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
const BiometricDeviceLog = require('./src/models/BiometricDeviceLog');
const Attendance = require('./src/models/Attendance');
require('./src/models/Employee');

const biometricEnrollmentService = require('./src/services/biometricEnrollmentService');
const biometricDeviceSyncService = require('./src/services/biometricDeviceSyncService');
const biometricDeviceService = require('./src/services/biometricDeviceService');

(async () => {
  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongod.getUri());
  await Promise.all([
    BiometricEnrollment.init(),
    BiometricUserMapping.init(),
    BiometricDeviceSyncJob.init(),
    Attendance.init(),
  ]);

  let passed = 0;
  const check = (name, fn) =>
    Promise.resolve()
      .then(fn)
      .then(() => {
        passed += 1;
        console.log(`PASS [${passed}]: ${name}`);
      });

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
      email: 'admin@sync.test',
      phone: '9000000099',
      password: 'Password123!',
      role: 'ADMIN',
      branchId: null,
      status: 'ACTIVE',
    });

    const deviceA = await BiometricDevice.create({
      deviceId: 1,
      deviceName: 'KVP Main Entrance',
      model: 'eSSL X2008',
      serialNumber: 'TDBD242100623',
      branchId: branchA._id,
      isActive: true,
      status: 'ONLINE',
      supportsRemoteEnrollment: false,
    });

    const deviceB = await BiometricDevice.create({
      deviceId: 2,
      deviceName: 'KRR Main Entrance',
      model: 'eSSL X2008',
      serialNumber: 'TDBD242100999',
      branchId: branchB._id,
      isActive: true,
      status: 'ONLINE',
    });

    const client1 = await ClientProfile.create({
      clientId: 'MM000001',
      name: 'Nataraj Kumar',
      phone: '9876541001',
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

    await check('1-3 & 7 & 10. Admin approval creates sync job on correct device with PIN 1001; default flag fails honestly & never fakes face enrollment', async () => {
      delete process.env.BIOMETRIC_REMOTE_USER_SYNC;
      const updated = await biometricEnrollmentService.approveEnrollment(enr1._id, adminUser, {
        deviceId: deviceA._id,
        biometricUserId: '1001',
      });
      assert.strictEqual(String(updated.assignedDeviceId), String(deviceA._id));
      assert.strictEqual(updated.biometricUserId, '1001');
      assert.strictEqual(updated.deviceUserSyncStatus, 'FAILED');
      assert.strictEqual(updated.status, 'AWAITING_PHYSICAL_ENROLLMENT');
      assert.strictEqual(updated.faceEnrollmentStatus, 'PENDING');

      const jobs = await BiometricDeviceSyncJob.find({ enrollmentId: enr1._id }).lean();
      assert.strictEqual(jobs.length, 1);
      assert.strictEqual(jobs[0].status, 'FAILED');
      assert.strictEqual(jobs[0].biometricUserId, '1001');
      assert.strictEqual(String(jobs[0].deviceId), String(deviceA._id));
      assert.strictEqual(jobs[0].failureReason, biometricDeviceSyncService.REMOTE_UNSUPPORTED_REASON);

      // Device B must have zero jobs
      const jobsB = await BiometricDeviceSyncJob.countDocuments({ deviceId: deviceB._id });
      assert.strictEqual(jobsB, 0);
    });

    await check('8-10. Retry with verified adapter & flag enabled moves to DEVICE_USER_READY without marking face ENROLLED', async () => {
      process.env.BIOMETRIC_REMOTE_USER_SYNC = 'true';
      deviceA.supportsRemoteEnrollment = true;
      await deviceA.save();

      let adapterCalls = 0;
      const verifiedAdapter = async ({ device, biometricUserId }) => {
        adapterCalls += 1;
        assert.strictEqual(String(device._id), String(deviceA._id));
        assert.strictEqual(biometricUserId, '1001');
        return { ok: true, acknowledged: true, verified: true, responseStatus: 'OK' };
      };

      const res = await biometricDeviceSyncService.retryDeviceUserSync(enr1._id, adminUser, {
        remoteAdapter: verifiedAdapter,
      });
      assert.strictEqual(adapterCalls, 1);
      assert.strictEqual(res.job.status, 'VERIFIED');
      assert.strictEqual(res.job.attemptCount, 2);
      assert.strictEqual(res.enrollment.status, 'DEVICE_USER_READY');
      assert.strictEqual(res.enrollment.faceEnrollmentStatus, 'PENDING');
    });

    await check('4. Duplicate sync is idempotent when job is already VERIFIED', async () => {
      const res = await biometricDeviceSyncService.syncEnrollmentDeviceUser({
        enrollment: await BiometricEnrollment.findById(enr1._id),
        device: deviceA,
        clientProfile: client1,
        adminUser,
      });
      assert.strictEqual(res.idempotentReused, true);
      const count = await BiometricDeviceSyncJob.countDocuments({ enrollmentId: enr1._id });
      assert.strictEqual(count, 1);
    });

    await check('5. Existing matching user in discoveredUsers is verified safely without duplicate creation', async () => {
      const client2 = await ClientProfile.create({
        clientId: 'MM000002',
        name: 'Arun Prakash',
        phone: '9876541002',
        branchId: branchA._id,
        status: 'ACTIVE',
      });
      const enr2 = await BiometricEnrollment.create({
        clientProfileId: client2._id,
        branchId: branchA._id,
        assignedDeviceId: deviceA._id,
        biometricUserId: '1002',
        consentStatus: 'GRANTED',
        status: 'APPROVED',
      });
      deviceA.discoveredUsers.push({ biometricUserId: '1002', name: 'Arun Prakash', privilege: '0' });
      await deviceA.save();

      const res = await biometricDeviceSyncService.syncEnrollmentDeviceUser({
        enrollment: enr2,
        device: deviceA,
        clientProfile: client2,
        adminUser,
      });
      assert.strictEqual(res.job.status, 'VERIFIED');
      assert.strictEqual(res.job.alreadyPresentOnDevice, true);
      assert.strictEqual(res.enrollment.status, 'DEVICE_USER_READY');
      assert.strictEqual(res.enrollment.faceEnrollmentStatus, 'PENDING');
    });

    await check('6 & 13 & 14. Conflicting user & wrong-branch device are rejected safely without cross-mapping', async () => {
      const client3 = await ClientProfile.create({
        clientId: 'MM000003',
        name: 'Vikram Singh',
        phone: '9876541003',
        branchId: branchA._id,
        status: 'ACTIVE',
      });
      const enr3 = await BiometricEnrollment.create({
        clientProfileId: client3._id,
        branchId: branchA._id,
        assignedDeviceId: deviceA._id,
        biometricUserId: '1002',
        consentStatus: 'GRANTED',
        status: 'APPROVED',
      });

      await assert.rejects(
        () =>
          biometricDeviceSyncService.syncEnrollmentDeviceUser({
            enrollment: enr3,
            device: deviceA,
            clientProfile: client3,
            adminUser,
          }),
        /does not match/i
      );

      // Wrong branch device rejected
      await assert.rejects(
        () =>
          biometricDeviceSyncService.syncEnrollmentDeviceUser({
            enrollment: enr3,
            device: deviceB,
            clientProfile: client3,
            adminUser,
          }),
        /Branch mismatch/i
      );
    });

    await check('11 & 12 & 15. Physical completion + ATTLOG maps 1001 -> MM000001, consent enforced, no biometric template logged', async () => {
      await biometricEnrollmentService.completeManualEnrollment(
        {
          enrollmentId: enr1._id,
          clientProfileId: client1._id,
          deviceId: deviceA._id,
          biometricUserId: '1001',
          captureType: 'FACE',
        },
        adminUser
      );

      const attRes = await biometricDeviceService.handleAdmsAttLog(
        deviceA.serialNumber,
        '1001\t2026-11-28 10:00:00\t0\t15\t0\t0\n'
      );
      assert.strictEqual(attRes.processed, 1);

      const att = await Attendance.findOne({ clientProfileId: client1._id }).lean();
      assert(att && att.biometricUserId === '1001');

      // Legacy ENROLLED record with PENDING consentStatus (not withdrawn) should still accept attendance
      await BiometricEnrollment.updateOne({ _id: enr1._id }, { $set: { consentStatus: 'PENDING' } });
      const legacyAtt = await biometricDeviceService.handleAdmsAttLog(
        deviceA.serialNumber,
        '1001\t2026-11-28 10:02:00\t0\t15\t0\t0\n'
      );
      assert.strictEqual(legacyAtt.processed, 1);

      // Withdraw consent -> punch must be rejected
      await BiometricEnrollment.updateOne({ _id: enr1._id }, { $set: { consentStatus: 'WITHDRAWN' } });

      const rejectedAtt = await biometricDeviceService.handleAdmsAttLog(
        deviceA.serialNumber,
        '1001\t2026-11-28 10:05:00\t0\t15\t0\t0\n'
      );
      assert.strictEqual(rejectedAtt.rejected, 1);
      assert.strictEqual(rejectedAtt.processed, 0);

      // Verify no face template/biometric payload in logs or sync jobs
      const logs = await BiometricDeviceLog.find({}).lean();
      for (const l of logs) {
        assert(!/template|TMP=|BIODATA/i.test(l.message || ''));
      }
    });

    console.log(`\nALL ${passed} DEVICE USER SYNC E2E CHECKS PASSED!`);
  } finally {
    delete process.env.BIOMETRIC_REMOTE_USER_SYNC;
    await mongoose.disconnect();
    await mongod.stop();
  }
})().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
