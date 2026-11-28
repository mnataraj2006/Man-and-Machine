const mongoose = require('mongoose');
const BiometricDevice = require('../models/BiometricDevice');
const BiometricEnrollment = require('../models/BiometricEnrollment');
const BiometricConsent = require('../models/BiometricConsent');
const BiometricUserMapping = require('../models/BiometricUserMapping');
const BiometricDeviceLog = require('../models/BiometricDeviceLog');
const BiometricPinSequence = require('../models/BiometricPinSequence');
const BiometricDeviceSyncJob = require('../models/BiometricDeviceSyncJob');
const ClientProfile = require('../models/ClientProfile');
const Membership = require('../models/Membership');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const { runWithOptionalTransaction } = require('../utils/membershipSync');
const biometricDeviceService = require('./biometricDeviceService');

const notifyClient = async (userId, title, message, category = 'SYSTEM') => {
  if (!userId) return;
  try {
    await Notification.create({ userId, title, message, category });
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

const hasActiveMembershipForClient = async (profile) => {
  if (!profile) return false;
  const now = new Date();
  const query = profile.userId
    ? { $or: [{ userId: profile.userId }, { clientProfileId: profile._id }] }
    : { clientProfileId: profile._id };
  const { getKolkataEndOfToday } = require('../utils/membershipSync');
  const endOfToday = getKolkataEndOfToday(now);
  const active = await Membership.findOne({
    ...query,
    status: 'ACTIVE',
    startDate: { $lte: endOfToday },
    expiryDate: { $gte: now },
  }).lean();
  return Boolean(active);
};

// ==========================================
// 1. OVERVIEW & LISTING (ADMIN)
// ==========================================

const getEnrollmentOverview = async (query = {}) => {
  const branchFilter =
    query.branchId && query.branchId !== 'ALL' && mongoose.Types.ObjectId.isValid(query.branchId)
      ? { branchId: new mongoose.Types.ObjectId(query.branchId) }
      : {};

  const [
    totalMembers,
    enrolledCount,
    pendingCount,
    requestsCount,
    failedCount,
    devices,
  ] = await Promise.all([
    ClientProfile.countDocuments(branchFilter),
    BiometricEnrollment.countDocuments({ ...branchFilter, status: 'ENROLLED' }),
    BiometricEnrollment.countDocuments({
      ...branchFilter,
      status: {
        $in: [
          'INVITED',
          'CAPTURE_IN_PROGRESS',
          'CAPTURE_SUBMITTED',
          'PENDING_REVIEW',
          'APPROVED',
          'AWAITING_PHYSICAL_ENROLLMENT',
          'REMOTE_ENROLLMENT_PENDING',
          'DEVICE_ENROLLMENT_IN_PROGRESS',
        ],
      },
    }),
    BiometricEnrollment.countDocuments({
      ...branchFilter,
      status: { $in: ['CAPTURE_SUBMITTED', 'PENDING_REVIEW'] },
    }),
    BiometricEnrollment.countDocuments({
      ...branchFilter,
      status: { $in: ['FAILED', 'REJECTED'] },
    }),
    BiometricDevice.find({ ...branchFilter, isActive: true }).lean(),
  ]);

  const activeDevicesCount = devices.filter(
    (d) => biometricDeviceService.computeEffectiveStatus(d) === 'ONLINE'
  ).length;

  const completionPercentage =
    totalMembers > 0 ? Math.min(100, Math.round((enrolledCount / totalMembers) * 100)) : 0;

  return {
    totalMembers,
    enrolledCount,
    pendingCount,
    requestsCount,
    failedCount,
    activeDevicesCount,
    totalDevicesCount: devices.length,
    completionPercentage,
  };
};

const listEnrollments = async (query = {}) => {
  const filter = {};
  if (query.branchId && query.branchId !== 'ALL' && mongoose.Types.ObjectId.isValid(query.branchId)) {
    filter.branchId = query.branchId;
  }
  if (query.status && query.status !== 'ALL') {
    if (query.status === 'PENDING') {
      filter.status = { $in: ['CAPTURE_SUBMITTED', 'PENDING_REVIEW', 'AWAITING_PHYSICAL_ENROLLMENT'] };
    } else {
      filter.status = query.status;
    }
  }
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(`${query.from.slice(0, 10)}T00:00:00+05:30`);
    if (query.to) filter.createdAt.$lte = new Date(`${query.to.slice(0, 10)}T23:59:59.999+05:30`);
  }

  const rows = await BiometricEnrollment.find(filter)
    .populate('clientProfileId', 'clientId name phone email')
    .populate('branchId', 'name city')
    .populate('assignedDeviceId', 'deviceName model serialNumber')
    .populate('deviceUserSyncJobId')
    .sort({ updatedAt: -1 })
    .lean();

  let mapped = rows;
  if (query.search && query.search.trim()) {
    const q = query.search.trim().toLowerCase();
    mapped = rows.filter(
      (r) =>
        r.clientProfileId?.name?.toLowerCase().includes(q) ||
        r.clientProfileId?.clientId?.toLowerCase().includes(q) ||
        r.clientProfileId?.phone?.toLowerCase().includes(q) ||
        String(r.biometricUserId || '').toLowerCase().includes(q)
    );
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const total = mapped.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paged = mapped.slice((page - 1) * limit, page * limit);

  return {
    total,
    page,
    limit,
    totalPages,
    enrollments: paged,
  };
};

const getEnrollmentDetails = async (id) => {
  const enrollment = await BiometricEnrollment.findById(id)
    .populate('clientProfileId', 'clientId name phone email joiningDate')
    .populate('branchId', 'name city code')
    .populate('assignedDeviceId', 'deviceName model serialNumber localIp admsServerPort status lastSeenAt')
    .populate('deviceUserSyncJobId')
    .populate('consentId')
    .lean();

  if (!enrollment) {
    const err = new Error('Biometric enrollment record not found.');
    err.statusCode = 404;
    throw err;
  }

  const membershipQuery = enrollment.userId
    ? { $or: [{ userId: enrollment.userId }, { clientProfileId: enrollment.clientProfileId?._id }] }
    : { clientProfileId: enrollment.clientProfileId?._id };
  const latestMembership = await Membership.findOne(membershipQuery).sort({ expiryDate: -1 }).lean();

  return {
    enrollment,
    latestMembership,
  };
};

// ==========================================
// 2. METHOD A — MANUAL ENROLLMENT AT PHYSICAL DEVICE
// ==========================================

const getSeedMinForDevice = async (deviceId) => {
  const [existingMappings, existingEnrollments] = await Promise.all([
    BiometricUserMapping.find({ deviceId }).select('biometricUserId').lean(),
    BiometricEnrollment.find({
      assignedDeviceId: deviceId,
      biometricUserId: { $nin: ['', null] },
      status: { $nin: ['REJECTED', 'REVOKED', 'FAILED'] },
    })
      .select('biometricUserId')
      .lean(),
  ]);
  let maxNum = 1000;
  for (const m of [...existingMappings, ...existingEnrollments]) {
    const n = parseInt(m.biometricUserId, 10);
    if (!Number.isNaN(n) && n > maxNum) maxNum = n;
  }
  return maxNum;
};

/**
 * Multi-instance safe PIN allocation backed by MongoDB atomic $inc (BiometricPinSequence).
 * Loops past any PIN that was manually assigned out-of-band.
 */
const allocateUniqueBiometricPin = async (deviceId) => {
  const seedMin = await getSeedMinForDevice(deviceId);
  for (let i = 0; i < 10; i += 1) {
    const candidate = await BiometricPinSequence.allocateNextPin(deviceId, seedMin);
    const [existingMap, existingEnr] = await Promise.all([
      BiometricUserMapping.findOne({ deviceId, biometricUserId: candidate }).select('_id').lean(),
      BiometricEnrollment.findOne({
        assignedDeviceId: deviceId,
        biometricUserId: candidate,
        status: { $nin: ['REJECTED', 'REVOKED', 'FAILED'] },
      })
        .select('_id')
        .lean(),
    ]);
    if (!existingMap && !existingEnr) {
      return candidate;
    }
  }
  const err = new Error('Unable to allocate a unique Biometric User ID. Please retry.');
  err.statusCode = 409;
  throw err;
};

const generateNextBiometricUserId = async (deviceId) => {
  const maxNum = await getSeedMinForDevice(deviceId);
  return String(maxNum + 1);
};

/**
 * Enforce 1:1 device PIN <-> clientProfile mapping on a device:
 * 1) One biometricUserId on a device cannot be assigned to multiple clients.
 * 2) One client cannot have multiple active/pending biometricUserIds on the same device.
 */
const assertNoBiometricIdConflict = async ({
  deviceId,
  biometricUserId,
  clientProfileId,
  excludeEnrollmentId = null,
}) => {
  const cleanBioId = String(biometricUserId || '').trim();
  if (!deviceId || !cleanBioId || !clientProfileId) return;

  const [pinMappingConflict, pinEnrollmentConflict, clientMappingConflict, clientEnrollmentConflict] =
    await Promise.all([
      BiometricUserMapping.findOne({ deviceId, biometricUserId: cleanBioId }).lean(),
      BiometricEnrollment.findOne({
        assignedDeviceId: deviceId,
        biometricUserId: cleanBioId,
        status: { $nin: ['REJECTED', 'REVOKED', 'FAILED'] },
        ...(excludeEnrollmentId ? { _id: { $ne: excludeEnrollmentId } } : {}),
      }).lean(),
      BiometricUserMapping.findOne({ deviceId, clientProfileId, status: 'ACTIVE' }).lean(),
      BiometricEnrollment.findOne({
        assignedDeviceId: deviceId,
        clientProfileId,
        status: {
          $in: [
            'APPROVED',
            'AWAITING_PHYSICAL_ENROLLMENT',
            'REMOTE_ENROLLMENT_PENDING',
            'DEVICE_ENROLLMENT_IN_PROGRESS',
            'ENROLLED',
          ],
        },
        biometricUserId: { $nin: ['', null, cleanBioId] },
        ...(excludeEnrollmentId ? { _id: { $ne: excludeEnrollmentId } } : {}),
      }).lean(),
    ]);

  if (pinMappingConflict && String(pinMappingConflict.clientProfileId) !== String(clientProfileId)) {
    const err = new Error(
      `Biometric User ID ${cleanBioId} is already assigned to another member on this device.`
    );
    err.statusCode = 409;
    throw err;
  }

  if (pinEnrollmentConflict && String(pinEnrollmentConflict.clientProfileId) !== String(clientProfileId)) {
    const err = new Error(
      `Biometric User ID ${cleanBioId} is already reserved for another member's enrollment on this device.`
    );
    err.statusCode = 409;
    throw err;
  }

  if (clientMappingConflict && clientMappingConflict.biometricUserId !== cleanBioId) {
    const err = new Error(
      `This member already has an active Biometric User ID (${clientMappingConflict.biometricUserId}) on this device.`
    );
    err.statusCode = 409;
    throw err;
  }

  if (clientEnrollmentConflict) {
    const err = new Error(
      `This member already has Biometric User ID (${clientEnrollmentConflict.biometricUserId}) assigned on this device.`
    );
    err.statusCode = 409;
    throw err;
  }
};

const completeManualEnrollment = async (
  { enrollmentId = null, clientProfileId, deviceId, biometricUserId, captureType = 'FACE' },
  adminUser
) => {
  if (!clientProfileId || !mongoose.Types.ObjectId.isValid(clientProfileId)) {
    const err = new Error('A valid ClientProfile ID is required for biometric enrollment.');
    err.statusCode = 400;
    throw err;
  }

  const [profile, device] = await Promise.all([
    ClientProfile.findById(clientProfileId),
    BiometricDevice.findById(deviceId),
  ]);

  if (!profile) {
    const err = new Error('ClientProfile not found for the selected member. Ensure the client has a valid profile before biometric enrollment.');
    err.statusCode = 404;
    throw err;
  }
  if (!device) {
    const err = new Error('Biometric device not found.');
    err.statusCode = 404;
    throw err;
  }

  biometricDeviceService.assertAdminBranchAccess(adminUser, device.branchId);
  biometricDeviceService.assertAdminBranchAccess(adminUser, profile.branchId);

  if (String(profile.branchId) !== String(device.branchId)) {
    const err = new Error('Branch mismatch: client belongs to a different branch than the selected biometric device.');
    err.statusCode = 409;
    throw err;
  }

  let preloadedEnrollment = enrollmentId
    ? await BiometricEnrollment.findById(enrollmentId)
    : await BiometricEnrollment.findOne({ clientProfileId: profile._id, branchId: device.branchId });

  if (preloadedEnrollment) {
    biometricDeviceService.assertAdminBranchAccess(adminUser, preloadedEnrollment.branchId);
    if (String(preloadedEnrollment.branchId) !== String(device.branchId)) {
      const err = new Error('Enrollment record belongs to a different branch than the selected device.');
      err.statusCode = 409;
      throw err;
    }
    if (preloadedEnrollment.status === 'REVOKED') {
      const err = new Error('Cannot complete enrollment for a REVOKED record without fresh client consent.');
      err.statusCode = 409;
      throw err;
    }
  }

  const finalBioId = biometricUserId?.trim() || (await allocateUniqueBiometricPin(device._id));

  await assertNoBiometricIdConflict({
    deviceId: device._id,
    biometricUserId: finalBioId,
    clientProfileId: profile._id,
    excludeEnrollmentId: preloadedEnrollment?._id || enrollmentId || null,
  });

  // Never trust frontend verifiedByDevice boolean: verify against independent device evidence only
  const discoveredUser = (device.discoveredUsers || []).find(
    (u) => String(u.biometricUserId || '').trim() === finalBioId
  );
  const normalizeTokens = (s) =>
    String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2);
  const discoveredNameConflict = (() => {
    if (!discoveredUser || !discoveredUser.name || !profile.name) return false;
    const a = normalizeTokens(discoveredUser.name);
    const b = normalizeTokens(profile.name);
    return a.length > 0 && b.length > 0 && !a.some((t) => b.includes(t));
  })();

  const isDbConnected = mongoose.connection.readyState === 1;
  const [verifiedSyncJob, reliablePunch] = isDbConnected
    ? await Promise.all([
        BiometricDeviceSyncJob.findOne({
          deviceId: device._id,
          clientProfileId: profile._id,
          biometricUserId: finalBioId,
          status: 'VERIFIED',
        })
          .select('_id verifiedAt')
          .lean(),
        Attendance.findOne({
          deviceId: device._id,
          biometricUserId: finalBioId,
          source: 'BIOMETRIC_ADMS',
          verificationMethod: captureType === 'FINGERPRINT' ? 'FINGERPRINT' : { $in: ['FACE', 'FINGERPRINT'] },
        })
          .select('_id verificationMethod checkInTime')
          .lean(),
      ])
    : [null, null];

  const hasIndependentDevicePinProof = Boolean(
    (discoveredUser && !discoveredNameConflict) || verifiedSyncJob
  );
  const hasReliableBiometricTemplateProof = Boolean(
    hasIndependentDevicePinProof &&
      reliablePunch &&
      ((captureType === 'FACE' && reliablePunch.verificationMethod === 'FACE') ||
        (captureType === 'FINGERPRINT' && reliablePunch.verificationMethod === 'FINGERPRINT') ||
        (captureType === 'BOTH' && ['FACE', 'FINGERPRINT'].includes(reliablePunch.verificationMethod)))
  );

  const prevMappingSnapshot = await BiometricUserMapping.findOne({
    deviceId: device._id,
    biometricUserId: finalBioId,
  }).lean();

  const enrollment = await runWithOptionalTransaction(async (session) => {
    const opts = session ? { session } : {};
    const savedMapping = await BiometricUserMapping.findOneAndUpdate(
      { deviceId: device._id, biometricUserId: finalBioId },
      {
        biometricUserId: finalBioId,
        clientProfileId: profile._id,
        userId: profile.userId || null,
        deviceId: device._id,
        branchId: device.branchId,
        status: 'ACTIVE',
      },
      { upsert: true, new: true, ...opts }
    );

    try {
      let targetEnrollment = preloadedEnrollment
        ? await BiometricEnrollment.findById(preloadedEnrollment._id, null, opts)
        : null;
      const prevStatus = targetEnrollment?.status || 'NOT_STARTED';
      if (!targetEnrollment) {
        targetEnrollment = new BiometricEnrollment({
          clientProfileId: profile._id,
          userId: profile.userId || null,
          branchId: device.branchId,
          enrollmentMethod: 'MANUAL_PHYSICAL',
          enrollmentRequestedAt: new Date(),
        });
      }

      const now = new Date();
      targetEnrollment.assignedDeviceId = device._id;
      targetEnrollment.branchId = device.branchId;
      targetEnrollment.biometricUserId = finalBioId;
      targetEnrollment.adminApprovalStatus = 'APPROVED';
      targetEnrollment.deviceEnrollmentStatus = hasIndependentDevicePinProof
        ? 'DEVICE_VERIFIED'
        : 'ADMIN_CONFIRMED';

      if (hasReliableBiometricTemplateProof) {
        targetEnrollment.status = 'ENROLLED';
        if (captureType === 'FINGERPRINT' || captureType === 'BOTH') {
          targetEnrollment.fingerprintEnrollmentStatus = 'ENROLLED';
        }
        if (captureType === 'FACE' || captureType === 'BOTH') {
          targetEnrollment.faceEnrollmentStatus = 'ENROLLED';
        }
        targetEnrollment.enrolledAt = targetEnrollment.enrolledAt || now;
        targetEnrollment.enrolledBy = adminUser?._id || null;
      } else {
        targetEnrollment.status = hasIndependentDevicePinProof
          ? 'DEVICE_USER_READY'
          : 'AWAITING_PHYSICAL_ENROLLMENT';
        if (captureType === 'FACE' || captureType === 'BOTH') {
          targetEnrollment.faceEnrollmentStatus = 'PENDING';
        }
        if (captureType === 'FINGERPRINT' || captureType === 'BOTH') {
          targetEnrollment.fingerprintEnrollmentStatus = 'PENDING';
        }
      }

      if (hasIndependentDevicePinProof) {
        targetEnrollment.lastVerifiedAt = verifiedSyncJob?.verifiedAt || now;
      }
      targetEnrollment.failureReason = '';
      targetEnrollment.history.push({
        action: hasReliableBiometricTemplateProof
          ? 'DEVICE_VERIFIED_ENROLLMENT'
          : hasIndependentDevicePinProof
            ? 'DEVICE_USER_VERIFIED_AWAITING_FACE'
            : 'ADMIN_CONFIRMED_MANUAL_ENROLLMENT',
        fromStatus: prevStatus,
        toStatus: targetEnrollment.status,
        actorUserId: adminUser?._id || null,
        note: hasReliableBiometricTemplateProof
          ? `Verified Biometric ID ${finalBioId} on ${device.deviceName} with ${reliablePunch.verificationMethod} evidence.`
          : hasIndependentDevicePinProof
            ? `Confirmed PIN ${finalBioId} exists on ${device.deviceName}. Awaiting physical ${captureType} enrollment.`
            : `Admin mapped Biometric ID ${finalBioId} on ${device.deviceName}. Device verification and physical ${captureType} enrollment pending.`,
      });

      await targetEnrollment.save(opts);
      return targetEnrollment;
    } catch (enrErr) {
      // Compensating rollback when running without MongoDB replica-set transactions
      if (!session) {
        if (prevMappingSnapshot) {
          await BiometricUserMapping.updateOne(
            { _id: prevMappingSnapshot._id },
            {
              $set: {
                clientProfileId: prevMappingSnapshot.clientProfileId,
                userId: prevMappingSnapshot.userId,
                status: prevMappingSnapshot.status,
              },
            }
          ).catch(() => {});
        } else {
          await BiometricUserMapping.deleteOne({ _id: savedMapping._id }).catch(() => {});
        }
      }
      throw enrErr;
    }
  });

  await BiometricDeviceLog.create({
    deviceId: device._id,
    branchId: device.branchId,
    category: 'ADMIN_ACTION',
    status: 'SUCCESS',
    action: 'MANUAL_ENROLLMENT',
    message: `Enrolled ${profile.name} (${profile.clientId || profile._id}) with Biometric ID ${finalBioId} (${enrollment.deviceEnrollmentStatus})`,
    actorUserId: adminUser?._id || null,
  });

  await notifyClient(
    profile.userId,
    'Biometric Registration Complete',
    `Your biometric access is now active on ${device.deviceName}.`,
    'ATTENDANCE'
  );

  return enrollment;
};

// ==========================================
// 3. METHOD B — REMOTE ENROLLMENT (HONEST FIRMWARE CHECK)
// ==========================================

const initiateRemoteEnrollment = async ({ enrollmentId, clientProfileId, deviceId }, adminUser) => {
  const device = await BiometricDevice.findById(deviceId);
  if (!device) {
    const err = new Error('Biometric device not found.');
    err.statusCode = 404;
    throw err;
  }
  biometricDeviceService.assertAdminBranchAccess(adminUser, device.branchId);

  const effective = biometricDeviceService.computeEffectiveStatus(device);
  if (effective !== 'ONLINE') {
    const err = new Error('Device is offline or not connected via ADMS. Cannot initiate remote enrollment.');
    err.statusCode = 400;
    throw err;
  }

  if (device.userCount >= device.userCapacity) {
    const err = new Error('Device user capacity is full.');
    err.statusCode = 400;
    throw err;
  }

  // Honest firmware check: eSSL X2008 ADMS push does not support remote unattended face enrollment unless verified
  if (!device.supportsRemoteEnrollment) {
    await BiometricDeviceLog.create({
      deviceId: device._id,
      branchId: device.branchId,
      category: 'ADMIN_ACTION',
      status: 'WARNING',
      action: 'REMOTE_ENROLLMENT_UNSUPPORTED',
      message: `Remote enrollment attempted on ${device.model} (${device.firmwareVersion || 'ADMS'}) — unsupported by current firmware; manual enrollment required.`,
      actorUserId: adminUser?._id || null,
    });

    const err = new Error(
      'Remote enrollment is not supported by the current device firmware. Please use manual enrollment.'
    );
    err.statusCode = 400;
    throw err;
  }

  // Future verified remote-enrollment hardware path
  const profile = await ClientProfile.findById(clientProfileId);
  if (!profile) {
    const err = new Error('Member profile not found.');
    err.statusCode = 404;
    throw err;
  }

  const bioId = await generateNextBiometricUserId(device._id);
  let enrollment = enrollmentId ? await BiometricEnrollment.findById(enrollmentId) : null;
  if (!enrollment) {
    enrollment = new BiometricEnrollment({
      clientProfileId: profile._id,
      userId: profile.userId || null,
      branchId: device.branchId,
      enrollmentMethod: 'REMOTE_ADMIN',
    });
  }
  enrollment.assignedDeviceId = device._id;
  enrollment.biometricUserId = bioId;
  enrollment.status = 'REMOTE_ENROLLMENT_PENDING';
  enrollment.history.push({
    action: 'REMOTE_ENROLLMENT_INITIATED',
    fromStatus: enrollment.status,
    toStatus: 'REMOTE_ENROLLMENT_PENDING',
    actorUserId: adminUser?._id || null,
    note: `Waiting for physical capture on ${device.deviceName} for Biometric ID ${bioId}`,
  });
  await enrollment.save();

  return enrollment;
};

const initiatePhysicalEnrollment = async (
  { clientProfileId, deviceId, biometricUserId = '' },
  adminUser
) => {
  if (!clientProfileId || !mongoose.Types.ObjectId.isValid(clientProfileId)) {
    const err = new Error('A valid ClientProfile ID is required.');
    err.statusCode = 400;
    throw err;
  }
  if (!deviceId || !mongoose.Types.ObjectId.isValid(deviceId)) {
    const err = new Error('A valid Biometric Device ID is required.');
    err.statusCode = 400;
    throw err;
  }

  const [profile, device] = await Promise.all([
    ClientProfile.findById(clientProfileId),
    BiometricDevice.findById(deviceId),
  ]);

  if (!profile) {
    const err = new Error('ClientProfile not found for the selected member.');
    err.statusCode = 404;
    throw err;
  }
  if (!device || !device.isActive || device.status === 'DISABLED') {
    const err = new Error('Selected biometric device is not found or is disabled.');
    err.statusCode = 400;
    throw err;
  }

  biometricDeviceService.assertAdminBranchAccess(adminUser, device.branchId);
  biometricDeviceService.assertAdminBranchAccess(adminUser, profile.branchId);

  if (String(profile.branchId) !== String(device.branchId)) {
    const err = new Error('Branch mismatch: client belongs to a different branch than the selected biometric device.');
    err.statusCode = 409;
    throw err;
  }

  let enrollment = await BiometricEnrollment.findOne({
    clientProfileId: profile._id,
    branchId: device.branchId,
  });
  if (enrollment && enrollment.status === 'ENROLLED') {
    const err = new Error('Biometric enrollment is already completed for this member in this branch.');
    err.statusCode = 409;
    throw err;
  }
  if (enrollment && enrollment.status === 'REVOKED') {
    const err = new Error('Cannot initiate physical enrollment for a REVOKED record without fresh client consent.');
    err.statusCode = 409;
    throw err;
  }

  const requestedBioId = String(biometricUserId || '').trim();
  const prevStatus = enrollment?.status || 'NOT_STARTED';
  const candidateBioId =
    requestedBioId || enrollment?.biometricUserId || (await allocateUniqueBiometricPin(device._id));

  await assertNoBiometricIdConflict({
    deviceId: device._id,
    biometricUserId: candidateBioId,
    clientProfileId: profile._id,
    excludeEnrollmentId: enrollment?._id || null,
  });

  if (!enrollment) {
    enrollment = new BiometricEnrollment({
      clientProfileId: profile._id,
      userId: profile.userId || null,
      branchId: device.branchId,
      enrollmentMethod: 'MANUAL_PHYSICAL',
      enrollmentRequestedAt: new Date(),
    });
  }

  enrollment.assignedDeviceId = device._id;
  enrollment.branchId = device.branchId;
  enrollment.biometricUserId = candidateBioId;
  enrollment.status = 'AWAITING_PHYSICAL_ENROLLMENT';
  enrollment.adminApprovalStatus = 'APPROVED';
  enrollment.identityVerificationStatus = 'VERIFIED';
  enrollment.deviceEnrollmentStatus = 'AWAITING_PHYSICAL';
  enrollment.approvedAt = new Date();
  enrollment.approvedBy = adminUser?._id || null;
  enrollment.failureReason = '';
  enrollment.history.push({
    action: 'ADMIN_INITIATED_PHYSICAL_ENROLLMENT',
    fromStatus: prevStatus,
    toStatus: 'AWAITING_PHYSICAL_ENROLLMENT',
    actorUserId: adminUser?._id || null,
    note: `Physical enrollment queued on ${device.deviceName} with Biometric ID ${candidateBioId}. Capture face on terminal to complete.`,
  });

  await enrollment.save();

  await BiometricDeviceLog.create({
    deviceId: device._id,
    branchId: device.branchId,
    category: 'ADMIN_ACTION',
    status: 'INFO',
    action: 'PHYSICAL_ENROLLMENT_REQUESTED',
    message: `Queued physical enrollment for ${profile.name} (${profile.clientId || profile._id}) as Biometric ID ${candidateBioId}`,
    actorUserId: adminUser?._id || null,
  });

  return enrollment;
};

// ==========================================
// 4. ADMIN APPROVAL / REJECTION FOR MOBILE REQUESTS
// ==========================================

const approveEnrollment = async (enrollmentId, adminUser, { deviceId = null, biometricUserId = '' } = {}) => {
  const enrollment = await BiometricEnrollment.findById(enrollmentId).populate('clientProfileId');
  if (!enrollment) {
    const err = new Error('Enrollment request not found.');
    err.statusCode = 404;
    throw err;
  }

  biometricDeviceService.assertAdminBranchAccess(adminUser, enrollment.branchId);

  if (enrollment.status === 'ENROLLED') {
    const err = new Error('Biometric enrollment is already completed and cannot be re-approved.');
    err.statusCode = 409;
    throw err;
  }
  if (enrollment.status === 'REVOKED' || enrollment.consentStatus === 'WITHDRAWN') {
    const err = new Error('Cannot approve a REVOKED enrollment. Client must grant fresh biometric consent first.');
    err.statusCode = 409;
    throw err;
  }
  if (enrollment.status === 'REJECTED') {
    const err = new Error('Cannot approve a REJECTED enrollment directly. Client must resubmit capture.');
    err.statusCode = 409;
    throw err;
  }

  const prevStatus = enrollment.status;
  let targetDeviceId = enrollment.assignedDeviceId;
  if (deviceId && mongoose.Types.ObjectId.isValid(deviceId)) {
    const dev = await BiometricDevice.findById(deviceId).select('_id branchId').lean();
    if (!dev) {
      const err = new Error('Selected biometric device not found.');
      err.statusCode = 404;
      throw err;
    }
    biometricDeviceService.assertAdminBranchAccess(adminUser, dev.branchId);
    if (String(dev.branchId) !== String(enrollment.branchId)) {
      const err = new Error('Branch mismatch: selected device belongs to a different branch than the enrollment.');
      err.statusCode = 409;
      throw err;
    }
    targetDeviceId = dev._id;
  } else if (!targetDeviceId) {
    const branchDevice = await BiometricDevice.findOne({ branchId: enrollment.branchId, isActive: true });
    if (branchDevice) targetDeviceId = branchDevice._id;
  }

  const clientProfileId = enrollment.clientProfileId?._id || enrollment.clientProfileId;
  const requestedBioId = String(biometricUserId || '').trim();
  const candidateBioId =
    requestedBioId ||
    enrollment.biometricUserId ||
    (targetDeviceId ? await allocateUniqueBiometricPin(targetDeviceId) : '');

  if (targetDeviceId && candidateBioId) {
    await assertNoBiometricIdConflict({
      deviceId: targetDeviceId,
      biometricUserId: candidateBioId,
      clientProfileId,
      excludeEnrollmentId: enrollment._id,
    });
  }

  const nextStatus = ['DEVICE_USER_READY', 'DEVICE_USER_SYNCING'].includes(prevStatus)
    ? prevStatus
    : 'AWAITING_PHYSICAL_ENROLLMENT';

  const now = new Date();
  const historyEntry = {
    action: 'ADMIN_APPROVED',
    fromStatus: prevStatus,
    toStatus: nextStatus,
    actorUserId: adminUser?._id || null,
    note: `Approved pre-enrollment. Biometric ID ${candidateBioId || 'pending'} ready for physical device capture.`,
    timestamp: now,
  };

  const updated = await BiometricEnrollment.findOneAndUpdate(
    { _id: enrollment._id, status: { $nin: ['ENROLLED', 'REVOKED', 'REJECTED'] } },
    {
      $set: {
        assignedDeviceId: targetDeviceId || null,
        biometricUserId: candidateBioId,
        status: nextStatus,
        adminApprovalStatus: 'APPROVED',
        identityVerificationStatus: 'VERIFIED',
        deviceEnrollmentStatus: 'AWAITING_PHYSICAL',
        approvedAt: enrollment.approvedAt || now,
        approvedBy: enrollment.approvedBy || adminUser?._id || null,
      },
      $push: { history: historyEntry },
    },
    { new: true }
  );

  if (!updated) {
    const err = new Error('Biometric enrollment state changed concurrently and cannot be approved.');
    err.statusCode = 409;
    throw err;
  }

  // Controlled device-user sync job (respects BIOMETRIC_REMOTE_USER_SYNC flag & firmware check)
  if (targetDeviceId && candidateBioId && mongoose.connection.readyState === 1) {
    const deviceDoc = await BiometricDevice.findById(targetDeviceId);
    if (deviceDoc) {
      const biometricDeviceSyncService = require('./biometricDeviceSyncService');
      await biometricDeviceSyncService.syncEnrollmentDeviceUser({
        enrollment: updated,
        device: deviceDoc,
        clientProfile: enrollment.clientProfileId,
        adminUser,
      });
    }
  }

  await notifyClient(
    updated.userId,
    'Biometric Enrollment Approved',
    'Your mobile pre-enrollment was approved. Please complete your face scan at the gym biometric terminal on your next visit.',
    'ATTENDANCE'
  );

  return updated;
};

const rejectEnrollment = async (enrollmentId, adminUser, { reason = 'Image quality or identity verification did not pass.' } = {}) => {
  const enrollment = await BiometricEnrollment.findById(enrollmentId);
  if (!enrollment) {
    const err = new Error('Enrollment request not found.');
    err.statusCode = 404;
    throw err;
  }

  biometricDeviceService.assertAdminBranchAccess(adminUser, enrollment.branchId);

  if (enrollment.status === 'ENROLLED') {
    const err = new Error('Biometric enrollment is already completed and cannot be rejected.');
    err.statusCode = 409;
    throw err;
  }
  if (enrollment.status === 'REVOKED') {
    const err = new Error('Biometric enrollment is REVOKED and cannot be rejected.');
    err.statusCode = 409;
    throw err;
  }

  const prevStatus = enrollment.status;
  enrollment.status = 'REJECTED';
  enrollment.adminApprovalStatus = 'REJECTED';
  enrollment.identityVerificationStatus = 'REJECTED';
  enrollment.mobileCaptureStatus = 'RESUBMIT_REQUIRED';
  enrollment.failureReason = reason;
  enrollment.history.push({
    action: 'ADMIN_REJECTED',
    fromStatus: prevStatus,
    toStatus: 'REJECTED',
    actorUserId: adminUser?._id || null,
    note: reason,
  });

  await enrollment.save();

  await notifyClient(
    enrollment.userId,
    'Biometric Pre-Enrollment Needs Retake',
    `Your biometric capture was not approved: ${reason}. Please retake in good lighting.`,
    'ATTENDANCE'
  );

  return enrollment;
};

// ==========================================
// 5. METHOD C — CLIENT SELF-ENROLLMENT
// ==========================================

const getClientBiometricStatus = async (userId, requestedBranchId = null) => {
  const profile = await ClientProfile.findOne({ userId }).populate('branchId', 'name city');
  if (!profile) {
    const err = new Error('Client profile not found.');
    err.statusCode = 404;
    throw err;
  }

  const targetBranchId =
    requestedBranchId && mongoose.Types.ObjectId.isValid(requestedBranchId)
      ? requestedBranchId
      : (profile.branchId?._id || profile.branchId);

  const isEligible = await hasActiveMembershipForClient(profile);
  const [enrollment, branchEnrollments, consent, lastBiometricAttendance, branchDevice] = await Promise.all([
    BiometricEnrollment.findOne({ clientProfileId: profile._id, branchId: targetBranchId })
      .populate('assignedDeviceId', 'deviceName model serialNumber status lastSeenAt')
      .populate('branchId', 'name city')
      .populate('deviceUserSyncJobId', 'status verifiedAt acknowledgedAt responseStatus')
      .lean(),
    BiometricEnrollment.find({ clientProfileId: profile._id })
      .populate('branchId', 'name city')
      .populate('assignedDeviceId', 'deviceName model')
      .lean(),
    BiometricConsent.findOne({ clientProfileId: profile._id, status: 'GRANTED' })
      .sort({ consentedAt: -1 })
      .lean(),
    Attendance.findOne({
      $or: [{ userId }, { clientProfileId: profile._id }],
      source: 'BIOMETRIC_ADMS',
    })
      .sort({ checkInTime: -1 })
      .lean(),
    BiometricDevice.findOne({ branchId: targetBranchId, isActive: true })
      .select('deviceName model')
      .lean(),
  ]);

  return {
    eligible: isEligible,
    reason: isEligible ? '' : 'ACTIVE_MEMBERSHIP_REQUIRED',
    clientId: profile.clientId || '',
    branch: profile.branchId,
    assignedDevice: enrollment?.assignedDeviceId || branchDevice || null,
    consent: consent ? { status: consent.status, consentedAt: consent.consentedAt } : null,
    branchEnrollments,
    enrollment: enrollment || {
      status: isEligible ? 'INVITED' : 'NOT_STARTED',
      faceEnrollmentStatus: 'NOT_ENROLLED',
      fingerprintEnrollmentStatus: 'NOT_ENROLLED',
      mobileCaptureStatus: 'NOT_STARTED',
      identityVerificationStatus: 'NOT_VERIFIED',
      deviceEnrollmentStatus: 'NOT_STARTED',
      consentStatus: consent ? 'GRANTED' : 'PENDING',
    },
    lastSuccessfulCheckIn: lastBiometricAttendance?.checkInTime || null,
  };
};

const recordClientConsent = async (userId, { agreed, ipAddress = '', branchId = null }) => {
  if (!agreed) {
    const err = new Error('Explicit biometric consent is required to proceed.');
    err.statusCode = 400;
    throw err;
  }

  const profile = await ClientProfile.findOne({ userId });
  if (!profile) {
    const err = new Error('Client profile not found.');
    err.statusCode = 404;
    throw err;
  }

  if (!(await hasActiveMembershipForClient(profile))) {
    const err = new Error('An active membership is required before biometric registration.');
    err.statusCode = 403;
    throw err;
  }

  const targetBranchId =
    branchId && mongoose.Types.ObjectId.isValid(branchId) ? branchId : profile.branchId;

  let enrollment = await BiometricEnrollment.findOne({
    clientProfileId: profile._id,
    branchId: targetBranchId,
  });
  if (enrollment && enrollment.consentStatus === 'GRANTED') {
    const err = new Error('Biometric consent has already been granted for this branch.');
    err.statusCode = 409;
    throw err;
  }

  const consent = await BiometricConsent.create({
    clientProfileId: profile._id,
    userId,
    branchId: targetBranchId,
    consentGiven: true,
    consentVersion: 'v1.0',
    ipAddress,
    status: 'GRANTED',
    consentedAt: new Date(),
  });

  const prevStatus = enrollment?.status || 'NOT_STARTED';
  if (!enrollment) {
    enrollment = new BiometricEnrollment({
      clientProfileId: profile._id,
      userId,
      branchId: targetBranchId,
      enrollmentMethod: 'CLIENT_MOBILE',
      status: 'CAPTURE_IN_PROGRESS',
    });
  }
  enrollment.consentId = consent._id;
  enrollment.consentStatus = 'GRANTED';
  if (['NOT_STARTED', 'INVITED', 'REJECTED', 'REVOKED', 'FAILED'].includes(enrollment.status)) {
    enrollment.status = 'CAPTURE_IN_PROGRESS';
    if (prevStatus === 'REVOKED') {
      // Require fresh capture, admin approval, and physical enrollment; never auto-reactivate old mappings
      enrollment.mobileCaptureStatus = 'NOT_STARTED';
      enrollment.identityVerificationStatus = 'NOT_VERIFIED';
      enrollment.adminApprovalStatus = 'PENDING';
      enrollment.deviceEnrollmentStatus = 'NOT_STARTED';
      enrollment.faceEnrollmentStatus = 'NOT_ENROLLED';
      enrollment.biometricUserId = '';
      enrollment.failureReason = '';
    }
  }
  enrollment.history.push({
    action: prevStatus === 'REVOKED' ? 'CONSENT_RENEWED' : 'CONSENT_GRANTED',
    fromStatus: prevStatus,
    toStatus: enrollment.status,
    actorUserId: userId,
    note:
      prevStatus === 'REVOKED'
        ? 'Member granted fresh Biometric Data Consent v1.0 after previous withdrawal.'
        : 'Member accepted Biometric Data Consent v1.0',
  });
  await enrollment.save();

  return { consent, enrollment };
};

const withdrawClientConsent = async (userId, { branchId = null } = {}) => {
  const profile = await ClientProfile.findOne({ userId });
  if (!profile) {
    const err = new Error('Client profile not found.');
    err.statusCode = 404;
    throw err;
  }

  const scopeFilter = { clientProfileId: profile._id };
  if (branchId && mongoose.Types.ObjectId.isValid(branchId)) {
    scopeFilter.branchId = branchId;
  }

  await BiometricConsent.updateMany(
    { ...scopeFilter, status: 'GRANTED' },
    { status: 'WITHDRAWN', withdrawnAt: new Date() }
  );

  await BiometricUserMapping.updateMany(
    { ...scopeFilter, status: 'ACTIVE' },
    { status: 'INACTIVE' }
  );

  const enrollments = await BiometricEnrollment.find({
    ...scopeFilter,
    status: { $ne: 'REVOKED' },
  });

  for (const enrollment of enrollments) {
    const prev = enrollment.status;
    enrollment.status = 'REVOKED';
    enrollment.consentStatus = 'WITHDRAWN';
    enrollment.history.push({
      action: 'CONSENT_WITHDRAWN',
      fromStatus: prev,
      toStatus: 'REVOKED',
      actorUserId: userId,
      note: 'Member withdrew biometric consent. Alternative check-in remains available.',
    });
    await enrollment.save();
  }

  return { withdrawn: true, revokedCount: enrollments.length };
};

const submitMobileCapture = async (
  userId,
  { brightnessScore = 0, sharpnessScore = 0, livenessPassed = false, frameCount = 0, branchId = null, agreed = false, ipAddress = '' }
) => {
  const profile = await ClientProfile.findOne({ userId });
  if (!profile) {
    const err = new Error('Client profile not found.');
    err.statusCode = 404;
    throw err;
  }

  if (!(await hasActiveMembershipForClient(profile))) {
    const err = new Error('Active membership is required for biometric self-enrollment.');
    err.statusCode = 403;
    throw err;
  }

  const targetBranchId =
    branchId && mongoose.Types.ObjectId.isValid(branchId) ? branchId : profile.branchId;

  let consent = await BiometricConsent.findOne({ clientProfileId: profile._id, status: 'GRANTED' });
  if (!consent) {
    if (!agreed) {
      const err = new Error('Biometric enrollment authorization is required when submitting your request.');
      err.statusCode = 400;
      throw err;
    }
    consent = await BiometricConsent.create({
      clientProfileId: profile._id,
      userId,
      branchId: targetBranchId,
      consentGiven: true,
      consentVersion: 'v1.0',
      ipAddress,
      status: 'GRANTED',
      consentedAt: new Date(),
    });
  }

  const branchDevice = await BiometricDevice.findOne({ branchId: targetBranchId, isActive: true });

  let enrollment = await BiometricEnrollment.findOne({
    clientProfileId: profile._id,
    branchId: targetBranchId,
  });
  if (enrollment && enrollment.status === 'ENROLLED') {
    const err = new Error('Biometric enrollment is already completed for this branch.');
    err.statusCode = 409;
    throw err;
  }
  const prevStatus = enrollment?.status || 'NOT_STARTED';
  if (!enrollment) {
    enrollment = new BiometricEnrollment({
      clientProfileId: profile._id,
      userId,
      branchId: targetBranchId,
    });
  }

  enrollment.enrollmentMethod = 'CLIENT_MOBILE';
  enrollment.assignedDeviceId = enrollment.assignedDeviceId || branchDevice?._id || null;
  enrollment.consentId = consent._id;
  enrollment.consentStatus = 'GRANTED';
  enrollment.status = 'PENDING_REVIEW';
  enrollment.mobileCaptureStatus = livenessPassed ? 'CAPTURED' : 'NOT_STARTED';
  enrollment.identityVerificationStatus = 'PENDING_REVIEW';
  enrollment.adminApprovalStatus = 'PENDING';
  enrollment.deviceEnrollmentStatus = 'NOT_STARTED';
  enrollment.faceEnrollmentStatus = 'PENDING';
  enrollment.enrollmentRequestedAt = new Date();
  enrollment.failureReason = '';
  enrollment.captureQuality = {
    brightnessScore: Number(brightnessScore) || 0,
    sharpnessScore: Number(sharpnessScore) || 0,
    livenessPassed: Boolean(livenessPassed),
    frameCount: Number(frameCount) || 0,
    capturedAt: new Date(),
  };
  enrollment.history.push({
    action: 'ENROLLMENT_REQUEST_SUBMITTED',
    fromStatus: prevStatus,
    toStatus: 'PENDING_REVIEW',
    actorUserId: userId,
    note: 'Biometric enrollment request submitted with member authorization. Awaiting Admin approval and physical X2008 terminal face enrollment.',
  });

  await enrollment.save();

  await notifyClient(
    userId,
    'Biometric Enrollment Request Submitted',
    'Your biometric enrollment request has been submitted for Admin review. Once approved, please complete your face enrollment at your branch biometric terminal.',
    'ATTENDANCE'
  );

  return enrollment;
};

// ==========================================
// 6. EXISTING BIOMETRIC USERS MIGRATION
// ==========================================

const analyzeMigration = async ({ deviceId, biometricUserIds = [] }, adminUser = null) => {
  const device = await BiometricDevice.findById(deviceId);
  if (!device) {
    const err = new Error('Biometric device not found.');
    err.statusCode = 404;
    throw err;
  }
  biometricDeviceService.assertAdminBranchAccess(adminUser, device.branchId);

  const rawSourceIds =
    biometricUserIds && biometricUserIds.length > 0
      ? biometricUserIds
      : (device.discoveredUsers || []).map((u) => u.biometricUserId);

  const cleanIds = rawSourceIds.map((x) => String(x).trim()).filter(Boolean);
  const seen = new Set();
  const duplicateIds = [];
  const invalidIds = [];
  const uniqueIds = [];
  for (const id of cleanIds) {
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(id)) {
      invalidIds.push(id);
      continue;
    }
    if (seen.has(id)) duplicateIds.push(id);
    else {
      seen.add(id);
      uniqueIds.push(id);
    }
  }

  const existingMappings = await BiometricUserMapping.find({ deviceId: device._id })
    .populate('clientProfileId', 'clientId name phone')
    .lean();
  const mapByBioId = new Map(existingMappings.map((m) => [m.biometricUserId, m]));

  const mapped = [];
  const unmapped = [];
  for (const bioId of uniqueIds) {
    if (mapByBioId.has(bioId)) mapped.push(mapByBioId.get(bioId));
    else unmapped.push(bioId);
  }

  return {
    totalDeviceUsers: uniqueIds.length,
    successfullyMapped: mapped.length,
    unmappedCount: unmapped.length,
    duplicateIds,
    invalidIds,
    mapped,
    unmapped,
  };
};

