/**
 * Complete Biometric System Verification Suite (Phases 2-7, Isolated In-Memory)
 * Does NOT connect to or mutate any MongoDB database or physical biometric device.
 */
const assert = require('assert');
const mongoose = require('mongoose');

const BiometricDevice = require('./src/models/BiometricDevice');
const BiometricEnrollment = require('./src/models/BiometricEnrollment');
const BiometricUserMapping = require('./src/models/BiometricUserMapping');
const BiometricDeviceLog = require('./src/models/BiometricDeviceLog');
const BiometricDeviceCommand = require('./src/models/BiometricDeviceCommand');
const Attendance = require('./src/models/Attendance');
const ClientProfile = require('./src/models/ClientProfile');
const Membership = require('./src/models/Membership');
const User = require('./src/models/User');
const Notification = require('./src/models/Notification');

const biometricDeviceService = require('./src/services/biometricDeviceService');
const biometricEnrollmentService = require('./src/services/biometricEnrollmentService');

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

async function testOperLogDiscoveryDeduplication() {
  console.log('1. Testing OPERLOG discovery deduplication & firstSeenAt preservation...');
  const initialDate = new Date('2026-11-01T10:00:00Z');
  const deviceDoc = {
    _id: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    serialNumber: 'TDDB250600919',
    isActive: true,
    status: 'ONLINE',
    discoveredUsers: [
      { biometricUserId: '101', name: 'Arjun', privilege: '0', firstSeenAt: initialDate, seenAt: initialDate },
    ],
    save: async function () { return this; },
  };

  stub(BiometricDevice, 'findOne', () => makeQuery(deviceDoc));
  stub(BiometricDeviceLog, 'create', () => Promise.resolve({}));

  const payload = [
    'USER PIN=101\tName=Arjun K\tPri=0',
    'USER PIN=102\tName=Priya\tPri=0',
    'USER PIN=102\tName=Priya\tPri=0',
  ].join('\n');

  const updated = await biometricDeviceService.handleAdmsOperLog('TDDB250600919', payload);
  assert.strictEqual(updated.discoveredUsers.length, 2, 'Must deduplicate discoveredUsers by PIN');
  const u101 = updated.discoveredUsers.find((u) => u.biometricUserId === '101');
  assert.strictEqual(new Date(u101.firstSeenAt).toISOString(), initialDate.toISOString(), 'Must preserve firstSeenAt');
  assert.strictEqual(u101.name, 'Arjun K');
  restoreAll();
  console.log('   PASS');
}

