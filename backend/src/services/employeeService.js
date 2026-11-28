const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const Branch = require('../models/Branch');
const BiometricDevice = require('../models/BiometricDevice');
const BiometricUserMapping = require('../models/BiometricUserMapping');
const BiometricDeviceLog = require('../models/BiometricDeviceLog');
const Attendance = require('../models/Attendance');
const ClientSequence = require('../models/ClientSequence');
const { assertAdminBranchAccess } = require('./biometricDeviceService');
const { processTrainerPhotoBuffer, UPLOAD_ROOT } = require('./trainerPhotoService');

const EMPLOYEE_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'employees');

const ensureEmployeeUploadDir = () => {
  if (!fs.existsSync(EMPLOYEE_UPLOAD_DIR)) {
    fs.mkdirSync(EMPLOYEE_UPLOAD_DIR, { recursive: true });
  }
};

const saveEmployeePhoto = async (employeeKey, buffer) => {
  const processed = await processTrainerPhotoBuffer(buffer);
  ensureEmployeeUploadDir();
  const safeId = String(employeeKey || 'emp').replace(/[^a-zA-Z0-9_-]/g, '');
  const randomSuffix = crypto.randomBytes(6).toString('hex');
  const fileName = `employee-${safeId}-${Date.now()}-${randomSuffix}.webp`;
  const targetPath = path.resolve(EMPLOYEE_UPLOAD_DIR, fileName);
  if (!targetPath.startsWith(EMPLOYEE_UPLOAD_DIR + path.sep)) {
    throw new Error('Invalid storage path resolved.');
  }
  await fs.promises.writeFile(targetPath, processed.buffer);
  return `/uploads/employees/${fileName}`;
};

const deleteEmployeePhotoIfLocal = async (photoUrl) => {
  if (!photoUrl || typeof photoUrl !== 'string' || !photoUrl.startsWith('/uploads/employees/')) return;
  const safeName = path.basename(photoUrl.trim());
  const targetPath = path.resolve(EMPLOYEE_UPLOAD_DIR, safeName);
  if (!targetPath.startsWith(EMPLOYEE_UPLOAD_DIR + path.sep)) return;
  try {
    await fs.promises.unlink(targetPath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`Failed to delete employee photo (${safeName}):`, err.message);
    }
  }
};

const resolveScopedBranchFilter = (requestedBranchId, adminUser) => {
  const adminBranch = adminUser?.branchId?._id || adminUser?.branchId;
  if (adminBranch) {
    if (requestedBranchId && requestedBranchId !== 'ALL' && String(requestedBranchId) !== String(adminBranch)) {
      const err = new Error('Access denied: you can only access employees in your assigned branch.');
      err.statusCode = 403;
      throw err;
    }
    return new mongoose.Types.ObjectId(adminBranch);
  }
  if (requestedBranchId && requestedBranchId !== 'ALL' && mongoose.Types.ObjectId.isValid(requestedBranchId)) {
    return new mongoose.Types.ObjectId(requestedBranchId);
  }
  return null;
};

const validateBiometricIdFormat = (bioId) => {
  const clean = String(bioId || '').trim();
  if (!clean) return '';
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(clean)) {
    const err = new Error('Biometric User ID must be 1–32 alphanumeric characters (letters, numbers, _ or -).');
    err.statusCode = 400;
    throw err;
  }
  return clean;
};

