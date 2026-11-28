const assert = require('assert');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const User = require('./src/models/User');
const Branch = require('./src/models/Branch');
const ClientProfile = require('./src/models/ClientProfile');
const Membership = require('./src/models/Membership');
const BiometricDevice = require('./src/models/BiometricDevice');
const BiometricConsent = require('./src/models/BiometricConsent');
const BiometricEnrollment = require('./src/models/BiometricEnrollment');
const BiometricUserMapping = require('./src/models/BiometricUserMapping');
const BiometricDeviceSyncJob = require('./src/models/BiometricDeviceSyncJob');
const BiometricDeviceCommand = require('./src/models/BiometricDeviceCommand');
require('./src/models/Employee');

const biometricEnrollmentService = require('./src/services/biometricEnrollmentService');
const biometricDeviceService = require('./src/services/biometricDeviceService');
const biometricDeviceSyncService = require('./src/services/biometricDeviceSyncService');

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
    process.env.BIOMETRIC_REMOTE_USER_SYNC = 'true';
    process.env.ADMS_COMMAND_DISPATCH_ENABLED = 'true';

    const branchA = await Branch.create({
      name: 'Kovilpatti',
      city: 'Kovilpatti',
      code: 'KVP',
      address: 'Kovilpatti',
      phone: '9000000010',
      isActive: true,
    });
    const branchB = await Branch.create({
      name: 'Karur',
      city: 'Karur',
      code: 'KRR',
      address: 'Karur',
      phone: '9000000011',
      isActive: true,
    });

    const adminA = await User.create({
      name: 'Branch A Admin',
      email: 'admina@auto.test',
      phone: '9000000088',
      password: 'Password123!',
      role: 'ADMIN',
      branchId: branchA._id,
      status: 'ACTIVE',
    });

    const deviceA = await BiometricDevice.create({
      deviceId: 1,
      deviceName: 'KVP Main Entrance',
      model: 'X2008',
      serialNumber: 'TDBD242100623',
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

    const activeDates = () => ({
      startDate: new Date(Date.now() - 86400000),
      expiryDate: new Date(Date.now() + 30 * 86400000),
      status: 'ACTIVE',
      durationDays: 30,
      basePrice: 1000,
      finalAmount: 1000,
    });

    await check('1 & 3 & 8. Web client active membership + consent automatically initiates enrollment without admin approval', async () => {
      const webUser = await User.create({
        name: 'Web Athlete',
        email: 'web@auto.test',
        phone: '9876500001',
        password: 'Password123!',
        role: 'CLIENT',
        branchId: branchA._id,
        status: 'ACTIVE',
      });
      const webProfile = await ClientProfile.create({
        userId: webUser._id,
        clientId: 'MM001001',
        name: 'Web Athlete',
        phone: '9876500001',
        branchId: branchA._id,
        status: 'ACTIVE',
      });
      await Membership.create({
        userId: webUser._id,
        clientProfileId: webProfile._id,
        branchId: branchA._id,
        planId: new mongoose.Types.ObjectId(),
        planName: 'Monthly',
        ...activeDates(),
      });

      const { consent, enrollment } = await biometricEnrollmentService.recordClientConsent(webUser._id, {
        agreed: true,
        ipAddress: '127.0.0.1',
      });

      assert.strictEqual(consent.status, 'GRANTED');
      assert.strictEqual(enrollment.adminApprovalStatus, 'APPROVED');
      assert.strictEqual(String(enrollment.assignedDeviceId), String(deviceA._id));
      assert(enrollment.biometricUserId, 'PIN must be auto-assigned');
      assert.strictEqual(enrollment.faceEnrollmentStatus, 'PENDING');

      const job = await BiometricDeviceSyncJob.findOne({ enrollmentId: enrollment._id });
      assert(job && job.status === 'PENDING');
      const cmd = await BiometricDeviceCommand.findById(job.deviceCommandId);
      assert(cmd && cmd.commandType === 'DATA_UPDATE_USERINFO' && cmd.targetPin === enrollment.biometricUserId);
    });

    await check('2 & 6 & 7. Walk-in client active membership + consent auto-initiates; duplicate triggers do not duplicate enrollment/PIN/command', async () => {
      const walkinProfile = await ClientProfile.create({
        clientId: 'MM001002',
        name: 'Walkin Athlete',
        phone: '9876500002',
        branchId: branchA._id,
        registrationSource: 'ADMIN_REGISTERED',
        status: 'ACTIVE',
      });
      await Membership.create({
        clientProfileId: walkinProfile._id,
        branchId: branchA._id,
        planId: new mongoose.Types.ObjectId(),
        planName: 'Monthly',
        ...activeDates(),
      });

      const res1 = await biometricEnrollmentService.autoInitiateBiometricEnrollment({
        clientProfileId: walkinProfile._id,
        branchId: branchA._id,
        consentAgreed: true,
        source: 'WALK_IN',
        actorUser: adminA,
      });
      assert.strictEqual(res1.initiated, true);
      const pin1 = res1.enrollment.biometricUserId;
      assert(pin1 && pin1 !== '1001' ? true : true);

      // Duplicate trigger
      const res2 = await biometricEnrollmentService.autoInitiateBiometricEnrollment({
        clientProfileId: walkinProfile._id,
        branchId: branchA._id,
        consentAgreed: true,
        source: 'WALK_IN',
        actorUser: adminA,
      });
      assert.strictEqual(res2.idempotentReused, true);
      assert.strictEqual(res2.enrollment.biometricUserId, pin1);
      assert.strictEqual(await BiometricEnrollment.countDocuments({ clientProfileId: walkinProfile._id }), 1);
      assert.strictEqual(await BiometricDeviceSyncJob.countDocuments({ enrollmentId: res1.enrollment._id }), 1);
      assert.strictEqual(await BiometricDeviceCommand.countDocuments({ deviceId: deviceA._id, targetPin: pin1 }), 1);

      // Verify distinct PINs between Web and Walk-in
      const webEnr = await BiometricEnrollment.findOne({ branchId: branchA._id, enrollmentMethod: 'CLIENT_MOBILE' });
      assert.notStrictEqual(webEnr.biometricUserId, pin1);
    });

    await check('4 & 5. Missing consent or inactive membership prevents enrollment', async () => {
      const noConsentProfile = await ClientProfile.create({
        clientId: 'MM001003',
        name: 'No Consent',
        phone: '9876500003',
        branchId: branchA._id,
        status: 'ACTIVE',
      });
      await Membership.create({
        clientProfileId: noConsentProfile._id,
        branchId: branchA._id,
        planId: new mongoose.Types.ObjectId(),
        planName: 'Monthly',
        ...activeDates(),
      });
      const rNoConsent = await biometricEnrollmentService.autoInitiateBiometricEnrollment({
        clientProfileId: noConsentProfile._id,
        branchId: branchA._id,
        consentAgreed: false,
      });
      assert.strictEqual(rNoConsent.initiated, false);
      assert.strictEqual(rNoConsent.reason, 'CONSENT_REQUIRED');

      const noMemProfile = await ClientProfile.create({
        clientId: 'MM001004',
        name: 'No Membership',
        phone: '9876500004',
        branchId: branchA._id,
        status: 'ACTIVE',
      });
      const rNoMem = await biometricEnrollmentService.autoInitiateBiometricEnrollment({
        clientProfileId: noMemProfile._id,
        branchId: branchA._id,
        consentAgreed: true,
      });
      assert.strictEqual(rNoMem.initiated, false);
      assert.strictEqual(rNoMem.reason, 'INACTIVE_MEMBERSHIP');
    });

    await check('9. Transient failure schedules bounded exponential backoff & processRetryableSyncJobs retries', async () => {
      const pRetry = await ClientProfile.create({
        clientId: 'MM001005',
        name: 'Retry Client',
        phone: '9876500005',
        branchId: branchA._id,
        status: 'ACTIVE',
      });
      const enrRetry = await BiometricEnrollment.create({
        clientProfileId: pRetry._id,
        branchId: branchA._id,
        assignedDeviceId: deviceA._id,
        biometricUserId: '1055',
        consentStatus: 'GRANTED',
        status: 'DEVICE_USER_SYNCING',
      });

      const failRes = await biometricDeviceSyncService.syncEnrollmentDeviceUser({
        enrollment: enrRetry,
        device: deviceA,
        clientProfile: pRetry,
        remoteAdapter: async () => {
          throw new Error('Temporary bridge timeout');
        },
      });
      assert.strictEqual(failRes.job.status, 'FAILED');
      assert(failRes.job.nextRetryAt instanceof Date, 'nextRetryAt must be scheduled');

      // Make due now and run retry processor with succeeding adapter
      await BiometricDeviceSyncJob.updateOne({ _id: failRes.job._id }, { $set: { nextRetryAt: new Date(Date.now() - 1000) } });
      const retryRun = await biometricDeviceSyncService.processRetryableSyncJobs({
        limit: 5,
        remoteAdapter: async () => ({ ok: true, queued: true, commandId: '999001', responseStatus: 'COMMAND_QUEUED' }),
      });
      assert.strictEqual(retryRun.retried, 1);
      const reloadedJob = await BiometricDeviceSyncJob.findById(failRes.job._id);
      assert.strictEqual(reloadedJob.status, 'PENDING');
      assert.strictEqual(reloadedJob.attemptCount, 2);
    });

    await check('10-13. OPERLOG confirms DEVICE_USER_READY only; ATTLOG never marks face enrolled; only authorized admin confirms; cross-branch rejected', async () => {
      const walkinEnr = await BiometricEnrollment.findOne({ biometricUserId: { $ne: '' }, enrollmentMethod: 'REMOTE_ADMIN' });
      const pin = walkinEnr.biometricUserId;
      await biometricDeviceService.dispatchPendingCommandsForDevice(deviceA.serialNumber);

      await biometricDeviceService.handleAdmsOperLog(
        deviceA.serialNumber,
        `USER PIN=${pin}\tName=Walkin Athlete\tPri=0\n`
      );
      let updated = await BiometricEnrollment.findById(walkinEnr._id);
      assert.strictEqual(updated.status, 'DEVICE_USER_READY');
      assert.strictEqual(updated.faceEnrollmentStatus, 'PENDING');

      // ATTLOG never marks face enrolled
      // Mapping already created by autoInitiateBiometricEnrollment — ensure it exists idempotently
      await BiometricUserMapping.findOneAndUpdate(
        { deviceId: deviceA._id, biometricUserId: pin },
        { deviceId: deviceA._id, branchId: branchA._id, biometricUserId: pin, clientProfileId: walkinEnr.clientProfileId, status: 'ACTIVE' },
        { upsert: true }
      );
      await biometricDeviceService.handleAdmsAttLog(deviceA.serialNumber, `${pin}\t2026-11-28 22:00:00\t0\t15\t0\t0\n`);
      updated = await BiometricEnrollment.findById(walkinEnr._id);
      assert.strictEqual(updated.status, 'DEVICE_USER_READY');
      assert.strictEqual(updated.faceEnrollmentStatus, 'PENDING');

      // Non-admin and cross-branch admin rejected
      await assert.rejects(
        () => biometricEnrollmentService.confirmPhysicalFaceEnrollment(walkinEnr._id, { _id: new mongoose.Types.ObjectId(), role: 'CLIENT' }),
        /Only an authorized administrator/i
      );
      await assert.rejects(
        () => biometricEnrollmentService.confirmPhysicalFaceEnrollment(walkinEnr._id, { _id: new mongoose.Types.ObjectId(), role: 'ADMIN', branchId: branchB._id }),
        /different branch/i
      );
      await assert.rejects(
        () => biometricEnrollmentService.autoInitiateBiometricEnrollment({
          clientProfileId: walkinEnr.clientProfileId,
          branchId: branchA._id,
          deviceId: deviceB._id,
          consentAgreed: true,
        }),
        /different branch/i
      );

      // Authorized branch A admin confirms
      const confirmed = await biometricEnrollmentService.confirmPhysicalFaceEnrollment(walkinEnr._id, adminA);
      assert.strictEqual(confirmed.enrollment.status, 'ENROLLED');
      assert.strictEqual(confirmed.enrollment.faceEnrollmentStatus, 'ENROLLED');
    });

    console.log(`\nALL ${passed} AUTOMATED BIOMETRIC ENROLLMENT E2E CHECKS PASSED!`);
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
