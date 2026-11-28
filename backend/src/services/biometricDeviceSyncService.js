const mongoose = require('mongoose');
const BiometricDevice = require('../models/BiometricDevice');
const BiometricEnrollment = require('../models/BiometricEnrollment');
const BiometricUserMapping = require('../models/BiometricUserMapping');
const BiometricDeviceSyncJob = require('../models/BiometricDeviceSyncJob');
const BiometricDeviceLog = require('../models/BiometricDeviceLog');
const BiometricDeviceCommand = require('../models/BiometricDeviceCommand');
const {
  assertAdminBranchAccess,
  ALLOWED_REMOTE_USER_COMMAND,
  queueDeviceCommand,
} = require('./biometricDeviceService');

const REMOTE_UNSUPPORTED_REASON =
  'Remote device-user creation is not supported/verified for this X2008 firmware. Manual device-user creation remains required.';

const isRemoteUserSyncEnabled = () => process.env.BIOMETRIC_REMOTE_USER_SYNC === 'true';

const normalizeNameTokens = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);

const namesRoughlyMatch = (a, b) => {
  const ta = normalizeNameTokens(a);
  const tb = normalizeNameTokens(b);
  if (ta.length === 0 || tb.length === 0) return false; // Missing device name must not count as a confirmed match
  return ta.some((t) => tb.includes(t));
};

const admsRemoteAdapter = async ({ device, biometricUserId, name, syncJob = null, adminUser = null }) => {
  const cleanPin = String(biometricUserId || '').trim();
  const existingActiveCmd = await BiometricDeviceCommand.findOne({
    deviceId: device._id,
    commandType: ALLOWED_REMOTE_USER_COMMAND,
    targetPin: cleanPin,
    status: { $in: ['PENDING', 'SENT', 'ACKNOWLEDGED'] },
  }).sort({ createdAt: -1 });

  if (existingActiveCmd) {
    return {
      ok: true,
      queued: existingActiveCmd.status === 'PENDING' || existingActiveCmd.status === 'SENT',
      acknowledged: existingActiveCmd.status === 'ACKNOWLEDGED',
      verified: false,
      reusedCommand: true,
      commandId: existingActiveCmd.commandId,
      deviceCommandId: existingActiveCmd._id,
      responseStatus: 'COMMAND_REUSED',
    };
  }

  const cmd = await queueDeviceCommand(
    device._id,
    {
      commandType: ALLOWED_REMOTE_USER_COMMAND,
      pin: cleanPin,
      name,
      syncJobId: syncJob?._id || null,
    },
    adminUser
  );

  return {
    ok: true,
    queued: true,
    acknowledged: false,
    verified: false,
    commandId: cmd.commandId,
    deviceCommandId: cmd._id,
    responseStatus: 'COMMAND_QUEUED',
  };
};