const assertNoEmployeeBiometricConflict = async ({
  deviceId,
  biometricUserId,
  excludeEmployeeId = null,
}) => {
  if (!deviceId || !biometricUserId) return;

  const [conflictEmployee, conflictMapping] = await Promise.all([
    Employee.findOne({
      assignedDeviceId: deviceId,
      biometricUserId,
      employmentStatus: 'ACTIVE',
      ...(excludeEmployeeId ? { _id: { $ne: excludeEmployeeId } } : {}),
    })
      .select('employeeId fullName')
      .lean(),
    BiometricUserMapping.findOne({
      deviceId,
      biometricUserId,
      status: 'ACTIVE',
      ...(excludeEmployeeId ? { employeeId: { $ne: excludeEmployeeId } } : {}),
    })
      .populate('clientProfileId', 'clientId name')
      .populate('employeeId', 'employeeId fullName')
      .lean(),
  ]);

  if (conflictEmployee) {
    const err = new Error(
      `Biometric User ID "${biometricUserId}" is already assigned to active employee ${conflictEmployee.fullName} (${conflictEmployee.employeeId}) on this device.`
    );
    err.statusCode = 409;
    throw err;
  }

  if (conflictMapping) {
    if (conflictMapping.subjectType === 'CLIENT' && conflictMapping.clientProfileId) {
      const err = new Error(
        `Biometric User ID "${biometricUserId}" is already mapped to client ${conflictMapping.clientProfileId.name} (${conflictMapping.clientProfileId.clientId}) on this device.`
      );
      err.statusCode = 409;
      throw err;
    }
    if (conflictMapping.employeeId) {
      const err = new Error(
        `Biometric User ID "${biometricUserId}" is already mapped to employee ${conflictMapping.employeeId.fullName} (${conflictMapping.employeeId.employeeId}) on this device.`
      );
      err.statusCode = 409;
      throw err;
    }
  }
};

const syncEmployeeBiometricMapping = async ({
  employee,
  deviceId,
  biometricUserId,
  requestedStatus,
  biometricError = '',
  adminUser = null,
}) => {
  const cleanBioId = validateBiometricIdFormat(biometricUserId);
  const cleanDeviceId = deviceId && mongoose.Types.ObjectId.isValid(deviceId) ? deviceId : null;

  if (cleanBioId && !cleanDeviceId) {
    const err = new Error('Assigned Biometric Device is required when setting a Biometric User ID.');
    err.statusCode = 400;
    throw err;
  }

  // Deactivate any previous active mapping owned by this employee if device or PIN changed
  await BiometricUserMapping.updateMany(
    {
      employeeId: employee._id,
      status: 'ACTIVE',
      $or: [
        { deviceId: { $ne: cleanDeviceId } },
        { biometricUserId: { $ne: cleanBioId } },
      ],
    },
    { $set: { status: 'INACTIVE' } }
  );

  if (!cleanBioId || !cleanDeviceId) {
    employee.biometricUserId = '';
    employee.assignedDeviceId = cleanDeviceId;
    employee.biometricEnrollmentStatus = requestedStatus === 'ERROR' ? 'ERROR' : 'NOT_LINKED';
    employee.biometricError = requestedStatus === 'ERROR' ? String(biometricError || '').trim() : '';
    employee.biometricLinkedAt = null;
    return employee;
  }

  const device = await BiometricDevice.findById(cleanDeviceId);
  if (!device) {
    const err = new Error('Selected biometric device not found.');
    err.statusCode = 404;
    throw err;
  }
  assertAdminBranchAccess(adminUser, device.branchId);

  if (String(device.branchId) !== String(employee.branchId)) {
    const err = new Error('Branch mismatch: assigned biometric device belongs to a different branch than the employee.');
    err.statusCode = 409;
    throw err;
  }

  if (employee.employmentStatus === 'ACTIVE') {
    await assertNoEmployeeBiometricConflict({
      deviceId: device._id,
      biometricUserId: cleanBioId,
      excludeEmployeeId: employee._id,
    });

    await BiometricUserMapping.findOneAndUpdate(
      { deviceId: device._id, biometricUserId: cleanBioId },
      {
        biometricUserId: cleanBioId,
        subjectType: 'EMPLOYEE',
        employeeId: employee._id,
        clientProfileId: null,
        userId: null,
        deviceId: device._id,
        branchId: device.branchId,
        status: 'ACTIVE',
      },
      { upsert: true, new: true }
    );

    await BiometricDeviceLog.create({
      deviceId: device._id,
      branchId: device.branchId,
      category: 'USER_SYNC',
      status: 'INFO',
      action: 'EMPLOYEE_BIOMETRIC_MAPPED',
      message: `Mapped Employee ${employee.fullName} (${employee.employeeId}) to Biometric User ID "${cleanBioId}" on ${device.deviceName}.`,
      actorUserId: adminUser?._id || null,
    });
  }

  const allowedStatuses = ['LINKED', 'PENDING_VERIFICATION', 'VERIFIED', 'ERROR'];
  const nextBioStatus = allowedStatuses.includes(requestedStatus) ? requestedStatus : 'LINKED';

  employee.biometricUserId = cleanBioId;
  employee.assignedDeviceId = device._id;
  employee.biometricEnrollmentStatus = nextBioStatus;
  employee.biometricError = nextBioStatus === 'ERROR' ? String(biometricError || '').trim() : '';
  employee.biometricLinkedAt = employee.biometricLinkedAt || new Date();
  if (nextBioStatus === 'VERIFIED' && !employee.biometricVerifiedAt) {
    employee.biometricVerifiedAt = new Date();
  }

  return employee;
};