const normalizeNameForMatch = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeDigits = (s) => String(s || '').replace(/\D/g, '').slice(-10);

const getMigrationPreview = async ({ deviceId, filter = 'ALL', search = '' }, adminUser = null) => {
  if (!deviceId || !mongoose.Types.ObjectId.isValid(deviceId)) {
    const err = new Error('A valid Biometric Device ID is required.');
    err.statusCode = 400;
    throw err;
  }

  const device = await BiometricDevice.findById(deviceId).populate('branchId', 'name city code').lean();
  if (!device) {
    const err = new Error('Biometric device not found.');
    err.statusCode = 404;
    throw err;
  }

  if (adminUser?.branchId && String(adminUser.branchId._id || adminUser.branchId) !== String(device.branchId?._id || device.branchId)) {
    const err = new Error('Access denied for device outside your assigned branch.');
    err.statusCode = 403;
    throw err;
  }

  const branchId = device.branchId?._id || device.branchId;
  const [existingMappings, branchEnrollments, branchClients, activeMemberships] = await Promise.all([
    BiometricUserMapping.find({ deviceId: device._id })
      .populate('clientProfileId', 'clientId name phone email branchId')
      .lean(),
    BiometricEnrollment.find({ branchId, assignedDeviceId: device._id }).lean(),
    ClientProfile.find({ branchId }).select('clientId name phone email branchId userId').lean(),
    Membership.find({ branchId, status: 'ACTIVE' }).select('clientProfileId userId planName status expiryDate').lean(),
  ]);

  const mapByBioId = new Map(existingMappings.map((m) => [m.biometricUserId, m]));
  const mapByClientId = new Map();
  for (const m of existingMappings) {
    if (m.status === 'ACTIVE' && m.clientProfileId?._id) {
      mapByClientId.set(String(m.clientProfileId._id), m);
    }
  }
  const enrByBioId = new Map();
  for (const e of branchEnrollments) {
    if (e.biometricUserId && !['REJECTED', 'REVOKED', 'FAILED'].includes(e.status)) {
      enrByBioId.set(e.biometricUserId, e);
    }
  }

  const activeMemByProfile = new Map();
  for (const mem of activeMemberships) {
    if (mem.clientProfileId) activeMemByProfile.set(String(mem.clientProfileId), mem);
    if (mem.userId) activeMemByProfile.set(String(mem.userId), mem);
  }

  // Count duplicate normalized names across discovered users
  const nameCounts = new Map();
  for (const u of device.discoveredUsers || []) {
    const norm = normalizeNameForMatch(u.name);
    if (norm) nameCounts.set(norm, (nameCounts.get(norm) || 0) + 1);
  }

  const rows = (device.discoveredUsers || []).map((u) => {
    const bioId = u.biometricUserId;
    const mapping = mapByBioId.get(bioId) || null;
    const enrollment = enrByBioId.get(bioId) || null;
    const normDevName = normalizeNameForMatch(u.name);
    const devDigits = normalizeDigits(u.name);
    const isPotentialDuplicate = Boolean(normDevName && (nameCounts.get(normDevName) || 0) > 1);

    let hasConflict = false;
    let conflictReason = '';
    if (mapping && mapping.status === 'INACTIVE') {
      hasConflict = true;
      conflictReason = 'Existing mapping is INACTIVE.';
    } else if (mapping && enrollment && String(mapping.clientProfileId?._id || mapping.clientProfileId) !== String(enrollment.clientProfileId)) {
      hasConflict = true;
      conflictReason = 'Mapping and Enrollment point to different clients.';
    } else if (!mapping && enrollment) {
      hasConflict = true;
      conflictReason = `PIN ${bioId} is already reserved by pending enrollment.`;
    }

    // Matching engine (never auto-maps; produces suggestions for admin confirmation)
    let confidence = 'NONE';
    let suggestedClient = null;
    let candidates = [];

    if (!mapping) {
      const highMatches = [];
      const possibleMatches = [];

      for (const c of branchClients) {
        const cId = String(c.clientId || '').trim().toUpperCase();
        const bioUpper = String(bioId).trim().toUpperCase();
        const cPhone = normalizeDigits(c.phone);
        const cNormName = normalizeNameForMatch(c.name);
        const hasMem = Boolean(activeMemByProfile.get(String(c._id)) || (c.userId && activeMemByProfile.get(String(c.userId))));
        const item = {
          clientProfileId: c._id,
          clientId: c.clientId || '',
          name: c.name,
          phone: c.phone || '',
          hasActiveMembership: hasMem,
          alreadyMappedPin: mapByClientId.get(String(c._id))?.biometricUserId || null,
        };

        if ((cId && cId === bioUpper) || (devDigits && devDigits.length >= 8 && cPhone && devDigits === cPhone)) {
          highMatches.push(item);
        } else if (normDevName && cNormName) {
          if (normDevName === cNormName) {
            highMatches.push(item);
          } else if (cNormName.includes(normDevName) || normDevName.includes(cNormName)) {
            possibleMatches.push(item);
          }
        }
      }

      if (highMatches.length === 1) {
        confidence = 'HIGH';
        suggestedClient = highMatches[0];
        candidates = highMatches;
      } else if (highMatches.length > 1) {
        confidence = 'POSSIBLE';
        candidates = highMatches;
      } else if (possibleMatches.length > 0) {
        confidence = 'POSSIBLE';
        if (possibleMatches.length === 1) suggestedClient = possibleMatches[0];
        candidates = possibleMatches;
      }
    }

    return {
      biometricUserId: bioId,
      deviceUserName: u.name || '',
      privilege: u.privilege || '0',
      firstSeenAt: u.firstSeenAt || u.seenAt || null,
      lastSeenAt: u.seenAt || null,
      deviceId: device._id,
      deviceName: device.deviceName,
      branchId,
      branchName: device.branchId?.city || device.branchId?.name || '—',
      mappingStatus: mapping ? (mapping.status === 'ACTIVE' ? 'MAPPED' : 'INACTIVE_MAPPING') : 'UNMAPPED',
      mappedClient: mapping?.clientProfileId
        ? {
            clientProfileId: mapping.clientProfileId._id,
            clientId: mapping.clientProfileId.clientId || '',
            name: mapping.clientProfileId.name,
            phone: mapping.clientProfileId.phone || '',
          }
        : null,
      enrollmentSynced: Boolean(enrollment && enrollment.status === 'ENROLLED'),
      confidence,
      suggestedClient,
      candidates,
      isPotentialDuplicate,
      hasConflict,
      conflictReason,
    };
  });

  const summary = {
    totalDiscovered: rows.length,
    mappedCount: rows.filter((r) => r.mappingStatus === 'MAPPED').length,
    unmappedCount: rows.filter((r) => r.mappingStatus === 'UNMAPPED').length,
    potentialDuplicatesCount: rows.filter((r) => r.isPotentialDuplicate).length,
    conflictsCount: rows.filter((r) => r.hasConflict).length,
    deviceReportedUserCount: device.userCount || 0,
    deviceReportedFaceCount: device.faceCount || 0,
    deviceReportedFingerprintCount: device.fingerprintCount || 0,
  };

  let filtered = rows;
  if (filter === 'MAPPED') filtered = rows.filter((r) => r.mappingStatus === 'MAPPED');
  else if (filter === 'UNMAPPED') filtered = rows.filter((r) => r.mappingStatus === 'UNMAPPED');
  else if (filter === 'DUPLICATES') filtered = rows.filter((r) => r.isPotentialDuplicate);
  else if (filter === 'CONFLICTS') filtered = rows.filter((r) => r.hasConflict);

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (r) =>
        String(r.biometricUserId).toLowerCase().includes(q) ||
        r.deviceUserName.toLowerCase().includes(q) ||
        r.mappedClient?.name?.toLowerCase().includes(q) ||
        r.mappedClient?.clientId?.toLowerCase().includes(q) ||
        r.suggestedClient?.name?.toLowerCase().includes(q)
    );
  }

  return {
    device: {
      _id: device._id,
      deviceName: device.deviceName,
      model: device.model,
      serialNumber: device.serialNumber,
      branchId,
      branchName: device.branchId?.city || device.branchId?.name || '—',
    },
    summary,
    users: filtered,
  };
};

