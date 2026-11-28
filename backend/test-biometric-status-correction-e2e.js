const assert = require('assert');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const User = require('./src/models/User');
const Branch = require('./src/models/Branch');
const ClientProfile = require('./src/models/ClientProfile');
const BiometricDevice = require('./src/models/BiometricDevice');
const BiometricEnrollment = require('./src/models/BiometricEnrollment');
const BiometricUserMapping = require('./src/models/BiometricUserMapping');
const BiometricDeviceSyncJob = require('./src/models/BiometricDeviceSyncJob');
const BiometricDeviceCommand = require('./src/models/BiometricDeviceCommand');
const Attendance = require('./src/models/Attendance');
require('./src/models/Employee');

const biometricEnrollmentService = require('./src/services/biometricEnrollmentService');
const biometricDeviceService = require('./src/services/biometricDeviceService');

(async () => {
  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongod.getUri());
  await Promise.all([
    BiometricEnrollment.init(),
    BiometricUserMapping.init(),
    BiometricDeviceSyncJob.init(),
    BiometricDeviceCommand.init(),
    Attendance.init(),
  ]);

  let passed = 0;
  const check = async (name, fn) => {
    await fn();
    passed += 1;
    console.log(`PASS [${passed}]: ${name}`);
  };

  try {
    const branch = await Branch.create({
      name: 'Man & Machine Kovilpatti',
      city: 'Kovilpatti',
      code: 'KVP',
      address: 'Kovilpatti',
      phone: '9000000010',
      isActive: true,
    });

    const adminUser = await User.create({
      name: 'Super Admin',
      email: 'admin@status.test',
      phone: '9000000099',
      password: 'Password123!',
      role: 'ADMIN',
      branchId: null,
      status: 'ACTIVE',
    });

    const deviceA = await BiometricDevice.create({
      deviceId: 1,
      deviceName: 'KVP Main Entrance',
      model: 'X2008',
      serialNumber: 'TDBD242100623',
      branchId: branch._id,
      isActive: true,
      status: 'ONLINE',
      lastSyncAt: new Date('2026-11-28T12:45:15Z'),
      supportsRemoteEnrollment: true,
    });

    const deviceB = await BiometricDevice.create({
      deviceId: 2,
      deviceName: 'KVP Secondary',
      model: 'X2008',
      serialNumber: 'TDBD242100777',
      branchId: branch._id,
      isActive: true,
      status: 'ONLINE',
    });

    await check('1-4 & 7-10. verifiedByDevice=true ignored; ACTIVE mapping + generic device.lastSyncAt never grant ENROLLED or fake sync time', async () => {
      const client = await ClientProfile.create({
        clientId: 'MM000005',
        name: 'Suresh',
        phone: '9876543210',
        branchId: branch._id,
        status: 'ACTIVE',
      });

      const enr = await biometricEnrollmentService.completeManualEnrollment(
        {
          clientProfileId: client._id,
          deviceId: deviceA._id,
          biometricUserId: '1003',
          captureType: 'FACE',
          verifiedByDevice: true, // Spoofed frontend boolean must be ignored
        },
        adminUser
      );

      assert.strictEqual(enr.deviceEnrollmentStatus, 'ADMIN_CONFIRMED');
      assert.strictEqual(enr.faceEnrollmentStatus, 'PENDING');
      assert.notStrictEqual(enr.status, 'ENROLLED');
      assert.strictEqual(enr.status, 'AWAITING_PHYSICAL_ENROLLMENT');
      assert.strictEqual(enr.lastVerifiedAt, null);

      const summary = await biometricEnrollmentService.getClientBiometricSummary({
        clientProfileId: client._id,
        branchId: branch._id,
        hasActiveMembership: true,
      });

      assert.notStrictEqual(summary.displayStatus, 'ENROLLED');
      assert.notStrictEqual(summary.gymAccessStatus, 'GRANTED');
      assert.strictEqual(summary.displayStatus, 'AWAITING_PHYSICAL_ENROLLMENT');
      assert.strictEqual(summary.faceEnrollmentStatus, 'PENDING');
      assert.strictEqual(summary.lastSyncAt, null, 'Generic device.lastSyncAt must NEVER be returned as per-user lastSyncAt');
    });

    await check('5-8. Discovered PIN on exact device produces DEVICE_USER_READY (distinct from ENROLLED); wrong device cannot verify', async () => {
      const client2 = await ClientProfile.create({
        clientId: 'MM000006',
        name: 'Arun Kumar',
        phone: '9876543211',
        branchId: branch._id,
        status: 'ACTIVE',
      });

      // PIN 1004 on deviceB only -> must NOT verify on deviceA
      deviceB.discoveredUsers.push({ biometricUserId: '1004', name: 'Arun Kumar', privilege: '0' });
      await deviceB.save();

      const enrOnA = await biometricEnrollmentService.completeManualEnrollment(
        {
          clientProfileId: client2._id,
          deviceId: deviceA._id,
          biometricUserId: '1004',
          captureType: 'FACE',
          verifiedByDevice: true,
        },
        adminUser
      );
      assert.strictEqual(enrOnA.deviceEnrollmentStatus, 'ADMIN_CONFIRMED');
      assert.strictEqual(enrOnA.status, 'AWAITING_PHYSICAL_ENROLLMENT');

      // Now discover PIN 1004 on deviceA -> produces DEVICE_USER_READY, face still PENDING
      deviceA.discoveredUsers.push({ biometricUserId: '1004', name: 'Arun Kumar', privilege: '0' });
      await deviceA.save();

      const enrReady = await biometricEnrollmentService.completeManualEnrollment(
        {
          enrollmentId: enrOnA._id,
          clientProfileId: client2._id,
          deviceId: deviceA._id,
          biometricUserId: '1004',
          captureType: 'FACE',
        },
        adminUser
      );
      assert.strictEqual(enrReady.deviceEnrollmentStatus, 'DEVICE_VERIFIED');
      assert.strictEqual(enrReady.status, 'DEVICE_USER_READY');
      assert.strictEqual(enrReady.faceEnrollmentStatus, 'PENDING');

      const summary = await biometricEnrollmentService.getClientBiometricSummary({
        clientProfileId: client2._id,
        branchId: branch._id,
        hasActiveMembership: true,
      });
      assert.strictEqual(summary.displayStatus, 'DEVICE_USER_READY');
      assert.strictEqual(summary.gymAccessStatus, 'AWAITING_FACE_ENROLLMENT');
      assert.strictEqual(summary.faceEnrollmentStatus, 'PENDING');
    });

    await check('11. Historical unverified ENROLLED record & REVOKED/REJECTED records never receive GRANTED access', async () => {
      // Simulate historical PIN 1003 record (ENROLLED without device proof)
      const histClient = await ClientProfile.create({
        clientId: 'MM000099',
        name: 'Historical Unverified',
        phone: '9876543299',
        branchId: branch._id,
        status: 'ACTIVE',
      });
      await BiometricEnrollment.create({
        clientProfileId: histClient._id,
        branchId: branch._id,
        assignedDeviceId: deviceA._id,
        biometricUserId: '1099',
        status: 'ENROLLED',
        deviceEnrollmentStatus: 'DEVICE_VERIFIED',
        faceEnrollmentStatus: 'ENROLLED',
      });
      await BiometricUserMapping.create({
        deviceId: deviceA._id,
        branchId: branch._id,
        biometricUserId: '1099',
        clientProfileId: histClient._id,
        status: 'ACTIVE',
      });

      const histSummary = await biometricEnrollmentService.getClientBiometricSummary({
        clientProfileId: histClient._id,
        branchId: branch._id,
        hasActiveMembership: true,
      });
      assert.notStrictEqual(histSummary.displayStatus, 'ENROLLED');
      assert.notStrictEqual(histSummary.gymAccessStatus, 'GRANTED');
      assert.strictEqual(histSummary.lastSyncAt, null);

      // REVOKED never receives GRANTED
      await BiometricEnrollment.updateOne(
        { clientProfileId: histClient._id },
        { $set: { status: 'REVOKED', consentStatus: 'WITHDRAWN' } }
      );
      const revSummary = await biometricEnrollmentService.getClientBiometricSummary({
        clientProfileId: histClient._id,
        branchId: branch._id,
        hasActiveMembership: true,
      });
      assert.strictEqual(revSummary.displayStatus, 'REVOKED');
      assert.strictEqual(revSummary.gymAccessStatus, 'DISABLED');
    });

    await check('12-15. Remote ADMS workflow + Return=0 ACK keeps face PENDING + late ACK never downgrades VERIFIED + ATTLOG works', async () => {
      process.env.BIOMETRIC_REMOTE_USER_SYNC = 'true';
      process.env.ADMS_COMMAND_DISPATCH_ENABLED = 'true';

      const client3 = await ClientProfile.create({
        clientId: 'MM000007',
        name: 'Vikram Dev',
        phone: '9876543212',
        branchId: branch._id,
        status: 'ACTIVE',
      });
      const enr3 = await BiometricEnrollment.create({
        clientProfileId: client3._id,
        branchId: branch._id,
        consentStatus: 'GRANTED',
        status: 'CAPTURE_SUBMITTED',
      });

      await biometricEnrollmentService.approveEnrollment(enr3._id, adminUser, {
        deviceId: deviceA._id,
        biometricUserId: '1007',
      });
      await biometricDeviceService.dispatchPendingCommandsForDevice(deviceA.serialNumber);
      const job3 = await BiometricDeviceSyncJob.findOne({ enrollmentId: enr3._id });

      await biometricDeviceService.handleAdmsDeviceCmdResponse(
        deviceA.serialNumber,
        `ID=${job3.commandId}&Return=0&CMD=DATA`
      );
      const summaryAck = await biometricEnrollmentService.getClientBiometricSummary({
        clientProfileId: client3._id,
        branchId: branch._id,
        hasActiveMembership: true,
      });
      assert.notStrictEqual(summaryAck.displayStatus, 'ENROLLED');
      assert.strictEqual(summaryAck.faceEnrollmentStatus, 'PENDING');
      assert.strictEqual(summaryAck.lastSyncAt, null);
      assert(summaryAck.lastAcknowledgedAt, 'acknowledgedAt may be shown separately');

      // OPERLOG verifies PIN -> DEVICE_USER_READY
      await biometricDeviceService.handleAdmsOperLog(
        deviceA.serialNumber,
        'USER PIN=1007\tName=Vikram Dev\tPri=0\n'
      );
      const summaryVer = await biometricEnrollmentService.getClientBiometricSummary({
        clientProfileId: client3._id,
        branchId: branch._id,
        hasActiveMembership: true,
      });
      assert.strictEqual(summaryVer.displayStatus, 'DEVICE_USER_READY');
      assert.strictEqual(summaryVer.faceEnrollmentStatus, 'PENDING');
      assert(summaryVer.lastSyncAt, 'verifiedAt must populate lastSyncAt');

      // Late duplicate ACK must not downgrade VERIFIED
      await biometricDeviceService.handleAdmsDeviceCmdResponse(
        deviceA.serialNumber,
        `ID=${job3.commandId}&Return=0&CMD=DATA`
      );
      const reloadedJob = await BiometricDeviceSyncJob.findById(job3._id);
      assert.strictEqual(reloadedJob.status, 'VERIFIED');
    });

    console.log(`\nALL ${passed} BIOMETRIC STATUS CORRECTION REGRESSION CHECKS PASSED!`);
  } finally {
    delete process.env.BIOMETRIC_REMOTE_USER_SYNC;
    delete process.env.ADMS_COMMAND_DISPATCH_ENABLED;
    await mongoose.disconnect();
    await mongod.stop();
  }
})().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