const getNextEmployeeId = async () => {
  for (let i = 0; i < 20; i += 1) {
    const candidate = await ClientSequence.getNextEmployeeId();
    const exists = await Employee.exists({ employeeId: candidate });
    if (!exists) return candidate;
  }
  const count = await Employee.countDocuments();
  return `EMP${String(count + 100).padStart(3, '0')}`;
};

const previewNextEmployeeId = async () => {
  const seqDoc = await ClientSequence.findById('employee').lean();
  let nextNum = (seqDoc?.sequence || 0) + 1;
  for (let i = 0; i < 50; i += 1) {
    const candidate = `EMP${String(nextNum).padStart(3, '0')}`;
    const exists = await Employee.exists({ employeeId: candidate });
    if (!exists) return candidate;
    nextNum += 1;
  }
  return `EMP${String(nextNum).padStart(3, '0')}`;
};

const getEmployeeOverview = async (query = {}, adminUser = null) => {
  const branchObjectId = resolveScopedBranchFilter(query.branchId, adminUser);
  const filter = branchObjectId ? { branchId: branchObjectId } : {};

  const [totalEmployees, activeEmployees, inactiveEmployees, withoutBiometricId, departments] = await Promise.all([
    Employee.countDocuments(filter),
    Employee.countDocuments({ ...filter, employmentStatus: 'ACTIVE' }),
    Employee.countDocuments({ ...filter, employmentStatus: 'INACTIVE' }),
    Employee.countDocuments({
      ...filter,
      employmentStatus: 'ACTIVE',
      $or: [{ biometricUserId: '' }, { biometricUserId: null }, { biometricUserId: { $exists: false } }],
    }),
    Employee.distinct('department', filter),
  ]);

  return {
    totalEmployees,
    activeEmployees,
    inactiveEmployees,
    withoutBiometricId,
    departments: departments.filter(Boolean).sort((a, b) => a.localeCompare(b)),
  };
};

