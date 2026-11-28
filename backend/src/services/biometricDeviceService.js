const net = require('net');
const mongoose = require('mongoose');
const BiometricDevice = require('../models/BiometricDevice');
const BiometricEnrollment = require('../models/BiometricEnrollment');
const BiometricUserMapping = require('../models/BiometricUserMapping');
const BiometricDeviceLog = require('../models/BiometricDeviceLog');
const BiometricDeviceCommand = require('../models/BiometricDeviceCommand');
const Attendance = require('../models/Attendance');
const ClientProfile = require('../models/ClientProfile');
const Membership = require('../models/Membership');
const User = require('../models/User');
const {
  getKolkataParts,
  getKolkataDayRange,
  getKolkataMonthRange,
} = require('./financeService');
const { runWithOptionalTransaction } = require('../utils/membershipSync');
const dashboardCache = require('../utils/dashboardCache');

/**
 * Compute real device status from isActive + lastSeenAt heartbeat window.
 * Never returns ONLINE unless device actually communicated within heartbeatTimeoutSeconds.
 */
const computeEffectiveStatus = (device, nowMs = Date.now()) => {
  if (!device) return 'OFFLINE';
  if (!device.isActive || device.status === 'DISABLED') return 'DISABLED';
  if (device.status === 'SYNCING') return 'SYNCING';

  const timeoutMs = Math.max(device.heartbeatTimeoutSeconds || 180, 300) * 1000;
  if (device.lastSeenAt) {
    const elapsed = nowMs - new Date(device.lastSeenAt).getTime();
    if (elapsed >= -60000 && elapsed <= timeoutMs) return 'ONLINE';
  }

  if (device.status === 'ERROR' && device.errorMessage) return 'ERROR';
  return 'OFFLINE';
};

const computeHealthIndicator = (effectiveStatus) => {
  switch (effectiveStatus) {
    case 'ONLINE':
      return { color: 'GREEN', label: 'Healthy' };
    case 'SYNCING':
    case 'CONNECTING':
      return { color: 'YELLOW', label: 'Syncing / Connecting' };
    case 'DISABLED':
      return { color: 'GRAY', label: 'Disabled' };
    case 'ERROR':
      return { color: 'RED', label: 'Error' };
    case 'OFFLINE':
    default:
      return { color: 'RED', label: 'Offline / Not Connected' };
  }
};

const parseAdmsVerifyCode = (code) => {
  const num = Number(code);
  if (num === 15) return 'FACE';
  if (num === 1 || num === 6 || num === 8 || num === 10) return 'FINGERPRINT';
  if (num === 0 || num === 3) return 'PASSWORD';
  if (num === 2 || num === 4 || num === 11) return 'CARD';
  return 'UNKNOWN';
};

const parseAdmsEventType = (statusVal) => {
  const num = Number(statusVal);
  if (num === 1 || num === 5) return 'CHECK_OUT';
  if (num === 0 || num === 4) return 'CHECK_IN';
  return 'CHECK_IN';
};

const logDeviceEvent = async ({
  deviceId = null,
  branchId = null,
  category,
  status = 'INFO',
  action = '',
  message,
  actorUserId = null,
  metadata = null,
}) => {
  try {
    await BiometricDeviceLog.create({
      deviceId,
      branchId,
      category,
      status,
      action,
      message,
      actorUserId,
      metadata,
    });
  } catch (err) {
    console.error('BiometricDeviceLog error:', err.message);
  }
};

const tcpPing = (host, port, timeoutMs = 2500) =>
  new Promise((resolve) => {
    if (!host || !port) return resolve({ reachable: false, reason: 'No local IP or TCP port configured' });
    const socket = new net.Socket();
    let settled = false;
    const finish = (reachable, reason = '') => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ reachable, reason });
    };
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => finish(true, 'TCP port reachable'));
    socket.on('timeout', () => finish(false, `Connection timed out after ${timeoutMs}ms`));
    socket.on('error', (err) => finish(false, err.message || 'TCP connection refused'));
    socket.connect(Number(port), host);
  });

// ==========================================
// 1. DEVICE MANAGEMENT (ADMIN)
// ==========================================

const registerDevice = async (data, adminUser) => {
  const {
    branchId,
    deviceName,
    manufacturer = 'eSSL',
    model = 'X2008',
    serialNumber,
    deviceId,
    macAddress = '',
    localIp = '',
    tcpPort = 4370,
    communicationProtocol = 'ADMS',
    admsServerAddress = '',
    admsServerPort = 8081,
    firmwareVersion = '',
    userCapacity = 1000,
    fingerprintCapacity = 5000,
    faceCapacity = 1500,
    isActive = true,
  } = data;

  if (!branchId || !mongoose.Types.ObjectId.isValid(branchId)) {
    const err = new Error('Valid branch is required.');
    err.statusCode = 400;
    throw err;
  }
  if (!deviceName?.trim() || !serialNumber?.trim() || !deviceId) {
    const err = new Error('Device name, serial number, and device ID are required.');
    err.statusCode = 400;
    throw err;
  }

  const cleanSN = serialNumber.trim().toUpperCase();
  const existingSN = await BiometricDevice.findOne({ serialNumber: cleanSN });
  if (existingSN) {
    const err = new Error(`A biometric device with serial number ${cleanSN} is already registered.`);
    err.statusCode = 409;
    throw err;
  }

  const existingBranchDeviceId = await BiometricDevice.findOne({ branchId, deviceId: Number(deviceId) });
  if (existingBranchDeviceId) {
    const err = new Error(`Device ID ${deviceId} already exists in this branch.`);
    err.statusCode = 409;
    throw err;
  }

  const device = await BiometricDevice.create({
    branchId,
    deviceName: deviceName.trim(),
    manufacturer: manufacturer.trim(),
    model: model.trim(),
    serialNumber: cleanSN,
    deviceId: Number(deviceId),
    macAddress: macAddress.trim().toLowerCase(),
    localIp: localIp.trim(),
    tcpPort: Number(tcpPort) || 4370,
    communicationProtocol,
    admsServerAddress: admsServerAddress.trim(),
    admsServerPort: Number(admsServerPort) || 8081,
    firmwareVersion: firmwareVersion.trim(),
    userCapacity: Number(userCapacity) || 1000,
    fingerprintCapacity: Number(fingerprintCapacity) || 5000,
    faceCapacity: Number(faceCapacity) || 1500,
    isActive: Boolean(isActive),
    status: isActive ? 'OFFLINE' : 'DISABLED',
  });

  await logDeviceEvent({
    deviceId: device._id,
    branchId: device.branchId,
    category: 'ADMIN_ACTION',
    status: 'SUCCESS',
    action: 'ADD_DEVICE',
    message: `Admin registered ${device.manufacturer} ${device.model} (SN: ${device.serialNumber})`,
    actorUserId: adminUser?._id || null,
  });

  return device;
};

