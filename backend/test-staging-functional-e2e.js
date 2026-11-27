/**
 * Isolated Staging Functional E2E Suite (Real Express 5 App + Real MongoMemoryReplSet)
 * - Uses disposable in-memory MongoDB replica set (zero production Atlas access).
 * - Does NOT connect to the physical eSSL X2008.
 * - Keeps ADMS_COMMAND_DISPATCH_ENABLED unset (disabled).
 */
const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

// Configure isolated staging env BEFORE requiring app
process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = 'staging-e2e-jwt-secret-key-not-for-prod';
process.env.ADMS_SHARED_SECRET = 'staging-e2e-adms-secret-key';
delete process.env.ADMS_COMMAND_DISPATCH_ENABLED;

const app = require('./src/server');
const Branch = require('./src/models/Branch');
const User = require('./src/models/User');
const ClientProfile = require('./src/models/ClientProfile');
const Membership = require('./src/models/Membership');
const BiometricDevice = require('./src/models/BiometricDevice');
const BiometricUserMapping = require('./src/models/BiometricUserMapping');
const BiometricEnrollment = require('./src/models/BiometricEnrollment');
const Attendance = require('./src/models/Attendance');

let replSet;
let server;
let port;

function httpReq(method, reqPath, body = null, headers = {}, isText = false) {
  return new Promise((resolve, reject) => {
    const payload = body === null ? null : isText ? String(body) : JSON.stringify(body);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: reqPath,
        method,
        headers: {
          ...(payload ? { 'Content-Type': isText ? 'text/plain' : 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          if (isText) return resolve({ status: res.statusCode, text: raw });
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, text: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function setup() {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri('man_and_machine_staging'));
  await Promise.all([
    Branch.createIndexes(),
    User.createIndexes(),
    ClientProfile.createIndexes(),
    BiometricDevice.createIndexes(),
    BiometricUserMapping.createIndexes(),
    BiometricEnrollment.createIndexes(),
    Attendance.createIndexes(),
  ]);
  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  port = server.address().port;
}

async function teardown() {
  if (server) await new Promise((r) => server.close(r));
  await mongoose.disconnect();
  if (replSet) await replSet.stop();
}

async function run() {
  console.log('==========================================================');
  console.log('ISOLATED STAGING FUNCTIONAL E2E TESTS (REAL APP + REPLSET)');
  console.log('==========================================================');
  await setup();

  try {
    // 1. Health check
    const health = await httpReq('GET', '/api/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.data.success, true);
    console.log('1. Health & DB connectivity: PASS');

    // Seed branches & users
    const branchA = await Branch.create({ name: 'Kovilpatti', city: 'Kovilpatti', code: 'KVP' });
    const branchB = await Branch.create({ name: 'Madurai', city: 'Madurai', code: 'MDU' });

    await User.create({
      name: 'Super Admin',
      email: 'superadmin@staging.local',
      phone: '9000000001',
      password: 'Password@123',
      role: 'ADMIN',
      branchId: null,
      status: 'ACTIVE',
    });
    await User.create({
      name: 'Branch A Admin',
      email: 'admina@staging.local',
      phone: '9000000002',
      password: 'Password@123',
      role: 'ADMIN',
      branchId: branchA._id,
      status: 'ACTIVE',
    });
    const clientUser = await User.create({
      name: 'Client One',
      email: 'client1@staging.local',
      phone: '9876543210',
      password: 'Password@123',
      role: 'CLIENT',
      branchId: branchA._id,
      status: 'ACTIVE',
    });
    const clientProfile = await ClientProfile.create({
      userId: clientUser._id,
      branchId: branchA._id,
      name: 'Client One',
      email: 'client1@staging.local',
      phone: '9876543210',
    });
    await Membership.create({
      userId: clientUser._id,
      clientProfileId: clientProfile._id,
      branchId: branchA._id,
      planName: 'Monthly Pro',
      status: 'ACTIVE',
      startDate: new Date(Date.now() - 86400000),
      expiryDate: new Date(Date.now() + 30 * 86400000),
    });

    // Login all 3
    const superLogin = await httpReq('POST', '/api/auth/login', { email: 'superadmin@staging.local', password: 'Password@123' });
    const branchALogin = await httpReq('POST', '/api/auth/login', { email: 'admina@staging.local', password: 'Password@123' });
    const clientLogin = await httpReq('POST', '/api/auth/login', { email: 'client1@staging.local', password: 'Password@123' });
    assert.strictEqual(superLogin.status, 200);
    assert.strictEqual(branchALogin.status, 200);
    assert.strictEqual(clientLogin.status, 200);

    const superHdr = { Authorization: `Bearer ${superLogin.data.token}` };
    const branchAHdr = { Authorization: `Bearer ${branchALogin.data.token}` };
    const clientHdr = { Authorization: `Bearer ${clientLogin.data.token}` };

    // Register Device A (Kovilpatti) and Device B (Madurai)
    const devARes = await httpReq('POST', '/api/biometric/devices', {
      branchId: branchA._id,
      deviceName: 'KVP Staging',
      serialNumber: 'STG_KVP_001',
      deviceId: 1,
    }, superHdr);
    const devBRes = await httpReq('POST', '/api/biometric/devices', {
      branchId: branchB._id,
      deviceName: 'MDU Staging',
      serialNumber: 'STG_MDU_001',
      deviceId: 1,
    }, superHdr);
    assert.strictEqual(devARes.status, 201);
    assert.strictEqual(devBRes.status, 201);
    const devAId = devARes.data.device._id;
    const devBId = devBRes.data.device._id;

    // 2. Branch-admin vs Super-admin authorization & client creation
    const crossClient = await httpReq('POST', '/api/admin/clients', { name: 'Cross Client', branchId: branchB._id }, branchAHdr);
    assert.strictEqual(crossClient.status, 403, 'Branch A admin cannot create client in Branch B');

    const ownClient = await httpReq('POST', '/api/admin/clients', { name: 'Walkin KVP', phone: '9876543211', branchId: branchA._id }, branchAHdr);
    assert.strictEqual(ownClient.status, 201);

    const crossDevUpdate = await httpReq('PUT', `/api/biometric/devices/${devBId}`, { deviceName: 'Hacked' }, branchAHdr);
    assert.strictEqual(crossDevUpdate.status, 403);

    const superClientB = await httpReq('POST', '/api/admin/clients', { name: 'Walkin MDU', phone: '9876543212', branchId: branchB._id }, superHdr);
    assert.strictEqual(superClientB.status, 201);
    console.log('2. Branch-admin & super-admin authorization + client creation: PASS');

    // 3. Offline device behavior
    const syncOffline = await httpReq('POST', `/api/biometric/devices/${devAId}/sync`, {}, branchAHdr);
    assert.strictEqual(syncOffline.status, 200);
    assert.strictEqual(syncOffline.data.synced, false);
    assert.strictEqual(syncOffline.data.effectiveStatus, 'OFFLINE');
    console.log('3. Offline device behavior: PASS');

    // 4. Enrollment & Consent Renewal (REVOKED -> fresh consent -> physical complete)
    const consent1 = await httpReq('POST', '/api/client/biometric/consent', { agreed: true }, clientHdr);
    assert.strictEqual(consent1.status, 201);
    const cap1 = await httpReq('POST', '/api/client/biometric/capture', { brightnessScore: 70, sharpnessScore: 30, livenessPassed: true, frameCount: 6 }, clientHdr);
    assert.strictEqual(cap1.status, 201);
    const enrId = cap1.data.enrollment._id;

    const app1 = await httpReq('POST', `/api/biometric/enrollments/${enrId}/approve`, { deviceId: devAId }, branchAHdr);
    assert.strictEqual(app1.status, 200);
    assert.strictEqual(app1.data.enrollment.status, 'AWAITING_PHYSICAL_ENROLLMENT');
    const assignedPin = app1.data.enrollment.biometricUserId;

    const comp1 = await httpReq('POST', `/api/biometric/enrollments/${enrId}/manual-complete`, {
      clientProfileId: clientProfile._id,
      deviceId: devAId,
      biometricUserId: assignedPin,
      captureType: 'FACE',
      verifiedByDevice: true,
    }, branchAHdr);
    assert.strictEqual(comp1.status, 200);
    assert.strictEqual(comp1.data.enrollment.status, 'ENROLLED');

    // Re-submit on ENROLLED -> 409
    const capDup = await httpReq('POST', '/api/client/biometric/capture', { brightnessScore: 70, sharpnessScore: 30, livenessPassed: true, frameCount: 6 }, clientHdr);
    assert.strictEqual(capDup.status, 409);

    // Withdraw -> REVOKED; approve on REVOKED -> 409; renew consent -> CAPTURE_IN_PROGRESS
    const withdraw = await httpReq('POST', '/api/client/biometric/consent/withdraw', {}, clientHdr);
    assert.strictEqual(withdraw.status, 200);
    const appRevoked = await httpReq('POST', `/api/biometric/enrollments/${enrId}/approve`, { deviceId: devAId }, branchAHdr);
    assert.strictEqual(appRevoked.status, 409);

    const consent2 = await httpReq('POST', '/api/client/biometric/consent', { agreed: true }, clientHdr);
    assert.strictEqual(consent2.status, 201);
    assert.strictEqual(consent2.data.enrollment.status, 'CAPTURE_IN_PROGRESS');
    console.log('4. Enrollment & consent renewal lifecycle: PASS');

    // 5. Mapping, unmapping & duplicate PIN rejection
    const walkinProfileId = ownClient.data.client.profileId;
    const map1 = await httpReq('POST', '/api/biometric/mappings', { deviceId: devAId, biometricUserId: '1055', clientProfileId: walkinProfileId }, branchAHdr);
    assert.strictEqual(map1.status, 201);

    const dupPin = await httpReq('POST', '/api/biometric/mappings', { deviceId: devAId, biometricUserId: '1055', clientProfileId: clientProfile._id }, branchAHdr);
    assert.strictEqual(dupPin.status, 409);

    const unmapRes = await httpReq('DELETE', `/api/biometric/mappings/${map1.data.mapping._id}`, null, branchAHdr);
    assert.strictEqual(unmapRes.status, 200);
    // Re-map for attendance test
    const map2 = await httpReq('POST', '/api/biometric/mappings', { deviceId: devAId, biometricUserId: '1055', clientProfileId: walkinProfileId }, branchAHdr);
    assert.strictEqual(map2.status, 201);
    console.log('5. Mapping, unmapping & duplicate PIN rejection: PASS');

    // 6. ADMS Attendance ingestion, deduplication & command dispatch disabled
    const admsHdr = { 'x-adms-secret': process.env.ADMS_SHARED_SECRET };
    const getReqRes = await httpReq('GET', '/iclock/getrequest?SN=STG_KVP_001', null, admsHdr, true);
    assert.strictEqual(getReqRes.status, 200);
    assert.strictEqual(getReqRes.text, 'OK');

    const attPayload = '1055\t2026-11-27 06:15:00\t0\t15\t0\t0\t0\n';
    const att1 = await httpReq('POST', '/iclock/cdata?SN=STG_KVP_001&table=ATTLOG', attPayload, admsHdr, true);
    assert.strictEqual(att1.status, 200);
    assert.strictEqual(att1.text, 'OK: 1');

    // Duplicate punch -> still OK: 1 (0 new + 1 duplicate), only 1 Attendance doc in DB
    const att2 = await httpReq('POST', '/iclock/cdata?SN=STG_KVP_001&table=ATTLOG', attPayload, admsHdr, true);
    assert.strictEqual(att2.status, 200);
    const attCount = await Attendance.countDocuments({ deviceId: devAId, biometricUserId: '1055' });
    assert.strictEqual(attCount, 1);

    // Client logs endpoint reflects BIOMETRIC_ADMS punch
    const logsRes = await httpReq('GET', `/api/biometric/clients/${walkinProfileId}/logs`, null, branchAHdr);
    assert.strictEqual(logsRes.status, 200);
    assert.strictEqual(logsRes.data.biometricAttendances.length, 1);
    console.log('6. ADMS attendance ingestion, deduplication & logs: PASS');

    // 7. Migration preview & dry-run
    const operPayload = 'USER PIN=1055\tName=Walkin KVP\tPri=0\nUSER PIN=1056\tName=Unmapped User\tPri=0\n';
    const operRes = await httpReq('POST', '/iclock/cdata?SN=STG_KVP_001&table=OPERLOG', operPayload, admsHdr, true);
    assert.strictEqual(operRes.status, 200);

    const migPrev = await httpReq('GET', `/api/biometric/migration/preview?deviceId=${devAId}`, null, branchAHdr);
    assert.strictEqual(migPrev.status, 200);
    assert.strictEqual(migPrev.data.summary.totalDiscovered, 2);
    assert.strictEqual(migPrev.data.summary.mappedCount, 1);
    assert.strictEqual(migPrev.data.summary.unmappedCount, 1);

    const dryBulk = await httpReq('POST', '/api/biometric/migration/bulk-map', {
      deviceId: devAId,
      dryRun: true,
      mappings: [{ biometricUserId: '1056', clientProfileId: clientProfile._id }],
    }, branchAHdr);
    assert.strictEqual(dryBulk.status, 200);
    assert.strictEqual(dryBulk.data.dryRun, true);
    assert.strictEqual(dryBulk.data.succeededCount, 1);
    const pin1056Map = await BiometricUserMapping.findOne({ deviceId: devAId, biometricUserId: '1056' });
    assert.strictEqual(pin1056Map, null, 'Dry run must perform zero DB writes');
    console.log('7. Migration preview & dry-run: PASS');

    console.log('==========================================================');
    console.log('ALL STAGING FUNCTIONAL E2E TESTS PASSED (7/7 GROUPS)');
    console.log('==========================================================');
  } finally {
    await teardown();
  }
}

run().catch((err) => {
  console.error('STAGING E2E FAILED:', err);
  process.exit(1);
});
