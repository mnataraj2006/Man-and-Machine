const mongoose = require('mongoose');
const BiometricDevice = require('../models/BiometricDevice');
const BiometricEnrollment = require('../models/BiometricEnrollment');
const BiometricConsent = require('../models/BiometricConsent');
const BiometricUserMapping = require('../models/BiometricUserMapping');
const BiometricDeviceLog = require('../models/BiometricDeviceLog');
const ClientProfile = require('../models/ClientProfile');
const Membership = require('../models/Membership');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
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
  const active = await Membership.findOne({
    ...query,
    status: 'ACTIVE',
    startDate: { $lte: now },
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

const generateNextBiometricUserId = async (deviceId) => {
  const existing = await BiometricUserMapping.find({ deviceId }).select('biometricUserId').lean();
  let maxNum = 1000;
  for (const m of existing) {
    const n = parseInt(m.biometricUserId, 10);
    if (!Number.isNaN(n) && n > maxNum) maxNum = n;
  }
  return String(maxNum + 1);
};

const completeManualEnrollment = async (
  { enrollmentId = null, clientProfileId, deviceId, biometricUserId, captureType = 'FACE', verifiedByDevice = false },
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

  const finalBioId = biometricUserId?.trim() || (await generateNextBiometricUserId(device._id));

  // Ensure biometricUserId isn't mapped to a different member on this device
  const conflict = await BiometricUserMapping.findOne({
    deviceId: device._id,
    biometricUserId: finalBioId,
  });
  if (conflict && String(conflict.clientProfileId) !== String(profile._id)) {
    const err = new Error(`Biometric User ID ${finalBioId} is already assigned to another member on this device.`);
    err.statusCode = 409;
    throw err;
  }

  await BiometricUserMapping.findOneAndUpdate(
    { deviceId: device._id, biometricUserId: finalBioId },
    {
      biometricUserId: finalBioId,
      clientProfileId: profile._id,
      userId: profile.userId || null,
      deviceId: device._id,
      branchId: device.branchId,
      status: 'ACTIVE',
    },
    { upsert: true, new: true }
  );

  let enrollment = enrollmentId
    ? await BiometricEnrollment.findById(enrollmentId)
    : await BiometricEnrollment.findOne({ clientProfileId: profile._id, branchId: device.branchId });

  const prevStatus = enrollment?.status || 'NOT_STARTED';
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
  enrollment.biometricUserId = finalBioId;
  enrollment.status = 'ENROLLED';
  enrollment.adminApprovalStatus = 'APPROVED';
  enrollment.deviceEnrollmentStatus = verifiedByDevice ? 'DEVICE_VERIFIED' : 'ADMIN_CONFIRMED';
  if (captureType === 'FINGERPRINT' || captureType === 'BOTH') {
    enrollment.fingerprintEnrollmentStatus = 'ENROLLED';
  }
  if (captureType === 'FACE' || captureType === 'BOTH') {
    enrollment.faceEnrollmentStatus = 'ENROLLED';
  }
  enrollment.enrolledAt = new Date();
  enrollment.enrolledBy = adminUser?._id || null;
  enrollment.lastVerifiedAt = verifiedByDevice ? new Date() : enrollment.lastVerifiedAt;
  enrollment.failureReason = '';
  enrollment.history.push({
    action: verifiedByDevice ? 'DEVICE_VERIFIED_ENROLLMENT' : 'ADMIN_CONFIRMED_MANUAL_ENROLLMENT',
    fromStatus: prevStatus,
    toStatus: 'ENROLLED',
    actorUserId: adminUser?._id || null,
    note: `Mapped Biometric ID ${finalBioId} on ${device.deviceName} (${captureType})`,
  });

  await enrollment.save();

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

  const prevStatus = enrollment.status;
  if (deviceId && mongoose.Types.ObjectId.isValid(deviceId)) {
    enrollment.assignedDeviceId = deviceId;
  } else if (!enrollment.assignedDeviceId) {
    const branchDevice = await BiometricDevice.findOne({ branchId: enrollment.branchId, isActive: true });
    if (branchDevice) enrollment.assignedDeviceId = branchDevice._id;
  }

  if (biometricUserId?.trim()) {
    enrollment.biometricUserId = biometricUserId.trim();
  } else if (!enrollment.biometricUserId && enrollment.assignedDeviceId) {
    enrollment.biometricUserId = await generateNextBiometricUserId(enrollment.assignedDeviceId);
  }

  enrollment.status = 'AWAITING_PHYSICAL_ENROLLMENT';
  enrollment.adminApprovalStatus = 'APPROVED';
  enrollment.identityVerificationStatus = 'VERIFIED';
  enrollment.deviceEnrollmentStatus = 'AWAITING_PHYSICAL';
  enrollment.approvedAt = new Date();
  enrollment.approvedBy = adminUser?._id || null;
  enrollment.history.push({
    action: 'ADMIN_APPROVED',
    fromStatus: prevStatus,
    toStatus: 'AWAITING_PHYSICAL_ENROLLMENT',
    actorUserId: adminUser?._id || null,
    note: `Approved pre-enrollment. Biometric ID ${enrollment.biometricUserId || 'pending'} ready for physical device capture.`,
  });

  await enrollment.save();

  await notifyClient(
    enrollment.userId,
    'Biometric Enrollment Approved',
    'Your mobile pre-enrollment was approved. Please complete your face scan at the gym biometric terminal on your next visit.',
    'ATTENDANCE'
  );

  return enrollment;
};

const rejectEnrollment = async (enrollmentId, adminUser, { reason = 'Image quality or identity verification did not pass.' } = {}) => {
  const enrollment = await BiometricEnrollment.findById(enrollmentId);
  if (!enrollment) {
    const err = new Error('Enrollment request not found.');
    err.statusCode = 404;
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

  const consent = await BiometricConsent.create({
    clientProfileId: profile._id,
    userId,
    branchId: targetBranchId,
    consentGiven: true,
    ipAddress,
    status: 'GRANTED',
    consentedAt: new Date(),
  });

  let enrollment = await BiometricEnrollment.findOne({
    clientProfileId: profile._id,
    branchId: targetBranchId,
  });
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
  if (enrollment.status === 'NOT_STARTED' || enrollment.status === 'INVITED' || enrollment.status === 'REJECTED') {
    enrollment.status = 'CAPTURE_IN_PROGRESS';
  }
  enrollment.history.push({
    action: 'CONSENT_GRANTED',
    toStatus: enrollment.status,
    actorUserId: userId,
    note: 'Member accepted Biometric Data Consent v1.0',
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
  { brightnessScore = 0, sharpnessScore = 0, livenessPassed = false, frameCount = 0, branchId = null }
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

  const consent = await BiometricConsent.findOne({ clientProfileId: profile._id, status: 'GRANTED' });
  if (!consent) {
    const err = new Error('Biometric data consent must be granted before submitting face capture.');
    err.statusCode = 400;
    throw err;
  }

  if (!livenessPassed || frameCount < 2) {
    const err = new Error('Multi-frame liveness check failed. Please retake using a live front camera.');
    err.statusCode = 400;
    throw err;
  }
  if (brightnessScore < 35) {
    const err = new Error('Lighting is too dim. Please move to a well-lit area and retake.');
    err.statusCode = 400;
    throw err;
  }
  if (sharpnessScore < 10) {
    const err = new Error('Captured image is too blurry. Hold steady and retake.');
    err.statusCode = 400;
    throw err;
  }

  const branchDevice = await BiometricDevice.findOne({ branchId: targetBranchId, isActive: true });

  let enrollment = await BiometricEnrollment.findOne({
    clientProfileId: profile._id,
    branchId: targetBranchId,
  });
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
  enrollment.status = 'CAPTURE_SUBMITTED';
  enrollment.mobileCaptureStatus = 'CAPTURED';
  enrollment.identityVerificationStatus = 'PENDING_REVIEW';
  enrollment.adminApprovalStatus = 'PENDING';
  enrollment.deviceEnrollmentStatus = 'NOT_STARTED';
  enrollment.faceEnrollmentStatus = 'PENDING';
  enrollment.enrollmentRequestedAt = new Date();
  enrollment.failureReason = '';
  enrollment.captureQuality = {
    brightnessScore,
    sharpnessScore,
    livenessPassed: true,
    frameCount,
    capturedAt: new Date(),
  };
  enrollment.history.push({
    action: 'MOBILE_CAPTURE_SUBMITTED',
    fromStatus: prevStatus,
    toStatus: 'CAPTURE_SUBMITTED',
    actorUserId: userId,
    note: `Pre-enrollment capture submitted (${frameCount} frames, brightness ${brightnessScore}, sharpness ${sharpnessScore}). Awaiting Admin review & physical X2008 enrollment.`,
  });

  await enrollment.save();

  await notifyClient(
    userId,
    'Biometric Pre-Enrollment Submitted',
    'Your mobile face capture has been submitted for Admin review. Physical device enrollment at your branch will complete your registration.',
    'ATTENDANCE'
  );

  return enrollment;
};

// ==========================================
// 6. EXISTING BIOMETRIC USERS MIGRATION
// ==========================================

const analyzeMigration = async ({ deviceId, biometricUserIds = [] }) => {
  const device = await BiometricDevice.findById(deviceId);
  if (!device) {
    const err = new Error('Biometric device not found.');
    err.statusCode = 404;
    throw err;
  }

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

module.exports = {
  getEnrollmentOverview,
  listEnrollments,
  getEnrollmentDetails,
  generateNextBiometricUserId,
  completeManualEnrollment,
  initiateRemoteEnrollment,
  approveEnrollment,
  rejectEnrollment,
  getClientBiometricStatus,
  recordClientConsent,
  withdrawClientConsent,
  submitMobileCapture,
  analyzeMigration,
};