const syncEnrollmentDeviceUser = async ({
  enrollment,
  device,
  clientProfile,
  adminUser = null,
  forceRetry = false,
  remoteAdapter = null,
}) => {
  if (!enrollment || !device || !clientProfile) {
    const err = new Error('Enrollment, device, and client profile are required for device user sync.');
    err.statusCode = 400;
    throw err;
  }

  const cleanBioId = String(enrollment.biometricUserId || '').trim();
  if (!cleanBioId) {
    const err = new Error('Biometric User ID must be assigned before syncing to device.');
    err.statusCode = 400;
    throw err;
  }

  if (String(device.branchId) !== String(enrollment.branchId)) {
    const err = new Error('Branch mismatch: device belongs to a different branch than the enrollment.');
    err.statusCode = 409;
    throw err;
  }

  // 1. Verify no active mapping conflict on this device
  const existingMapping = await BiometricUserMapping.findOne({
    deviceId: device._id,
    biometricUserId: cleanBioId,
    status: 'ACTIVE',
  }).lean();

  if (
    existingMapping &&
    (existingMapping.subjectType === 'EMPLOYEE' ||
      String(existingMapping.clientProfileId) !== String(clientProfile._id))
  ) {
    const err = new Error(
      `Biometric ID ${cleanBioId} is already mapped to another user on ${device.deviceName}.`
    );
    err.statusCode = 409;
    throw err;
  }

  // 2. Idempotency: reuse existing active/verified sync job unless forceRetry is requested
  if (!forceRetry) {
    const existingJob = await BiometricDeviceSyncJob.findOne({
      enrollmentId: enrollment._id,
      deviceId: device._id,
      biometricUserId: cleanBioId,
      status: { $in: ['PENDING', 'SENT', 'ACKNOWLEDGED', 'VERIFIED'] },
    }).sort({ createdAt: -1 });

    if (existingJob) {
      return { job: existingJob, enrollment, idempotentReused: true };
    }
  }

  const now = new Date();
  const discovered = (device.discoveredUsers || []).find(
    (u) => String(u.biometricUserId || '').trim() === cleanBioId
  );

  // 3. If user already exists on the device, verify identity instead of creating a duplicate
  if (discovered) {
    const alreadyMappedToThisClient =
      existingMapping && String(existingMapping.clientProfileId) === String(clientProfile._id);
    const hasDeviceName = Boolean(discovered.name && String(discovered.name).trim());

    if (!alreadyMappedToThisClient && !hasDeviceName) {
      const unverifiedReason = `Device user PIN ${cleanBioId} exists on ${device.deviceName} without a user name. Admin verification is required before marking DEVICE_USER_READY.`;
      const pendingJob = await BiometricDeviceSyncJob.create({
        enrollmentId: enrollment._id,
        clientProfileId: clientProfile._id,
        deviceId: device._id,
        branchId: device.branchId,
        biometricUserId: cleanBioId,
        clientName: clientProfile.name || '',
        operation: 'VERIFY_DEVICE_USER',
        status: 'PENDING',
        attemptCount: 1,
        lastAttemptAt: now,
        responseStatus: 'IDENTITY_UNVERIFIED',
        failureReason: unverifiedReason,
        alreadyPresentOnDevice: true,
        createdBy: adminUser?._id || null,
      });

      const prevStatus = enrollment.status;
      enrollment.deviceUserSyncJobId = pendingJob._id;
      enrollment.deviceUserSyncStatus = 'PENDING';
      enrollment.deviceUserSyncError = unverifiedReason;
      if (!['ENROLLED', 'REVOKED'].includes(enrollment.status)) {
        enrollment.status = 'AWAITING_PHYSICAL_ENROLLMENT';
        enrollment.faceEnrollmentStatus = 'PENDING';
      }
      enrollment.history.push({
        action: 'DEVICE_USER_IDENTITY_UNVERIFIED',
        fromStatus: prevStatus,
        toStatus: enrollment.status,
        actorUserId: adminUser?._id || null,
        note: unverifiedReason,
      });
      await enrollment.save();

      return { job: pendingJob, enrollment, idempotentReused: false };
    }

    if (!alreadyMappedToThisClient && hasDeviceName && !namesRoughlyMatch(discovered.name, clientProfile.name)) {
      const conflictReason = `Existing device user "${discovered.name}" for PIN ${cleanBioId} on ${device.deviceName} does not match ${clientProfile.name}.`;
      const prevStatus = enrollment.status;
      const failedJob = await BiometricDeviceSyncJob.create({
        enrollmentId: enrollment._id,
        clientProfileId: clientProfile._id,
        deviceId: device._id,
        branchId: device.branchId,
        biometricUserId: cleanBioId,
        clientName: clientProfile.name || '',
        operation: 'VERIFY_DEVICE_USER',
        status: 'FAILED',
        attemptCount: 1,
        lastAttemptAt: now,
        responseStatus: 'IDENTITY_CONFLICT',
        failureReason: conflictReason,
        createdBy: adminUser?._id || null,
      });

      enrollment.deviceUserSyncJobId = failedJob._id;
      enrollment.deviceUserSyncStatus = 'FAILED';
      enrollment.deviceUserSyncError = conflictReason;
      enrollment.status = 'FAILED';
      enrollment.failureReason = conflictReason;
      enrollment.history.push({
        action: 'DEVICE_USER_SYNC_CONFLICT',
        fromStatus: prevStatus,
        toStatus: 'FAILED',
        actorUserId: adminUser?._id || null,
        note: conflictReason,
      });
      await enrollment.save();

      const err = new Error(conflictReason);
      err.statusCode = 409;
      throw err;
    }

    const verifiedJob = await BiometricDeviceSyncJob.create({
      enrollmentId: enrollment._id,
      clientProfileId: clientProfile._id,
      deviceId: device._id,
      branchId: device.branchId,
      biometricUserId: cleanBioId,
      clientName: clientProfile.name || '',
      operation: 'VERIFY_DEVICE_USER',
      status: 'VERIFIED',
      attemptCount: 1,
      lastAttemptAt: now,
      responseStatus: 'EXISTING_DEVICE_USER_MATCHED',
      verifiedAt: now,
      alreadyPresentOnDevice: true,
      createdBy: adminUser?._id || null,
    });

    const prevStatus = enrollment.status;
    enrollment.deviceUserSyncJobId = verifiedJob._id;
    enrollment.deviceUserSyncStatus = 'VERIFIED';
    enrollment.deviceUserSyncError = '';
    if (enrollment.status !== 'ENROLLED') {
      enrollment.status = 'DEVICE_USER_READY';
      enrollment.faceEnrollmentStatus = 'PENDING';
    }
    enrollment.history.push({
      action: 'DEVICE_USER_VERIFIED',
      fromStatus: prevStatus,
      toStatus: enrollment.status,
      actorUserId: adminUser?._id || null,
      note: `Biometric ID ${cleanBioId} verified on ${device.deviceName}. Client may now enroll face physically.`,
    });
    await enrollment.save();

    await BiometricDeviceLog.create({
      deviceId: device._id,
      branchId: device.branchId,
      category: 'USER_SYNC',
      status: 'SUCCESS',
      action: 'DEVICE_USER_VERIFIED',
      message: `Verified existing Biometric ID ${cleanBioId} for ${clientProfile.name} on ${device.deviceName}.`,
      actorUserId: adminUser?._id || null,
    });

    return { job: verifiedJob, enrollment, idempotentReused: false };
  }

  // 4. Create or retry CREATE_DEVICE_USER job
  let job = await BiometricDeviceSyncJob.findOne({
    enrollmentId: enrollment._id,
    deviceId: device._id,
    biometricUserId: cleanBioId,
    operation: 'CREATE_DEVICE_USER',
  }).sort({ createdAt: -1 });

  if (!job) {
    job = new BiometricDeviceSyncJob({
      enrollmentId: enrollment._id,
      clientProfileId: clientProfile._id,
      deviceId: device._id,
      branchId: device.branchId,
      biometricUserId: cleanBioId,
      clientName: clientProfile.name || '',
      operation: 'CREATE_DEVICE_USER',
      status: 'PENDING',
      createdBy: adminUser?._id || null,
    });
  }

  job.attemptCount += 1;
  job.lastAttemptAt = now;

  const effectiveAdapter = typeof remoteAdapter === 'function' ? remoteAdapter : admsRemoteAdapter;

  // Honest firmware & feature-flag guard: never fake device user creation
  if (!isRemoteUserSyncEnabled() || !device.supportsRemoteEnrollment) {
    job.status = 'FAILED';
    job.responseStatus = !isRemoteUserSyncEnabled() ? 'FEATURE_DISABLED' : 'FIRMWARE_UNSUPPORTED';
    job.failureReason = REMOTE_UNSUPPORTED_REASON;
    await job.save();

    const prevStatus = enrollment.status;
    enrollment.deviceUserSyncJobId = job._id;
    enrollment.deviceUserSyncStatus = 'FAILED';
    enrollment.deviceUserSyncError = REMOTE_UNSUPPORTED_REASON;
    if (!['ENROLLED', 'REVOKED'].includes(enrollment.status)) {
      enrollment.status = 'AWAITING_PHYSICAL_ENROLLMENT';
      enrollment.faceEnrollmentStatus = 'PENDING';
    }
    enrollment.history.push({
      action: 'DEVICE_USER_SYNC_UNSUPPORTED',
      fromStatus: prevStatus,
      toStatus: enrollment.status,
      actorUserId: adminUser?._id || null,
      note: REMOTE_UNSUPPORTED_REASON,
    });
    await enrollment.save();

    await BiometricDeviceLog.create({
      deviceId: device._id,
      branchId: device.branchId,
      category: 'USER_SYNC',
      status: 'WARNING',
      action: 'DEVICE_USER_SYNC_UNSUPPORTED',
      message: `PIN ${cleanBioId} (${clientProfile.name}): ${REMOTE_UNSUPPORTED_REASON}`,
      actorUserId: adminUser?._id || null,
    });

    return { job, enrollment, idempotentReused: false };
  }

  // Verified remote sync execution path (only when feature flag + firmware support are active)
  job.status = 'PENDING';
  job.failureReason = '';
  await job.save();

  try {
    const adapterRes = await effectiveAdapter({
      device,
      biometricUserId: cleanBioId,
      name: clientProfile.name || '',
      privilege: '0',
      syncJob: job,
      adminUser,
    });

    if (!adapterRes || !adapterRes.ok) {
      throw new Error(adapterRes?.error || 'Device rejected remote user creation.');
    }

    const isVerifiedOnDevice = Boolean(adapterRes.verified);
    const isQueuedForPoll = Boolean(adapterRes.queued) && !adapterRes.acknowledged && !isVerifiedOnDevice;

    job.status = isVerifiedOnDevice ? 'VERIFIED' : isQueuedForPoll ? 'PENDING' : 'ACKNOWLEDGED';
    job.responseStatus = adapterRes.responseStatus || 'OK';
    job.failureReason = '';
    if (adapterRes.commandId) job.commandId = String(adapterRes.commandId);
    if (adapterRes.deviceCommandId) job.deviceCommandId = adapterRes.deviceCommandId;
    if (job.status === 'ACKNOWLEDGED') job.acknowledgedAt = new Date();
    if (isVerifiedOnDevice) job.verifiedAt = new Date();
    await job.save();

    const prevStatus = enrollment.status;
    enrollment.deviceUserSyncJobId = job._id;
    enrollment.deviceUserSyncStatus = job.status;
    enrollment.deviceUserSyncError = '';
    if (enrollment.faceEnrollmentStatus !== 'ENROLLED') {
      enrollment.faceEnrollmentStatus = 'PENDING'; // Never falsely mark face enrolled after user creation
    }

    if (isVerifiedOnDevice) {
      enrollment.status = 'DEVICE_USER_READY';
      enrollment.history.push({
        action: 'DEVICE_USER_SYNCED',
        fromStatus: prevStatus,
        toStatus: 'DEVICE_USER_READY',
        actorUserId: adminUser?._id || null,
        note: `Device user ${cleanBioId} verified on ${device.deviceName}. Awaiting physical face enrollment.`,
      });
    } else if (isQueuedForPoll) {
      enrollment.status = 'AWAITING_PHYSICAL_ENROLLMENT';
      enrollment.history.push({
        action: 'DEVICE_USER_SYNC_QUEUED',
        fromStatus: prevStatus,
        toStatus: 'AWAITING_PHYSICAL_ENROLLMENT',
        actorUserId: adminUser?._id || null,
        note: `Queued DATA UPDATE USERINFO for PIN ${cleanBioId} on ${device.deviceName} (CMD ${job.commandId || 'pending'}).`,
      });
    } else {
      enrollment.status = 'AWAITING_PHYSICAL_ENROLLMENT';
      enrollment.history.push({
        action: 'DEVICE_USER_SYNC_ACKNOWLEDGED',
        fromStatus: prevStatus,
        toStatus: 'AWAITING_PHYSICAL_ENROLLMENT',
        actorUserId: adminUser?._id || null,
        note: `Device user ${cleanBioId} command acknowledged by ${device.deviceName}. Awaiting OPERLOG confirmation before marking READY.`,
      });
    }
    await enrollment.save();

    await BiometricDeviceLog.create({
      deviceId: device._id,
      branchId: device.branchId,
      category: 'USER_SYNC',
      status: 'SUCCESS',
      action: isQueuedForPoll ? 'DEVICE_USER_SYNC_QUEUED' : 'DEVICE_USER_SYNCED',
      message: `Device user ${cleanBioId} sync ${job.status} on ${device.deviceName}.`,
      actorUserId: adminUser?._id || null,
    });

    return { job, enrollment, idempotentReused: false };
  } catch (syncErr) {
    job.status = 'FAILED';
    job.responseStatus = 'ERROR';
    job.failureReason = syncErr.message || 'Remote device user sync failed.';
    const maxAttempts = job.maxAttempts || 5;
    if (job.attemptCount < maxAttempts) {
      const backoffMs = Math.min(30 * 60 * 1000, 30 * 1000 * Math.pow(2, Math.max(0, job.attemptCount - 1)));
      job.nextRetryAt = new Date(Date.now() + backoffMs);
    } else {
      job.nextRetryAt = null;
    }
    await job.save();

    const prevStatus = enrollment.status;
    enrollment.deviceUserSyncJobId = job._id;
    enrollment.deviceUserSyncStatus = 'FAILED';
    enrollment.deviceUserSyncError = job.failureReason;
    // Keep manual physical enrollment fallback available on failed remote dispatch
    if (!['ENROLLED', 'REVOKED', 'REJECTED'].includes(enrollment.status)) {
      enrollment.status = 'AWAITING_PHYSICAL_ENROLLMENT';
      if (enrollment.faceEnrollmentStatus !== 'ENROLLED') {
        enrollment.faceEnrollmentStatus = 'PENDING';
      }
    }
    enrollment.failureReason = job.failureReason;
    enrollment.history.push({
      action: 'DEVICE_USER_SYNC_FAILED',
      fromStatus: prevStatus,
      toStatus: enrollment.status,
      actorUserId: adminUser?._id || null,
      note: job.failureReason,
    });
    await enrollment.save();

    return { job, enrollment, idempotentReused: false };
  }
};