const listEmployees = async (query = {}, adminUser = null) => {
  const branchObjectId = resolveScopedBranchFilter(query.branchId, adminUser);
  const filter = {};
  if (branchObjectId) filter.branchId = branchObjectId;

  if (query.department && query.department !== 'ALL') {
    filter.department = query.department.trim();
  }
  if (query.employmentStatus && query.employmentStatus !== 'ALL') {
    filter.employmentStatus = query.employmentStatus.toUpperCase();
  }
  if (query.biometricStatus && query.biometricStatus !== 'ALL') {
    if (query.biometricStatus === 'UNLINKED') {
      filter.$or = [{ biometricUserId: '' }, { biometricUserId: null }, { biometricEnrollmentStatus: 'NOT_LINKED' }];
    } else {
      filter.biometricEnrollmentStatus = query.biometricStatus;
    }
  }
  if (query.search && query.search.trim()) {
    const safe = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safe, 'i');
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [{ fullName: regex }, { employeeId: regex }, { biometricUserId: regex }, { phone: regex }],
    });
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 15));
  const skip = (page - 1) * limit;

  const [total, employees] = await Promise.all([
    Employee.countDocuments(filter),
    Employee.find(filter)
      .populate('branchId', 'name city code')
      .populate('assignedDeviceId', 'deviceName model serialNumber status lastSeenAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    employees,
  };
};

const getEmployeeById = async (id, adminUser = null) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('Invalid employee ID.');
    err.statusCode = 400;
    throw err;
  }

  const employee = await Employee.findById(id)
    .populate('branchId', 'name city code')
    .populate('assignedDeviceId', 'deviceName model serialNumber status lastSeenAt')
    .populate('deactivatedBy', 'name email')
    .populate('reactivatedBy', 'name email')
    .populate('statusHistory.actorUserId', 'name email')
    .lean();

  if (!employee) {
    const err = new Error('Employee not found.');
    err.statusCode = 404;
    throw err;
  }

  assertAdminBranchAccess(adminUser, employee.branchId?._id || employee.branchId);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [recentAttendance, totalAttendanceCount, monthAttendanceCount] = await Promise.all([
    Attendance.find({ employeeId: employee._id })
      .populate('deviceId', 'deviceName model serialNumber')
      .populate('branchId', 'name city')
      .sort({ checkInTime: -1 })
      .limit(20)
      .lean(),
    Attendance.countDocuments({ employeeId: employee._id }),
    Attendance.countDocuments({ employeeId: employee._id, date: { $gte: monthStart } }),
  ]);

  return {
    employee,
    attendanceSummary: {
      totalPunches: totalAttendanceCount,
      thisMonthPunches: monthAttendanceCount,
      lastCheckIn: recentAttendance[0]?.checkInTime || null,
    },
    recentAttendance,
  };
};