const bulkMapDiscoveredUsers = async ({ deviceId, mappings = [], dryRun = false }, adminUser = null) => {
  if (!deviceId || !mongoose.Types.ObjectId.isValid(deviceId)) {
    const err = new Error('A valid Biometric Device ID is required.');
    err.statusCode = 400;
    throw err;
  }
  if (!Array.isArray(mappings) || mappings.length === 0) {
    const err = new Error('At least one mapping selection is required.');
    err.statusCode = 400;
    throw err;
  }

  const device = await BiometricDevice.findById(deviceId).lean();
  if (!device) {
    const err = new Error('Biometric device not found.');
    err.statusCode = 404;
    throw err;
  }
  if (adminUser?.branchId && String(adminUser.branchId._id || adminUser.branchId) !== String(device.branchId)) {
    const err = new Error('Access denied for device outside your assigned branch.');
    err.statusCode = 403;
    throw err;
  }

  const [beforeMappings, beforeEnrolled] = await Promise.all([
    BiometricUserMapping.countDocuments({ deviceId: device._id, status: 'ACTIVE' }),
    BiometricEnrollment.countDocuments({ branchId: device.branchId, status: 'ENROLLED' }),
  ]);

  const seenPins = new Set();
  const seenClients = new Set();
  const results = [];
  let succeededCount = 0;
  let failedCount = 0;

  for (const item of mappings) {
    const bioId = String(item.biometricUserId || '').trim();
    const clientProfileId = String(item.clientProfileId || '').trim();

    if (!bioId || !/^[A-Za-z0-9_-]{1,32}$/.test(bioId)) {
      failedCount += 1;
      results.push({ biometricUserId: bioId, clientProfileId, status: 'FAILED', error: 'Invalid biometric user ID format.' });
      continue;
    }
    if (!clientProfileId || !mongoose.Types.ObjectId.isValid(clientProfileId)) {
      failedCount += 1;
      results.push({ biometricUserId: bioId, clientProfileId, status: 'FAILED', error: 'Invalid client profile ID.' });
      continue;
    }
    if (seenPins.has(bioId)) {
      failedCount += 1;
      results.push({ biometricUserId: bioId, clientProfileId, status: 'FAILED', error: `Duplicate PIN ${bioId} in batch selection.` });
      continue;
    }
    if (seenClients.has(clientProfileId)) {
      failedCount += 1;
      results.push({ biometricUserId: bioId, clientProfileId, status: 'FAILED', error: 'Duplicate client selected in batch.' });
      continue;
    }
    seenPins.add(bioId);
    seenClients.add(clientProfileId);

    try {
      const profile = await ClientProfile.findById(clientProfileId).lean();
      if (!profile) {
        throw Object.assign(new Error('ClientProfile not found.'), { statusCode: 404 });
      }
      if (String(profile.branchId) !== String(device.branchId)) {
        throw Object.assign(new Error('Branch mismatch: client belongs to a different branch than this device.'), { statusCode: 409 });
      }

      await assertNoBiometricIdConflict({
        deviceId: device._id,
        biometricUserId: bioId,
        clientProfileId: profile._id,
      });

      if (dryRun) {
        succeededCount += 1;
        results.push({
          biometricUserId: bioId,
          clientProfileId,
          clientName: profile.name,
          clientId: profile.clientId || '',
          status: 'VALID_DRY_RUN',
        });
      } else {
        const mapping = await biometricDeviceService.mapBiometricUser(
          { deviceId: device._id, biometricUserId: bioId, clientProfileId: profile._id },
          adminUser
        );
        succeededCount += 1;
        results.push({
          biometricUserId: bioId,
          clientProfileId,
          clientName: profile.name,
          clientId: profile.clientId || '',
          status: 'MAPPED',
          mappingId: mapping._id,
        });
      }
    } catch (err) {
      failedCount += 1;
      results.push({
        biometricUserId: bioId,
        clientProfileId,
        status: 'FAILED',
        error: err.message || 'Mapping conflict',
      });
    }
  }

  const [afterMappings, afterEnrolled] = dryRun
    ? [beforeMappings + succeededCount, beforeEnrolled + succeededCount]
    : await Promise.all([
        BiometricUserMapping.countDocuments({ deviceId: device._id, status: 'ACTIVE' }),
        BiometricEnrollment.countDocuments({ branchId: device.branchId, status: 'ENROLLED' }),
      ]);

  return {
    dryRun: Boolean(dryRun),
    totalRequested: mappings.length,
    succeededCount,
    failedCount,
    beforeCounts: { activeMappings: beforeMappings, enrolledCount: beforeEnrolled },
    afterCounts: { activeMappings: afterMappings, enrolledCount: afterEnrolled },
    reconciliation: {
      discoveredUsersOnDevice: (device.discoveredUsers || []).length,
      activeMappingsAfter: afterMappings,
      enrolledRecordsAfter: afterEnrolled,
    },
    results,
  };
};

