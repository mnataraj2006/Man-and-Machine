/**
 * Phase 1 Biometric Data Integrity & Integration Tests (Isolated In-Memory)
 * Does NOT connect to or mutate any MongoDB database or physical biometric device.
 */
const assert = require('assert');
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');

const BiometricDevice = require('./src/models/BiometricDevice');
const BiometricEnrollment = require('./src/models/BiometricEnrollment');
const BiometricConsent = require('./src/models/BiometricConsent');
const BiometricUserMapping = require('./src/models/BiometricUserMapping');
const BiometricDeviceLog = require('./src/models/BiometricDeviceLog');
const BiometricPinSequence = require('./src/models/BiometricPinSequence');
const Attendance = require('./src/models/Attendance');
const ClientProfile = require('./src/models/ClientProfile');
const Membership = require('./src/models/Membership');
const Notification = require('./src/models/Notification');

const biometricEnrollmentService = require('./src/services/biometricEnrollmentService');
const biometricDeviceService = require('./src/services/biometricDeviceService');
const adminController = require('./src/controllers/adminController');
const admsRoutes = require('./src/routes/admsRoutes');

// Helper to build a chainable Mongoose-like query stub
function makeQuery(result) {
  const q = {
    _result: result,
    select() { return q; },
    sort() { return q; },
    limit() { return q; },
    populate() { return q; },
    lean() { return Promise.resolve(q._result); },
    then(resolve, reject) { return Promise.resolve(q._result).then(resolve, reject); },
  };
  return q;
}

// Save originals for clean restore
const originals = new Map();
function stub(obj, method, fn) {
  if (!originals.has(obj)) originals.set(obj, new Map());
  if (!originals.get(obj).has(method)) originals.get(obj).set(method, obj[method]);
  obj[method] = fn;
}
function restoreAll() {
  for (const [obj, methods] of originals.entries()) {
    for (const [m, fn] of methods.entries()) {
      obj[m] = fn;
    }
  }
  originals.clear();
}

async function testSourceFilteringSummaryAndLogs() {
  console.log('1-3. Testing BIOMETRIC_ADMS source filtering, summary & logs...');
  const clientProfileId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const branchId = new mongoose.Types.ObjectId();
  const deviceId = new mongoose.Types.ObjectId();

  const capturedQueries = [];
  const samplePunchTime = new Date('2026-11-27T01:00:00.000Z'); // 06:30 IST

  stub(BiometricEnrollment, 'findOne', () =>
    makeQuery({
      _id: new mongoose.Types.ObjectId(),
      status: 'ENROLLED',
      biometricUserId: '1001',
      assignedDeviceId: { _id: deviceId, deviceName: 'X2008', serialNumber: 'TDDB250600919', status: 'ONLINE', isActive: true },
      branchId: { _id: branchId, name: 'Kovilpatti', city: 'Kovilpatti' },
      enrolledAt: new Date(),
    })
  );
  stub(BiometricUserMapping, 'findOne', () =>
    makeQuery({
      _id: new mongoose.Types.ObjectId(),
      biometricUserId: '1001',
      status: 'ACTIVE',
      deviceId: { _id: deviceId, deviceName: 'X2008', serialNumber: 'TDDB250600919', status: 'ONLINE', isActive: true },
      branchId: { _id: branchId, name: 'Kovilpatti', city: 'Kovilpatti' },
    })
  );
  stub(BiometricDevice, 'findOne', () => makeQuery(null));
  stub(Attendance, 'findOne', (q) => {
    capturedQueries.push(q);
    return makeQuery({
      _id: new mongoose.Types.ObjectId(),
      checkInTime: samplePunchTime,
      attendanceStatus: 'SUCCESS',
      biometricUserId: '1001',
    });
  });

  const summary = await biometricEnrollmentService.getClientBiometricSummary({
    clientProfileId,
    userId,
    branchId,
    hasActiveMembership: true,
  });

  assert.strictEqual(capturedQueries[0].source, 'BIOMETRIC_ADMS', 'Summary must query source: BIOMETRIC_ADMS');
  assert.strictEqual(summary.lastPunchResult, 'SUCCESS');
  assert.strictEqual(new Date(summary.lastPunchAt).toISOString(), samplePunchTime.toISOString());

  // Now test getClientBiometricLogs
  const logQueries = [];
  stub(ClientProfile, 'findById', () => makeQuery({ _id: clientProfileId, userId, branchId }));
  stub(BiometricEnrollment, 'find', () => makeQuery([{ status: 'ENROLLED', biometricUserId: '1001', history: [] }]));
  stub(BiometricUserMapping, 'find', () => makeQuery([{ biometricUserId: '1001', deviceId, status: 'ACTIVE' }]));
  stub(Attendance, 'find', (q) => {
    logQueries.push(q);
    return makeQuery([
      {
        _id: new mongoose.Types.ObjectId(),
        checkInTime: samplePunchTime,
        attendanceStatus: 'SUCCESS',
        biometricUserId: '1001',
      },
    ]);
  });
  stub(BiometricDeviceLog, 'find', () => makeQuery([]));

  const logs = await biometricEnrollmentService.getClientBiometricLogs(String(clientProfileId));
  assert.strictEqual(logQueries[0].source, 'BIOMETRIC_ADMS', 'Logs must query source: BIOMETRIC_ADMS');
  assert.strictEqual(logs.biometricAttendances.length, 1);
  assert.strictEqual(logs.biometricAttendances[0].biometricUserId, '1001');
  restoreAll();
  console.log('   PASS');
}