const updateDevice = async (id, data, adminUser) => {
  const device = await BiometricDevice.findById(id);
  if (!device) {
    const err = new Error('Biometric device not found.');
    err.statusCode = 404;
    throw err;
  }
  assertAdminBranchAccess(adminUser, device.branchId);
  if (data.branchId !== undefined) {
    assertAdminBranchAccess(adminUser, data.branchId);
  }

  const allowed = [
    'branchId',
    'deviceName',
    'manufacturer',
    'model',
    'deviceId',
    'macAddress',
    'localIp',
    'tcpPort',
    'communicationProtocol',
    'admsServerAddress',
    'admsServerPort',
    'firmwareVersion',
    'userCapacity',
    'fingerprintCapacity',
    'faceCapacity',
    'heartbeatTimeoutSeconds',
  ];

  for (const field of allowed) {
    if (data[field] !== undefined) {
      device[field] = data[field];
    }
  }
  await device.save();

  await logDeviceEvent({
    deviceId: device._id,
    branchId: device.branchId,
    category: 'ADMIN_ACTION',
    status: 'INFO',
    action: 'EDIT_DEVICE',
    message: `Admin updated configuration for ${device.deviceName} (SN: ${device.serialNumber})`,
    actorUserId: adminUser?._id || null,
  });

  return device;
};

const toggleDeviceStatus = async (id, enable, adminUser) => {
  const device = await BiometricDevice.findById(id);
  if (!device) {
    const err = new Error('Biometric device not found.');
    err.statusCode = 404;
    throw err;
  }
  assertAdminBranchAccess(adminUser, device.branchId);

  device.isActive = Boolean(enable);
  device.status = enable ? computeEffectiveStatus({ ...device.toObject(), isActive: true, status: 'OFFLINE' }) : 'DISABLED';
  if (enable) device.errorMessage = '';
  await device.save();

  await logDeviceEvent({
    deviceId: device._id,
    branchId: device.branchId,
    category: 'ADMIN_ACTION',
    status: 'INFO',
    action: enable ? 'ENABLE_DEVICE' : 'DISABLE_DEVICE',
    message: `Admin ${enable ? 'enabled' : 'disabled'} ${device.deviceName} (SN: ${device.serialNumber})`,
    actorUserId: adminUser?._id || null,
  });

  return device;
};

const testDeviceConnection = async (id, adminUser) => {
  const device = await BiometricDevice.findById(id);
  if (!device) {
    const err = new Error('Biometric device not found.');
    err.statusCode = 404;
    throw err;
  }
  assertAdminBranchAccess(adminUser, device.branchId);

  if (!device.isActive || device.status === 'DISABLED') {
    return {
      reachable: false,
      effectiveStatus: 'DISABLED',
      message: 'Device is currently disabled by administrator.',
    };
  }

  const effectiveBefore = computeEffectiveStatus(device);
  if (effectiveBefore === 'ONLINE') {
    await logDeviceEvent({
      deviceId: device._id,
      branchId: device.branchId,
      category: 'CONNECTION_TEST',
      status: 'SUCCESS',
      action: 'TEST_CONNECTION',
      message: `ADMS connection healthy. Last heartbeat received at ${device.lastSeenAt.toISOString()}`,
      actorUserId: adminUser?._id || null,
    });
    return {
      reachable: true,
      effectiveStatus: 'ONLINE',
      message: 'ADMS heartbeat active and healthy.',
      lastSeenAt: device.lastSeenAt,
    };
  }

  // Fallback real TCP socket check if localIp is reachable from backend host
  const tcpRes = await tcpPing(device.localIp, device.tcpPort || 4370, 2500);
  if (!tcpRes.reachable) {
    device.status = 'OFFLINE';
    device.errorMessage = `Not connected via ADMS; TCP ${device.localIp || 'N/A'}:${device.tcpPort} — ${tcpRes.reason}`;
    await device.save();

    await logDeviceEvent({
      deviceId: device._id,
      branchId: device.branchId,
      category: 'CONNECTION_TEST',
      status: 'ERROR',
      action: 'TEST_CONNECTION',
      message: `Connection test failed: ${device.errorMessage}`,
      actorUserId: adminUser?._id || null,
    });

    return {
      reachable: false,
      effectiveStatus: 'OFFLINE',
      message: device.errorMessage,
      lastSeenAt: device.lastSeenAt,
    };
  }

  // TCP reachable but ADMS hasn't pushed yet
  await logDeviceEvent({
    deviceId: device._id,
    branchId: device.branchId,
    category: 'CONNECTION_TEST',
    status: 'WARNING',
    action: 'TEST_CONNECTION',
    message: `TCP port ${device.tcpPort} reachable at ${device.localIp}, waiting for ADMS push heartbeat.`,
    actorUserId: adminUser?._id || null,
  });

  return {
    reachable: true,
    effectiveStatus: effectiveBefore,
    message: `Device TCP port ${device.tcpPort} is reachable. Waiting for ADMS push on port ${device.admsServerPort}.`,
    lastSeenAt: device.lastSeenAt,
  };
};

const syncDevice = async (id, adminUser) => {
  const device = await BiometricDevice.findById(id);
  if (!device) {
    const err = new Error('Biometric device not found.');
    err.statusCode = 404;
    throw err;
  }
  assertAdminBranchAccess(adminUser, device.branchId);

  if (!device.isActive || device.status === 'DISABLED') {
    const err = new Error('Cannot sync a disabled device. Enable it first.');
    err.statusCode = 400;
    throw err;
  }

  const effective = computeEffectiveStatus(device);
  if (effective !== 'ONLINE') {
    device.status = 'OFFLINE';
    device.errorMessage = 'Device offline — cannot sync until ADMS heartbeat resumes.';
    await device.save();

    await logDeviceEvent({
      deviceId: device._id,
      branchId: device.branchId,
      category: 'ERROR',
      status: 'ERROR',
      action: 'SYNC_DEVICE',
      message: 'Manual sync requested while device is offline / not connected.',
      actorUserId: adminUser?._id || null,
    });

    return {
      synced: false,
      effectiveStatus: 'OFFLINE',
      message: 'Device is offline / not connected via ADMS. Check network & ADMS server configuration.',
    };
  }

  device.lastSyncAt = new Date();
  device.errorMessage = '';
  await device.save();

  await logDeviceEvent({
    deviceId: device._id,
    branchId: device.branchId,
    category: 'ATTENDANCE_SYNC',
    status: 'SUCCESS',
    action: 'SYNC_DEVICE',
    message: `Admin triggered manual ADMS sync check on ${device.deviceName}.`,
    actorUserId: adminUser?._id || null,
  });

  return {
    synced: true,
    effectiveStatus: 'ONLINE',
    lastSyncAt: device.lastSyncAt,
    message: 'Device is online and synchronized via ADMS.',
  };
};

// ==========================================
// 2. BIOMETRIC USER MAPPING
// ==========================================