const retryDeviceUserSync = async (enrollmentId, adminUser = null, { remoteAdapter = null } = {}) => {
  if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
    const err = new Error('Invalid enrollment ID.');
    err.statusCode = 400;
    throw err;
  }

  const enrollment = await BiometricEnrollment.findById(enrollmentId).populate('clientProfileId');
  if (!enrollment) {
    const err = new Error('Enrollment not found.');
    err.statusCode = 404;
    throw err;
  }

  assertAdminBranchAccess(adminUser, enrollment.branchId);

  if (enrollment.status === 'ENROLLED') {
    const err = new Error('Enrollment is already completed.');
    err.statusCode = 409;
    throw err;
  }
  if (enrollment.status === 'REVOKED' || enrollment.consentStatus === 'WITHDRAWN') {
    const err = new Error('Cannot sync a REVOKED enrollment.');
    err.statusCode = 409;
    throw err;
  }
  if (!enrollment.assignedDeviceId) {
    const err = new Error('No biometric device is assigned to this enrollment.');
    err.statusCode = 400;
    throw err;
  }

  const device = await BiometricDevice.findById(enrollment.assignedDeviceId);
  if (!device) {
    const err = new Error('Assigned biometric device not found.');
    err.statusCode = 404;
    throw err;
  }
  assertAdminBranchAccess(adminUser, device.branchId);

  return syncEnrollmentDeviceUser({
    enrollment,
    device,
    clientProfile: enrollment.clientProfileId,
    adminUser,
    forceRetry: true,
    remoteAdapter,
  });
};

