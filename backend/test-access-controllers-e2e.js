const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('./src/server');
const User = require('./src/models/User');
const Branch = require('./src/models/Branch');
const ClientProfile = require('./src/models/ClientProfile');
const Membership = require('./src/models/Membership');
const BiometricEnrollment = require('./src/models/BiometricEnrollment');
const AccessController = require('./src/models/AccessController');
const AccessControlEvent = require('./src/models/AccessControlEvent');
const generateToken = require('./src/utils/generateToken');

const reqJson = (server, method, path, body = null, token = null) =>
  new Promise((resolve, reject) => {
    const addr = server.address();
    const payload = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    if (token) headers.Authorization = `Bearer ${token}`;

    const req = http.request(
      { hostname: '127.0.0.1', port: addr.port, path, method, headers },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let parsed = raw;
          try {
            parsed = JSON.parse(raw);
          } catch {
            // ignore
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });

(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-access-ctrl-secret';
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await AccessControlEvent.init();
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));

  let passed = 0;
  const check = (name, fn) =>
    Promise.resolve()
      .then(fn)
      .then(() => {
        passed += 1;
        console.log(`PASS [${passed}]: ${name}`);
      });

  try {
    const branchA = await Branch.create({ name: 'Kovilpatti', city: 'Kovilpatti', code: 'KVP', address: 'KVP', phone: '9000000010', isActive: true });
    const branchB = await Branch.create({ name: 'Karur', city: 'Karur', code: 'KRR', address: 'KRR', phone: '9000000011', isActive: true });

    const superAdmin = await User.create({ name: 'Admin', email: 'admin@test.local', phone: '9000000020', password: 'Password123!', role: 'ADMIN', branchId: null, status: 'ACTIVE' });
    const branchBAdmin = await User.create({ name: 'KRR Admin', email: 'krr@test.local', phone: '9000000021', password: 'Password123!', role: 'ADMIN', branchId: branchB._id, status: 'ACTIVE' });
    const adminToken = generateToken(superAdmin._id, 0);
    const branchBToken = generateToken(branchBAdmin._id, 0);

    const clientA = await ClientProfile.create({ clientId: 'MM000001', name: 'Nataraj', phone: '9876543210', branchId: branchA._id, status: 'ACTIVE' });
    await BiometricEnrollment.create({
      clientProfileId: clientA._id,
      branchId: branchA._id,
      biometricUserId: '1001',
      consentStatus: 'GRANTED',
      status: 'ENROLLED',
      faceEnrollmentStatus: 'ENROLLED',
    });
    const membership = await Membership.create({
      clientProfileId: clientA._id,
      branchId: branchA._id,
      planName: 'Monthly Pro',
      status: 'ACTIVE',
      startDate: new Date(Date.now() - 86400000),
      expiryDate: new Date(Date.now() + 10 * 86400000),
    });

    let controllerId = null;

    await check('1. Register MOCK controller (credentials encrypted & never leaked) + unimplemented TCP_IP cannot be enabled', async () => {
      const bad = await reqJson(server, 'POST', '/api/biometric/access-controllers', {
        branchId: branchA._id,
        name: 'Unknown TCP Door',
        doorName: 'Side Gate',
        adapterType: 'TCP_IP',
        isEnabled: true,
      }, adminToken);
      assert.strictEqual(bad.status, 400);

      const reg = await reqJson(server, 'POST', '/api/biometric/access-controllers', {
        branchId: branchA._id,
        name: 'Main Door Sim',
        doorName: 'Main Entrance',
        adapterType: 'MOCK',
        connectionConfig: { mockOptions: { hasDoorSensor: false } },
        credentials: { token: 'super-secret-token' },
        isEnabled: true,
      }, adminToken);
      assert.strictEqual(reg.status, 201);
      assert.strictEqual(reg.data.controller.hasCredentials, true);
      assert.strictEqual(reg.data.controller.encryptedCredentials, undefined);
      assert.strictEqual(reg.data.controller.capabilities.emergencyEgressIndependent, true);
      controllerId = reg.data.controller._id;
    });

    await check('2. Active membership unlock authorization & ack without physical sensor -> NO_SENSOR', async () => {
      const res = await reqJson(server, 'POST', `/api/biometric/access-controllers/${controllerId}/authorize`, {
        clientProfileId: clientA._id,
        commandId: 'cmd-active-1',
      }, adminToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.decision, 'ALLOWED');
      assert.strictEqual(res.data.acknowledged, true);
      assert.strictEqual(res.data.physicalState, 'NO_SENSOR');
      assert.strictEqual(res.data.emergencyEgressIndependent, true);
    });

    await check('3. Duplicate / replayed commandId is rejected cleanly', async () => {
      const dup = await reqJson(server, 'POST', `/api/biometric/access-controllers/${controllerId}/authorize`, {
        clientProfileId: clientA._id,
        commandId: 'cmd-active-1',
      }, adminToken);
      assert.strictEqual(dup.status, 200);
      assert.strictEqual(dup.data.decision, 'DENIED');
      assert.strictEqual(dup.data.reason, 'DUPLICATE_COMMAND');
    });

    await check('4. Expired membership is DENIED (MEMBERSHIP_EXPIRED)', async () => {
      await Membership.updateOne({ _id: membership._id }, { $set: { expiryDate: new Date(Date.now() - 3600000) } });
      const res = await reqJson(server, 'POST', `/api/biometric/access-controllers/${controllerId}/authorize`, {
        clientProfileId: clientA._id,
        commandId: 'cmd-expired-1',
      }, adminToken);
      assert.strictEqual(res.data.decision, 'DENIED');
      assert.strictEqual(res.data.reason, 'MEMBERSHIP_EXPIRED');
    });

    await check('5. Suspended/Paused membership is DENIED (MEMBERSHIP_SUSPENDED)', async () => {
      await Membership.updateOne({ _id: membership._id }, { $set: { status: 'PAUSED', expiryDate: new Date(Date.now() + 86400000) } });
      const res = await reqJson(server, 'POST', `/api/biometric/access-controllers/${controllerId}/authorize`, {
        clientProfileId: clientA._id,
        commandId: 'cmd-paused-1',
      }, adminToken);
      assert.strictEqual(res.data.decision, 'DENIED');
      assert.strictEqual(res.data.reason, 'MEMBERSHIP_SUSPENDED');
    });

    await check('6. Renewal restores authorization (ALLOWED)', async () => {
      await Membership.updateOne({ _id: membership._id }, { $set: { status: 'ACTIVE', expiryDate: new Date(Date.now() + 30 * 86400000) } });
      const res = await reqJson(server, 'POST', `/api/biometric/access-controllers/${controllerId}/authorize`, {
        clientProfileId: clientA._id,
        commandId: 'cmd-renewed-1',
      }, adminToken);
      assert.strictEqual(res.data.decision, 'ALLOWED');
    });

    await check('7. Failure modes: offline, network failure, timeout, invalid credentials -> UNAVAILABLE (fail closed)', async () => {
      for (const [label, mockOptions, expectedReason] of [
        ['offline', { offline: true }, 'CONTROLLER_OFFLINE'],
        ['network', { networkError: true }, 'NETWORK_FAILURE'],
        ['timeout', { timeout: true }, 'COMMAND_TIMEOUT'],
        ['invalid-creds', { expectedToken: 'different-token' }, 'INVALID_CREDENTIALS'],
      ]) {
        await AccessController.updateOne({ _id: controllerId }, { $set: { 'connectionConfig.mockOptions': mockOptions } });
        const res = await reqJson(server, 'POST', `/api/biometric/access-controllers/${controllerId}/authorize`, {
          clientProfileId: clientA._id,
          commandId: `cmd-fail-${label}`,
        }, adminToken);
        assert.strictEqual(res.data.decision, 'UNAVAILABLE');
        assert.strictEqual(res.data.reason, expectedReason);
      }
    });

    await check('8. Branch isolation: Branch B admin cannot authorize or view Branch A controller', async () => {
      const res = await reqJson(server, 'POST', `/api/biometric/access-controllers/${controllerId}/authorize`, {
        clientProfileId: clientA._id,
        commandId: 'cmd-branch-b',
      }, branchBToken);
      assert.strictEqual(res.status, 403);
    });

    console.log(`\nALL ${passed} UNIVERSAL ACCESS CONTROLLER E2E CHECKS PASSED!`);
  } finally {
    server.close();
    await mongoose.disconnect();
    await mongod.stop();
  }
})().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
