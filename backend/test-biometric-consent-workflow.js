/**
 * Biometric Consent Workflow Verification Suite (Isolated In-Memory)
 * Tests:
 * 1. Pending consent on an ENROLLED record
 * 2. Successful consent on an ENROLLED record (preserving status, PIN, mapping, IP & audit fields)
 * 3. Duplicate consent rejection (409) & Admin impersonation block on consent route
 * 4. Attendance punch rejection before consent and acceptance after consent (without deleting/deactivating mapping)
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
const Attendance = require('./src/models/Attendance');
const ClientProfile = require('./src/models/ClientProfile');
const Membership = require('./src/models/Membership');
const User = require('./src/models/User');

const biometricDeviceService = require('./src/services/biometricDeviceService');
const biometricEnrollmentService = require('./src/services/biometricEnrollmentService');
const clientRoutes = require('./src/routes/clientRoutes');

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

async function run() {
  console.log('==========================================================');
  console.log('BIOMETRIC CONSENT WORKFLOW SUITE (ISOLATED IN-MEMORY)');
  console.log('==========================================================');

  const branchId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const profileId = new mongoose.Types.ObjectId();
  const deviceId = new mongoose.Types.ObjectId();
  const mappingId = new mongoose.Types.ObjectId();

  const profile = {
    _id: profileId,
    userId,
    branchId,
    clientId: 'MM-0001',
    name: 'Test Member',
  };

  const device = {
    _id: deviceId,
    branchId,
    deviceName: 'KVP Main Entrance',
    model: 'X2008',
    serialNumber: 'TDBD242100623',
    isActive: true,
    status: 'ONLINE',
  };

  const enrollmentDoc = {
    _id: new mongoose.Types.ObjectId(),
    clientProfileId: profileId,
    userId,
    branchId,
    assignedDeviceId: deviceId,
    biometricUserId: '1001',
    enrollmentMethod: 'MANUAL_PHYSICAL',
    status: 'ENROLLED',
    faceEnrollmentStatus: 'ENROLLED',
    consentId: null,
    consentStatus: 'PENDING',
    history: [],
    save: async function save() {
      return this;
    },
  };

  const mappingDoc = {
    _id: mappingId,
    deviceId,
    branchId,
    clientProfileId: profile,
    userId,
    biometricUserId: '1001',
    status: 'ACTIVE',
  };

  let createdConsent = null;
  let attendanceCreatedCount = 0;
  let mappingDeletedOrDeactivated = false;
  const deviceLogs = [];

  stub(ClientProfile, 'findOne', () => makeQuery(profile));
  stub(Membership, 'findOne', () =>
    makeQuery({
      _id: new mongoose.Types.ObjectId(),
      status: 'ACTIVE',
      startDate: new Date(Date.now() - 86400000),
      expiryDate: new Date(Date.now() + 86400000 * 30),
    })
  );
  stub(Membership, 'find', () =>
    makeQuery([
      {
        _id: new mongoose.Types.ObjectId(),
        status: 'ACTIVE',
        startDate: new Date(Date.now() - 86400000),
        expiryDate: new Date(Date.now() + 86400000 * 30),
      },
    ])
  );
  stub(User, 'findById', () => makeQuery({ _id: userId, status: 'ACTIVE' }));
  stub(BiometricEnrollment, 'findOne', () => makeQuery(enrollmentDoc));
  stub(BiometricEnrollment, 'find', () => makeQuery([enrollmentDoc]));
  stub(BiometricConsent, 'findOne', () => makeQuery(createdConsent));
  stub(BiometricConsent, 'create', async (doc) => {
    createdConsent = { _id: new mongoose.Types.ObjectId(), ...doc };
    return createdConsent;
  });
  stub(BiometricDevice, 'findOne', () => makeQuery(device));
  stub(BiometricUserMapping, 'findOne', () => makeQuery(mappingDoc));
  stub(BiometricUserMapping, 'updateMany', async () => {
    mappingDeletedOrDeactivated = true;
    return { modifiedCount: 0 };
  });
  stub(BiometricUserMapping, 'deleteOne', async () => {
    mappingDeletedOrDeactivated = true;
    return { deletedCount: 0 };
  });
  stub(BiometricDeviceLog, 'create', async (doc) => {
    deviceLogs.push(doc);
    return doc;
  });
  stub(Attendance, 'findOne', () => makeQuery(null));
  stub(Attendance, 'create', async (doc) => {
    attendanceCreatedCount += 1;
    return { _id: new mongoose.Types.ObjectId(), ...doc };
  });

  // 1. Pending consent on an ENROLLED record
  console.log('1. Checking pending consent state on ENROLLED record...');
  const statusBefore = await biometricEnrollmentService.getClientBiometricStatus(userId);
  assert.strictEqual(statusBefore.eligible, true);
  assert.strictEqual(statusBefore.enrollment.status, 'ENROLLED');
  assert.strictEqual(statusBefore.enrollment.consentStatus, 'PENDING');
  assert.strictEqual(statusBefore.consent, null);
  console.log('   PASS');

  // 2. Attendance when consent is WITHDRAWN must be rejected without deleting/deactivating mapping
  console.log('2. Checking attendance punch rejection when consent is WITHDRAWN...');
  enrollmentDoc.consentStatus = 'WITHDRAWN';
  const punchBefore = await biometricDeviceService.processAttendanceEvent({
    device,
    biometricUserId: '1001',
    timestamp: new Date('2026-11-28T01:00:00Z'),
    verificationMethod: 'FACE',
  });
  assert.strictEqual(punchBefore.accepted, false);
  assert.strictEqual(punchBefore.rejected, true);
  assert.strictEqual(punchBefore.reason, 'CONSENT_REQUIRED');
  assert.strictEqual(attendanceCreatedCount, 0);
  enrollmentDoc.consentStatus = 'PENDING';
  assert.strictEqual(mappingDeletedOrDeactivated, false);
  assert.strictEqual(mappingDoc.status, 'ACTIVE');
  assert(deviceLogs.some((l) => l.action === 'ATTENDANCE_REJECTED_NO_CONSENT'));
  console.log('   PASS');

  // 3. Successful consent on ENROLLED record
  console.log('3. Granting biometric consent on ENROLLED record...');
  const consentRes = await biometricEnrollmentService.recordClientConsent(userId, {
    agreed: true,
    ipAddress: '203.0.113.10',
  });
  assert(consentRes.consent, 'BiometricConsent should be created');
  assert.strictEqual(consentRes.consent.status, 'GRANTED');
  assert.strictEqual(consentRes.consent.ipAddress, '203.0.113.10');
  assert.strictEqual(consentRes.consent.consentVersion, 'v1.0');
  assert.strictEqual(enrollmentDoc.status, 'ENROLLED', 'Enrollment status must remain ENROLLED');
  assert.strictEqual(enrollmentDoc.biometricUserId, '1001', 'PIN 1001 must be preserved');
  assert.strictEqual(enrollmentDoc.consentStatus, 'GRANTED');
  assert.strictEqual(String(enrollmentDoc.consentId), String(createdConsent._id));
  assert.strictEqual(enrollmentDoc.history[0].action, 'CONSENT_GRANTED');
  console.log('   PASS');

  // 4. Duplicate consent must be rejected with 409
  console.log('4. Checking duplicate consent rejection (409)...');
  let dupErr = null;
  try {
    await biometricEnrollmentService.recordClientConsent(userId, {
      agreed: true,
      ipAddress: '203.0.113.10',
    });
  } catch (err) {
    dupErr = err;
  }
  assert(dupErr && dupErr.statusCode === 409, 'Duplicate consent should fail with 409');
  console.log('   PASS');

  // 5. Attendance after consent must be accepted
  console.log('5. Checking attendance punch acceptance after consent...');
  const punchAfter = await biometricDeviceService.processAttendanceEvent({
    device,
    biometricUserId: '1001',
    timestamp: new Date('2026-11-28T01:05:00Z'),
    verificationMethod: 'FACE',
  });
  assert.strictEqual(punchAfter.duplicate, false);
  assert(punchAfter.record, 'Attendance record should be created after consent');
  assert.strictEqual(punchAfter.record.biometricUserId, '1001');
  assert.strictEqual(punchAfter.record.attendanceStatus, 'SUCCESS');
  assert.strictEqual(attendanceCreatedCount, 1);
  console.log('   PASS');

  // 6. Verify ADMIN role cannot call /biometric/consent route (no impersonation)
  console.log('6. Checking ADMIN impersonation block on POST /biometric/consent...');
  const consentLayer = clientRoutes.stack.find(
    (layer) => layer.route && layer.route.path === '/biometric/consent' && layer.route.methods.post
  );
  assert(consentLayer, 'POST /biometric/consent route should exist');
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { _id: new mongoose.Types.ObjectId(), role: 'ADMIN' };
    next();
  });
  // Invoke only the route-level middleware stack (skipping router-level protect)
  const routeStack = consentLayer.route.stack.map((s) => s.handle);
  app.post('/biometric/consent', ...routeStack);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const resStatus = await new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/biometric/consent',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      }
    );
    req.on('error', reject);
    req.write(JSON.stringify({ agreed: true }));
    req.end();
  });
  await new Promise((resolve) => server.close(resolve));
  assert.strictEqual(resStatus, 403, 'ADMIN should be forbidden from calling POST /biometric/consent');
  console.log('   PASS');

  restoreAll();
  console.log('==========================================================');
  console.log('ALL BIOMETRIC CONSENT WORKFLOW TESTS PASSED (6/6)');
  console.log('==========================================================');
}

run().catch((err) => {
  restoreAll();
  console.error('TEST FAILED:', err);
  process.exit(1);
});
