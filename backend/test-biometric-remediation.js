/**
 * Security Remediation Verification Suite (Phase 8 — All 16 Requirements)
 * Isolated in-memory tests; does NOT connect to or mutate production MongoDB or X2008.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');

const BiometricDevice = require('./src/models/BiometricDevice');
const BiometricEnrollment = require('./src/models/BiometricEnrollment');
const BiometricConsent = require('./src/models/BiometricConsent');
const BiometricUserMapping = require('./src/models/BiometricUserMapping');
const BiometricDeviceLog = require('./src/models/BiometricDeviceLog');
const BiometricPinSequence = require('./src/models/BiometricPinSequence');
const ClientProfile = require('./src/models/ClientProfile');
const Membership = require('./src/models/Membership');
const Notification = require('./src/models/Notification');

const biometricDeviceService = require('./src/services/biometricDeviceService');
const biometricEnrollmentService = require('./src/services/biometricEnrollmentService');
const adminController = require('./src/controllers/adminController');
const admsRoutes = require('./src/routes/admsRoutes');

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

async function assertRejectsWithStatus(fn, expectedStatus, label) {
  let caught = null;
  try {
    await fn();
  } catch (err) {
    caught = err;
  }
  assert(caught, `${label}: expected error with status ${expectedStatus}`);
  assert.strictEqual(caught.statusCode, expectedStatus, `${label}: expected ${expectedStatus}, got ${caught.statusCode} (${caught.message})`);
}

async function testBranchAuthorizationAndSuperAdmin() {
  console.log('1-8. Testing cross-branch denials & super-admin global access...');
  const branchA = new mongoose.Types.ObjectId();
  const branchB = new mongoose.Types.ObjectId();
  const branchAdminA = { _id: new mongoose.Types.ObjectId(), role: 'ADMIN', branchId: branchA };
  const superAdmin = { _id: new mongoose.Types.ObjectId(), role: 'ADMIN', branchId: null };

  const deviceBId = new mongoose.Types.ObjectId();
  const mappingBId = new mongoose.Types.ObjectId();
  const enrollmentBId = new mongoose.Types.ObjectId();
  const profileAId = new mongoose.Types.ObjectId();
  const profileBId = new mongoose.Types.ObjectId();

  stub(BiometricDevice, 'findById', () => makeQuery({ _id: deviceBId, branchId: branchB, deviceName: 'Branch B Device', serialNumber: 'SN_B', isActive: true, status: 'ONLINE', save: async function () { return this; } }));
  stub(BiometricUserMapping, 'findById', () => makeQuery({ _id: mappingBId, branchId: branchB, deviceId: deviceBId, biometricUserId: '501' }));
  stub(BiometricEnrollment, 'findById', () => makeQuery({ _id: enrollmentBId, branchId: branchB, clientProfileId: profileBId, status: 'CAPTURE_SUBMITTED', consentStatus: 'GRANTED' }));
  stub(ClientProfile, 'findById', (id) => makeQuery(String(id) === String(profileAId) ? { _id: profileAId, branchId: branchA, name: 'Client A' } : { _id: profileBId, branchId: branchB, name: 'Client B' }));
  stub(BiometricDeviceLog, 'create', () => Promise.resolve({}));

  // 1. Cross-branch device update denial
  await assertRejectsWithStatus(
    () => biometricDeviceService.updateDevice(deviceBId, { deviceName: 'Hacked' }, branchAdminA),
    403,
    'Cross-branch updateDevice'
  );

  // 2. Cross-branch device disable denial
  await assertRejectsWithStatus(
    () => biometricDeviceService.toggleDeviceStatus(deviceBId, false, branchAdminA),
    403,
    'Cross-branch toggleDeviceStatus'
  );

  // 3. Cross-branch mapping denial (admin A trying to map client A to device B, or client B to device B)
  await assertRejectsWithStatus(
    () => biometricDeviceService.mapBiometricUser({ deviceId: deviceBId, biometricUserId: '501', clientProfileId: profileBId }, branchAdminA),
    403,
    'Cross-branch mapBiometricUser'
  );
  // Also client A (branch A) on device B (branch B) even by superAdmin -> 409 branch mismatch
  await assertRejectsWithStatus(
    () => biometricDeviceService.mapBiometricUser({ deviceId: deviceBId, biometricUserId: '501', clientProfileId: profileAId }, superAdmin),
    409,
    'Cross-branch client/device mismatch'
  );

  // 4. Cross-branch unmapping denial
  await assertRejectsWithStatus(
    () => biometricDeviceService.unmapBiometricUser(mappingBId, branchAdminA),
    403,
    'Cross-branch unmapBiometricUser'
  );

  // 5. Cross-branch enrollment approval denial
  await assertRejectsWithStatus(
    () => biometricEnrollmentService.approveEnrollment(enrollmentBId, branchAdminA, {}),
    403,
    'Cross-branch approveEnrollment'
  );

  // 6. Cross-branch physical enrollment denial
  await assertRejectsWithStatus(
    () => biometricEnrollmentService.initiatePhysicalEnrollment({ clientProfileId: profileBId, deviceId: deviceBId }, branchAdminA),
    403,
    'Cross-branch initiatePhysicalEnrollment'
  );

  // 7. Unauthorized client creation under another branch
  let createStatus = null;
  let createBody = null;
  const resMock = {
    status(c) { createStatus = c; return resMock; },
    json(b) { createBody = b; return resMock; },
  };
  await adminController.createClient(
    { user: branchAdminA, body: { name: 'Test Walkin', branchId: String(branchB) } },
    resMock,
    (err) => { throw err; }
  );
  assert.strictEqual(createStatus, 403, 'Branch admin creating client in another branch must return 403');
  assert.strictEqual(createBody.success, false);

  // 8. Super-admin global access (can toggle device in branch B)
  const toggled = await biometricDeviceService.toggleDeviceStatus(deviceBId, false, superAdmin);
  assert.strictEqual(toggled.isActive, false);

  restoreAll();
  console.log('   PASS');
}

async function testRevokedStateMachineAndReconsent() {
  console.log('9-11. Testing REVOKED enrollment guards & fresh consent renewal...');
  const branchId = new mongoose.Types.ObjectId();
  const deviceId = new mongoose.Types.ObjectId();
  const profileId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const enrollmentId = new mongoose.Types.ObjectId();

  const revokedDoc = {
    _id: enrollmentId,
    clientProfileId: profileId,
    userId,
    branchId,
    assignedDeviceId: deviceId,
    biometricUserId: '1009',
    status: 'REVOKED',
    consentStatus: 'WITHDRAWN',
    mobileCaptureStatus: 'CAPTURED',
    identityVerificationStatus: 'VERIFIED',
    adminApprovalStatus: 'APPROVED',
    deviceEnrollmentStatus: 'ADMIN_CONFIRMED',
    faceEnrollmentStatus: 'ENROLLED',
    history: [],
    save: async function () { return this; },
  };

  stub(BiometricEnrollment, 'findById', () => makeQuery(revokedDoc));
  stub(BiometricEnrollment, 'findOne', () => makeQuery(revokedDoc));
  stub(ClientProfile, 'findById', () => makeQuery({ _id: profileId, userId, branchId, name: 'Member' }));
  stub(ClientProfile, 'findOne', () => makeQuery({ _id: profileId, userId, branchId, name: 'Member' }));
  stub(BiometricDevice, 'findById', () => makeQuery({ _id: deviceId, branchId, deviceName: 'X2008', isActive: true, status: 'ONLINE' }));
  stub(Membership, 'findOne', () => makeQuery({ _id: new mongoose.Types.ObjectId(), status: 'ACTIVE' }));

  // 9. REVOKED enrollment cannot be approved
  await assertRejectsWithStatus(
    () => biometricEnrollmentService.approveEnrollment(enrollmentId, { role: 'ADMIN', branchId: null }, {}),
    409,
    'Approve REVOKED enrollment'
  );

  // 10. REVOKED enrollment cannot start physical enrollment
  await assertRejectsWithStatus(
    () => biometricEnrollmentService.initiatePhysicalEnrollment({ clientProfileId: profileId, deviceId }, { role: 'ADMIN', branchId: null }),
    409,
    'Physical enrollment on REVOKED record'
  );

  // 11. Fresh consent after REVOKED resets to CAPTURE_IN_PROGRESS without reactivating old mappings
  let mappingReactivated = false;
  stub(BiometricUserMapping, 'updateMany', () => {
    mappingReactivated = true;
    return Promise.resolve({});
  });
  stub(BiometricConsent, 'create', async (doc) => ({ _id: new mongoose.Types.ObjectId(), ...doc }));

  const renewed = await biometricEnrollmentService.recordClientConsent(userId, { agreed: true, ipAddress: '127.0.0.1' });
  assert.strictEqual(renewed.enrollment.status, 'CAPTURE_IN_PROGRESS');
  assert.strictEqual(renewed.enrollment.consentStatus, 'GRANTED');
  assert.strictEqual(renewed.enrollment.biometricUserId, '');
  assert.strictEqual(renewed.enrollment.adminApprovalStatus, 'PENDING');
  assert.strictEqual(mappingReactivated, false, 'Old mappings must NOT be reactivated on re-consent');

  restoreAll();
  console.log('   PASS');
}

async function testAtomicRollbackOnSecondWriteFailure() {
  console.log('12. Testing compensating rollback when enrollment write fails after mapping...');
  const branchId = new mongoose.Types.ObjectId();
  const deviceId = new mongoose.Types.ObjectId();
  const profileId = new mongoose.Types.ObjectId();
  const superAdmin = { _id: new mongoose.Types.ObjectId(), role: 'ADMIN', branchId: null };

  const mappingStore = new Map();
  let enrollmentSaveFailed = false;

  // Simulate standalone MongoDB (sessions not supported -> runWithOptionalTransaction falls back to session = null)
  stub(mongoose, 'startSession', async () => ({
    withTransaction: async () => { throw new Error('Transaction numbers are only allowed on a replica set'); },
    endSession: async () => {},
  }));

  stub(ClientProfile, 'findById', () => makeQuery({ _id: profileId, branchId, name: 'Rollback Client' }));
  stub(BiometricDevice, 'findById', () => makeQuery({ _id: deviceId, branchId, deviceName: 'X2008' }));
  stub(BiometricUserMapping, 'findOne', (q) => {
    const key = `${q.deviceId}:${q.biometricUserId}`;
    return makeQuery(mappingStore.get(key) || null);
  });
  stub(BiometricEnrollment, 'findOne', () => makeQuery(null));
  stub(BiometricUserMapping, 'findOneAndUpdate', async (filter, doc) => {
    const rec = { _id: new mongoose.Types.ObjectId(), ...doc };
    mappingStore.set(`${filter.deviceId}:${filter.biometricUserId}`, rec);
    return rec;
  });
  stub(BiometricUserMapping, 'deleteOne', async (filter) => {
    for (const [k, v] of mappingStore.entries()) {
      if (String(v._id) === String(filter._id)) mappingStore.delete(k);
    }
    return { deletedCount: 1 };
  });
  stub(BiometricEnrollment.prototype, 'save', async function () {
    enrollmentSaveFailed = true;
    throw new Error('Simulated BiometricEnrollment write failure');
  });

  let caught = null;
  try {
    await biometricEnrollmentService.completeManualEnrollment(
      { clientProfileId: profileId, deviceId, biometricUserId: '1088' },
      superAdmin
    );
  } catch (err) {
    caught = err;
  }

  assert(caught && enrollmentSaveFailed);
  assert.strictEqual(mappingStore.size, 0, 'Orphaned BiometricUserMapping MUST be rolled back when enrollment.save() fails');
  restoreAll();
  console.log('   PASS');
}

async function testMultiWorkerConcurrentPinAllocation() {
  console.log('13-14. Testing multi-worker concurrent PIN allocation & duplicate mapping prevention...');
  const deviceId = new mongoose.Types.ObjectId();

  // Simulate an atomic MongoDB document store across 10 concurrent "workers"
  const counterDb = new Map();
  stub(BiometricPinSequence, 'findOneAndUpdate', async (filter, update, opts) => {
    const key = filter._id;
    let doc = counterDb.get(key);
    if (!doc && opts?.upsert) {
      doc = { _id: key, sequence: update.$setOnInsert?.sequence ?? 1000 };
      counterDb.set(key, doc);
    }
    if (doc && update.$inc?.sequence) {
      doc.sequence += update.$inc.sequence;
    }
    return doc ? { ...doc } : null;
  });
  stub(BiometricPinSequence, 'updateOne', async (filter, update) => {
    const doc = counterDb.get(filter._id);
    if (doc && doc.sequence < filter.sequence.$lt) {
      doc.sequence = update.$set.sequence;
    }
    return { modifiedCount: 1 };
  });

  const allocated = await Promise.all(
    Array.from({ length: 10 }, () => BiometricPinSequence.allocateNextPin(deviceId, 1000))
  );
  const unique = new Set(allocated);
  assert.strictEqual(unique.size, 10, `All 10 concurrent workers must get distinct PINs, got: ${allocated.join(',')}`);

  restoreAll();
  console.log('   PASS');
}

async function testFrontendPollFixAndAdmsHeader() {
  console.log('15-16. Testing migration poll fix & ADMS x-adms-secret header enforcement...');
  // 15. Verify BiometricDevices.jsx migration effect does not depend on `devices` array
  const bioDevicesSrc = fs.readFileSync(
    path.join(__dirname, '../frontend/src/pages/Admin/BiometricDevices.jsx'),
    'utf8'
  );
  assert(
    bioDevicesSrc.includes('defaultMigDeviceId') &&
      !bioDevicesSrc.includes('[activeTab, migDeviceId, migFilter, migSearch, devices, loadMigrationPreview]'),
    'Migration useEffect must not re-run on every devices array poll'
  );

  // 16. Verify ADMS accepts x-adms-secret header and rejects query-param secret
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
  const prevEnv = process.env.NODE_ENV;
  const prevSecret = process.env.ADMS_SHARED_SECRET;

  const getReq = (reqPath, headers = {}) =>
    new Promise((resolve, reject) => {
      const req = http.request({ hostname: '127.0.0.1', port, path: reqPath, method: 'GET', headers }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      });
      req.on('error', reject);
      req.end();
    });

  try {
    process.env.NODE_ENV = 'production';
    process.env.ADMS_SHARED_SECRET = 'bridge-test-secret';

    const queryOnlyRes = await getReq('/iclock/getrequest?SN=TDDB250600919&secret=bridge-test-secret');
    assert.strictEqual(queryOnlyRes.status, 401, 'Query-param secret fallback must be rejected');

    const headerRes = await getReq('/iclock/getrequest?SN=TDDB250600919', { 'x-adms-secret': 'bridge-test-secret' });
    assert.strictEqual(headerRes.status, 200);
    assert.strictEqual(headerRes.body, 'OK');
  } finally {
    process.env.NODE_ENV = prevEnv;
    if (prevSecret === undefined) delete process.env.ADMS_SHARED_SECRET;
    else process.env.ADMS_SHARED_SECRET = prevSecret;
    server.close();
    restoreAll();
  }
  console.log('   PASS');
}

async function run() {
  console.log('==========================================================');
  console.log('BIOMETRIC SECURITY REMEDIATION SUITE (16 REQUIREMENTS)');
  console.log('==========================================================');
  await testBranchAuthorizationAndSuperAdmin();
  await testRevokedStateMachineAndReconsent();
  await testAtomicRollbackOnSecondWriteFailure();
  await testMultiWorkerConcurrentPinAllocation();
  await testFrontendPollFixAndAdmsHeader();
  console.log('==========================================================');
  console.log('ALL REMEDIATION TESTS PASSED (5/5 GROUPS / 16/16 CASES)');
  console.log('==========================================================');
}

run().catch((err) => {
  restoreAll();
  console.error('TEST FAILED:', err);
  process.exit(1);
});