const mapBiometricUser = async ({ deviceId, biometricUserId, clientProfileId }, adminUser) => {
  if (!clientProfileId || !mongoose.Types.ObjectId.isValid(clientProfileId)) {
    const err = new Error('A valid ClientProfile ID is required for biometric user mapping.');
    err.statusCode = 400;
    throw err;
  }

  const [device, profile] = await Promise.all([
    BiometricDevice.findById(deviceId),
    ClientProfile.findById(clientProfileId),
  ]);

  if (!device) {
    const err = new Error('Biometric device not found.');
    err.statusCode = 404;
    throw err;
  }
  if (!profile) {
    const err = new Error('ClientProfile not found for the selected member. Ensure the client has a valid profile before biometric mapping.');
    err.statusCode = 404;
    throw err;
  }

  assertAdminBranchAccess(adminUser, device.branchId);
  assertAdminBranchAccess(adminUser, profile.branchId);

  if (String(profile.branchId) !== String(device.branchId)) {
    const err = new Error('Branch mismatch: client belongs to a different branch than the selected biometric device.');
    err.statusCode = 409;
    throw err;
  }

  const cleanBioId = String(biometricUserId).trim();
  if (!cleanBioId) {
    const err = new Error('Biometric User ID is required.');
    err.statusCode = 400;
    throw err;
  }

  const existing = await BiometricUserMapping.findOne({ deviceId: device._id, biometricUserId: cleanBioId });
  if (existing && String(existing.clientProfileId) !== String(profile._id)) {
    const err = new Error(`Biometric ID ${cleanBioId} is already mapped to another member on this device.`);
    err.statusCode = 409;
    throw err;
  }

  const BiometricEnrollment = require('../models/BiometricEnrollment');
  const [clientActiveMapping, pendingPinEnrollment, clientOtherEnrollment] = await Promise.all([
    BiometricUserMapping.findOne({
      deviceId: device._id,
      clientProfileId: profile._id,
      status: 'ACTIVE',
    }).lean(),
    BiometricEnrollment.findOne({
      assignedDeviceId: device._id,
      biometricUserId: cleanBioId,
      status: { $nin: ['REJECTED', 'REVOKED', 'FAILED'] },
    }).lean(),
    BiometricEnrollment.findOne({
      assignedDeviceId: device._id,
      clientProfileId: profile._id,
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
    }).lean(),
  ]);

  if (clientActiveMapping && clientActiveMapping.biometricUserId !== cleanBioId) {
    const err = new Error(
      `This member already has an active Biometric ID (${clientActiveMapping.biometricUserId}) on this device. Unmap it first.`
    );
    err.statusCode = 409;
    throw err;
  }
  if (pendingPinEnrollment && String(pendingPinEnrollment.clientProfileId) !== String(profile._id)) {
    const err = new Error(
      `Biometric ID ${cleanBioId} is already reserved for another member's enrollment on this device.`
    );
    err.statusCode = 409;
    throw err;
  }
  if (clientOtherEnrollment) {
    const err = new Error(
      `This member already has Biometric ID (${clientOtherEnrollment.biometricUserId}) assigned on this device.`
    );
    err.statusCode = 409;
    throw err;
  }

  const prevMappingSnapshot = await BiometricUserMapping.findOne({
    deviceId: device._id,
    biometricUserId: cleanBioId,
  }).lean();

  const mapping = await runWithOptionalTransaction(async (session) => {
    const opts = session ? { session } : {};
    const savedMapping = await BiometricUserMapping.findOneAndUpdate(
      { deviceId: device._id, biometricUserId: cleanBioId },
      {
        biometricUserId: cleanBioId,
        clientProfileId: profile._id,
        userId: profile.userId || null,
        deviceId: device._id,
        branchId: device.branchId,
        status: 'ACTIVE',
      },
      { upsert: true, new: true, ...opts }
    );

    try {
      // Sync BiometricEnrollment so overview KPIs and client status reflect the mapped terminal record
      let enrollment = await BiometricEnrollment.findOne(
        { clientProfileId: profile._id, branchId: device.branchId },
        null,
        opts
      );
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
      enrollment.biometricUserId = cleanBioId;
      enrollment.status = 'ENROLLED';
      enrollment.adminApprovalStatus = 'APPROVED';
      enrollment.deviceEnrollmentStatus = 'ADMIN_CONFIRMED';
      if (enrollment.faceEnrollmentStatus === 'NOT_ENROLLED') {
        enrollment.faceEnrollmentStatus = 'ENROLLED';
      }
      enrollment.enrolledAt = enrollment.enrolledAt || new Date();
      enrollment.enrolledBy = enrollment.enrolledBy || adminUser?._id || null;
      enrollment.failureReason = '';
      enrollment.history.push({
        action: 'ADMIN_MAPPED_USER',
        fromStatus: prevStatus,
        toStatus: 'ENROLLED',
        actorUserId: adminUser?._id || null,
        note: `Mapped Biometric ID ${cleanBioId} on ${device.deviceName} to ${profile.name}`,
      });
      await enrollment.save(opts);
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

    return savedMapping;
  });

  await logDeviceEvent({
    deviceId: device._id,
    branchId: device.branchId,
    category: 'ADMIN_ACTION',
    status: 'SUCCESS',
    action: 'MAP_USER',
    message: `Mapped Biometric ID ${cleanBioId} -> ${profile.name} (${profile.clientId || profile._id})`,
    actorUserId: adminUser?._id || null,
  });

  return mapping;
};

const unmapBiometricUser = async (mappingId, adminUser) => {
  const mapping = await BiometricUserMapping.findById(mappingId);
  if (!mapping) {
    const err = new Error('Mapping not found.');
    err.statusCode = 404;
    throw err;
  }
  assertAdminBranchAccess(adminUser, mapping.branchId);

  await BiometricUserMapping.deleteOne({ _id: mapping._id });

  await logDeviceEvent({
    deviceId: mapping.deviceId,
    branchId: mapping.branchId,
    category: 'ADMIN_ACTION',
    status: 'INFO',
    action: 'UNMAP_USER',
    message: `Unmapped Biometric ID ${mapping.biometricUserId}`,
    actorUserId: adminUser?._id || null,
  });

  return true;
};

// ==========================================
// 3. ATTENDANCE EVENT PROCESSING & MEMBERSHIP VALIDATION
// ==========================================

const validateMembershipForProfile = async (profile) => {
  if (!profile) return { membershipStatus: 'NOT_FOUND', attendanceStatus: 'UNMAPPED_USER' };

  if (profile.userId) {
    const user = await User.findById(profile.userId).select('status').lean();
    if (user && (user.status === 'SUSPENDED' || user.status === 'INACTIVE')) {
      return { membershipStatus: 'SUSPENDED', attendanceStatus: 'FLAGGED_SUSPENDED' };
    }
  }

  const identityQuery = profile.userId
    ? { $or: [{ userId: profile.userId }, { clientProfileId: profile._id }] }
    : { clientProfileId: profile._id };

  const memberships = await Membership.find(identityQuery).sort({ expiryDate: -1 }).lean();
  if (!memberships || memberships.length === 0) {
    return { membershipStatus: 'NO_MEMBERSHIP', attendanceStatus: 'FLAGGED_NO_MEMBERSHIP' };
  }

  const now = new Date();
  const { getKolkataEndOfToday } = require('../utils/membershipSync');
  const endOfToday = getKolkataEndOfToday(now);
  const active = memberships.find(
    (m) => m.status === 'ACTIVE' && new Date(m.startDate) <= endOfToday && new Date(m.expiryDate) >= now
  );
  if (active) {
    return { membershipStatus: 'ACTIVE', attendanceStatus: 'SUCCESS' };
  }

  const latest = memberships[0];
  if (latest.status === 'EXPIRED' || (latest.status === 'ACTIVE' && new Date(latest.expiryDate) < now)) {
    return { membershipStatus: 'EXPIRED', attendanceStatus: 'FLAGGED_EXPIRED' };
  }

  if (latest.status === 'FROZEN' || latest.status === 'PAUSED') {
    return { membershipStatus: 'FROZEN', attendanceStatus: 'FLAGGED_FROZEN' };
  }

  if (latest.status === 'CANCELLED') {
    return { membershipStatus: 'CANCELLED', attendanceStatus: 'FLAGGED_CANCELLED' };
  }

  return { membershipStatus: 'NO_MEMBERSHIP', attendanceStatus: 'FLAGGED_NO_MEMBERSHIP' };
};

/**
 * Process a single attendance punch from a registered biometric device.
 * Idempotent: duplicate punches with the same rawEventReference are ignored cleanly.
 */
const processAttendanceEvent = async ({
  device,
  biometricUserId,
  timestamp,
  verificationMethod = 'UNKNOWN',
  eventType = 'CHECK_IN',
  rawEventReference = null,
}) => {
  if (!device || !device.isActive || device.status === 'DISABLED') {
    const err = new Error('Device is not registered or is disabled.');
    err.statusCode = 403;
    throw err;
  }

  const cleanBioId = String(biometricUserId || '').trim();
  if (!cleanBioId) {
    const err = new Error('Biometric user ID is missing in event.');
    err.statusCode = 400;
    throw err;
  }

  const eventTime = timestamp ? new Date(timestamp) : new Date();
  if (Number.isNaN(eventTime.getTime())) {
    const err = new Error('Invalid event timestamp.');
    err.statusCode = 400;
    throw err;
  }

  const dedupKey = rawEventReference || `${device._id}:${cleanBioId}:${eventTime.toISOString()}`;

  // Idempotency check
  const existing = await Attendance.findOne({ deviceId: device._id, rawEventReference: dedupKey }).lean();
  if (existing) {
    return { duplicate: true, record: existing };
  }

  // Lookup BiometricUserMapping (supports both Clients and Employees)
  const mapping = await BiometricUserMapping.findOne({
    deviceId: device._id,
    biometricUserId: cleanBioId,
    status: 'ACTIVE',
  })
    .populate('clientProfileId')
    .populate('employeeId');

  const dateStr = getKolkataParts(eventTime).dateStr;
  const dayStart = new Date(`${dateStr}T00:00:00+05:30`);

  // Employee biometric attendance path
  if (mapping && (mapping.subjectType === 'EMPLOYEE' || mapping.employeeId)) {
    const employee = mapping.employeeId;
    if (!employee) {
      await logDeviceEvent({
        deviceId: device._id,
        branchId: device.branchId,
        category: 'ATTENDANCE_SYNC',
        status: 'WARNING',
        action: 'UNMAPPED_BIOMETRIC_PUNCH',
        message: `Biometric ID ${cleanBioId} references a missing employee record on ${device.deviceName}.`,
      });
    } else {
      const isInactive = employee.employmentStatus !== 'ACTIVE';
      if (isInactive) {
        await logDeviceEvent({
          deviceId: device._id,
          branchId: device.branchId,
          category: 'ATTENDANCE_SYNC',
          status: 'WARNING',
          action: 'INACTIVE_EMPLOYEE_PUNCH',
          message: `Biometric punch received for inactive employee ${employee.fullName} (${employee.employeeId}, Biometric ID ${cleanBioId}).`,
        });
      } else if (['LINKED', 'PENDING_VERIFICATION'].includes(employee.biometricEnrollmentStatus)) {
        const Employee = require('../models/Employee');
        await Employee.updateOne(
          { _id: employee._id },
          {
            $set: {
              biometricEnrollmentStatus: 'VERIFIED',
              biometricVerifiedAt: new Date(),
              biometricError: '',
            },
          }
        );
      }

      try {
        const record = await Attendance.create({
          userId: null,
          clientProfileId: null,
          employeeId: employee._id,
          subjectType: 'EMPLOYEE',
          branchId: device.branchId,
          date: dayStart,
          checkInTime: eventTime,
          method: 'BIOMETRIC',
          biometricUserId: cleanBioId,
          deviceId: device._id,
          eventType,
          verificationMethod,
          source: 'BIOMETRIC_ADMS',
          membershipStatusAtEvent: 'N/A',
          attendanceStatus: isInactive ? 'FLAGGED_SUSPENDED' : 'SUCCESS',
          rawEventReference: dedupKey,
        });
        if (!isInactive) {
          const attendanceNotificationService = require('./attendanceNotificationService');
          await attendanceNotificationService.createAndEmitForEmployeeAttendance({
            attendance: record,
            employee,
            device,
          });
        }
        return { duplicate: false, record };
      } catch (err) {
        if (err.code === 11000) {
          const dup = await Attendance.findOne({ deviceId: device._id, rawEventReference: dedupKey }).lean();
          return { duplicate: true, record: dup };
        }
        throw err;
      }
    }
  }

  const profile = mapping?.clientProfileId || null;
  if (profile) {
    const enrollment = await BiometricEnrollment.findOne({
      clientProfileId: profile._id,
      branchId: device.branchId,
    })
      .select('consentStatus status')
      .lean();

    const isExplicitlyRevoked =
      !enrollment || enrollment.consentStatus === 'WITHDRAWN' || enrollment.status === 'REVOKED';
    const hasEnrollmentAuthorization =
      enrollment &&
      (enrollment.consentStatus === 'GRANTED' ||
        ['ENROLLED', 'DEVICE_USER_READY', 'FACE_ENROLLED', 'AWAITING_PHYSICAL_ENROLLMENT', 'APPROVED'].includes(enrollment.status));

    if (isExplicitlyRevoked || !hasEnrollmentAuthorization) {
      await logDeviceEvent({
        deviceId: device._id,
        branchId: device.branchId,
        category: 'ATTENDANCE_SYNC',
        status: 'WARNING',
        action: 'ATTENDANCE_REJECTED_NO_CONSENT',
        message: `Ignored biometric punch for Biometric ID ${cleanBioId} (${profile.name || profile._id}): biometric authorization is ${enrollment?.consentStatus || 'PENDING'}.`,
      });
      return {
        duplicate: false,
        accepted: false,
        rejected: true,
        reason: 'CONSENT_REQUIRED',
        record: null,
      };
    }
  } else {
    // Unknown / unmapped biometric user ? never silently discard; log for admin investigation
    await logDeviceEvent({
      deviceId: device._id,
      branchId: device.branchId,
      category: 'ATTENDANCE_SYNC',
      status: 'WARNING',
      action: 'UNMAPPED_BIOMETRIC_PUNCH',
      message: `Unmapped biometric punch received for Biometric ID ${cleanBioId} on ${device.deviceName} (${device.serialNumber}).`,
      metadata: { biometricUserId: cleanBioId, eventTime, verificationMethod, eventType },
    });
  }

  const { membershipStatus, attendanceStatus } = await validateMembershipForProfile(profile);

  try {
    const record = await Attendance.create({
      userId: profile?.userId || null,
      clientProfileId: profile?._id || null,
      employeeId: null,
      subjectType: profile ? 'CLIENT' : 'UNKNOWN',
      branchId: device.branchId,
      date: dayStart,
      checkInTime: eventTime,
      method: 'BIOMETRIC',
      biometricUserId: cleanBioId,
      deviceId: device._id,
      eventType,
      verificationMethod,
      source: 'BIOMETRIC_ADMS',
      membershipStatusAtEvent: membershipStatus,
      attendanceStatus,
      rawEventReference: dedupKey,
    });

    return { duplicate: false, record };
  } catch (err) {
    if (err.code === 11000) {
      const dup = await Attendance.findOne({ deviceId: device._id, rawEventReference: dedupKey }).lean();
      return { duplicate: true, record: dup };
    }
    throw err;
  }
};

// ==========================================
// 4. ADMS PROTOCOL HANDLERS (eSSL / ZKTeco)
// ==========================================

const findActiveDeviceBySN = async (sn) => {
  if (!sn) return null;
  return BiometricDevice.findOne({ serialNumber: String(sn).trim().toUpperCase() });
};

const handleAdmsHeartbeat = async (sn, { firmwareVersion = '' } = {}) => {
  const device = await findActiveDeviceBySN(sn);
  if (!device) return null;

  const wasOffline = computeEffectiveStatus(device) !== 'ONLINE';
  const now = new Date();
  device.lastSeenAt = now;
  if (firmwareVersion) device.firmwareVersion = firmwareVersion;
  if (device.isActive && device.status !== 'DISABLED') {
    device.status = 'ONLINE';
    device.errorMessage = '';
  }
  await device.save();

  // Log heartbeat when transitioning from offline or every 15 minutes
  if (wasOffline) {
    await logDeviceEvent({
      deviceId: device._id,
      branchId: device.branchId,
      category: 'HEARTBEAT',
      status: 'SUCCESS',
      action: 'ADMS_HEARTBEAT',
      message: `Device heartbeat received (${device.serialNumber}) — Device is ONLINE.`,
    });
  }

  return device;
};

const handleAdmsAttLog = async (sn, rawBody) => {
  const device = await findActiveDeviceBySN(sn);
  if (!device) return { found: false, processed: 0, duplicates: 0 };
  if (!device.isActive || device.status === 'DISABLED') {
    await logDeviceEvent({
      deviceId: device._id,
      branchId: device.branchId,
      category: 'ERROR',
      status: 'WARNING',
      action: 'ADMS_ATTLOG_REJECTED',
      message: `Rejected attendance push from disabled device ${device.serialNumber}.`,
    });
    return { found: true, disabled: true, processed: 0, duplicates: 0 };
  }

  const lines = String(rawBody || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let processed = 0;
  let duplicates = 0;
  let rejected = 0;
  let malformedCount = 0;

  for (const line of lines) {
    // eSSL / ZKTeco ATTLOG tab-separated format:
    // PIN \t DateTime \t Status \t Verify \t WorkCode \t Reserved1 \t Reserved2
    const parts = line.split('\t');
    if (parts.length < 2) {
      malformedCount += 1;
      continue;
    }

    const biometricUserId = parts[0].trim();
    const rawTs = parts[1].trim();
    const statusCode = parts[2] ?? '0';
    const verifyCode = parts[3] ?? '15';

    if (!biometricUserId || !/^[A-Za-z0-9_-]{1,32}$/.test(biometricUserId)) {
      malformedCount += 1;
      continue;
    }

    // Device local time is IST (+05:30)
    const isoLike = rawTs.includes('T') ? rawTs : `${rawTs.replace(' ', 'T')}+05:30`;
    const eventTime = new Date(isoLike);
    if (Number.isNaN(eventTime.getTime())) {
      malformedCount += 1;
      continue;
    }

    const res = await processAttendanceEvent({
      device,
      biometricUserId,
      timestamp: eventTime,
      verificationMethod: parseAdmsVerifyCode(verifyCode),
      eventType: parseAdmsEventType(statusCode),
      rawEventReference: `${device._id}:${biometricUserId}:${rawTs}`,
    });

    if (res.duplicate) duplicates += 1;
    else if (res.rejected) rejected += 1;
    else processed += 1;
  }

  if (lines.length > 0 && processed === 0 && duplicates === 0 && malformedCount > 0) {
    await logDeviceEvent({
      deviceId: device._id,
      branchId: device.branchId,
      category: 'ERROR',
      status: 'ERROR',
      action: 'ADMS_MALFORMED_PAYLOAD',
      message: `Rejected malformed ATTLOG payload from ${device.serialNumber} (${malformedCount} invalid line(s)).`,
    });
    return { found: true, malformed: true, processed: 0, duplicates: 0 };
  }

  const now = new Date();
  device.lastSeenAt = now;
  device.lastSyncAt = now;
  if (processed > 0) device.lastEventAt = now;
  device.status = 'ONLINE';
  device.errorMessage = '';
  await device.save();

  if (processed > 0 || lines.length > 0) {
    await logDeviceEvent({
      deviceId: device._id,
      branchId: device.branchId,
      category: 'ATTENDANCE_SYNC',
      status: 'SUCCESS',
      action: 'ADMS_ATTLOG',
      message: `Attendance synchronized: ${processed} new, ${duplicates} duplicate(s) skipped.`,
    });
  }

  if (processed > 0) {
    dashboardCache.invalidateOnAttendance();
  }

  return { found: true, processed, duplicates, rejected };
};

const handleAdmsOperLog = async (sn, rawBody) => {
  const device = await findActiveDeviceBySN(sn);
  if (!device) return null;

  const text = String(rawBody || '');
  // Parse optional INFO / user counts if pushed by device
  const userMatch = text.match(/UserCount=(\d+)/i);
  const fpMatch = text.match(/FPCount=(\d+)/i);
  const faceMatch = text.match(/FaceCount=(\d+)/i);
  const fwMatch = text.match(/FWVersion=([^\s\r\n]+)/i);

  if (userMatch) device.userCount = Number(userMatch[1]);
  if (fpMatch) device.fingerprintCount = Number(fpMatch[1]);
  if (faceMatch) device.faceCount = Number(faceMatch[1]);
  if (fwMatch) device.firmwareVersion = fwMatch[1];

  // Parse USER PIN=... records if sent in OPERLOG (never store Passwd or templates)
  const existingMap = new Map(
    (device.discoveredUsers || []).map((u) => [u.biometricUserId, u])
  );
  let parsedUsersCount = 0;
  let invalidUsersCount = 0;
  const operLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of operLines) {
    if (!/^USER\b/i.test(line)) continue;
    const pinMatch = line.match(/\bPIN=([^\t\s]+)/i);
    const pin = pinMatch ? pinMatch[1].trim() : '';
    if (!pin || !/^[A-Za-z0-9_-]{1,32}$/.test(pin)) {
      invalidUsersCount += 1;
      continue;
    }
    const nameMatch = line.match(/\bName=([^\t\r\n]*)/i);
    const priMatch = line.match(/\bPri=([^\t\s]*)/i);
    const prevDiscovered = existingMap.get(pin);
    const nowSeen = new Date();
    existingMap.set(pin, {
      biometricUserId: pin,
      name: nameMatch ? nameMatch[1].trim() : (prevDiscovered?.name || ''),
      privilege: priMatch ? priMatch[1].trim() : (prevDiscovered?.privilege || '0'),
      firstSeenAt: prevDiscovered?.firstSeenAt || prevDiscovered?.seenAt || nowSeen,
      seenAt: nowSeen,
    });
    parsedUsersCount += 1;
  }
  if (parsedUsersCount > 0) {
    device.discoveredUsers = Array.from(existingMap.values());
  }

  device.lastSeenAt = new Date();
  if (device.isActive && device.status !== 'DISABLED') device.status = 'ONLINE';
  await device.save();

  // Promote ACKNOWLEDGED device-user sync jobs to VERIFIED only when OPERLOG confirms the user with a non-empty matching name
  if (parsedUsersCount > 0 && mongoose.connection.readyState === 1) {
    const BiometricEnrollment = require('../models/BiometricEnrollment');
    const BiometricDeviceSyncJob = require('../models/BiometricDeviceSyncJob');
    const pendingJobs = await BiometricDeviceSyncJob.find({
      deviceId: device._id,
      status: 'ACKNOWLEDGED',
    });
    for (const job of pendingJobs) {
      const discovered = existingMap.get(job.biometricUserId);
      if (!discovered || !discovered.name || !String(discovered.name).trim()) continue;
      const enrollment = await BiometricEnrollment.findById(job.enrollmentId).populate('clientProfileId', 'name');
      if (!enrollment) continue;
      const clientName = enrollment.clientProfileId?.name || job.clientName || '';
      const normA = String(discovered.name).toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
      const normB = String(clientName).toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
      if (normA.length === 0 || normB.length === 0 || !normA.some((t) => normB.includes(t))) continue;

      job.status = 'VERIFIED';
      job.verifiedAt = new Date();
      job.responseStatus = 'OPERLOG_CONFIRMED';
      await job.save();

      const prevStatus = enrollment.status;
      enrollment.deviceUserSyncStatus = 'VERIFIED';
      if (!['ENROLLED', 'REVOKED'].includes(enrollment.status)) {
        enrollment.status = 'DEVICE_USER_READY';
        enrollment.faceEnrollmentStatus = 'PENDING';
      }
      enrollment.history.push({
        action: 'DEVICE_USER_VERIFIED',
        fromStatus: prevStatus,
        toStatus: enrollment.status,
        note: `Confirmed device user ${job.biometricUserId} (${discovered.name}) via OPERLOG from ${device.serialNumber}.`,
      });
      await enrollment.save();
    }
  }

  await logDeviceEvent({
    deviceId: device._id,
    branchId: device.branchId,
    category: 'USER_SYNC',
    status: 'INFO',
    action: 'ADMS_OPERLOG',
    message: `Received OPERLOG update from ${device.serialNumber}${parsedUsersCount ? ` (${parsedUsersCount} user record(s) parsed, ${invalidUsersCount} invalid)` : ''}.`,
  });

  return device;
};

// ==========================================
// 5. DASHBOARD QUERIES (ADMIN)
// ==========================================

const getDevicesOverview = async (query = {}) => {
  const filter = {};
  if (query.branchId && query.branchId !== 'ALL' && mongoose.Types.ObjectId.isValid(query.branchId)) {
    filter.branchId = query.branchId;
  }

  const todayRange = getKolkataDayRange(getKolkataParts().dateStr);

  const [devices, todayBioAttendance] = await Promise.all([
    BiometricDevice.find(filter).populate('branchId', 'name city code').sort({ createdAt: 1 }).lean(),
    Attendance.find({
      ...(filter.branchId ? { branchId: filter.branchId } : {}),
      source: 'BIOMETRIC_ADMS',
      checkInTime: { $gte: todayRange.start, $lte: todayRange.end },
    })
      .select('deviceId')
      .lean(),
  ]);

  const countByDevice = {};
  for (const a of todayBioAttendance) {
    const dId = String(a.deviceId || '');
    countByDevice[dId] = (countByDevice[dId] || 0) + 1;
  }

  let online = 0;
  let offline = 0;
  let syncing = 0;

  const nowMs = Date.now();
  const enrichedDevices = devices.map((d) => {
    const effectiveStatus = computeEffectiveStatus(d, nowMs);
    const health = computeHealthIndicator(effectiveStatus);
    if (effectiveStatus === 'ONLINE') online += 1;
    else if (effectiveStatus === 'SYNCING') syncing += 1;
    else if (effectiveStatus === 'OFFLINE' || effectiveStatus === 'ERROR') offline += 1;

    const lastSeenSecondsAgo = d.lastSeenAt
      ? Math.max(0, Math.floor((nowMs - new Date(d.lastSeenAt).getTime()) / 1000))
      : null;

    return {
      ...d,
      effectiveStatus,
      lastSeenSecondsAgo,
      health,
      todayAttendanceCount: countByDevice[String(d._id)] || 0,
    };
  });

  return {
    summary: {
      totalDevices: devices.length,
      online,
      offline,
      syncing,
      attendanceToday: todayBioAttendance.length,
    },
    devices: enrichedDevices,
  };
};

const getDeviceDetails = async (id) => {
  const device = await BiometricDevice.findById(id).populate('branchId', 'name city code').lean();
  if (!device) {
    const err = new Error('Biometric device not found.');
    err.statusCode = 404;
    throw err;
  }

  const nowParts = getKolkataParts();
  const todayRange = getKolkataDayRange(nowParts.dateStr);
  const monthRange = getKolkataMonthRange(nowParts.year, nowParts.month);

  const [todayCount, monthCount, logs, mappings] = await Promise.all([
    Attendance.countDocuments({
      deviceId: device._id,
      checkInTime: { $gte: todayRange.start, $lte: todayRange.end },
    }),
    Attendance.countDocuments({
      deviceId: device._id,
      checkInTime: { $gte: monthRange.start, $lte: monthRange.end },
    }),
    BiometricDeviceLog.find({ deviceId: device._id })
      .populate('actorUserId', 'name')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    BiometricUserMapping.find({ deviceId: device._id })
      .populate('clientProfileId', 'clientId name phone email')
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const nowMs = Date.now();
  const effectiveStatus = computeEffectiveStatus(device, nowMs);
  const health = computeHealthIndicator(effectiveStatus);
  const lastSeenSecondsAgo = device.lastSeenAt
    ? Math.max(0, Math.floor((nowMs - new Date(device.lastSeenAt).getTime()) / 1000))
    : null;

  return {
    device: {
      ...device,
      effectiveStatus,
      lastSeenSecondsAgo,
      health,
      attendanceToday: todayCount,
      attendanceThisMonth: monthCount,
    },
    logs,
    mappings,
  };
};

const getBiometricAttendance = async (query = {}) => {
  const {
    branchId,
    date,
    deviceId,
    verificationMethod,
    membershipStatus,
    attendanceStatus,
    search,
    page = 1,
    limit = 20,
  } = query;

  const filter = { source: 'BIOMETRIC_ADMS' };
  if (branchId && branchId !== 'ALL' && mongoose.Types.ObjectId.isValid(branchId)) {
    filter.branchId = branchId;
  }
  if (deviceId && deviceId !== 'ALL' && mongoose.Types.ObjectId.isValid(deviceId)) {
    filter.deviceId = deviceId;
  }
  if (verificationMethod && verificationMethod !== 'ALL') {
    filter.verificationMethod = verificationMethod;
  }
  if (membershipStatus && membershipStatus !== 'ALL') {
    filter.membershipStatusAtEvent = membershipStatus;
  }
  if (attendanceStatus && attendanceStatus !== 'ALL') {
    filter.attendanceStatus = attendanceStatus;
  }

  const targetDateStr = date ? date.slice(0, 10) : getKolkataParts().dateStr;
  const dayRange = getKolkataDayRange(targetDateStr);
  filter.checkInTime = { $gte: dayRange.start, $lte: dayRange.end };

  const records = await Attendance.find(filter)
    .populate('clientProfileId', 'clientId name phone')
    .populate('employeeId', 'employeeId fullName department designation')
    .populate('userId', 'name phone')
    .populate('branchId', 'name city')
    .populate('deviceId', 'deviceName model serialNumber')
    .sort({ checkInTime: -1 })
    .lean();

  let mapped = records.map((r) => ({
    id: r._id,
    subjectType: r.subjectType || (r.employeeId ? 'EMPLOYEE' : r.clientProfileId ? 'CLIENT' : 'UNKNOWN'),
    memberName: r.employeeId?.fullName || r.clientProfileId?.name || r.userId?.name || 'Unmapped Biometric User',
    memberId: r.employeeId?.employeeId || r.clientProfileId?.clientId || 'UNMAPPED',
    biometricUserId: r.biometricUserId,
    branch: r.branchId?.city || r.branchId?.name || '—',
    device: r.deviceId ? `${r.deviceId.model} (${r.deviceId.deviceName})` : '—',
    verificationMethod: r.verificationMethod,
    checkInTime: r.checkInTime,
    membershipStatus: r.membershipStatusAtEvent,
    attendanceStatus: r.attendanceStatus,
  }));

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    mapped = mapped.filter(
      (m) =>
        m.memberName.toLowerCase().includes(q) ||
        m.memberId.toLowerCase().includes(q) ||
        String(m.biometricUserId || '').toLowerCase().includes(q)
    );
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const total = mapped.length;
  const rows = mapped.slice((parsedPage - 1) * parsedLimit, parsedPage * parsedLimit);

  return {
    date: targetDateStr,
    total,
    page: parsedPage,
    limit: parsedLimit,
    totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
    records: rows,
  };
};

// ==========================================
// 6. SAFE ADMS READ-ONLY COMMAND QUEUE
// ==========================================

const ALLOWED_READ_ONLY_COMMANDS = Object.freeze({
  INFO: 'INFO',
  CHECK: 'CHECK',
  DATA_QUERY_USERINFO: 'DATA QUERY USERINFO',
});

const FORBIDDEN_COMMAND_PATTERNS = [
  /CLEAR/i,
  /DELETE/i,
  /RESET/i,
  /REBOOT/i,
  /SHUTDOWN/i,
  /DATA[\s_]+UPDATE/i,
  /ENROLL/i,
  /SET[\s_]+OPTION/i,
];

const assertAdminBranchAccess = (adminUser, targetBranchId) => {
  const adminBranch = adminUser?.branchId?._id || adminUser?.branchId;
  if (!adminBranch || !targetBranchId) return;
  if (String(adminBranch) !== String(targetBranchId)) {
    const err = new Error('Access denied: resource belongs to a different branch.');
    err.statusCode = 403;
    throw err;
  }
};

let commandSeqCounter = 0;
const generateUniqueCommandId = () => {
  commandSeqCounter = (commandSeqCounter + 1) % 1000;
  return `${Date.now()}${String(commandSeqCounter).padStart(3, '0')}`;
};

const queueDeviceCommand = async (deviceId, { commandType, rawCommand = '' } = {}, adminUser = null) => {
  const normalizedType = String(commandType || '').trim().toUpperCase();
  const rawCheck = `${normalizedType} ${String(rawCommand || '')}`;
  if (FORBIDDEN_COMMAND_PATTERNS.some((re) => re.test(rawCheck))) {
    const err = new Error('Command rejected: destructive or mutating device commands are strictly prohibited.');
    err.statusCode = 403;
    throw err;
  }

  const commandPayload = ALLOWED_READ_ONLY_COMMANDS[normalizedType];
  if (!commandPayload) {
    const err = new Error(
      `Unsupported commandType "${commandType}". Allowed read-only commands: ${Object.keys(ALLOWED_READ_ONLY_COMMANDS).join(', ')}.`
    );
    err.statusCode = 400;
    throw err;
  }

  const device = await BiometricDevice.findById(deviceId);
  if (!device) {
    const err = new Error('Biometric device not found.');
    err.statusCode = 404;
    throw err;
  }

  assertAdminBranchAccess(adminUser, device.branchId);

  if (!device.isActive || device.status === 'DISABLED') {
    const err = new Error('Cannot queue command for a disabled device.');
    err.statusCode = 400;
    throw err;
  }

  const cmd = await BiometricDeviceCommand.create({
    deviceId: device._id,
    branchId: device.branchId,
    commandId: generateUniqueCommandId(),
    commandType: normalizedType,
    commandPayload,
    status: 'PENDING',
    createdBy: adminUser?._id || null,
  });

  await logDeviceEvent({
    deviceId: device._id,
    branchId: device.branchId,
    category: 'ADMIN_ACTION',
    status: 'INFO',
    action: 'QUEUE_COMMAND',
    message: `Queued read-only ADMS command ${normalizedType} (ID: ${cmd.commandId}) for ${device.serialNumber}`,
    actorUserId: adminUser?._id || null,
  });

  return cmd;
};

const getDeviceCommands = async (deviceId, query = {}, adminUser = null) => {
  const device = await BiometricDevice.findById(deviceId).select('_id branchId').lean();
  if (!device) {
    const err = new Error('Biometric device not found.');
    err.statusCode = 404;
    throw err;
  }
  assertAdminBranchAccess(adminUser, device.branchId);

  const filter = { deviceId: device._id };
  if (query.status && query.status !== 'ALL') {
    filter.status = String(query.status).toUpperCase();
  }

  const [commands, allStatuses] = await Promise.all([
    BiometricDeviceCommand.find(filter)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    BiometricDeviceCommand.find({ deviceId: device._id }).select('status').lean(),
  ]);

  const counts = { pending: 0, sent: 0, completed: 0, failed: 0, total: allStatuses.length };
  for (const c of allStatuses) {
    if (c.status === 'PENDING') counts.pending += 1;
    else if (c.status === 'SENT' || c.status === 'ACKNOWLEDGED') counts.sent += 1;
    else if (c.status === 'COMPLETED') counts.completed += 1;
    else if (c.status === 'FAILED' || c.status === 'EXPIRED') counts.failed += 1;
  }

  return { counts, commands };
};

const cancelDeviceCommand = async (commandDocId, adminUser = null) => {
  const cmd = await BiometricDeviceCommand.findById(commandDocId);
  if (!cmd) {
    const err = new Error('Device command not found.');
    err.statusCode = 404;
    throw err;
  }
  assertAdminBranchAccess(adminUser, cmd.branchId);

  if (['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(cmd.status)) {
    const err = new Error(`Command is already ${cmd.status} and cannot be cancelled.`);
    err.statusCode = 409;
    throw err;
  }

  cmd.status = 'CANCELLED';
  cmd.completedAt = new Date();
  await cmd.save();

  await logDeviceEvent({
    deviceId: cmd.deviceId,
    branchId: cmd.branchId,
    category: 'ADMIN_ACTION',
    status: 'INFO',
    action: 'CANCEL_COMMAND',
    message: `Cancelled ADMS command ${cmd.commandType} (ID: ${cmd.commandId})`,
    actorUserId: adminUser?._id || null,
  });

  return cmd;
};

const dispatchPendingCommandsForDevice = async (snOrDevice) => {
  const device =
    snOrDevice && typeof snOrDevice === 'object' && snOrDevice._id
      ? snOrDevice
      : await findActiveDeviceBySN(snOrDevice);
  if (!device || !device.isActive || device.status === 'DISABLED') {
    return { device, commandLines: [] };
  }

  // Physical X2008 command dispatch is disabled by default until hardware staging verification passes
  if (process.env.ADMS_COMMAND_DISPATCH_ENABLED !== 'true') {
    return { device, commandLines: [] };
  }

  const now = new Date();
  // Expire stale commands
  await BiometricDeviceCommand.updateMany(
    {
      deviceId: device._id,
      status: { $in: ['PENDING', 'SENT'] },
      expiresAt: { $lt: now },
    },
    { $set: { status: 'EXPIRED', error: 'Command expired before completion.' } }
  );

  // Re-queue timed-out SENT commands (older than 120s) or mark FAILED if retries exhausted
  const staleThreshold = new Date(now.getTime() - 120 * 1000);
  const staleSent = await BiometricDeviceCommand.find({
    deviceId: device._id,
    status: 'SENT',
    sentAt: { $lt: staleThreshold },
  });
  for (const sc of staleSent) {
    if (sc.retryCount >= sc.maxRetries) {
      sc.status = 'FAILED';
      sc.error = 'Device response timed out after max retries.';
      sc.completedAt = now;
      await sc.save();
    } else {
      sc.status = 'PENDING';
      sc.retryCount += 1;
      await sc.save();
    }
  }

  // Dispatch up to 5 PENDING allowlisted commands
  const pending = await BiometricDeviceCommand.find({
    deviceId: device._id,
    status: 'PENDING',
  })
    .sort({ createdAt: 1 })
    .limit(5);

  const commandLines = [];
  for (const cmd of pending) {
    if (!ALLOWED_READ_ONLY_COMMANDS[cmd.commandType]) continue;
    const locked = await BiometricDeviceCommand.findOneAndUpdate(
      { _id: cmd._id, status: 'PENDING' },
      { $set: { status: 'SENT', sentAt: now } },
      { new: true }
    );
    if (locked) {
      commandLines.push(`C:${locked.commandId}:${locked.commandPayload}`);
    }
  }

  return { device, commandLines };
};

const handleAdmsDeviceCmdResponse = async (sn, rawBody) => {
  const device = await findActiveDeviceBySN(sn);
  if (!device) return { found: false, processed: 0 };

  const text = String(rawBody || '').trim();
  if (!text) return { found: true, processed: 0 };

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let processed = 0;

  for (const line of lines) {
    // ADMS devicecmd response format: ID=12345&Return=0&CMD=INFO
    const params = new URLSearchParams(line.replace(/\t/g, '&'));
    const cmdId = (params.get('ID') || params.get('id') || '').trim();
    const returnCode = (params.get('Return') || params.get('return') || '').trim();

    if (!cmdId || returnCode === '') {
      await logDeviceEvent({
        deviceId: device._id,
        branchId: device.branchId,
        category: 'ERROR',
        status: 'WARNING',
        action: 'ADMS_DEVICECMD_MALFORMED',
        message: `Received malformed devicecmd response from ${device.serialNumber}`,
      });
      continue;
    }

    const cmd = await BiometricDeviceCommand.findOne({ deviceId: device._id, commandId: cmdId });
    if (!cmd) {
      await logDeviceEvent({
        deviceId: device._id,
        branchId: device.branchId,
        category: 'ERROR',
        status: 'WARNING',
        action: 'ADMS_DEVICECMD_UNKNOWN',
        message: `Received devicecmd response for unknown command ID ${cmdId}`,
      });
      continue;
    }

    // Idempotent handling for duplicate acknowledgements
    if (['COMPLETED', 'FAILED'].includes(cmd.status)) {
      continue;
    }

    const now = new Date();
    const isSuccess = returnCode === '0';
    cmd.acknowledgedAt = cmd.acknowledgedAt || now;
    cmd.completedAt = now;
    cmd.response = line.slice(0, 500);
    cmd.status = isSuccess ? 'COMPLETED' : 'FAILED';
    cmd.error = isSuccess ? '' : `Device returned error code ${returnCode}`;
    await cmd.save();

    await logDeviceEvent({
      deviceId: device._id,
      branchId: device.branchId,
      category: 'ADMIN_ACTION',
      status: isSuccess ? 'SUCCESS' : 'ERROR',
      action: 'ADMS_DEVICECMD_RESULT',
      message: `Command ${cmd.commandType} (ID: ${cmd.commandId}) ${cmd.status} (Return=${returnCode})`,
    });
    processed += 1;
  }

  return { found: true, processed };
};

module.exports = {
  computeEffectiveStatus,
  computeHealthIndicator,
  parseAdmsVerifyCode,
  registerDevice,
  updateDevice,
  toggleDeviceStatus,
  testDeviceConnection,
  syncDevice,
  mapBiometricUser,
  unmapBiometricUser,
  processAttendanceEvent,
  handleAdmsHeartbeat,
  handleAdmsAttLog,
  handleAdmsOperLog,
  getDevicesOverview,
  getDeviceDetails,
  getBiometricAttendance,
  ALLOWED_READ_ONLY_COMMANDS,
  assertAdminBranchAccess,
  queueDeviceCommand,
  getDeviceCommands,
  cancelDeviceCommand,
  dispatchPendingCommandsForDevice,
  handleAdmsDeviceCmdResponse,
};