async function test263UserMigrationSimulation() {
  console.log('2. Testing 263-user migration preview, matching confidence, dry-run & bulk mapping...');
  const branchId = new mongoose.Types.ObjectId();
  const otherBranchId = new mongoose.Types.ObjectId();
  const deviceId = new mongoose.Types.ObjectId();

  // Build 263 discovered users
  const discoveredUsers = Array.from({ length: 263 }, (_, i) => ({
    biometricUserId: String(i + 1),
    name: i === 0 ? 'Karthik Raja' : i === 1 ? 'Karthik Raja' : `Member ${i + 1}`,
    privilege: '0',
    firstSeenAt: new Date(),
    seenAt: new Date(),
  }));

  const prof1 = { _id: new mongoose.Types.ObjectId(), clientId: 'MM0001', name: 'Karthik Raja', phone: '9876543210', branchId, userId: null };
  const prof3 = { _id: new mongoose.Types.ObjectId(), clientId: 'MM0003', name: 'Member 3', phone: '9876543212', branchId, userId: null };
  const profOtherBranch = { _id: new mongoose.Types.ObjectId(), clientId: 'MM0004', name: 'Other Branch', phone: '9876543213', branchId: otherBranchId, userId: null };

  const activeMappings = [
    { _id: new mongoose.Types.ObjectId(), deviceId, biometricUserId: '10', clientProfileId: { _id: new mongoose.Types.ObjectId(), clientId: 'MM0010', name: 'Member 10', phone: '9000000010' }, status: 'ACTIVE' },
  ];
  const enrollments = [];

  stub(BiometricDevice, 'findById', () =>
    makeQuery({
      _id: deviceId,
      branchId: { _id: branchId, name: 'Kovilpatti', city: 'Kovilpatti' },
      deviceName: 'KVP Main Entrance',
      model: 'X2008',
      serialNumber: 'TDDB250600919',
      userCount: 263,
      faceCount: 248,
      fingerprintCount: 15,
      discoveredUsers,
    })
  );
  stub(BiometricUserMapping, 'find', () => makeQuery(activeMappings));
  stub(BiometricEnrollment, 'find', () => makeQuery(enrollments));
  stub(ClientProfile, 'find', () => makeQuery([prof1, prof3]));
  stub(Membership, 'find', () => makeQuery([{ clientProfileId: prof3._id, status: 'ACTIVE' }]));

  const preview = await biometricEnrollmentService.getMigrationPreview({ deviceId, filter: 'ALL' });
  assert.strictEqual(preview.summary.totalDiscovered, 263);
  assert.strictEqual(preview.summary.mappedCount, 1);
  assert.strictEqual(preview.summary.unmappedCount, 262);
  assert.strictEqual(preview.summary.potentialDuplicatesCount, 2, 'Two users named Karthik Raja flagged as potential duplicates');

  const row3 = preview.users.find((u) => u.biometricUserId === '3');
  assert.strictEqual(row3.confidence, 'HIGH');
  assert.strictEqual(String(row3.suggestedClient.clientProfileId), String(prof3._id));

  // Dry-run bulk mapping with 1 valid + 1 branch-mismatch failure
  stub(BiometricDevice, 'findById', () => makeQuery({ _id: deviceId, branchId, deviceName: 'KVP Main Entrance' }));
  stub(BiometricUserMapping, 'countDocuments', () => Promise.resolve(activeMappings.length));
  stub(BiometricEnrollment, 'countDocuments', () => Promise.resolve(enrollments.length));
  stub(ClientProfile, 'findById', (id) => {
    if (String(id) === String(prof3._id)) return makeQuery(prof3);
    if (String(id) === String(profOtherBranch._id)) return makeQuery(profOtherBranch);
    return makeQuery(null);
  });
  stub(BiometricUserMapping, 'findOne', () => makeQuery(null));
  stub(BiometricEnrollment, 'findOne', () => makeQuery(null));

  const dryRes = await biometricEnrollmentService.bulkMapDiscoveredUsers({
    deviceId,
    dryRun: true,
    mappings: [
      { biometricUserId: '3', clientProfileId: prof3._id },
      { biometricUserId: '4', clientProfileId: profOtherBranch._id },
    ],
  });
  assert.strictEqual(dryRes.dryRun, true);
  assert.strictEqual(dryRes.succeededCount, 1);
  assert.strictEqual(dryRes.failedCount, 1);
  assert.strictEqual(dryRes.results[1].status, 'FAILED');

  // Execute real bulk mapping for PIN 3 (syncs BiometricUserMapping + BiometricEnrollment)
  let syncedEnrollmentStatus = null;
  stub(mongoose, 'startSession', async () => ({
    withTransaction: async () => { throw new Error('Transaction numbers are only allowed on a replica set'); },
    endSession: async () => {},
  }));
  stub(BiometricUserMapping, 'findOneAndUpdate', (filter, doc) => {
    const rec = { _id: new mongoose.Types.ObjectId(), ...doc };
    activeMappings.push(rec);
    return Promise.resolve(rec);
  });
  stub(BiometricEnrollment.prototype, 'save', async function () {
    syncedEnrollmentStatus = this.status;
    enrollments.push(this);
    return this;
  });
  stub(BiometricDeviceLog, 'create', () => Promise.resolve({}));

  const execRes = await biometricEnrollmentService.bulkMapDiscoveredUsers({
    deviceId,
    dryRun: false,
    mappings: [{ biometricUserId: '3', clientProfileId: prof3._id }],
  });
  assert.strictEqual(execRes.succeededCount, 1);
  assert.strictEqual(syncedEnrollmentStatus, 'ENROLLED');
  restoreAll();
  console.log('   PASS');
}