async function testIstDateBoundaries() {
  console.log('4. Testing IST date boundaries in getAttendanceOverview...');
  const captured = [];
  stub(Attendance, 'find', (q) => {
    captured.push(q);
    return makeQuery([
      {
        toObject: () => ({
          _id: 'att1',
          userId: null,
          clientProfileId: { name: 'Test Member' },
          date: new Date('2026-11-26T18:30:00.000Z'), // 2026-11-27 00:00:00+05:30
          checkInTime: new Date('2026-11-26T18:45:00.000Z'), // 2026-11-27 00:15:00+05:30
        }),
      },
    ]);
  });
  stub(Attendance, 'countDocuments', (q) => {
    captured.push(q);
    return Promise.resolve(1);
  });

  const req = { query: { date: '2026-11-27' } };
  let statusCode = null;
  let jsonBody = null;
  const res = {
    status(c) { statusCode = c; return res; },
    json(b) { jsonBody = b; return res; },
  };
  await adminController.getAttendanceOverview(req, res, (err) => { throw err; });

  assert.strictEqual(statusCode, 200);
  assert.strictEqual(jsonBody.selectedDate, '2026-11-27');
  assert.strictEqual(captured[0].date.$gte.toISOString(), '2026-11-26T18:30:00.000Z');
  assert.strictEqual(captured[0].date.$lte.toISOString(), '2026-11-27T18:29:59.999Z');
  assert.strictEqual(jsonBody.records.length, 1);
  restoreAll();
  console.log('   PASS');
}

async function testResubmitCompletedEnrollment() {
  console.log('5. Testing re-submission protection on ENROLLED record...');
  const userId = new mongoose.Types.ObjectId();
  const profileId = new mongoose.Types.ObjectId();
  const branchId = new mongoose.Types.ObjectId();

  stub(ClientProfile, 'findOne', () => makeQuery({ _id: profileId, userId, branchId }));
  stub(Membership, 'findOne', () => makeQuery({ _id: new mongoose.Types.ObjectId(), status: 'ACTIVE' }));
  stub(BiometricConsent, 'findOne', () => makeQuery({ _id: new mongoose.Types.ObjectId(), status: 'GRANTED' }));
  stub(BiometricDevice, 'findOne', () => makeQuery({ _id: new mongoose.Types.ObjectId(), branchId, isActive: true }));
  stub(BiometricEnrollment, 'findOne', () =>
    makeQuery({
      _id: new mongoose.Types.ObjectId(),
      clientProfileId: profileId,
      branchId,
      status: 'ENROLLED',
      biometricUserId: '1005',
    })
  );

  let caught = null;
  try {
    await biometricEnrollmentService.submitMobileCapture(userId, {
      brightnessScore: 70,
      sharpnessScore: 25,
      livenessPassed: true,
      frameCount: 6,
    });
  } catch (err) {
    caught = err;
  }

  assert(caught, 'Must reject capture submission when already ENROLLED');
  assert.strictEqual(caught.statusCode, 409);
  restoreAll();
  console.log('   PASS');
}

