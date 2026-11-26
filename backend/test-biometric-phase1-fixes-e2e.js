require('dotenv').config();
const http = require('http');
const assert = require('assert');
const mongoose = require('mongoose');

const BiometricDevice = require('./src/models/BiometricDevice');
const BiometricEnrollment = require('./src/models/BiometricEnrollment');
const BiometricUserMapping = require('./src/models/BiometricUserMapping');
const BiometricDeviceLog = require('./src/models/BiometricDeviceLog');
const ClientProfile = require('./src/models/ClientProfile');
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
  console.log('MAN & MACHINE — PHASE 1 BIOMETRIC ID & HANDLER REGRESSION TESTS');
  console.log('==================================================================\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);

  const createdUserIds = [];
  const createdProfileIds = [];
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

    // Register test biometric device
    const devRes = await request(
      'POST',
      '/api/biometric/devices',
      { branchId, deviceName: 'Phase1 Test X2008', serialNumber: `P1SN${ts}`, deviceId: 88 },
      adminHeaders
    );
    assert.strictEqual(devRes.status, 201);
    const deviceId = devRes.data.device._id;
    createdDeviceIds.push(deviceId);

    // 1. Create a self-registered client
    console.log('1. Creating self-registered client & walk-in client...');
    const selfReg = await request('POST', '/api/auth/register', {
      name: `P1 Self ${ts}`,
      email: `p1_self_${ts}@example.com`,
      phone: `9301${ts}`,
      branchId,
      password: 'Password@123',
      confirmPassword: 'Password@123',
    });
    assert.strictEqual(selfReg.status, 201);
    createdUserIds.push(selfReg.data.user.id);
    const selfProf = await ClientProfile.findOne({ userId: selfReg.data.user.id });
    createdProfileIds.push(selfProf._id);

    // 2. Create an Admin walk-in client
    const walkInReg = await request(
      'POST',
      '/api/admin/clients',
      { name: `P1 Walkin ${ts}`, phone: `9302${ts}`, branchId },
      adminHeaders
    );
    assert.strictEqual(walkInReg.status, 201);
    createdProfileIds.push(walkInReg.data.client.profileId);

    // 3. Verify GET /api/admin/clients returns userId + profileId for both
    console.log('2. Verifying GET /api/admin/clients returns profileId & userId...');
    const selfList = await request('GET', `/api/admin/clients?search=p1_self_${ts}@example.com`, null, adminHeaders);
    assert.strictEqual(selfList.status, 200);
    const selfRow = selfList.data.clients[0];
    assert(selfRow, 'Self-registered client must appear in list');
    assert.strictEqual(String(selfRow.id), String(selfReg.data.user.id));
    assert.strictEqual(String(selfRow.userId), String(selfReg.data.user.id));
    assert.strictEqual(String(selfRow.profileId), String(selfProf._id));
    assert.notStrictEqual(String(selfRow.userId), String(selfRow.profileId), 'User._id and ClientProfile._id must be distinct');

    const walkInList = await request('GET', `/api/admin/clients?search=9302${ts}`, null, adminHeaders);
    const walkInRow = walkInList.data.clients[0];
    assert(walkInRow, 'Walk-in client must appear in list');
    assert.strictEqual(walkInRow.userId, null);
    assert.strictEqual(String(walkInRow.profileId), String(walkInReg.data.client.profileId));
    console.log('   PASS: profileId & userId returned accurately.\n');

    // 4. Manual enrollment using selfRow.profileId succeeds
    console.log('3. Testing manual enrollment & user mapping with ClientProfile._id...');
    const enrSelf = await request(
      'POST',
      '/api/biometric/enrollments/manual',
      { clientProfileId: selfRow.profileId, deviceId, biometricUserId: '801', captureType: 'FACE' },
      adminHeaders
    );
    assert.strictEqual(enrSelf.status, 200, `Self-registered client manual enrollment failed: ${JSON.stringify(enrSelf.data)}`);
    assert.strictEqual(enrSelf.data.enrollment.status, 'ENROLLED');

    const mapWalkin = await request(
      'POST',
      '/api/biometric/mappings',
      { clientProfileId: walkInRow.profileId, deviceId, biometricUserId: '802' },
      adminHeaders
    );
    assert.strictEqual(mapWalkin.status, 201);
    console.log('   PASS: Both self-registered & walk-in clients enrolled/mapped.\n');

    // 5. Passing User._id instead of profileId must NOT silently substitute — must return clear 404
    console.log('4. Testing missing/wrong ClientProfile ID produces clear error...');
    const wrongIdEnr = await request(
      'POST',
      '/api/biometric/enrollments/manual',
      { clientProfileId: selfRow.userId, deviceId, biometricUserId: '803' },
      adminHeaders
    );
    assert.strictEqual(wrongIdEnr.status, 404, 'Passing User._id as clientProfileId must return 404');
    assert(wrongIdEnr.data.message.includes('ClientProfile not found'));

    const missingIdMap = await request(
      'POST',
      '/api/biometric/mappings',
      { clientProfileId: '', deviceId, biometricUserId: '804' },
      adminHeaders
    );
    assert.strictEqual(missingIdMap.status, 400);
    console.log('   PASS: Missing/invalid ClientProfile rejected cleanly.\n');

    // 6. Duplicate biometric user ID is rejected safely
    console.log('5. Testing duplicate biometric user ID rejection...');
    const dupBioId = await request(
      'POST',
      '/api/biometric/enrollments/manual',
      { clientProfileId: walkInRow.profileId, deviceId, biometricUserId: '801' },
      adminHeaders
    );
    assert.strictEqual(dupBioId.status, 409);
    console.log('   PASS: Duplicate biometric ID rejected with 409.\n');

    console.log('==================================================================');
    console.log('ALL PHASE 1 BIOMETRIC REGRESSION TESTS PASSED!');
    console.log('==================================================================');
  } finally {
    if (createdProfileIds.length) {
      await BiometricEnrollment.deleteMany({ clientProfileId: { $in: createdProfileIds } });
      await BiometricUserMapping.deleteMany({ clientProfileId: { $in: createdProfileIds } });
      await ClientProfile.deleteMany({ _id: { $in: createdProfileIds } });
    }
    if (createdDeviceIds.length) {
      await BiometricDeviceLog.deleteMany({ deviceId: { $in: createdDeviceIds } });
      await BiometricDevice.deleteMany({ _id: { $in: createdDeviceIds } });
    }
    if (createdUserIds.length) {
      await Notification.deleteMany({ userId: { $in: createdUserIds } });
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('PHASE 1 REGRESSION TEST FAILED:', err);
  process.exit(1);
});