const getEmployeeAttendance = async (id, query = {}, adminUser = null) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('Invalid employee ID.');
    err.statusCode = 400;
    throw err;
  }

  const employee = await Employee.findById(id).select('branchId fullName employeeId').lean();
  if (!employee) {
    const err = new Error('Employee not found.');
    err.statusCode = 404;
    throw err;
  }
  assertAdminBranchAccess(adminUser, employee.branchId);

  const filter = { employeeId: employee._id };
  if (query.from || query.to) {
    filter.checkInTime = {};
    if (query.from) filter.checkInTime.$gte = new Date(`${String(query.from).slice(0, 10)}T00:00:00+05:30`);
    if (query.to) filter.checkInTime.$lte = new Date(`${String(query.to).slice(0, 10)}T23:59:59.999+05:30`);
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [total, records] = await Promise.all([
    Attendance.countDocuments(filter),
    Attendance.find(filter)
      .populate('deviceId', 'deviceName model serialNumber')
      .populate('branchId', 'name city')
      .sort({ checkInTime: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    records,
  };
};

const createEmployee = async (payload = {}, photoFile = null, adminUser = null) => {
  const fullName = String(payload.fullName || '').trim();
  const phone = String(payload.phone || '').trim();
  const department = String(payload.department || '').trim();
  const designation = String(payload.designation || '').trim();
  const branchId = payload.branchId;

  if (!fullName || !phone || !department || !designation || !branchId) {
    const err = new Error('Full name, phone number, department, designation, and branch are required.');
    err.statusCode = 400;
    throw err;
  }

  if (!mongoose.Types.ObjectId.isValid(branchId)) {
    const err = new Error('A valid branch ID is required.');
    err.statusCode = 400;
    throw err;
  }

  const branch = await Branch.findById(branchId).lean();
  if (!branch) {
    const err = new Error('Selected branch not found.');
    err.statusCode = 404;
    throw err;
  }
  assertAdminBranchAccess(adminUser, branch._id);

  let employeeId = String(payload.employeeId || '').trim().toUpperCase();
  if (!employeeId) {
    employeeId = await getNextEmployeeId();
  } else {
    const dup = await Employee.exists({ employeeId });
    if (dup) {
      const err = new Error(`Employee ID "${employeeId}" is already in use.`);
      err.statusCode = 409;
      throw err;
    }
  }

  const employmentStatus = payload.employmentStatus === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
  const employee = new Employee({
    employeeId,
    fullName,
    gender: payload.gender || '',
    dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : null,
    phone,
    email: String(payload.email || '').trim().toLowerCase(),
    address: String(payload.address || '').trim(),
    department,
    designation,
    branchId: branch._id,
    joiningDate: payload.joiningDate ? new Date(payload.joiningDate) : new Date(),
    employmentType: payload.employmentType || 'FULL_TIME',
    employmentStatus,
    exitDate: payload.exitDate ? new Date(payload.exitDate) : null,
    createdBy: adminUser?._id || null,
    updatedBy: adminUser?._id || null,
    statusHistory: [
      {
        action: 'CREATED',
        fromStatus: '',
        toStatus: employmentStatus,
        actorUserId: adminUser?._id || null,
        reason: 'Employee record created',
      },
    ],
  });

  if (photoFile && photoFile.buffer) {
    employee.profilePhoto = await saveEmployeePhoto(employeeId, photoFile.buffer);
  }

  // Save first so employee._id exists for BiometricUserMapping, rolling back if biometric conflict occurs
  try {
    await employee.save();
    if (payload.biometricUserId || payload.assignedDeviceId || payload.biometricEnrollmentStatus) {
      await syncEmployeeBiometricMapping({
        employee,
        deviceId: payload.assignedDeviceId,
        biometricUserId: payload.biometricUserId,
        requestedStatus: payload.biometricEnrollmentStatus,
        biometricError: payload.biometricError,
        adminUser,
      });
      await employee.save();
    }
  } catch (err) {
    if (employee._id) {
      await Employee.deleteOne({ _id: employee._id }).catch(() => {});
    }
    if (employee.profilePhoto) {
      await deleteEmployeePhotoIfLocal(employee.profilePhoto);
    }
    throw err;
  }

  return Employee.findById(employee._id)
    .populate('branchId', 'name city code')
    .populate('assignedDeviceId', 'deviceName model serialNumber status')
    .lean();
};

const updateEmployee = async (id, payload = {}, photoFile = null, adminUser = null) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('Invalid employee ID.');
    err.statusCode = 400;
    throw err;
  }

  const employee = await Employee.findById(id);
  if (!employee) {
    const err = new Error('Employee not found.');
    err.statusCode = 404;
    throw err;
  }

  assertAdminBranchAccess(adminUser, employee.branchId);

  if (payload.branchId && String(payload.branchId) !== String(employee.branchId)) {
    if (!mongoose.Types.ObjectId.isValid(payload.branchId)) {
      const err = new Error('Invalid branch ID.');
      err.statusCode = 400;
      throw err;
    }
    const branch = await Branch.findById(payload.branchId).lean();
    if (!branch) {
      const err = new Error('Selected branch not found.');
      err.statusCode = 404;
      throw err;
    }
    assertAdminBranchAccess(adminUser, branch._id);
    employee.branchId = branch._id;
  }

  if (payload.employeeId !== undefined) {
    const nextCode = String(payload.employeeId).trim().toUpperCase();
    if (!nextCode) {
      const err = new Error('Employee ID cannot be empty.');
      err.statusCode = 400;
      throw err;
    }
    if (nextCode !== employee.employeeId) {
      const dup = await Employee.exists({ employeeId: nextCode, _id: { $ne: employee._id } });
      if (dup) {
        const err = new Error(`Employee ID "${nextCode}" is already assigned to another employee.`);
        err.statusCode = 409;
        throw err;
      }
      employee.employeeId = nextCode;
    }
  }

  if (payload.fullName !== undefined) employee.fullName = String(payload.fullName).trim();
  if (payload.gender !== undefined) employee.gender = payload.gender;
  if (payload.dateOfBirth !== undefined) employee.dateOfBirth = payload.dateOfBirth ? new Date(payload.dateOfBirth) : null;
  if (payload.phone !== undefined) employee.phone = String(payload.phone).trim();
  if (payload.email !== undefined) employee.email = String(payload.email || '').trim().toLowerCase();
  if (payload.address !== undefined) employee.address = String(payload.address || '').trim();
  if (payload.department !== undefined) employee.department = String(payload.department).trim();
  if (payload.designation !== undefined) employee.designation = String(payload.designation).trim();
  if (payload.joiningDate !== undefined && payload.joiningDate) employee.joiningDate = new Date(payload.joiningDate);
  if (payload.employmentType !== undefined) employee.employmentType = payload.employmentType;
  if (payload.exitDate !== undefined) employee.exitDate = payload.exitDate ? new Date(payload.exitDate) : null;

  if (photoFile && photoFile.buffer) {
    const oldPhoto = employee.profilePhoto;
    employee.profilePhoto = await saveEmployeePhoto(employee.employeeId, photoFile.buffer);
    if (oldPhoto) await deleteEmployeePhotoIfLocal(oldPhoto);
  } else if (payload.removePhoto === true || payload.removePhoto === 'true') {
    const oldPhoto = employee.profilePhoto;
    employee.profilePhoto = '';
    if (oldPhoto) await deleteEmployeePhotoIfLocal(oldPhoto);
  }

  const hasBiometricFields =
    payload.biometricUserId !== undefined ||
    payload.assignedDeviceId !== undefined ||
    payload.biometricEnrollmentStatus !== undefined;

  if (hasBiometricFields) {
    await syncEmployeeBiometricMapping({
      employee,
      deviceId: payload.assignedDeviceId !== undefined ? payload.assignedDeviceId : employee.assignedDeviceId,
      biometricUserId: payload.biometricUserId !== undefined ? payload.biometricUserId : employee.biometricUserId,
      requestedStatus:
        payload.biometricEnrollmentStatus !== undefined
          ? payload.biometricEnrollmentStatus
          : employee.biometricEnrollmentStatus,
      biometricError: payload.biometricError,
      adminUser,
    });
  }

  employee.updatedBy = adminUser?._id || null;
  employee.statusHistory.push({
    action: 'UPDATED',
    fromStatus: employee.employmentStatus,
    toStatus: employee.employmentStatus,
    actorUserId: adminUser?._id || null,
    reason: 'Employee details updated',
  });

  await employee.save();

  return Employee.findById(employee._id)
    .populate('branchId', 'name city code')
    .populate('assignedDeviceId', 'deviceName model serialNumber status')
    .lean();
};

const updateEmployeeBiometric = async (id, payload = {}, adminUser = null) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('Invalid employee ID.');
    err.statusCode = 400;
    throw err;
  }

  const employee = await Employee.findById(id);
  if (!employee) {
    const err = new Error('Employee not found.');
    err.statusCode = 404;
    throw err;
  }
  assertAdminBranchAccess(adminUser, employee.branchId);

  await syncEmployeeBiometricMapping({
    employee,
    deviceId: payload.assignedDeviceId,
    biometricUserId: payload.biometricUserId,
    requestedStatus: payload.biometricEnrollmentStatus,
    biometricError: payload.biometricError,
    adminUser,
  });

  employee.updatedBy = adminUser?._id || null;
  employee.statusHistory.push({
    action: 'BIOMETRIC_UPDATED',
    fromStatus: employee.employmentStatus,
    toStatus: employee.employmentStatus,
    actorUserId: adminUser?._id || null,
    reason: employee.biometricUserId
      ? `Biometric ID "${employee.biometricUserId}" (${employee.biometricEnrollmentStatus})`
      : 'Biometric mapping unlinked',
  });

  await employee.save();

  return Employee.findById(employee._id)
    .populate('branchId', 'name city code')
    .populate('assignedDeviceId', 'deviceName model serialNumber status')
    .lean();
};

