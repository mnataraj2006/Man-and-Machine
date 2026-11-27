/**
 * Real MongoDB Replica-Set Integration Tests (MongoMemoryReplSet)
 * Tests ACID transaction rollback, partial unique indexes, E11000 rejection,
 * duplicate-audit aggregations, and concurrent PIN allocation against a real mongod replica set.
 * Does NOT connect to production MongoDB.
 */
const assert = require('assert');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const Branch = require('./src/models/Branch');
const ClientProfile = require('./src/models/ClientProfile');
const BiometricDevice = require('./src/models/BiometricDevice');
const BiometricUserMapping = require('./src/models/BiometricUserMapping');
const BiometricEnrollment = require('./src/models/BiometricEnrollment');
const BiometricPinSequence = require('./src/models/BiometricPinSequence');
const BiometricDeviceLog = require('./src/models/BiometricDeviceLog');

const biometricDeviceService = require('./src/services/biometricDeviceService');
const biometricEnrollmentService = require('./src/services/biometricEnrollmentService');

let replSet;

async function setup() {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  const uri = replSet.getUri('man_and_machine_test');
  await mongoose.connect(uri);
  await Promise.all([
    Branch.createIndexes(),
    ClientProfile.createIndexes(),
    BiometricDevice.createIndexes(),
    BiometricUserMapping.createIndexes(),
    BiometricEnrollment.createIndexes(),
    BiometricPinSequence.createIndexes(),
  ]);
}

async function teardown() {
  await mongoose.disconnect();
  if (replSet) {
    await replSet.stop();
  }
}

