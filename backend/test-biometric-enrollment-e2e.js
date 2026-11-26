require('dotenv').config();
const http = require('http');
const assert = require('assert');
const mongoose = require('mongoose');

const BiometricDevice = require('./src/models/BiometricDevice');
const BiometricEnrollment = require('./src/models/BiometricEnrollment');
const BiometricConsent = require('./src/models/BiometricConsent');
const BiometricUserMapping = require('./src/models/BiometricUserMapping');
const BiometricDeviceLog = require('./src/models/BiometricDeviceLog');
const ClientProfile = require('./src/models/ClientProfile');
const Membership = require('./src/models/Membership');
const Notification = require('./src/models/Notification');
const User = require('./src/models/User');

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === null ? null : JSON.stringify(body);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('==================================================================');
  console.log('MAN & MACHINE — BIOMETRIC ENROLLMENT (METHODS A, B, C) E2E');
  console.log('==================================================================\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);

  const createdUserIds = [];
  const createdProfileIds = [];
  const createdMembershipIds = [];
  const createdDeviceIds = [];

  try {
    const adminLogin = await request('POST', '/api/auth/login', {
      email: 'admin@manandmachine.com',
      password: 'Password@123',
    });
    assert.strictEqual(adminLogin.status, 200);
    const adminHeaders = { Authorization: `Bearer ${adminLogin.data.token}` };

    const branchRes = await request('GET', '/api/branches');
    const branches = branchRes.data.branches || branchRes.data.data || [];
    const branchId = branches[0]._id;

    const ts = Date.now().toString().slice(-6);

    // Register a test device (ONLINE via heartbeat)
    const sn = `ENRSN${ts}`;
    const devRes = await request(
      'POST',
      '/api/biometric/devices',
      { branchId, deviceName: 'KVP Enrollment Test X2008', serialNumber: sn, deviceId: 77 },
      adminHeaders
    );
    assert.strictEqual(devRes.status, 201);
    const deviceId = devRes.data.device._id;
    createdDeviceIds.push(deviceId);
    await BiometricDevice.updateOne({ _id: deviceId }, { lastSeenAt: new Date(), status: 'ONLINE' });

    // 1. Client without active membership is NOT eligible
    console.log('1. Testing membership eligibility gate...');
    const cReg = await request('POST', '/api/auth/register', {
      name: `Enr Client ${ts}`,
      email: `enr_client_${ts}@example.com`,
      phone: `9401${ts}`,
      branchId,
      password: 'Password@123',
      confirmPassword: 'Password@123',
    });
    assert.strictEqual(cReg.status, 201);
    const clientUserId = cReg.data.user.id;
    createdUserIds.push(clientUserId);
    const cProf = await ClientProfile.findOne({ userId: clientUserId });
    createdProfileIds.push(cProf._id);
    const clientHeaders = { Authorization: `Bearer ${cReg.data.token}` };

    const statusBefore = await request('GET', '/api/client/biometric/status', null, clientHeaders);
    assert.strictEqual(statusBefore.status, 200);
    assert.strictEqual(statusBefore.data.eligible, false);

    const consentNoMem = await request('POST', '/api/client/biometric/consent', { agreed: true }, clientHeaders);
    assert.strictEqual(consentNoMem.status, 403, 'Must block biometric consent without active membership');
    console.log('   PASS: Membership eligibility gate enforced.\n');

    // 2. Activate membership -> becomes eligible
    console.log('2. Testing Method C: consent, quality checks & mobile capture...');
    const now = new Date();
    const mem = await Membership.create({
      userId: clientUserId,
      clientProfileId: cProf._id,
      branchId,
      planName: 'Test Active Plan',
      status: 'ACTIVE',
      startDate: new Date(now.getTime() - 86400000),
      expiryDate: new Date(now.getTime() + 30 * 86400000),
      amount: 1000,
    });
    createdMembershipIds.push(mem._id);

    const statusEligible = await request('GET', '/api/client/biometric/status', null, clientHeaders);
    assert.strictEqual(statusEligible.data.eligible, true);

    // Reject unagreed consent
    const badConsent = await request('POST', '/api/client/biometric/consent', { agreed: false }, clientHeaders);
    assert.strictEqual(badConsent.status, 400);

    // Accept consent
    const okConsent = await request('POST', '/api/client/biometric/consent', { agreed: true }, clientHeaders);
    assert.strictEqual(okConsent.status, 201);

    // Reject poor quality / failed liveness
    const badCapture = await request(
      'POST',
      '/api/client/biometric/capture',
      { brightnessScore: 20, sharpnessScore: 5, livenessPassed: false, frameCount: 1 },
      clientHeaders
    );
    assert.strictEqual(badCapture.status, 400);

    // Valid capture -> CAPTURE_SUBMITTED (NOT ENROLLED!)
    const goodCapture = await request(
      'POST',
      '/api/client/biometric/capture',
      { brightnessScore: 70, sharpnessScore: 35, livenessPassed: true, frameCount: 3 },
      clientHeaders
    );
    assert.strictEqual(goodCapture.status, 201);
    assert.strictEqual(goodCapture.data.enrollment.status, 'CAPTURE_SUBMITTED');
    const enrollmentId = goodCapture.data.enrollment._id;
    console.log('   PASS: Consent & mobile capture submitted (not prematurely marked ENROLLED).\n');

    // 3. Admin approves -> AWAITING_PHYSICAL_ENROLLMENT
    console.log('3. Testing Admin approval & Method B honest firmware check...');
    const ov = await request('GET', '/api/biometric/enrollments/overview', null, adminHeaders);
    assert.strictEqual(ov.status, 200);
    assert(ov.data.overview.requestsCount >= 1);

    const approveRes = await request('POST', `/api/biometric/enrollments/${enrollmentId}/approve`, { deviceId }, adminHeaders);
    assert.strictEqual(approveRes.status, 200);
    assert.strictEqual(approveRes.data.enrollment.status, 'AWAITING_PHYSICAL_ENROLLMENT');

    // Method B Remote Enrollment -> must honestly report unsupported on X2008 ADMS
    const remoteRes = await request(
      'POST',
      `/api/biometric/enrollments/${enrollmentId}/remote-enroll`,
      { clientProfileId: cProf._id, deviceId },
      adminHeaders
    );
    assert.strictEqual(remoteRes.status, 400);
    assert(remoteRes.data.message.includes('not supported by the current device firmware'));
    console.log('   PASS: Approval & honest remote enrollment check verified.\n');

    // 4. Method A Manual Enrollment -> ENROLLED + Mapping created
    console.log('4. Testing Method A manual completion & duplicate conflict check...');
    const manualRes = await request(
      'POST',
      `/api/biometric/enrollments/${enrollmentId}/manual-complete`,
      { clientProfileId: cProf._id, deviceId, biometricUserId: '501', captureType: 'FACE' },
      adminHeaders
    );
    assert.strictEqual(manualRes.status, 200);
    assert.strictEqual(manualRes.data.enrollment.status, 'ENROLLED');
    assert.strictEqual(manualRes.data.enrollment.deviceEnrollmentStatus, 'ADMIN_CONFIRMED');

    // Conflicting biometric ID on same device for another member -> 409
    const otherProf = await ClientProfile.create({ name: `Conflict Member ${ts}`, phone: `9402${ts}`, branchId });
    createdProfileIds.push(otherProf._id);
    const conflictRes = await request(
      'POST',
      '/api/biometric/enrollments/manual',
      { clientProfileId: otherProf._id, deviceId, biometricUserId: '501' },
      adminHeaders
    );
    assert.strictEqual(conflictRes.status, 409);
    console.log('   PASS: Manual enrollment & conflict prevention verified.\n');

    // 5. Existing Users Migration analysis
    console.log('5. Testing existing X2008 user migration analysis...');
    const migRes = await request(
      'POST',
      '/api/biometric/migration/analyze',
      { deviceId, biometricUserIds: ['501', '502', '502', '503'] },
      adminHeaders
    );
    assert.strictEqual(migRes.status, 200);
    assert.strictEqual(migRes.data.successfullyMapped, 1);
    assert.strictEqual(migRes.data.unmappedCount, 2);
    assert.strictEqual(migRes.data.duplicateIds.length, 1);
    console.log('   PASS: Migration analysis verified.\n');

    // 6. Consent withdrawal
    console.log('6. Testing consent withdrawal...');
    const withdrawRes = await request('POST', '/api/client/biometric/consent/withdraw', {}, clientHeaders);
    assert.strictEqual(withdrawRes.status, 200);
    const statusAfterWithdraw = await request('GET', '/api/client/biometric/status', null, clientHeaders);
    assert.strictEqual(statusAfterWithdraw.data.enrollment.status, 'REVOKED');
    console.log('   PASS: Consent withdrawal verified.\n');

    console.log('==================================================================');
    console.log('ALL BIOMETRIC ENROLLMENT (METHODS A, B, C) E2E TESTS PASSED!');
    console.log('==================================================================');
  } finally {
    if (createdProfileIds.length) {
      await BiometricEnrollment.deleteMany({ clientProfileId: { $in: createdProfileIds } });
      await BiometricConsent.deleteMany({ clientProfileId: { $in: createdProfileIds } });
      await BiometricUserMapping.deleteMany({ clientProfileId: { $in: createdProfileIds } });
      await ClientProfile.deleteMany({ _id: { $in: createdProfileIds } });
    }
    if (createdDeviceIds.length) {
      await BiometricDeviceLog.deleteMany({ deviceId: { $in: createdDeviceIds } });
      await BiometricDevice.deleteMany({ _id: { $in: createdDeviceIds } });
    }
    if (createdMembershipIds.length) await Membership.deleteMany({ _id: { $in: createdMembershipIds } });
    if (createdUserIds.length) {
      await Notification.deleteMany({ userId: { $in: createdUserIds } });
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('BIOMETRIC ENROLLMENT E2E FAILED:', err);
  process.exit(1);
});