const deactivateEmployee = async (id, { reason = '', exitDate = null } = {}, adminUser = null) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('Invalid employee ID.');
    err.statusCode = 400;
    throw err;
  }

  const employee = await Employee.findById(id);
  if (!employee) {
    const err = new Error('Employee not found.');
    err.statusCode = 404;
    throw err;
  }
  assertAdminBranchAccess(adminUser, employee.branchId);

  if (employee.employmentStatus === 'INACTIVE') {
    const err = new Error('Employee is already inactive.');
    err.statusCode = 409;
    throw err;
  }

  const now = new Date();
  employee.employmentStatus = 'INACTIVE';
  employee.exitDate = exitDate ? new Date(exitDate) : employee.exitDate || now;
  employee.deactivatedAt = now;
  employee.deactivatedBy = adminUser?._id || null;
  employee.deactivationReason = String(reason || '').trim();
  employee.updatedBy = adminUser?._id || null;
  employee.statusHistory.push({
    action: 'DEACTIVATED',
    fromStatus: 'ACTIVE',
    toStatus: 'INACTIVE',
    actorUserId: adminUser?._id || null,
    reason: employee.deactivationReason || 'Safe deactivation',
    timestamp: now,
  });

  await employee.save();

  // Retain biometricUserId & assignedDeviceId on Employee for historical attendance interpretation,
  // but mark active BiometricUserMapping INACTIVE so they are not treated as an active workforce member.
  await BiometricUserMapping.updateMany(
    { employeeId: employee._id, status: 'ACTIVE' },
    { $set: { status: 'INACTIVE' } }
  );

  return Employee.findById(employee._id)
    .populate('branchId', 'name city code')
    .populate('assignedDeviceId', 'deviceName model serialNumber status')
    .populate('deactivatedBy', 'name email')
    .lean();
};

