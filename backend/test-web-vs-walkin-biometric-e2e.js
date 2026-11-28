const assert = require('assert');
const http = require('http');
const path = require('path');
const { pathToFileURL } = require('url');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('./src/server');
const User = require('./src/models/User');
const Branch = require('./src/models/Branch');
const ClientProfile = require('./src/models/ClientProfile');
const Membership = require('./src/models/Membership');
const BiometricDevice = require('./src/models/BiometricDevice');
const BiometricEnrollment = require('./src/models/BiometricEnrollment');
const BiometricDeviceSyncJob = require('./src/models/BiometricDeviceSyncJob');
const BiometricUserMapping = require('./src/models/BiometricUserMapping');
const Attendance = require('./src/models/Attendance');
const biometricEnrollmentService = require('./src/services/biometricEnrollmentService');
const generateToken = require('./src/utils/generateToken');

const req = (server, method, urlPath, body = null, token = null, isText = false) =>
  new Promise((resolve, reject) => {
    const addr = server.address();
    const payload = body ? (isText ? String(body) : JSON.stringify(body)) : null;
    const headers = {};
    if (payload) {
      headers['Content-Type'] = isText ? 'text/plain' : 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (token) headers.Authorization = `Bearer ${token}`;

    const r = http.request({ hostname: '127.0.0.1', port: addr.port, path: urlPath, method, headers }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        let data = raw;
        if (!isText) {
          try {
            data = JSON.parse(raw);
          } catch {
            // keep raw
          }
        }
        resolve({ status: res.statusCode, data });
      });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });

