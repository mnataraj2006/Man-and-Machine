const assert = require('assert');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const User = require('./src/models/User');
const Branch = require('./src/models/Branch');
const ClientProfile = require('./src/models/ClientProfile');
const BiometricDevice = require('./src/models/BiometricDevice');
const BiometricConsent = require('./src/models/BiometricConsent');
const BiometricEnrollment = require('./src/models/BiometricEnrollment');
const BiometricUserMapping = require('./src/models/BiometricUserMapping');
const BiometricDeviceSyncJob = require('./src/models/BiometricDeviceSyncJob');
const BiometricDeviceCommand = require('./src/models/BiometricDeviceCommand');
require('./src/models/Employee');

const biometricDeviceService = require('./src/services/biometricDeviceService');
const biometricDeviceSyncService = require('./src/services/biometricDeviceSyncService');
const biometricEnrollmentService = require('./src/services/biometricEnrollmentService');

(async () => {
  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongod.getUri());
  await Promise.all([
    BiometricEnrollment.init(),
    BiometricUserMapping.init(),
    BiometricDeviceSyncJob.init(),
    BiometricDeviceCommand.init(),
  ]);

  let passed = 0;
  const check = async (name, fn) => {
    await fn();
    passed += 1;
    console.log(`PASS [${passed}]: ${name}`);
  };

  try {
    const branchA = await Branch.create({
      name: 'Man & Machine Kovilpatti',
      city: 'Kovilpatti',
      code: 'KVP',
      address: 'Kovilpatti',
      phone: '9000000010',
      isActive: true,
    });
    const branchB = await Branch.create({
      name: 'Man & Machine Karur',
      city: 'Karur',
      code: 'KRR',
      address: 'Karur',
      phone: '9000000011',
      isActive: true,
    });

    const adminUser = await User.create({
      name: 'Super Admin',
      email: 'admin@remote.test',
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
      firmwareVersion: 'ZMM510-NF24VB-Ver1.3.13',
      branchId: branchA._id,
      isActive: true,
      status: 'ONLINE',
      supportsRemoteEnrollment: true,
    });

    const deviceB = await BiometricDevice.create({
      deviceId: 2,
      deviceName: 'KRR Main Entrance',
      model: 'X2008',
      serialNumber: 'TDBD242100999',
      branchId: branchB._id,
      isActive: true,
      status: 'ONLINE',
      supportsRemoteEnrollment: true,
    });

    await check('1. Unit: Command construction & sanitization', async () => {
      const built = biometricDeviceService.buildDataUpdateUserInfoPayload({
        pin: '1001',
        name: 'Ravi   Kumar!@#',
      });
      assert.strictEqual(built.cleanPin, '1001');
      assert.strictEqual(built.cleanName, 'Ravi Kumar');
      assert.strictEqual(
        built.payload,
        'DATA UPDATE USERINFO PIN=1001\tName=Ravi Kumar\tPrivilege=0\tCard=\tPasswd=\tGrp=1'
      );
      assert(biometricDeviceService.isValidDataUpdateUserInfoPayload(built.payload));

      // Long name truncated to 24 chars
      const longBuilt = biometricDeviceService.buildDataUpdateUserInfoPayload({
        pin: '1002',
        name: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234',
      });
      assert.strictEqual(longBuilt.cleanName.length, 24);
    });

    await check('2. Input validation: Reject invalid PINs, CR/LF injection, and forbidden commands', async () => {
      for (const badPin of ['', '0', '-1', '0123', 'abc', '1234567890', '1001\nCLEAR']) {
        assert.throws(() => biometricDeviceService.validateNumericPin(badPin), /Invalid biometric PIN/);
      }
      for (const badName of ['', '   ', '!!!', 'Ravi\nC:1:CLEAR', 'Ravi\r\nName=X', 'Ravi\tPin=2', 'Ravi\0']) {
        assert.throws(() => biometricDeviceService.sanitizeDeviceUserName(badName), /Invalid client name/);
      }

      process.env.BIOMETRIC_REMOTE_USER_SYNC = 'true';
      // Arbitrary rawCommand rejected for DATA_UPDATE_USERINFO
      await assert.rejects(
        () =>
          biometricDeviceService.queueDeviceCommand(
            deviceA._id,
            { commandType: 'DATA_UPDATE_USERINFO', pin: '1001', name: 'Ravi', rawCommand: 'CLEAR ALL' },
            adminUser
          ),
        /prohibited/i
      );
      // Destructive commands rejected
      for (const badType of ['CLEAR_DATA', 'DELETE_USER', 'RESET', 'DATA_UPDATE', 'REBOOT', 'ENROLL', 'SET_OPTION']) {
        await assert.rejects(
          () => biometricDeviceService.queueDeviceCommand(deviceA._id, { commandType: badType }, adminUser),
          /prohibited/i
        );
      }
      // Disabled feature flag blocks queueing
      delete process.env.BIOMETRIC_REMOTE_USER_SYNC;
      await assert.rejects(
        () =>
          biometricDeviceService.queueDeviceCommand(
            deviceA._id,
            { commandType: 'DATA_UPDATE_USERINFO', pin: '1001', name: 'Ravi' },
            adminUser
          ),
        /disabled/i
      );
    });

    await check('3. Full lifecycle: Approve -> PENDING -> SENT -> ACKNOWLEDGED (Return=0) -> VERIFIED (OPERLOG)', async () => {
      process.env.BIOMETRIC_REMOTE_USER_SYNC = 'true';
      process.env.ADMS_COMMAND_DISPATCH_ENABLED = 'true';

      const client1 = await ClientProfile.create({
        clientId: 'MM000101',
        name: 'Ravi Kumar',
        phone: '9876540101',
        branchId: branchA._id,
        status: 'ACTIVE',
      });
      const consent1 = await BiometricConsent.create({
        clientProfileId: client1._id,
        branchId: branchA._id,
        consentGiven: true,
        status: 'GRANTED',
      });
      const enr1 = await BiometricEnrollment.create({
        clientProfileId: client1._id,
        branchId: branchA._id,
        consentId: consent1._id,
        consentStatus: 'GRANTED',
        status: 'CAPTURE_SUBMITTED',
        mobileCaptureStatus: 'CAPTURED',
      });

      // Step A: Admin approves -> assigns PIN 1001, queues DATA_UPDATE_USERINFO
      const approved = await biometricEnrollmentService.approveEnrollment(enr1._id, adminUser, {
        deviceId: deviceA._id,
        biometricUserId: '1001',
      });
      assert.strictEqual(approved.biometricUserId, '1001');

      let job = await BiometricDeviceSyncJob.findOne({ enrollmentId: enr1._id });
      assert.strictEqual(job.status, 'PENDING');
      assert(job.commandId && /^\d{1,10}$/.test(job.commandId));
      assert(Number(job.commandId) <= 2147483647, 'Command ID must be 32-bit signed int safe');

      let cmd = await BiometricDeviceCommand.findById(job.deviceCommandId);
      assert.strictEqual(cmd.status, 'PENDING');
      assert.strictEqual(cmd.commandType, 'DATA_UPDATE_USERINFO');
      assert.strictEqual(
        cmd.commandPayload,
        'DATA UPDATE USERINFO PIN=1001\tName=Ravi Kumar\tPrivilege=0\tCard=\tPasswd=\tGrp=1'
      );

      // Step B: Device polls getrequest -> SENT
      const dispatched = await biometricDeviceService.dispatchPendingCommandsForDevice(deviceA.serialNumber);
      assert.strictEqual(dispatched.commandLines.length, 1);
      assert.strictEqual(
        dispatched.commandLines[0],
        `C:${cmd.commandId}:DATA UPDATE USERINFO PIN=1001\tName=Ravi Kumar\tPrivilege=0\tCard=\tPasswd=\tGrp=1`
      );
      job = await BiometricDeviceSyncJob.findById(job._id);
      assert.strictEqual(job.status, 'SENT');

      // Step C: Device sends Return=0 -> ACKNOWLEDGED only (NOT VERIFIED, NOT DEVICE_USER_READY)
      const ackRes = await biometricDeviceService.handleAdmsDeviceCmdResponse(
        deviceA.serialNumber,
        `ID=${cmd.commandId}&Return=0&CMD=DATA`
      );
      assert.strictEqual(ackRes.processed, 1);

      cmd = await BiometricDeviceCommand.findById(cmd._id);
      assert.strictEqual(cmd.status, 'ACKNOWLEDGED');
      job = await BiometricDeviceSyncJob.findById(job._id);
      assert.strictEqual(job.status, 'ACKNOWLEDGED');
      let enrAfterAck = await BiometricEnrollment.findById(enr1._id);
      assert.strictEqual(enrAfterAck.deviceUserSyncStatus, 'ACKNOWLEDGED');
      assert.strictEqual(enrAfterAck.status, 'AWAITING_PHYSICAL_ENROLLMENT');
      assert.strictEqual(enrAfterAck.faceEnrollmentStatus, 'PENDING');

      // Step D: Duplicate ack is idempotent
      const dupAck = await biometricDeviceService.handleAdmsDeviceCmdResponse(
        deviceA.serialNumber,
        `ID=${cmd.commandId}&Return=0&CMD=DATA`
      );
      assert.strictEqual(dupAck.processed, 0);

      // Step E: Repeated approval creates NO duplicate command or sync job
      await biometricEnrollmentService.approveEnrollment(enr1._id, adminUser, {
        deviceId: deviceA._id,
        biometricUserId: '1001',
      });
      assert.strictEqual(await BiometricDeviceSyncJob.countDocuments({ enrollmentId: enr1._id }), 1);
      assert.strictEqual(await BiometricDeviceCommand.countDocuments({ syncJobId: job._id }), 1);

      // Step F: Independent OPERLOG confirms user on deviceA -> VERIFIED & DEVICE_USER_READY (face still PENDING)
      await biometricDeviceService.handleAdmsOperLog(
        deviceA.serialNumber,
        'USER PIN=1001\tName=Ravi Kumar\tPri=0\n'
      );
      job = await BiometricDeviceSyncJob.findById(job._id);
      assert.strictEqual(job.status, 'VERIFIED');
      const enrVerified = await BiometricEnrollment.findById(enr1._id);
      assert.strictEqual(enrVerified.status, 'DEVICE_USER_READY');
      assert.strictEqual(enrVerified.deviceUserSyncStatus, 'VERIFIED');
      assert.strictEqual(enrVerified.faceEnrollmentStatus, 'PENDING');

      // Step G: Duplicate OPERLOG does not duplicate history
      const histLen = enrVerified.history.length;
      await biometricDeviceService.handleAdmsOperLog(
        deviceA.serialNumber,
        'USER PIN=1001\tName=Ravi Kumar\tPri=0\n'
      );
      const enrAfterDupOper = await BiometricEnrollment.findById(enr1._id);
      assert.strictEqual(enrAfterDupOper.history.length, histLen);
    });

    await check('4. Invalid acknowledgement (Return=-1002) marks FAILED and preserves manual fallback', async () => {
      const client2 = await ClientProfile.create({
        clientId: 'MM000102',
        name: 'Karthik Raja',
        phone: '9876540102',
        branchId: branchA._id,
        status: 'ACTIVE',
      });
      const enr2 = await BiometricEnrollment.create({
        clientProfileId: client2._id,
        branchId: branchA._id,
        consentStatus: 'GRANTED',
        status: 'CAPTURE_SUBMITTED',
      });

      await biometricEnrollmentService.approveEnrollment(enr2._id, adminUser, {
        deviceId: deviceA._id,
        biometricUserId: '1002',
      });
      await biometricDeviceService.dispatchPendingCommandsForDevice(deviceA.serialNumber);
      const job2 = await BiometricDeviceSyncJob.findOne({ enrollmentId: enr2._id });

      await biometricDeviceService.handleAdmsDeviceCmdResponse(
        deviceA.serialNumber,
        `ID=${job2.commandId}&Return=-1002&CMD=DATA`
      );
      const updatedJob2 = await BiometricDeviceSyncJob.findById(job2._id);
      assert.strictEqual(updatedJob2.status, 'FAILED');
      const updatedEnr2 = await BiometricEnrollment.findById(enr2._id);
      assert.strictEqual(updatedEnr2.deviceUserSyncStatus, 'FAILED');
      assert.strictEqual(updatedEnr2.status, 'AWAITING_PHYSICAL_ENROLLMENT');
    });

    await check('5. Wrong-device, wrong-PIN, name-mismatch, and out-of-order OPERLOG checks', async () => {
      const client3 = await ClientProfile.create({
        clientId: 'MM000103',
        name: 'Suresh Babu',
        phone: '9876540103',
        branchId: branchA._id,
        status: 'ACTIVE',
      });
      const enr3 = await BiometricEnrollment.create({
        clientProfileId: client3._id,
        branchId: branchA._id,
        consentStatus: 'GRANTED',
        status: 'CAPTURE_SUBMITTED',
      });
      await biometricEnrollmentService.approveEnrollment(enr3._id, adminUser, {
        deviceId: deviceA._id,
        biometricUserId: '1003',
      });
      await biometricDeviceService.dispatchPendingCommandsForDevice(deviceA.serialNumber);
      let job3 = await BiometricDeviceSyncJob.findOne({ enrollmentId: enr3._id });
      assert.strictEqual(job3.status, 'SENT');

      // Wrong device (deviceB) OPERLOG must NOT verify deviceA's job
      await biometricDeviceService.handleAdmsOperLog(
        deviceB.serialNumber,
        'USER PIN=1003\tName=Suresh Babu\tPri=0\n'
      );
      job3 = await BiometricDeviceSyncJob.findById(job3._id);
      assert.strictEqual(job3.status, 'SENT');

      // Wrong PIN OPERLOG on deviceA must NOT verify
      await biometricDeviceService.handleAdmsOperLog(
        deviceA.serialNumber,
        'USER PIN=1099\tName=Suresh Babu\tPri=0\n'
      );
      job3 = await BiometricDeviceSyncJob.findById(job3._id);
      assert.strictEqual(job3.status, 'SENT');

      // Name mismatch OPERLOG must NOT verify
      await biometricDeviceService.handleAdmsOperLog(
        deviceA.serialNumber,
        'USER PIN=1003\tName=Different Person\tPri=0\n'
      );
      job3 = await BiometricDeviceSyncJob.findById(job3._id);
      assert.strictEqual(job3.status, 'SENT');

      // Out-of-order matching OPERLOG while SENT promotes to VERIFIED, and late Return=0 does NOT downgrade!
      await biometricDeviceService.handleAdmsOperLog(
        deviceA.serialNumber,
        'USER PIN=1003\tName=Suresh Babu\tPri=0\n'
      );
      job3 = await BiometricDeviceSyncJob.findById(job3._id);
      assert.strictEqual(job3.status, 'VERIFIED');

      await biometricDeviceService.handleAdmsDeviceCmdResponse(
        deviceA.serialNumber,
        `ID=${job3.commandId}&Return=0&CMD=DATA`
      );
      job3 = await BiometricDeviceSyncJob.findById(job3._id);
      assert.strictEqual(job3.status, 'VERIFIED', 'Late Return=0 must not downgrade VERIFIED');
    });

    await check('6. Retry & Expiry: stale SENT retries then fails; expired command fails linked syncJob', async () => {
      const client4 = await ClientProfile.create({
        clientId: 'MM000104',
        name: 'Manoj Tiwari',
        phone: '9876540104',
        branchId: branchA._id,
        status: 'ACTIVE',
      });
      const enr4 = await BiometricEnrollment.create({
        clientProfileId: client4._id,
        branchId: branchA._id,
        consentStatus: 'GRANTED',
        status: 'CAPTURE_SUBMITTED',
      });
      await biometricEnrollmentService.approveEnrollment(enr4._id, adminUser, {
        deviceId: deviceA._id,
        biometricUserId: '1004',
      });
      await biometricDeviceService.dispatchPendingCommandsForDevice(deviceA.serialNumber);

      let job4 = await BiometricDeviceSyncJob.findOne({ enrollmentId: enr4._id });
      let cmd4 = await BiometricDeviceCommand.findById(job4.deviceCommandId);

      // Force stale sentAt + exhausted retries
      cmd4.sentAt = new Date(Date.now() - 300 * 1000);
      cmd4.retryCount = cmd4.maxRetries;
      await cmd4.save();

      await biometricDeviceService.dispatchPendingCommandsForDevice(deviceA.serialNumber);
      cmd4 = await BiometricDeviceCommand.findById(cmd4._id);
      job4 = await BiometricDeviceSyncJob.findById(job4._id);
      assert.strictEqual(cmd4.status, 'FAILED');
      assert.strictEqual(job4.status, 'FAILED');

      // Expiry test
      const cmdExp = await biometricDeviceService.queueDeviceCommand(
        deviceA._id,
        { commandType: 'DATA_UPDATE_USERINFO', pin: '1005', name: 'Expired Test', syncJobId: job4._id },
        adminUser
      );
      cmdExp.expiresAt = new Date(Date.now() - 1000);
      await cmdExp.save();
      await biometricDeviceService.dispatchPendingCommandsForDevice(deviceA.serialNumber);
      const reloadedExp = await BiometricDeviceCommand.findById(cmdExp._id);
      assert.strictEqual(reloadedExp.status, 'EXPIRED');
    });

    await check('7. Test-only mode: reserved test PIN 9999 only, rejects client PINs', async () => {
      // Non-reserved PIN rejected
      await assert.rejects(
        () =>
          biometricDeviceService.queueTestDeviceUserCommand(
            deviceA._id,
            { pin: '1001', name: 'ADMS Test User' },
            adminUser
          ),
        /reserved test PIN/i
      );

      // Reserved test PIN 9999 succeeds when unused
      const testCmd = await biometricDeviceService.queueTestDeviceUserCommand(
        deviceA._id,
        { pin: '9999', name: 'ADMS Test User' },
        adminUser
      );
      assert.strictEqual(testCmd.isTestCommand, true);
      assert.strictEqual(testCmd.targetPin, '9999');
      assert.strictEqual(
        testCmd.commandPayload,
        'DATA UPDATE USERINFO PIN=9999\tName=ADMS Test User\tPrivilege=0\tCard=\tPasswd=\tGrp=1'
      );

      // If 9999 is mapped to a client, test mode refuses to reuse it
      await BiometricUserMapping.create({
        deviceId: deviceA._id,
        branchId: branchA._id,
        biometricUserId: '9999',
        clientProfileId: new mongoose.Types.ObjectId(),
        status: 'ACTIVE',
      });
      await assert.rejects(
        () =>
          biometricDeviceService.queueTestDeviceUserCommand(
            deviceA._id,
            { pin: '9999', name: 'ADMS Test User' },
            adminUser
          ),
        /already in use/i
      );
    });

    console.log(`\nALL ${passed} ADMS REMOTE USER CREATION E2E CHECKS PASSED!`);
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
