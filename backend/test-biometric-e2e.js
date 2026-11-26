require('dotenv').config();
const http = require('http');
const assert = require('assert');
const mongoose = require('mongoose');

const BiometricDevice = require('./src/models/BiometricDevice');
const BiometricUserMapping = require('./src/models/BiometricUserMapping');
const BiometricDeviceLog = require('./src/models/BiometricDeviceLog');
const Attendance = require('./src/models/Attendance');
const ClientProfile = require('./src/models/ClientProfile');
const Membership = require('./src/models/Membership');
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
  console.log('MAN & MACHINE — BIOMETRIC ADMS & DEVICE MANAGEMENT E2E');
  console.log('==================================================================\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);

  const createdDeviceIds = [];
  const createdProfileIds = [];
  const createdUserIds = [];
  const createdMembershipIds = [];
  const createdMappingIds = [];
  const createdAttendanceIds = [];

  try {
    // 1. Auth & RBAC checks
    console.log('1. Testing API authentication & Admin authorization...');
    const unauth = await request('GET', '/api/biometric/devices');
    assert.strictEqual(unauth.status, 401);

    const adminLogin = await request('POST', '/api/auth/login', {
      email: 'admin@manandmachine.com',
      password: 'Password@123',
    });
    assert.strictEqual(adminLogin.status, 200);
    const adminHeaders = { Authorization: `Bearer ${adminLogin.data.token}` };

    const branchRes = await request('GET', '/api/branches');
    const branches = branchRes.data.branches || branchRes.data.data || [];
    assert(branches.length >= 2);
    const kvpBranch = branches[0]._id;
    const otherBranch = branches[1]._id;

    const ts = Date.now().toString().slice(-6);
    const clientReg = await request('POST', '/api/auth/register', {
      name: `Bio Client ${ts}`,
      email: `bio_client_${ts}@example.com`,
      phone: `9501${ts}`,
      branchId: kvpBranch,
      password: 'Password@123',
      confirmPassword: 'Password@123',
    });
    assert.strictEqual(clientReg.status, 201);
    createdUserIds.push(clientReg.data.user.id);
    const cProf = await ClientProfile.findOne({ userId: clientReg.data.user.id });
    createdProfileIds.push(cProf._id);

    const clientDenied = await request('GET', '/api/biometric/devices', null, {
      Authorization: `Bearer ${clientReg.data.token}`,
    });
    assert.strictEqual(clientDenied.status, 403);
    console.log('   PASS: Auth & RBAC enforced.\n');

    // 2. Register eSSL X2008 + duplicate prevention + initial OFFLINE check
    console.log('2. Testing device registration, duplicate prevention, and honest initial OFFLINE status...');
    const sn1 = `TESTSN${ts}A`;
    const sn2 = `TESTSN${ts}B`;
    const dev1 = await request(
      'POST',
      '/api/biometric/devices',
      {
        branchId: kvpBranch,
        deviceName: 'Kovilpatti X2008 Test',
        manufacturer: 'eSSL',
        model: 'X2008',
        serialNumber: sn1,
        deviceId: 91,
        macAddress: '00:17:51:10:4b:13',
        localIp: '127.0.0.1',
        tcpPort: 59999,
        communicationProtocol: 'ADMS',
        admsServerPort: 8081,
      },
      adminHeaders
    );
    assert.strictEqual(dev1.status, 201, `Device create failed: ${JSON.stringify(dev1.data)}`);
    const dev1Id = dev1.data.device._id;
    createdDeviceIds.push(dev1Id);

    const dupSN = await request(
      'POST',
      '/api/biometric/devices',
      { branchId: otherBranch, deviceName: 'Dup', serialNumber: sn1, deviceId: 92 },
      adminHeaders
    );
    assert.strictEqual(dupSN.status, 409, 'Duplicate serialNumber must fail with 409');

    const overviewBefore = await request('GET', `/api/biometric/devices?branchId=${kvpBranch}`, null, adminHeaders);
    const d1Before = overviewBefore.data.devices.find((d) => d._id === dev1Id);
    assert.strictEqual(d1Before.effectiveStatus, 'OFFLINE', 'Unseen device must be OFFLINE, never ONLINE');

    // Test connection on unreachable port fails honestly
    const testConn = await request('POST', `/api/biometric/devices/${dev1Id}/test-connection`, {}, adminHeaders);
    assert.strictEqual(testConn.status, 200);
    assert.strictEqual(testConn.data.reachable, false);
    console.log('   PASS: Registration, duplicate prevention & offline check verified.\n');

    // 3. ADMS Handshake & Heartbeat -> ONLINE, then stale lastSeenAt -> OFFLINE
    console.log('3. Testing ADMS handshake, heartbeat (ONLINE), and timeout (OFFLINE)...');
    const handshake = await request('GET', `/iclock/cdata?SN=${sn1}&options=all&pushver=2.4.1`, null, {}, true);
    assert.strictEqual(handshake.status, 200);
    assert(handshake.text.includes(`GET OPTION FROM: ${sn1}`));

    const hb = await request('GET', `/iclock/getrequest?SN=${sn1}`, null, {}, true);
    assert.strictEqual(hb.status, 200);
    assert.strictEqual(hb.text.trim(), 'OK');

    const overviewOnline = await request('GET', `/api/biometric/devices?branchId=${kvpBranch}`, null, adminHeaders);
    const d1Online = overviewOnline.data.devices.find((d) => d._id === dev1Id);
    assert.strictEqual(d1Online.effectiveStatus, 'ONLINE', 'Recent ADMS heartbeat must mark device ONLINE');

    // Simulate stale lastSeenAt -> must report OFFLINE
    await BiometricDevice.updateOne({ _id: dev1Id }, { lastSeenAt: new Date(Date.now() - 10 * 60 * 1000) });
    const overviewStale = await request('GET', `/api/biometric/devices?branchId=${kvpBranch}`, null, adminHeaders);
    assert.strictEqual(overviewStale.data.devices.find((d) => d._id === dev1Id).effectiveStatus, 'OFFLINE');

    // Restore heartbeat
    await request('GET', `/iclock/getrequest?SN=${sn1}`, null, {}, true);
    console.log('   PASS: Heartbeat & offline threshold verified.\n');

    // 4. Create Active, Expired, and Suspended members + Map biometric IDs
    console.log('4. Testing user mappings & membership validation (ACTIVE, EXPIRED, SUSPENDED, UNMAPPED)...');
    const expProf = await ClientProfile.create({ name: `Bio Expired ${ts}`, phone: `9502${ts}`, branchId: kvpBranch });
    createdProfileIds.push(expProf._id);

    const suspUser = await User.create({
      name: `Bio Suspended ${ts}`,
      email: `bio_susp_${ts}@example.com`,
      phone: `9503${ts}`,
      password: 'Password@123',
      role: 'CLIENT',
      status: 'SUSPENDED',
      branchId: kvpBranch,
    });
    createdUserIds.push(suspUser._id);
    const suspProf = await ClientProfile.create({ userId: suspUser._id, name: suspUser.name, phone: suspUser.phone, branchId: kvpBranch });
    createdProfileIds.push(suspProf._id);

    const now = new Date();
    const activeMem = await Membership.create({
      userId: clientReg.data.user.id,
      clientProfileId: cProf._id,
      branchId: kvpBranch,
      planName: 'Pro Test',
      status: 'ACTIVE',
      startDate: new Date(now.getTime() - 86400000),
      expiryDate: new Date(now.getTime() + 30 * 86400000),
      amount: 1000,
    });
    const expMem = await Membership.create({
      clientProfileId: expProf._id,
      branchId: kvpBranch,
      planName: 'Old Test',
      status: 'EXPIRED',
      startDate: new Date(now.getTime() - 60 * 86400000),
      expiryDate: new Date(now.getTime() - 5 * 86400000),
      amount: 1000,
    });
    createdMembershipIds.push(activeMem._id, expMem._id);

    const m1 = await request('POST', '/api/biometric/mappings', { deviceId: dev1Id, biometricUserId: '101', clientProfileId: cProf._id }, adminHeaders);
    const m2 = await request('POST', '/api/biometric/mappings', { deviceId: dev1Id, biometricUserId: '102', clientProfileId: expProf._id }, adminHeaders);
    const m3 = await request('POST', '/api/biometric/mappings', { deviceId: dev1Id, biometricUserId: '103', clientProfileId: suspProf._id }, adminHeaders);
    assert.strictEqual(m1.status, 201);
    assert.strictEqual(m2.status, 201);
    assert.strictEqual(m3.status, 201);
    createdMappingIds.push(m1.data.mapping._id, m2.data.mapping._id, m3.data.mapping._id);

    const todayStr = new Date().toISOString().slice(0, 10);
    const attPayload = [
      `101\t${todayStr} 06:42:10\t0\t15\t0\t0`, // Active FACE
      `102\t${todayStr} 06:45:00\t0\t1\t0\t0`,  // Expired FINGERPRINT
      `103\t${todayStr} 06:47:00\t0\t15\t0\t0`, // Suspended FACE
      `999\t${todayStr} 06:50:00\t0\t15\t0\t0`, // Unmapped user
    ].join('\n');

    const push1 = await request('POST', `/iclock/cdata?SN=${sn1}&table=ATTLOG`, attPayload, {}, true);
    assert.strictEqual(push1.status, 200);
    assert.strictEqual(push1.text.trim(), 'OK: 4');

    // Duplicate push must be deduplicated
    const push2 = await request('POST', `/iclock/cdata?SN=${sn1}&table=ATTLOG`, attPayload, {}, true);
    assert.strictEqual(push2.status, 200);

    const bioAtt = await Attendance.find({ deviceId: dev1Id }).lean();
    assert.strictEqual(bioAtt.length, 4, 'Deduplication must prevent creating more than 4 records');
    bioAtt.forEach((a) => createdAttendanceIds.push(a._id));

    const r101 = bioAtt.find((a) => a.biometricUserId === '101');
    const r102 = bioAtt.find((a) => a.biometricUserId === '102');
    const r103 = bioAtt.find((a) => a.biometricUserId === '103');
    const r999 = bioAtt.find((a) => a.biometricUserId === '999');

    assert.strictEqual(r101.attendanceStatus, 'SUCCESS');
    assert.strictEqual(r101.verificationMethod, 'FACE');
    assert.strictEqual(r102.attendanceStatus, 'FLAGGED_EXPIRED');
    assert.strictEqual(r102.verificationMethod, 'FINGERPRINT');
    assert.strictEqual(r103.attendanceStatus, 'FLAGGED_SUSPENDED');
    assert.strictEqual(r999.attendanceStatus, 'UNMAPPED_USER');
    console.log('   PASS: Attendance event processing, deduplication & membership validation verified.\n');

    // 5. Multi-branch + Disabled device check
    console.log('5. Testing multi-branch support & disabled device rejection...');
    const dev2 = await request(
      'POST',
      '/api/biometric/devices',
      {
        branchId: otherBranch,
        deviceName: 'Other Branch X2008',
        serialNumber: sn2,
        deviceId: 1,
      },
      adminHeaders
    );
    assert.strictEqual(dev2.status, 201);
    createdDeviceIds.push(dev2.data.device._id);

    const disableRes = await request('PATCH', `/api/biometric/devices/${dev1Id}/toggle`, { isActive: false }, adminHeaders);
    assert.strictEqual(disableRes.status, 200);

    const disabledPush = await request('POST', `/iclock/cdata?SN=${sn1}&table=ATTLOG`, `101\t${todayStr} 07:00:00\t0\t15\t0\t0`, {}, true);
    assert.strictEqual(disabledPush.status, 403, 'Disabled device must be rejected');
    console.log('   PASS: Multi-branch & disabled device handling verified.\n');

    console.log('==================================================================');
    console.log('ALL BIOMETRIC ADMS & DEVICE MANAGEMENT E2E TESTS PASSED!');
    console.log('==================================================================');
  } finally {
    if (createdAttendanceIds.length) await Attendance.deleteMany({ _id: { $in: createdAttendanceIds } });
    if (createdMappingIds.length) await BiometricUserMapping.deleteMany({ _id: { $in: createdMappingIds } });
    if (createdDeviceIds.length) {
      await BiometricDeviceLog.deleteMany({ deviceId: { $in: createdDeviceIds } });
      await BiometricDevice.deleteMany({ _id: { $in: createdDeviceIds } });
    }
    if (createdMembershipIds.length) await Membership.deleteMany({ _id: { $in: createdMembershipIds } });
    if (createdProfileIds.length) await ClientProfile.deleteMany({ _id: { $in: createdProfileIds } });
    if (createdUserIds.length) await User.deleteMany({ _id: { $in: createdUserIds } });
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('BIOMETRIC E2E FAILED:', err);
  process.exit(1);
});