const getClientBiometricSummary = async ({
  clientProfileId,
  userId = null,
  branchId = null,
  hasActiveMembership = false,
}) => {
  if (!clientProfileId) {
    return {
      enrollmentId: null,
      mappingId: null,
      rawEnrollmentStatus: null,
      displayStatus: 'NOT_ENROLLED',
      biometricUserId: null,
      deviceId: null,
      deviceName: null,
      serialNumber: null,
      deviceStatus: null,
      branchName: null,
      enrollmentDate: null,
      lastSyncAt: null,
      lastPunchAt: null,
      lastPunchResult: null,
      gymAccessStatus: hasActiveMembership ? 'NOT_ENROLLED' : 'NO_MEMBERSHIP',
      failureReason: '',
      eligibleToEnroll: false,
      canRetrySync: false,
      canDisableAccess: false,
    };
  }

  const Attendance = require('../models/Attendance');
  const attOr = [{ clientProfileId }];
  if (userId) attOr.push({ userId });

  const [latestEnrollment, mapping, lastBioPunch, branchDevice] = await Promise.all([
    BiometricEnrollment.findOne({ clientProfileId })
      .select('-faceCapture -captureFrames -history')
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate('assignedDeviceId', 'deviceName serialNumber status isActive lastSyncAt lastSeenAt branchId discoveredUsers')
      .populate('branchId', 'name city')
      .populate('deviceUserSyncJobId', 'status verifiedAt acknowledgedAt responseStatus failureReason biometricUserId deviceId')
      .lean(),
    BiometricUserMapping.findOne({ clientProfileId })
      .sort({ status: 1, updatedAt: -1 }) // ACTIVE sorts before INACTIVE
      .populate('deviceId', 'deviceName serialNumber status isActive lastSyncAt lastSeenAt branchId discoveredUsers')
      .populate('branchId', 'name city')
      .lean(),
    Attendance.findOne({ $or: attOr, source: 'BIOMETRIC_ADMS' })
      .sort({ checkInTime: -1, date: -1 })
      .select('date checkInTime attendanceStatus biometricUserId verificationMethod deviceId')
      .lean(),
    branchId
      ? BiometricDevice.findOne({ branchId, isActive: true })
          .select('deviceName serialNumber status isActive lastSyncAt lastSeenAt branchId discoveredUsers')
          .lean()
      : Promise.resolve(null),
  ]);

  const device = mapping?.deviceId || latestEnrollment?.assignedDeviceId || branchDevice || null;
  const branchDoc = mapping?.branchId || latestEnrollment?.branchId || null;
  const rawStatus = latestEnrollment?.status || null;
  const bioPin = mapping?.biometricUserId || latestEnrollment?.biometricUserId || null;
  const syncJob = latestEnrollment?.deviceUserSyncJobId || null;

  const discoveredMatch = Boolean(
    bioPin &&
      device?.discoveredUsers?.some((u) => String(u.biometricUserId || '').trim() === String(bioPin).trim())
  );
  const verifiedJobMatch = Boolean(
    syncJob &&
      syncJob.status === 'VERIFIED' &&
      (!syncJob.biometricUserId || String(syncJob.biometricUserId) === String(bioPin)) &&
      (!syncJob.deviceId || !device?._id || String(syncJob.deviceId) === String(device._id))
  );
  const reliablePunchMatch = Boolean(
    lastBioPunch &&
      bioPin &&
      String(lastBioPunch.biometricUserId || '') === String(bioPin) &&
      ['FACE', 'FINGERPRINT'].includes(lastBioPunch.verificationMethod)
  );
  const hasIndependentPinOnly = Boolean(discoveredMatch || verifiedJobMatch);
  const hasReliableDeviceEvidence = Boolean(verifiedJobMatch || discoveredMatch || reliablePunchMatch);
  const hasFaceEnrolledEvidence = Boolean(
    latestEnrollment?.faceEnrollmentStatus === 'ENROLLED' && hasReliableDeviceEvidence
  );

  const PENDING_SET = new Set([
    'INVITED',
    'CAPTURE_IN_PROGRESS',
    'CAPTURE_SUBMITTED',
    'PENDING_REVIEW',
    'APPROVED',
    'REMOTE_ENROLLMENT_PENDING',
    'AWAITING_PHYSICAL_ENROLLMENT',
    'DEVICE_ENROLLMENT_IN_PROGRESS',
    'FACE_ENROLLMENT_PENDING',
  ]);

  const isRevokedOrDisabled =
    rawStatus === 'REVOKED' ||
    latestEnrollment?.consentStatus === 'WITHDRAWN' ||
    mapping?.status === 'INACTIVE' ||
    rawStatus === 'REJECTED' ||
    (device && (device.isActive === false || device.status === 'DISABLED'));

  let displayStatus = 'NOT_ENROLLED';
  if (isRevokedOrDisabled) {
    displayStatus = rawStatus === 'REVOKED' ? 'REVOKED' : 'DISABLED';
  } else if (rawStatus === 'FAILED' || (syncJob?.status === 'FAILED' && rawStatus !== 'ENROLLED')) {
    displayStatus = 'SYNC_FAILED';
  } else if (
    rawStatus === 'DEVICE_USER_SYNCING' ||
    (syncJob && ['PENDING', 'SENT'].includes(syncJob.status) && rawStatus !== 'ENROLLED')
  ) {
    displayStatus = 'DEVICE_USER_SYNCING';
  } else if (rawStatus === 'DEVICE_USER_READY' && !hasFaceEnrolledEvidence) {
    displayStatus = 'DEVICE_USER_READY';
  } else if (rawStatus === 'ENROLLED' && hasFaceEnrolledEvidence) {
    displayStatus = device?.status === 'OFFLINE' ? 'DEVICE_OFFLINE' : 'ENROLLED';
  } else if (rawStatus === 'ENROLLED' && !hasFaceEnrolledEvidence) {
    // Historical or unverified ENROLLED record without independent device proof must not display ENROLLED/GRANTED
    displayStatus = hasIndependentPinOnly
      ? 'DEVICE_USER_READY'
      : 'AWAITING_PHYSICAL_ENROLLMENT';
  } else if (rawStatus && PENDING_SET.has(rawStatus)) {
    displayStatus = rawStatus === 'AWAITING_PHYSICAL_ENROLLMENT' ? 'AWAITING_PHYSICAL_ENROLLMENT' : 'PENDING';
  } else if (mapping?.status === 'ACTIVE') {
    // An ACTIVE mapping alone does not prove physical device existence or face enrollment
    displayStatus = hasIndependentPinOnly
      ? 'DEVICE_USER_READY'
      : 'AWAITING_PHYSICAL_ENROLLMENT';
  } else if (!rawStatus || rawStatus === 'NOT_STARTED') {
    displayStatus = 'NOT_ENROLLED';
  } else {
    displayStatus = 'UNKNOWN';
  }

  let gymAccessStatus = 'NO_MEMBERSHIP';
  if (displayStatus === 'REVOKED' || displayStatus === 'DISABLED') {
    gymAccessStatus = 'DISABLED';
  } else if (!hasActiveMembership) {
    gymAccessStatus = 'NO_ACTIVE_MEMBERSHIP';
  } else if (displayStatus === 'ENROLLED') {
    gymAccessStatus = 'GRANTED';
  } else if (displayStatus === 'DEVICE_OFFLINE') {
    gymAccessStatus = 'DEVICE_OFFLINE';
  } else if (displayStatus === 'DEVICE_USER_READY') {
    gymAccessStatus = 'AWAITING_FACE_ENROLLMENT';
  } else if (['PENDING', 'DEVICE_USER_SYNCING', 'AWAITING_PHYSICAL_ENROLLMENT', 'SYNC_FAILED'].includes(displayStatus)) {
    gymAccessStatus = 'PENDING_ENROLLMENT';
  } else {
    gymAccessStatus = 'NOT_ENROLLED';
  }

  const branchHasDevice = Boolean(branchDevice || mapping?.deviceId || latestEnrollment?.assignedDeviceId);
  const perUserVerifiedAt =
    syncJob?.verifiedAt || (hasReliableDeviceEvidence ? latestEnrollment?.lastVerifiedAt : null) || null;

  return {
    enrollmentId: latestEnrollment?._id || null,
    mappingId: mapping?._id || null,
    rawEnrollmentStatus: rawStatus,
    displayStatus,
    biometricUserId: bioPin,
    deviceId: device?._id || null,
    deviceName: device?.deviceName || null,
    serialNumber: device?.serialNumber || null,
    deviceStatus: device?.status || null,
    branchName: branchDoc ? `${branchDoc.city || branchDoc.name}` : null,
    enrollmentDate:
      (displayStatus === 'ENROLLED' ? latestEnrollment?.enrolledAt : null) ||
      latestEnrollment?.enrollmentRequestedAt ||
      mapping?.createdAt ||
      null,
    lastSyncAt: perUserVerifiedAt,
    lastAcknowledgedAt: syncJob?.acknowledgedAt || null,
    deviceUserSyncStatus: syncJob?.status || latestEnrollment?.deviceUserSyncStatus || 'NOT_STARTED',
    deviceEnrollmentStatus: hasReliableDeviceEvidence
      ? 'DEVICE_VERIFIED'
      : latestEnrollment?.deviceEnrollmentStatus === 'DEVICE_VERIFIED'
        ? 'ADMIN_CONFIRMED'
        : latestEnrollment?.deviceEnrollmentStatus || 'NOT_STARTED',
    faceEnrollmentStatus: hasFaceEnrolledEvidence
      ? 'ENROLLED'
      : latestEnrollment?.faceEnrollmentStatus === 'ENROLLED'
        ? 'PENDING'
        : latestEnrollment?.faceEnrollmentStatus || 'NOT_ENROLLED',
    lastPunchAt: lastBioPunch?.checkInTime || lastBioPunch?.date || null,
    lastPunchResult: lastBioPunch?.attendanceStatus || null,
    gymAccessStatus,
    failureReason: latestEnrollment?.failureReason || '',
    eligibleToEnroll: Boolean(hasActiveMembership && displayStatus === 'NOT_ENROLLED' && branchHasDevice),
    canRetrySync: Boolean(
      device?._id && ['SYNC_FAILED', 'PENDING', 'AWAITING_PHYSICAL_ENROLLMENT'].includes(displayStatus)
    ),
    canDisableAccess: Boolean(mapping?._id && mapping.status === 'ACTIVE'),
  };
};

