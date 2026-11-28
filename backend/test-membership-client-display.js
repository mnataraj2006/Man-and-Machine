const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-membership-display-secret';

const app = require('./src/server');
const User = require('./src/models/User');
const Branch = require('./src/models/Branch');
const ClientProfile = require('./src/models/ClientProfile');
const Membership = require('./src/models/Membership');

const requestJson = (baseUrl, method, path, token = '') =>
  new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw || '{}') });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });

(async () => {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const branchA = await Branch.create({ name: 'Kovilpatti Main', city: 'Kovilpatti', code: 'KVP' });
    const branchB = await Branch.create({ name: 'Madurai Branch', city: 'Madurai', code: 'MDU' });

    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@test.local',
      phone: '9876543210',
      password: 'Password123!',
      role: 'ADMIN',
      branchId: branchA._id,
    });
    const adminToken = jwt.sign({ id: adminUser._id, role: 'ADMIN' }, process.env.JWT_SECRET);

    const registeredUser = await User.create({
      name: 'Nataraj M',
      email: 'nataraj@test.local',
      phone: '+91 85318 68631',
      password: 'Password123!',
      role: 'CLIENT',
      branchId: branchA._id,
    });
    const registeredProfile = await ClientProfile.create({
      clientId: 'MM000001',
      userId: registeredUser._id,
      branchId: branchA._id,
      name: '',
      phone: '',
    });

    const walkInProfile = await ClientProfile.create({
      clientId: 'MM000002',
      userId: null,
      branchId: branchA._id,
      name: 'ravi',
      phone: '+919876543210',
    });

    const emptyNameProfile = await ClientProfile.create({
      clientId: 'MM000003',
      userId: null,
      branchId: branchB._id,
      name: '',
      phone: '+919876500003',
    });

    const orphanedProfileId = new mongoose.Types.ObjectId();

    const startDate = new Date('2026-11-26T00:00:00Z');
    const expiryDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

    const mRegistered = await Membership.create({
      userId: registeredUser._id,
      clientProfileId: registeredProfile._id,
      branchId: branchA._id,
      planName: '1 Month Kickstart',
      status: 'ACTIVE',
      startDate,
      expiryDate,
      amount: 1200,
    });

    const mWalkIn = await Membership.create({
      userId: null,
      clientProfileId: walkInProfile._id,
      branchId: branchA._id,
      planName: '1 Month Kickstart',
      status: 'ACTIVE',
      startDate,
      expiryDate,
      amount: 1200,
    });

    const mMissingRef = await Membership.create({
      userId: null,
      clientProfileId: null,
      branchId: branchA._id,
      planName: 'Missing Ref Plan',
      status: 'ACTIVE',
      startDate,
      expiryDate,
      amount: 1000,
    });

    const mOrphanedRef = await Membership.create({
      userId: null,
      clientProfileId: orphanedProfileId,
      branchId: branchA._id,
      planName: 'Orphaned Ref Plan',
      status: 'PAUSED',
      startDate,
      expiryDate,
      amount: 1000,
    });

    const mEmptyName = await Membership.create({
      userId: null,
      clientProfileId: emptyNameProfile._id,
      branchId: branchB._id,
      planName: 'Empty Name Plan',
      status: 'ACTIVE',
      startDate,
      expiryDate,
      amount: 1500,
    });

    // 1-5: Fetch full membership list and verify every case
    const res = await requestJson(baseUrl, 'GET', '/api/admin/memberships', adminToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.memberships.length, 5);

    const byId = new Map(res.body.memberships.map((m) => [String(m._id), m]));

    // Case 1a: Registered user with User + ClientProfile
    const reg = byId.get(String(mRegistered._id));
    assert.strictEqual(reg.clientSummary.name, 'Nataraj M');
    assert.strictEqual(reg.clientSummary.phone, '+91 85318 68631');
    assert.strictEqual(reg.clientSummary.hasValidClient, true);

    // Case 1b: Walk-in client (userId: null, clientProfileId populated)
    const walkIn = byId.get(String(mWalkIn._id));
    assert.strictEqual(walkIn.clientSummary.name, 'ravi');
    assert.strictEqual(walkIn.clientSummary.phone, '+919876543210');
    assert.strictEqual(walkIn.clientSummary.clientId, 'MM000002');
    assert.strictEqual(walkIn.clientSummary.hasValidClient, true);
    assert.strictEqual(walkIn.clientProfileId.name, 'ravi');
    console.log('PASS [1]: Registered & Walk-in memberships resolve real client name and phone');

    // Case 2: Missing client reference
    const missing = byId.get(String(mMissingRef._id));
    assert.strictEqual(missing.clientSummary.name, 'Missing Client');
    assert.strictEqual(missing.clientSummary.hasValidClient, false);
    console.log('PASS [2]: Missing client reference handled gracefully');

    // Case 3: Invalid/orphaned client reference
    const orphaned = byId.get(String(mOrphanedRef._id));
    assert.strictEqual(orphaned.clientSummary.name, 'Missing Client');
    assert.strictEqual(orphaned.clientSummary.hasValidClient, false);
    console.log('PASS [3]: Orphaned client reference handled gracefully');

    // Case 4: Empty client name falls back to Client <clientId>
    const emptyName = byId.get(String(mEmptyName._id));
    assert.strictEqual(emptyName.clientSummary.name, 'Client MM000003');
    assert.strictEqual(emptyName.clientSummary.phone, '+919876500003');
    assert.strictEqual(emptyName.clientSummary.hasValidClient, true);
    console.log('PASS [4]: Empty client name resolves cleanly with clientId and phone');

    // Case 6: Existing filters (branchId, status, expiringSoon)
    const branchRes = await requestJson(
      baseUrl,
      'GET',
      `/api/admin/memberships?branchId=${branchB._id}&status=ACTIVE&expiringSoon=7`,
      adminToken
    );
    assert.strictEqual(branchRes.status, 200);
    assert.strictEqual(branchRes.body.memberships.length, 1);
    assert.strictEqual(String(branchRes.body.memberships[0]._id), String(mEmptyName._id));
    console.log('PASS [5 & 6]: Membership list API filters & response consistency verified');

    console.log('\nALL MEMBERSHIP CLIENT DISPLAY TESTS PASSED!');
  } finally {
    await new Promise((r) => server.close(r));
    await mongoose.disconnect();
    await mongod.stop();
  }
})().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