async function testDuplicatePinAssignment() {
  console.log('6. Testing duplicate biometric PIN assignment protection...');
  const deviceId = new mongoose.Types.ObjectId();
  const branchId = new mongoose.Types.ObjectId();
  const profileA = new mongoose.Types.ObjectId();
  const profileB = new mongoose.Types.ObjectId();

  stub(BiometricDevice, 'findById', () => makeQuery({ _id: deviceId, branchId, deviceName: 'X2008' }));
  stub(ClientProfile, 'findById', () => makeQuery({ _id: profileB, name: 'Member B' }));
  stub(BiometricUserMapping, 'findOne', (q) => {
    if (q.biometricUserId === '101') {
      return makeQuery({ _id: new mongoose.Types.ObjectId(), deviceId, biometricUserId: '101', clientProfileId: profileA });
    }
    return makeQuery(null);
  });

  let caught = null;
  try {
    await biometricDeviceService.mapBiometricUser({
      deviceId,
      biometricUserId: '101',
      clientProfileId: profileB,
    });
  } catch (err) {
    caught = err;
  }
  assert(caught, 'Must reject assigning PIN already mapped to another client');
  assert.strictEqual(caught.statusCode, 409);

  // Also test 1 client -> 2 active PINs on same device
  stub(BiometricUserMapping, 'findOne', (q) => {
    if (q.clientProfileId && q.status === 'ACTIVE') {
      return makeQuery({ _id: new mongoose.Types.ObjectId(), deviceId, biometricUserId: '101', clientProfileId: profileB, status: 'ACTIVE' });
    }
    return makeQuery(null);
  });
  stub(BiometricEnrollment, 'findOne', () => makeQuery(null));

  let caught2 = null;
  try {
    await biometricDeviceService.mapBiometricUser({
      deviceId,
      biometricUserId: '102',
      clientProfileId: profileB,
    });
  } catch (err) {
    caught2 = err;
  }
  assert(caught2, 'Must reject assigning a second active PIN to the same client on the same device');
  assert.strictEqual(caught2.statusCode, 409);

  restoreAll();
  console.log('   PASS');
}

async function testConcurrentEnrollmentApproval() {
  console.log('7. Testing concurrent enrollment approval PIN collision prevention...');
  const deviceId = new mongoose.Types.ObjectId();
  const branchId = new mongoose.Types.ObjectId();
  const enr1Id = new mongoose.Types.ObjectId();
  const enr2Id = new mongoose.Types.ObjectId();
  const prof1Id = new mongoose.Types.ObjectId();
  const prof2Id = new mongoose.Types.ObjectId();

  const store = {
    [String(enr1Id)]: { _id: enr1Id, clientProfileId: prof1Id, branchId, assignedDeviceId: deviceId, biometricUserId: '', status: 'CAPTURE_SUBMITTED', userId: null },
    [String(enr2Id)]: { _id: enr2Id, clientProfileId: prof2Id, branchId, assignedDeviceId: deviceId, biometricUserId: '', status: 'CAPTURE_SUBMITTED', userId: null },
  };

  let seq = 1000;
  stub(BiometricPinSequence, 'allocateNextPin', async () => {
    seq += 1;
    return String(seq);
  });
  stub(BiometricEnrollment, 'findById', (id) => makeQuery(store[String(id)] ? { ...store[String(id)] } : null));
  stub(BiometricUserMapping, 'find', () => makeQuery([{ biometricUserId: '1000' }]));
  stub(BiometricUserMapping, 'findOne', () => makeQuery(null));
  stub(BiometricEnrollment, 'find', () => makeQuery([]));
  stub(BiometricEnrollment, 'findOne', (q) => {
    // Conflict / race detection
    const match = Object.values(store).find((e) => {
      if (q._id?.$ne && String(e._id) === String(q._id.$ne)) return false;
      if (q.biometricUserId && typeof q.biometricUserId === 'string' && e.biometricUserId !== q.biometricUserId) return false;
      if (q.clientProfileId && String(e.clientProfileId) !== String(q.clientProfileId)) return false;
      if (q.status?.$in && !q.status.$in.includes(e.status)) return false;
      if (q.status?.$nin && q.status.$nin.includes(e.status)) return false;
      return Boolean(e.biometricUserId);
    });
    return makeQuery(match ? { ...match } : null);
  });
  stub(BiometricEnrollment, 'findOneAndUpdate', (filter, update) => {
    const rec = store[String(filter._id)];
    if (!rec) return makeQuery(null);
    Object.assign(rec, update.$set);
    return Promise.resolve({ ...rec });
  });
  stub(BiometricEnrollment, 'updateOne', (filter, update) => {
    const rec = store[String(filter._id)];
    if (rec && update.$set) Object.assign(rec, update.$set);
    return Promise.resolve({ modifiedCount: 1 });
  });
  stub(Notification, 'create', () => Promise.resolve({}));

  const [res1, res2] = await Promise.all([
    biometricEnrollmentService.approveEnrollment(enr1Id, null, {}),
    biometricEnrollmentService.approveEnrollment(enr2Id, null, {}),
  ]);

  assert(res1.biometricUserId, 'Enrollment 1 must have a biometricUserId');
  assert(res2.biometricUserId, 'Enrollment 2 must have a biometricUserId');
  assert.notStrictEqual(res1.biometricUserId, res2.biometricUserId, 'Concurrent approvals must not assign the same PIN');
  restoreAll();
  console.log('   PASS');
}