const getClientBiometricLogs = async (clientId, { branchId = null } = {}) => {
  if (!mongoose.Types.ObjectId.isValid(clientId)) {
    const err = new Error('Invalid client ID.');
    err.statusCode = 400;
    throw err;
  }

  let profile = await ClientProfile.findById(clientId).select('_id userId branchId').lean();
  if (!profile) {
    profile = await ClientProfile.findOne({ userId: clientId }).select('_id userId branchId').lean();
  }
  if (!profile) {
    const err = new Error('Client profile not found.');
    err.statusCode = 404;
    throw err;
  }

  if (branchId && branchId !== 'ALL' && String(profile.branchId) !== String(branchId)) {
    const err = new Error('Access denied for client outside the selected branch.');
    err.statusCode = 403;
    throw err;
  }

  const Attendance = require('../models/Attendance');
  const BiometricDeviceLog = require('../models/BiometricDeviceLog');

  const [enrollments, mappings, biometricAttendances] = await Promise.all([
    BiometricEnrollment.find({ clientProfileId: profile._id })
      .select('status enrollmentMethod biometricUserId failureReason history createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean(),
    BiometricUserMapping.find({ clientProfileId: profile._id })
      .select('biometricUserId deviceId status createdAt updatedAt')
      .lean(),
    Attendance.find({
      $or: [{ clientProfileId: profile._id }, ...(profile.userId ? [{ userId: profile.userId }] : [])],
      source: 'BIOMETRIC_ADMS',
    })
      .select('date checkInTime attendanceStatus biometricUserId branchId')
      .populate('branchId', 'city name')
      .sort({ checkInTime: -1, date: -1 })
      .limit(15)
      .lean(),
  ]);

  const bioIds = [
    ...new Set([
      ...mappings.map((m) => m.biometricUserId).filter(Boolean),
      ...enrollments.map((e) => e.biometricUserId).filter(Boolean),
    ]),
  ];

  const logOr = [
    { 'metadata.clientProfileId': profile._id },
    { 'metadata.clientProfileId': String(profile._id) },
    ...(profile.userId ? [{ 'metadata.userId': profile.userId }, { 'metadata.userId': String(profile.userId) }] : []),
    ...(bioIds.length > 0 ? [{ 'metadata.biometricUserId': { $in: bioIds } }] : []),
  ];

  const deviceLogs = await BiometricDeviceLog.find({
    branchId: profile.branchId,
    $or: logOr,
  })
    .select('category status action message createdAt')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const enrollmentHistory = enrollments.flatMap((e) =>
    (e.history || []).map((h) => ({
      action: h.action,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      note: h.note,
      timestamp: h.timestamp,
    }))
  ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return {
    enrollmentHistory,
    deviceLogs,
    biometricAttendances,
  };
};

module.exports = {
  getEnrollmentOverview,
  listEnrollments,
  getEnrollmentDetails,
  getClientBiometricSummary,
  getClientBiometricLogs,
  generateNextBiometricUserId,
  assertNoBiometricIdConflict,
  completeManualEnrollment,
  initiatePhysicalEnrollment,
  initiateRemoteEnrollment,
  approveEnrollment,
  rejectEnrollment,
  getClientBiometricStatus,
  recordClientConsent,
  withdrawClientConsent,
  submitMobileCapture,
  analyzeMigration,
  getMigrationPreview,
  bulkMapDiscoveredUsers,
};