const computeBackoffDelayMs = (attemptCount) =>
  Math.min(30 * 60 * 1000, 30 * 1000 * Math.pow(2, Math.max(0, Number(attemptCount || 1) - 1)));

/**
 * Bounded exponential backoff retry processor for transient FAILED sync jobs.
 * Never retries FEATURE_DISABLED, FIRMWARE_UNSUPPORTED, or IDENTITY_CONFLICT jobs.
 */
const processRetryableSyncJobs = async ({ limit = 10, remoteAdapter = null } = {}) => {
  if (!isRemoteUserSyncEnabled()) return { processed: 0, retried: 0, skipped: 0 };
  const now = new Date();
  const candidates = await BiometricDeviceSyncJob.find({
    status: 'FAILED',
    operation: 'CREATE_DEVICE_USER',
    responseStatus: { $nin: ['FEATURE_DISABLED', 'FIRMWARE_UNSUPPORTED', 'IDENTITY_CONFLICT'] },
    $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }],
  })
    .sort({ nextRetryAt: 1, updatedAt: 1 })
    .limit(limit);

  let retried = 0;
  let skipped = 0;

  for (const job of candidates) {
    const maxAttempts = job.maxAttempts || 5;
    if (job.attemptCount >= maxAttempts) {
      if (job.nextRetryAt !== null) {
        job.nextRetryAt = null;
        await job.save();
      }
      skipped += 1;
      continue;
    }

    const [enrollment, device] = await Promise.all([
      BiometricEnrollment.findById(job.enrollmentId).populate('clientProfileId'),
      BiometricDevice.findById(job.deviceId),
    ]);

    if (
      !enrollment ||
      !device ||
      !device.isActive ||
      device.status === 'DISABLED' ||
      !device.supportsRemoteEnrollment ||
      ['ENROLLED', 'REVOKED', 'REJECTED'].includes(enrollment.status) ||
      enrollment.consentStatus === 'WITHDRAWN'
    ) {
      skipped += 1;
      continue;
    }

    await syncEnrollmentDeviceUser({
      enrollment,
      device,
      clientProfile: enrollment.clientProfileId,
      forceRetry: true,
      remoteAdapter,
    });
    retried += 1;
  }

  return { processed: candidates.length, retried, skipped };
};

let biometricRetryTimer = null;
const startBiometricRetryScheduler = () => {
  if (process.env.NODE_ENV === 'test' || biometricRetryTimer) return;
  biometricRetryTimer = setInterval(() => {
    if (mongoose.connection.readyState !== 1) return;
    processRetryableSyncJobs({ limit: 5 }).catch((err) => {
      console.error('Biometric retry scheduler error:', err.message);
    });
  }, 60 * 1000);
  if (typeof biometricRetryTimer.unref === 'function') {
    biometricRetryTimer.unref();
  }
};

module.exports = {
  REMOTE_UNSUPPORTED_REASON,
  isRemoteUserSyncEnabled,
  computeBackoffDelayMs,
  admsRemoteAdapter,
  syncEnrollmentDeviceUser,
  retryDeviceUserSync,
  processRetryableSyncJobs,
  startBiometricRetryScheduler,
};