async function testAdmsCommandAllowlistAndLifecycle() {
  console.log('3. Testing ADMS safe command allowlist & lifecycle...');
  const deviceId = new mongoose.Types.ObjectId();
  const branchId = new mongoose.Types.ObjectId();

  // Destructive commands must be blocked with 403
  for (const bad of ['CLEAR_DATA', 'DELETE_USER', 'RESET', 'DATA_UPDATE']) {
    let blocked = null;
    try {
      await biometricDeviceService.queueDeviceCommand(deviceId, { commandType: bad });
    } catch (err) {
      blocked = err;
    }
    assert(blocked && blocked.statusCode === 403, `Command ${bad} must be blocked with 403`);
  }

  // Allowlisted command lifecycle: PENDING -> SENT -> COMPLETED
  const cmdStore = [];
  stub(BiometricDevice, 'findById', () => makeQuery({ _id: deviceId, branchId, serialNumber: 'TDDB250600919', isActive: true, status: 'ONLINE' }));
  stub(BiometricDevice, 'findOne', () => makeQuery({ _id: deviceId, branchId, serialNumber: 'TDDB250600919', isActive: true, status: 'ONLINE' }));
  stub(BiometricDeviceLog, 'create', () => Promise.resolve({}));
  stub(BiometricDeviceCommand, 'create', async (doc) => {
    const rec = { _id: new mongoose.Types.ObjectId(), ...doc, retryCount: 0, maxRetries: 3, save: async function () { return this; } };
    cmdStore.push(rec);
    return rec;
  });

  const queued = await biometricDeviceService.queueDeviceCommand(deviceId, { commandType: 'INFO' });
  assert.strictEqual(queued.status, 'PENDING');
  assert.strictEqual(queued.commandPayload, 'INFO');

  stub(BiometricDeviceCommand, 'updateMany', () => Promise.resolve({ modifiedCount: 0 }));
  stub(BiometricDeviceCommand, 'find', (q) => {
    if (q.status === 'PENDING') return makeQuery(cmdStore.filter((c) => c.status === 'PENDING'));
    return makeQuery([]);
  });
  stub(BiometricDeviceCommand, 'findOneAndUpdate', (filter, update) => {
    const found = cmdStore.find((c) => String(c._id) === String(filter._id) && c.status === 'PENDING');
    if (!found) return Promise.resolve(null);
    Object.assign(found, update.$set);
    return Promise.resolve(found);
  });

  const prevDispatchFlag = process.env.ADMS_COMMAND_DISPATCH_ENABLED;
  delete process.env.ADMS_COMMAND_DISPATCH_ENABLED;
  const disabledDispatch = await biometricDeviceService.dispatchPendingCommandsForDevice('TDDB250600919');
  assert.strictEqual(disabledDispatch.commandLines.length, 0, 'Command dispatch must be disabled by default');

  process.env.ADMS_COMMAND_DISPATCH_ENABLED = 'true';
  try {
    const dispatched = await biometricDeviceService.dispatchPendingCommandsForDevice('TDDB250600919');
    assert.strictEqual(dispatched.commandLines.length, 1);
    assert.strictEqual(dispatched.commandLines[0], `C:${queued.commandId}:INFO`);
    assert.strictEqual(queued.status, 'SENT');
  } finally {
    if (prevDispatchFlag === undefined) delete process.env.ADMS_COMMAND_DISPATCH_ENABLED;
    else process.env.ADMS_COMMAND_DISPATCH_ENABLED = prevDispatchFlag;
  }

  // Acknowledge via devicecmd
  stub(BiometricDeviceCommand, 'findOne', (q) =>
    makeQuery(cmdStore.find((c) => c.commandId === q.commandId) || null)
  );
  const ack1 = await biometricDeviceService.handleAdmsDeviceCmdResponse('TDDB250600919', `ID=${queued.commandId}&Return=0&CMD=INFO`);
  assert.strictEqual(ack1.processed, 1);
  assert.strictEqual(queued.status, 'COMPLETED');

  // Duplicate ack must be idempotent (processed: 0)
  const ack2 = await biometricDeviceService.handleAdmsDeviceCmdResponse('TDDB250600919', `ID=${queued.commandId}&Return=0&CMD=INFO`);
  assert.strictEqual(ack2.processed, 0);

  restoreAll();
  console.log('   PASS');
}

async function testBranchIsolationAndAttendanceFlags() {
  console.log('4. Testing branch isolation & attendance membership validation flags...');
  const branchA = new mongoose.Types.ObjectId();
  const branchB = new mongoose.Types.ObjectId();

  // Branch-scoped admin blocked from Branch B
  let forbidden = null;
  try {
    biometricDeviceService.assertAdminBranchAccess({ branchId: branchA }, branchB);
  } catch (err) {
    forbidden = err;
  }
  assert(forbidden && forbidden.statusCode === 403);

  // Super-admin (branchId: null) allowed
  biometricDeviceService.assertAdminBranchAccess({ branchId: null }, branchB);

  // Attendance processing: FROZEN membership -> FLAGGED_FROZEN
  const device = { _id: new mongoose.Types.ObjectId(), branchId: branchA, isActive: true, status: 'ONLINE' };
  const profile = { _id: new mongoose.Types.ObjectId(), userId: null };
  let createdAttendance = null;

  stub(Attendance, 'findOne', () => makeQuery(null));
  stub(BiometricUserMapping, 'findOne', () => makeQuery({ clientProfileId: profile }));
  stub(BiometricEnrollment, 'findOne', () => makeQuery({ status: 'ENROLLED', consentStatus: 'GRANTED' }));
  stub(Membership, 'find', () => makeQuery([{ status: 'FROZEN', startDate: new Date('2026-11-01'), expiryDate: new Date('2026-12-31') }]));
  stub(Attendance, 'create', async (doc) => {
    createdAttendance = doc;
    return doc;
  });

  const attRes = await biometricDeviceService.processAttendanceEvent({
    device,
    biometricUserId: '201',
    timestamp: new Date('2026-11-27T01:00:00Z'),
    verificationMethod: 'FACE',
  });
  assert.strictEqual(attRes.duplicate, false);
  assert.strictEqual(createdAttendance.source, 'BIOMETRIC_ADMS');
  assert.strictEqual(createdAttendance.attendanceStatus, 'FLAGGED_FROZEN');

  restoreAll();
  console.log('   PASS');
}

async function run() {
  console.log('==========================================================');
  console.log('COMPLETE BIOMETRIC SYSTEM SUITE (PHASES 2-7)');
  console.log('==========================================================');
  await testOperLogDiscoveryDeduplication();
  await test263UserMigrationSimulation();
  await testAdmsCommandAllowlistAndLifecycle();
  await testBranchIsolationAndAttendanceFlags();
  console.log('==========================================================');
  console.log('ALL PHASES 2-7 TESTS PASSED (4/4 SUITES)');
  console.log('==========================================================');
}

run().catch((err) => {
  restoreAll();
  console.error('TEST FAILED:', err);
  process.exit(1);
});
