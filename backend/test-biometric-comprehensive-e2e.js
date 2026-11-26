require('dotenv').config();
const http = require('http');
const assert = require('assert');
const mongoose = require('mongoose');

const BiometricDevice = require('./src/models/BiometricDevice');
const BiometricEnrollment = require('./src/models/BiometricEnrollment');
const BiometricConsent = require('./src/models/BiometricConsent');
const BiometricUserMapping = require('./src/models/BiometricUserMapping');
const BiometricDeviceLog = require('./src/models/BiometricDeviceLog');
const Attendance = require('./src/models/Attendance');
const ClientProfile = require('./src/models/ClientProfile');
const Membership = require('./src/models/Membership');
const Notification = require('./src/models/Notification');
const User = require('./src/models/User');

function request(method, path, body = null, headers = {}, rawText = false) {
  return new Promise((resolve, reject) => {
    const payload = body === null ? null : rawText ? String(body) : JSON.stringify(body);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers: {
          'Content-Type': rawText ? 'text/plain' : 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          if (rawText) return resolve({ status: res.statusCode, text: raw });
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
  console.log('MAN & MACHINE — COMPREHENSIVE BIOMETRIC PHASES 2-6 E2E VERIFICATION');
  console.log('==================================================================\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);

  const createdUserIds = [];
  const createdProfileIds = [];
  const createdMembershipIds = [];
  const createdDeviceIds = [];
  const createdAttendanceIds = [];

  try {
    const adminLogin = await request('POST', '/api/auth/login', {
      email: 'admin@manandmachine.com',
      password: 'Password@123',
    });
    assert.strictEqual(adminLogin.status, 200);
    const adminHeaders = { Authorization: `Bearer ${adminLogin.data.token}` };

    const branchRes = await request('GET', '/api/branches');
    const branches = branchRes.data.branches || branchRes.data.data || [];
    assert(branches.length >= 2);
    const branchA = branches[0]._id;
    const branchB = branches[1]._id;

    const ts = Date.now().toString().slice(-6);
    const snA = `COMPSNA${ts}`;

    const devA = await request(
      'POST',
      '/api/biometric/devices',
      { branchId: branchA, deviceName: 'Comp Test A', serialNumber: snA, deviceId: 66 },
      adminHeaders
    );
    assert.strictEqual(devA.status, 201);
    const devAId = devA.data.device._id;
    createdDeviceIds.push(devAId);

    // 1. ADMS Security: invalid SN, unknown SN, malformed ATTLOG
    console.log('1. Testing ADMS security (invalid SN, unknown SN, malformed payload)...');
    const badSN = await request('GET', '/iclock/getrequest?SN=!!bad!!', null, {}, true);
    assert.strictEqual(badSN.status, 400);

    const unkSN = await request('GET', '/iclock/getrequest?SN=UNKNOWNSN999', null, {}, true);
    assert.strictEqual(unkSN.status, 404);

    const malformedAtt = await request('POST', `/iclock/cdata?SN=${snA}&table=ATTLOG`, 'GARBAGE_NOT_TABBED\nBAD_LINE', {}, true);
    assert.strictEqual(malformedAtt.status, 400, 'Completely malformed ATTLOG must return 400');
    console.log('   PASS: ADMS validation & malformed payload rejection verified.\n');

    // 2. OPERLOG USER PIN parsing & migration auto-discovery (no Passwd stored)
    console.log('2. Testing OPERLOG USER PIN parsing & non-destructive migration...');
    const operBody = [
      'USER PIN=201\tName=TestMember1\tPri=0\tPasswd=secret123',
      'USER PIN=202\tName=TestMember2\tPri=0',
      'UserCount=2',
      'FaceCount=2',
    ].join('\n');
    const operRes = await request('POST', `/iclock/cdata?SN=${snA}&table=OPERLOG`, operBody, {}, true);
    assert.strictEqual(operRes.status, 200);

    const devAfterOper = await BiometricDevice.findById(devAId).lean();
    assert.strictEqual(devAfterOper.userCount, 2);
    assert.strictEqual(devAfterOper.discoveredUsers.length, 2);
    assert(!JSON.stringify(devAfterOper.discoveredUsers).includes('secret123'), 'Passwords must never be stored');

    const migAuto = await request('POST', '/api/biometric/migration/analyze', { deviceId: devAId }, adminHeaders);
    assert.strictEqual(migAuto.status, 200);
    assert.strictEqual(migAuto.data.totalDeviceUsers, 2);
    assert.strictEqual(migAuto.data.unmappedCount, 2);
    console.log('   PASS: OPERLOG USER PIN parsing & migration verified.\n');

    // 3. Distinct Membership Statuses (FROZEN & CANCELLED)
    console.log('3. Testing distinct FROZEN and CANCELLED membership flags on biometric check-in...');
    const frozenProf = await ClientProfile.create({ name: `Bio Frozen ${ts}`, phone: `9201${ts}`, branchId: branchA });
    const cancelProf = await ClientProfile.create({ name: `Bio Cancel ${ts}`, phone: `9202${ts}`, branchId: branchA });
    createdProfileIds.push(frozenProf._id, cancelProf._id);

    const now = new Date();
    const mFrozen = await Membership.create({
      clientProfileId: frozenProf._id,
      branchId: branchA,
      planName: 'Frozen Plan',
      status: 'FROZEN',
      startDate: now,
      expiryDate: new Date(now.getTime() + 30 * 86400000),
      amount: 1000,
    });
    const mCancel = await Membership.create({
      clientProfileId: cancelProf._id,
      branchId: branchA,
      planName: 'Cancelled Plan',
      status: 'CANCELLED',
      startDate: now,
      expiryDate: new Date(now.getTime() + 30 * 86400000),
      amount: 1000,
    });
    createdMembershipIds.push(mFrozen._id, mCancel._id);

    await request('POST', '/api/biometric/mappings', { deviceId: devAId, biometricUserId: '301', clientProfileId: frozenProf._id }, adminHeaders);
    await request('POST', '/api/biometric/mappings', { deviceId: devAId, biometricUserId: '302', clientProfileId: cancelProf._id }, adminHeaders);

    const todayStr = new Date().toISOString().slice(0, 10);
    const pushRes = await request(
      'POST',
      `/iclock/cdata?SN=${snA}&table=ATTLOG`,
      `301\t${todayStr} 08:00:00\t0\t15\t0\t0\n302\t${todayStr} 08:01:00\t0\t15\t0\t0`,
      {},
      true
    );
    assert.strictEqual(pushRes.status, 200);

    const attRows = await Attendance.find({ deviceId: devAId }).lean();
    attRows.forEach((a) => createdAttendanceIds.push(a._id));
    assert.strictEqual(attRows.find((a) => a.biometricUserId === '301').attendanceStatus, 'FLAGGED_FROZEN');
    assert.strictEqual(attRows.find((a) => a.biometricUserId === '302').attendanceStatus, 'FLAGGED_CANCELLED');
    console.log('   PASS: FROZEN and CANCELLED flagged distinctly.\n');

    // 4. Multi-branch isolation + Pagination + Rate Limit
    console.log('4. Testing multi-branch enrollment isolation, details endpoint & rate limiting...');
    const cReg = await request('POST', '/api/auth/register', {
      name: `MultiBranch Bio ${ts}`,
      email: `mb_bio_${ts}@example.com`,
      phone: `9203${ts}`,
      branchId: branchA,
      password: 'Password@123',
      confirmPassword: 'Password@123',
    });
    assert.strictEqual(cReg.status, 201);
    createdUserIds.push(cReg.data.user.id);
    const mbProf = await ClientProfile.findOne({ userId: cReg.data.user.id });
    createdProfileIds.push(mbProf._id);
    const cHeaders = { Authorization: `Bearer ${cReg.data.token}` };

    const mbMem = await Membership.create({
      userId: cReg.data.user.id,
      clientProfileId: mbProf._id,
      branchId: branchA,
      planName: 'MB Active',
      status: 'ACTIVE',
      startDate: new Date(now.getTime() - 86400000),
      expiryDate: new Date(now.getTime() + 30 * 86400000),
      amount: 1000,
    });
    createdMembershipIds.push(mbMem._id);

    await request('POST', '/api/client/biometric/consent', { agreed: true, branchId: branchA }, cHeaders);
    await request('POST', '/api/client/biometric/consent', { agreed: true, branchId: branchB }, cHeaders);

    const mbEnrollments = await BiometricEnrollment.find({ clientProfileId: mbProf._id }).lean();
    assert.strictEqual(mbEnrollments.length, 2, 'Multi-branch consent must create separate branch enrollment records');

    const capA = await request(
      'POST',
      '/api/client/biometric/capture',
      { brightnessScore: 70, sharpnessScore: 30, livenessPassed: true, frameCount: 6, branchId: branchA },
      cHeaders
    );
    assert.strictEqual(capA.status, 201);

    // Enrollment details & pagination
    const listPaginated = await request('GET', '/api/biometric/enrollments?page=1&limit=10', null, adminHeaders);
    assert.strictEqual(listPaginated.status, 200);
    assert(listPaginated.data.totalPages >= 1);

    const detRes = await request('GET', `/api/biometric/enrollments/${capA.data.enrollment._id}`, null, adminHeaders);
    assert.strictEqual(detRes.status, 200);
    assert.strictEqual(String(detRes.data.enrollment._id), String(capA.data.enrollment._id));

    // Withdraw consent revokes both branch records
    const wRes = await request('POST', '/api/client/biometric/consent/withdraw', {}, cHeaders);
    assert.strictEqual(wRes.status, 200);
    assert.strictEqual(wRes.data.revokedCount, 2);

    // Rate limit check on /api/client/biometric/capture (max 10/min)
    let got429 = false;
    for (let i = 0; i < 12; i++) {
      const rl = await request('POST', '/api/client/biometric/capture', { brightnessScore: 10 }, cHeaders);
      if (rl.status === 429) {
        got429 = true;
        break;
      }
    }
    assert(got429, 'Rate limiter must trigger 429 after excessive capture attempts');
    console.log('   PASS: Multi-branch isolation, details, pagination & rate limiting verified.\n');

    console.log('==================================================================');
    console.log('ALL COMPREHENSIVE BIOMETRIC PHASES 2-6 E2E TESTS PASSED!');
    console.log('==================================================================');
  } finally {
    if (createdAttendanceIds.length) await Attendance.deleteMany({ _id: { $in: createdAttendanceIds } });
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
  console.error('COMPREHENSIVE BIOMETRIC E2E FAILED:', err);
  process.exit(1);
});