async function testAdminPhysicalEnrollmentRequest() {
  console.log('8. Testing admin physical enrollment request workflow...');
  const deviceId = new mongoose.Types.ObjectId();
  const branchId = new mongoose.Types.ObjectId();
  const profileId = new mongoose.Types.ObjectId();
  const enrId = new mongoose.Types.ObjectId();
  let savedEnrollment = null;

  stub(ClientProfile, 'findById', () => makeQuery({ _id: profileId, branchId, name: 'Walk-In Member', clientId: 'MM0099' }));
  stub(BiometricDevice, 'findById', () => makeQuery({ _id: deviceId, branchId, deviceName: 'X2008', isActive: true, status: 'ONLINE' }));
  let seq8 = 1050;
  stub(BiometricPinSequence, 'allocateNextPin', async () => {
    seq8 += 1;
    return String(seq8);
  });
  stub(BiometricUserMapping, 'find', () => makeQuery([{ biometricUserId: '1050' }]));
  stub(BiometricUserMapping, 'findOne', () => makeQuery(null));
  stub(BiometricEnrollment, 'find', () => makeQuery([]));
  stub(BiometricEnrollment, 'findOne', () => makeQuery(null));
  stub(BiometricEnrollment.prototype, 'save', async function () {
    if (!this._id) this._id = enrId;
    savedEnrollment = this;
    return this;
  });
  stub(BiometricDeviceLog, 'create', () => Promise.resolve({}));

  const res = await biometricEnrollmentService.initiatePhysicalEnrollment(
    { clientProfileId: profileId, deviceId },
    { _id: new mongoose.Types.ObjectId() }
  );

  assert.strictEqual(res.status, 'AWAITING_PHYSICAL_ENROLLMENT');
  assert.strictEqual(res.deviceEnrollmentStatus, 'AWAITING_PHYSICAL');
  assert.strictEqual(res.biometricUserId, '1051');
  assert(savedEnrollment);
  restoreAll();
  console.log('   PASS');
}

function httpGet(port, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path, method: 'GET', headers }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function testAdmsAuthentication() {
  console.log('9. Testing ADMS authentication (missing, invalid, valid secrets)...');
  const app = express();
  app.use('/iclock', admsRoutes);

  stub(biometricDeviceService, 'handleAdmsHeartbeat', () =>
    Promise.resolve({ serialNumber: 'TDDB250600919', isActive: true, status: 'ONLINE' })
  );
  stub(biometricDeviceService, 'dispatchPendingCommandsForDevice', () =>
    Promise.resolve({ device: { serialNumber: 'TDDB250600919' }, commandLines: [] })
  );

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;

  const prevNodeEnv = process.env.NODE_ENV;
  const prevSecret = process.env.ADMS_SHARED_SECRET;

  try {
    // 1. Production with missing ADMS_SHARED_SECRET -> 503
    process.env.NODE_ENV = 'production';
    delete process.env.ADMS_SHARED_SECRET;
    const missingRes = await httpGet(port, '/iclock/getrequest?SN=TDDB250600919');
    assert.strictEqual(missingRes.status, 503);

    // 2. Production with invalid secret -> 401
    process.env.ADMS_SHARED_SECRET = 'super-strong-test-secret';
    const invalidRes = await httpGet(port, '/iclock/getrequest?SN=TDDB250600919', {
      'x-adms-secret': 'wrong-secret',
    });
    assert.strictEqual(invalidRes.status, 401);
    assert(!invalidRes.body.includes('super-strong-test-secret'), 'Secret must never appear in response');

    // 3. Production with valid secret -> 200
    const validRes = await httpGet(port, '/iclock/getrequest?SN=TDDB250600919', {
      'x-adms-secret': 'super-strong-test-secret',
    });
    assert.strictEqual(validRes.status, 200);
    assert.strictEqual(validRes.body, 'OK');

    // 4. Development without secret -> 200
    process.env.NODE_ENV = 'development';
    delete process.env.ADMS_SHARED_SECRET;
    const devRes = await httpGet(port, '/iclock/getrequest?SN=TDDB250600919');
    assert.strictEqual(devRes.status, 200);
  } finally {
    process.env.NODE_ENV = prevNodeEnv;
    if (prevSecret === undefined) delete process.env.ADMS_SHARED_SECRET;
    else process.env.ADMS_SHARED_SECRET = prevSecret;
    server.close();
    restoreAll();
  }
  console.log('   PASS');
}

async function run() {
  console.log('==========================================================');
  console.log('PHASE 1 BIOMETRIC INTEGRITY & INTEGRATION TESTS');
  console.log('==========================================================');
  await testSourceFilteringSummaryAndLogs();
  await testIstDateBoundaries();
  await testResubmitCompletedEnrollment();
  await testDuplicatePinAssignment();
  await testConcurrentEnrollmentApproval();
  await testAdminPhysicalEnrollmentRequest();
  await testAdmsAuthentication();
  console.log('==========================================================');
  console.log('ALL PHASE 1 TESTS PASSED (7/7 SUITES)');
  console.log('==========================================================');
}

run().catch((err) => {
  restoreAll();
  console.error('TEST FAILED:', err);
  process.exit(1);
});