async function testPartialIndexCompatibilityAndDuplicateRejection() {
  console.log('1. Testing partial unique index creation, E11000 rejection & duplicate-audit queries...');
  const serverInfo = await mongoose.connection.db.admin().serverInfo();
  console.log(`   MongoDB Server Version: ${serverInfo.version}`);

  // Create proposed partial unique indexes on test DB (using $in, not $nin)
  await BiometricUserMapping.collection.createIndex(
    { deviceId: 1, clientProfileId: 1 },
    { unique: true, partialFilterExpression: { status: 'ACTIVE' } }
  );
  await BiometricEnrollment.collection.createIndex(
    { assignedDeviceId: 1, biometricUserId: 1 },
    {
      unique: true,
      partialFilterExpression: {
        assignedDeviceId: { $type: 'objectId' },
        biometricUserId: { $gt: '' },
        status: {
          $in: [
            'NOT_STARTED',
            'INVITED',
            'CAPTURE_IN_PROGRESS',
            'CAPTURE_SUBMITTED',
            'PENDING_REVIEW',
            'APPROVED',
            'REMOTE_ENROLLMENT_PENDING',
            'AWAITING_PHYSICAL_ENROLLMENT',
            'DEVICE_ENROLLMENT_IN_PROGRESS',
            'ENROLLED',
          ],
        },
      },
    }
  );

  const branch = await Branch.create({ name: 'Kovilpatti', city: 'Kovilpatti' });
  const device = await BiometricDevice.create({
    deviceId: 1,
    branchId: branch._id,
    deviceName: 'KVP Test',
    serialNumber: 'TDDB_TEST_01',
  });
  const clientA = await ClientProfile.create({ branchId: branch._id, name: 'Client A', clientId: 'MM000001' });
  const clientB = await ClientProfile.create({ branchId: branch._id, name: 'Client B', clientId: 'MM000002' });

  await BiometricUserMapping.create({
    deviceId: device._id,
    branchId: branch._id,
    clientProfileId: clientA._id,
    biometricUserId: '101',
    status: 'ACTIVE',
  });

  // Duplicate PIN on same device -> E11000
  let errPinDup = null;
  try {
    await BiometricUserMapping.create({
      deviceId: device._id,
      branchId: branch._id,
      clientProfileId: clientB._id,
      biometricUserId: '101',
      status: 'ACTIVE',
    });
  } catch (err) {
    errPinDup = err;
  }
  assert(errPinDup && errPinDup.code === 11000, 'Expected E11000 for duplicate (deviceId, biometricUserId)');

  // Duplicate ACTIVE mapping for same client on same device -> E11000
  let errClientDup = null;
  try {
    await BiometricUserMapping.create({
      deviceId: device._id,
      branchId: branch._id,
      clientProfileId: clientA._id,
      biometricUserId: '102',
      status: 'ACTIVE',
    });
  } catch (err) {
    errClientDup = err;
  }
  assert(errClientDup && errClientDup.code === 11000, 'Expected E11000 for duplicate ACTIVE (deviceId, clientProfileId)');

  // Run read-only duplicate-audit aggregations
  const dupMappings = await BiometricUserMapping.aggregate([
    { $match: { status: 'ACTIVE' } },
    { $group: { _id: { deviceId: '$deviceId', clientProfileId: '$clientProfileId' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  assert.strictEqual(dupMappings.length, 0);

  const dupEnrollments = await BiometricEnrollment.aggregate([
    { $match: { assignedDeviceId: { $type: 'objectId' }, biometricUserId: { $gt: '' }, status: { $nin: ['REJECTED', 'REVOKED', 'FAILED'] } } },
    { $group: { _id: { assignedDeviceId: '$assignedDeviceId', biometricUserId: '$biometricUserId' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  assert.strictEqual(dupEnrollments.length, 0);

  console.log('   PASS');
}

async function testTransactionRollbackInBothServices() {
  console.log('2. Testing real MongoDB ACID transaction rollback in completeManualEnrollment & mapBiometricUser...');
  const branch = await Branch.findOne();
  const device = await BiometricDevice.findOne();
  const clientC = await ClientProfile.create({ branchId: branch._id, name: 'Client C', clientId: 'MM000003' });
  const superAdmin = { _id: new mongoose.Types.ObjectId(), role: 'ADMIN', branchId: null };

  const origSave = BiometricEnrollment.prototype.save;
  BiometricEnrollment.prototype.save = async function () {
    throw new Error('Simulated enrollment write failure inside ACID transaction');
  };

  try {
    // 2a. completeManualEnrollment rollback
    let err1 = null;
    try {
      await biometricEnrollmentService.completeManualEnrollment(
        { clientProfileId: clientC._id, deviceId: device._id, biometricUserId: '103' },
        superAdmin
      );
    } catch (e) {
      err1 = e;
    }
    assert(err1, 'completeManualEnrollment must throw on enrollment.save failure');
    const orphan1 = await BiometricUserMapping.findOne({ deviceId: device._id, biometricUserId: '103' }).lean();
    assert.strictEqual(orphan1, null, 'Transaction abort must leave zero orphaned BiometricUserMapping for PIN 103');

    // 2b. mapBiometricUser rollback
    let err2 = null;
    try {
      await biometricDeviceService.mapBiometricUser(
        { deviceId: device._id, biometricUserId: '104', clientProfileId: clientC._id },
        superAdmin
      );
    } catch (e) {
      err2 = e;
    }
    assert(err2, 'mapBiometricUser must throw on enrollment.save failure');
    const orphan2 = await BiometricUserMapping.findOne({ deviceId: device._id, biometricUserId: '104' }).lean();
    assert.strictEqual(orphan2, null, 'Transaction abort must leave zero orphaned BiometricUserMapping for PIN 104');
  } finally {
    BiometricEnrollment.prototype.save = origSave;
  }

  console.log('   PASS');
}

async function testConcurrentPinAllocationOnRealMongo() {
  console.log('3. Testing concurrent PIN allocation across 15 parallel callers on real MongoDB...');
  const device = await BiometricDevice.findOne();

  const pins = await Promise.all(
    Array.from({ length: 15 }, () => BiometricPinSequence.allocateNextPin(device._id, 1000))
  );
  const uniquePins = new Set(pins);
  assert.strictEqual(uniquePins.size, 15, `Expected 15 distinct PINs, got ${uniquePins.size}: ${pins.join(',')}`);
  console.log('   PASS');
}

async function run() {
  console.log('==========================================================');
  console.log('REAL MONGODB REPLICA-SET INTEGRATION TESTS');
  console.log('==========================================================');
  await setup();
  try {
    await testPartialIndexCompatibilityAndDuplicateRejection();
    await testTransactionRollbackInBothServices();
    await testConcurrentPinAllocationOnRealMongo();
    console.log('==========================================================');
    console.log('ALL REAL MONGODB REPLICA-SET TESTS PASSED (3/3 SUITES)');
    console.log('==========================================================');
  } finally {
    await teardown();
  }
}

run().catch((err) => {
  console.error('REPLICA-SET TEST FAILED:', err);
  process.exit(1);
});