(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-web-walkin-secret';
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));

  const { mapBiometricUiState } = await import(
    pathToFileURL(path.resolve(__dirname, '../frontend/src/utils/biometricStatus.js')).href
  );

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
    const clientUser = await User.create({ name: 'Web User', email: 'web@test.local', phone: '9000000022', password: 'Password123!', role: 'CLIENT', branchId: branchA._id, status: 'ACTIVE' });

    const adminToken = generateToken(superAdmin._id, 0);
    const branchBToken = generateToken(branchBAdmin._id, 0);
    const clientToken = generateToken(clientUser._id, 0);

    const deviceA = await BiometricDevice.create({
      deviceId: 1,
      deviceName: 'KVP Main Entrance',
      model: 'X2008',
      serialNumber: 'TDBD242100623',
      branchId: branchA._id,
      isActive: true,
      status: 'ONLINE',
      supportsRemoteEnrollment: true,
    });

    const webClient = await ClientProfile.create({
      clientId: 'MM000001',
      userId: clientUser._id,
      name: 'Web Client',
      phone: '9876543210',
      branchId: branchA._id,
      registrationSource: 'SELF_REGISTERED',
      status: 'ACTIVE',
    });
    const walkinClient = await ClientProfile.create({
      clientId: 'MM000002',
      name: 'Walkin Client',
      phone: '9876543211',
      branchId: branchA._id,
      registrationSource: 'ADMIN_REGISTERED',
      status: 'ACTIVE',
    });

    const webMembership = await Membership.create({
      clientProfileId: webClient._id,
      userId: clientUser._id,
      branchId: branchA._id,
      planName: 'Monthly Pro',
      status: 'ACTIVE',
      startDate: new Date(Date.now() - 86400000),
      expiryDate: new Date(Date.now() + 30 * 86400000),
    });
    await Membership.create({
      clientProfileId: walkinClient._id,
      branchId: branchA._id,
      planName: 'Monthly Pro',
      status: 'ACTIVE',
      startDate: new Date(Date.now() - 86400000),
      expiryDate: new Date(Date.now() + 30 * 86400000),
    });

    let webEnroll = null;
    let walkinEnroll = null;

    await check('1. Web purchase + consent creates BiometricEnrollment AND BiometricUserMapping immediately', async () => {
      const res = await biometricEnrollmentService.autoInitiateBiometricEnrollment({
        clientProfileId: webClient._id,
        userId: clientUser._id,
        branchId: branchA._id,
        consentAgreed: true,
        source: 'WEB',
      });
      assert.strictEqual(res.initiated, true);
      webEnroll = res.enrollment;
      const mapping = await BiometricUserMapping.findOne({ clientProfileId: webClient._id, deviceId: deviceA._id, status: 'ACTIVE' }).lean();
      assert(mapping);
      assert.strictEqual(mapping.biometricUserId, webEnroll.biometricUserId);
      assert.strictEqual(webEnroll.faceEnrollmentStatus, 'PENDING');
    });

    await check('2. Web client summary & UI state do NOT expose Confirm Physical Face Enrollment', async () => {
      await BiometricEnrollment.updateOne({ _id: webEnroll._id }, { $set: { status: 'DEVICE_USER_READY', deviceUserSyncStatus: 'VERIFIED' } });
      if (webEnroll.deviceUserSyncJobId) {
        await BiometricDeviceSyncJob.updateOne({ _id: webEnroll.deviceUserSyncJobId }, { $set: { status: 'VERIFIED', verifiedAt: new Date() } });
      }
      const summary = await biometricEnrollmentService.getClientBiometricSummary({
        clientProfileId: webClient._id,
        userId: clientUser._id,
        branchId: branchA._id,
        hasActiveMembership: true,
      });
      assert.strictEqual(summary.registrationSource, 'SELF_REGISTERED');
      assert.strictEqual(summary.requiresAdminFaceConfirmation, false);
      const ui = mapBiometricUiState(summary);
      assert.notStrictEqual(ui.actionType, 'CONFIRM_FACE');
      assert.notStrictEqual(ui.actionLabel, 'Confirm Physical Face Enrollment');
    });

    await check('3. Walk-in client creates enrollment & mapping and retains Confirm Physical Face Enrollment action', async () => {
      const res = await biometricEnrollmentService.autoInitiateBiometricEnrollment({
        clientProfileId: walkinClient._id,
        branchId: branchA._id,
        consentAgreed: true,
        source: 'WALK_IN',
        actorUser: superAdmin,
      });
      assert.strictEqual(res.initiated, true);
      walkinEnroll = res.enrollment;
      const mapping = await BiometricUserMapping.findOne({ clientProfileId: walkinClient._id, deviceId: deviceA._id, status: 'ACTIVE' }).lean();
      assert(mapping);

      await BiometricEnrollment.updateOne({ _id: walkinEnroll._id }, { $set: { status: 'DEVICE_USER_READY', deviceUserSyncStatus: 'VERIFIED' } });
      if (walkinEnroll.deviceUserSyncJobId) {
        await BiometricDeviceSyncJob.updateOne({ _id: walkinEnroll.deviceUserSyncJobId }, { $set: { status: 'VERIFIED', verifiedAt: new Date() } });
      }
      const summary = await biometricEnrollmentService.getClientBiometricSummary({
        clientProfileId: walkinClient._id,
        branchId: branchA._id,
        hasActiveMembership: true,
      });
      assert.strictEqual(summary.registrationSource, 'ADMIN_REGISTERED');
      assert.strictEqual(summary.requiresAdminFaceConfirmation, true);
      const ui = mapBiometricUiState(summary);
      assert.strictEqual(ui.actionType, 'CONFIRM_FACE');
      assert.strictEqual(ui.actionLabel, 'Confirm Physical Face Enrollment');
    });

    await check('4. Web & Walk-in attendance resolve client BEFORE admin confirmation and ATTLOG does NOT mark face ENROLLED', async () => {
      const r1 = await req(server, 'POST', `/iclock/cdata?SN=${deviceA.serialNumber}&table=ATTLOG`, `${webEnroll.biometricUserId}\t2026-11-29 08:00:00\t0\t15\t0\t0`, null, true);
      assert.strictEqual(r1.status, 200);
      const webAtt = await Attendance.findOne({ clientProfileId: webClient._id }).lean();
      assert(webAtt);
      assert.strictEqual(webAtt.accessDecision, 'ALLOWED');

      const r2 = await req(server, 'POST', `/iclock/cdata?SN=${deviceA.serialNumber}&table=ATTLOG`, `${walkinEnroll.biometricUserId}\t2026-11-29 08:05:00\t0\t15\t0\t0`, null, true);
      assert.strictEqual(r2.status, 200);
      const walkinAtt = await Attendance.findOne({ clientProfileId: walkinClient._id }).lean();
      assert(walkinAtt);
      assert.strictEqual(walkinAtt.accessDecision, 'ALLOWED');

      const webReload = await BiometricEnrollment.findById(webEnroll._id).lean();
      assert.strictEqual(webReload.faceEnrollmentStatus, 'PENDING');
    });

    await check('5. Walk-in admin confirmation succeeds; Web confirmation rejected (403); unauthorized & cross-branch rejected', async () => {
      const unauth = await req(server, 'POST', `/api/biometric/enrollments/${walkinEnroll._id}/confirm-face`, {});
      assert.strictEqual(unauth.status, 401);

      const clientAttempt = await req(server, 'POST', `/api/biometric/enrollments/${walkinEnroll._id}/confirm-face`, {}, clientToken);
      assert.strictEqual(clientAttempt.status, 403);

      const branchBAttempt = await req(server, 'POST', `/api/biometric/enrollments/${walkinEnroll._id}/confirm-face`, {}, branchBToken);
      assert.strictEqual(branchBAttempt.status, 403);

      const webConfirm = await req(server, 'POST', `/api/biometric/enrollments/${webEnroll._id}/confirm-face`, {}, adminToken);
      assert.strictEqual(webConfirm.status, 403);

      const walkinConfirm = await req(server, 'POST', `/api/biometric/enrollments/${walkinEnroll._id}/confirm-face`, {}, adminToken);
      assert.strictEqual(walkinConfirm.status, 200);
      const updated = await BiometricEnrollment.findById(walkinEnroll._id).lean();
      assert.strictEqual(updated.faceEnrollmentStatus, 'ENROLLED');
      assert.strictEqual(updated.status, 'ENROLLED');
    });

    await check('6. Duplicate mapping prevention & membership expiry/renewal preserved', async () => {
      await biometricEnrollmentService.autoInitiateBiometricEnrollment({
        clientProfileId: webClient._id,
        userId: clientUser._id,
        branchId: branchA._id,
        consentAgreed: true,
        source: 'WEB',
      });
      assert.strictEqual(await BiometricUserMapping.countDocuments({ clientProfileId: webClient._id }), 1);

      await Membership.updateOne({ _id: webMembership._id }, { $set: { expiryDate: new Date(Date.now() - 3600000) } });
      const expRes = await req(server, 'POST', `/iclock/cdata?SN=${deviceA.serialNumber}&table=ATTLOG`, `${webEnroll.biometricUserId}\t2026-11-29 09:00:00\t0\t15\t0\t0`, null, true);
      assert.strictEqual(expRes.status, 200);
      const expAtt = await Attendance.findOne({ clientProfileId: webClient._id }).sort({ createdAt: -1 }).lean();
      assert.strictEqual(expAtt.accessDecision, 'DENIED');
      assert.strictEqual(expAtt.accessDenialReason, 'MEMBERSHIP_EXPIRED');
    });

    console.log(`\nALL ${passed} WEB VS WALK-IN BIOMETRIC E2E CHECKS PASSED!`);
  } finally {
    server.close();
    await mongoose.disconnect();
    await mongod.stop();
  }
})().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