const reactivateEmployee = async (id, { reason = '' } = {}, adminUser = null) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('Invalid employee ID.');
    err.statusCode = 400;
    throw err;
  }

  const employee = await Employee.findById(id);
  if (!employee) {
    const err = new Error('Employee not found.');
    err.statusCode = 404;
    throw err;
  }
  assertAdminBranchAccess(adminUser, employee.branchId);

  if (employee.employmentStatus === 'ACTIVE') {
    const err = new Error('Employee is already active.');
    err.statusCode = 409;
    throw err;
  }

  const now = new Date();
  employee.employmentStatus = 'ACTIVE';
  employee.exitDate = null;
  employee.reactivatedAt = now;
  employee.reactivatedBy = adminUser?._id || null;
  employee.updatedBy = adminUser?._id || null;
  employee.statusHistory.push({
    action: 'REACTIVATED',
    fromStatus: 'INACTIVE',
    toStatus: 'ACTIVE',
    actorUserId: adminUser?._id || null,
    reason: String(reason || '').trim() || 'Employee reactivated',
    timestamp: now,
  });

  // Restore BiometricUserMapping if no conflict occurred while inactive
  if (employee.biometricUserId && employee.assignedDeviceId) {
    try {
      await assertNoEmployeeBiometricConflict({
        deviceId: employee.assignedDeviceId,
        biometricUserId: employee.biometricUserId,
        excludeEmployeeId: employee._id,
      });
      await BiometricUserMapping.findOneAndUpdate(
        { deviceId: employee.assignedDeviceId, biometricUserId: employee.biometricUserId },
        {
          biometricUserId: employee.biometricUserId,
          subjectType: 'EMPLOYEE',
          employeeId: employee._id,
          clientProfileId: null,
          userId: null,
          deviceId: employee.assignedDeviceId,
          branchId: employee.branchId,
          status: 'ACTIVE',
        },
        { upsert: true, new: true }
      );
    } catch (conflictErr) {
      employee.biometricEnrollmentStatus = 'ERROR';
      employee.biometricError = conflictErr.message;
    }
  }

  await employee.save();

  return Employee.findById(employee._id)
    .populate('branchId', 'name city code')
    .populate('assignedDeviceId', 'deviceName model serialNumber status')
    .populate('reactivatedBy', 'name email')
    .lean();
};

module.exports = {
  previewNextEmployeeId,
  getEmployeeOverview,
  listEmployees,
  getEmployeeById,
  getEmployeeAttendance,
  createEmployee,
  updateEmployee,
  updateEmployeeBiometric,
  deactivateEmployee,
  reactivateEmployee,
};
