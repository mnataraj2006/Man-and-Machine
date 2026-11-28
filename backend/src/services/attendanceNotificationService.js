const mongoose = require('mongoose');
const AttendanceNotification = require('../models/AttendanceNotification');
const Branch = require('../models/Branch');
const {
  emitEmployeeAttendanceNotification,
  emitClientAttendanceNotification,
} = require('./socketService');

const formatKolkataTime = (dateVal) => {
  try {
    return new Date(dateVal).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).toUpperCase();
  } catch {
    return '';
  }
};

const getTitleForEvent = (eventType, subjectType = 'EMPLOYEE', attendanceStatus = 'SUCCESS') => {
  if (subjectType === 'CLIENT') {
    if (String(attendanceStatus || '').startsWith('FLAGGED_')) return 'Client Access Alert';
    if (eventType === 'CHECK_OUT') return 'Client Check-out';
    return 'Client Check-in';
  }
  if (eventType === 'CHECK_OUT') return 'Employee Check-out';
  if (eventType === 'CHECK_IN') return 'New Employee Check-in';
  return 'Employee Attendance Event';
};

const getEventLabel = (eventType) => {
  if (eventType === 'CHECK_OUT') return 'Check-out';
  if (eventType === 'CHECK_IN') return 'Check-in';
  return 'Attendance';
};

const resolveBranchName = async (branchId) => {
  if (!branchId) return '';
  const branch = await Branch.findById(branchId).select('city name').lean();
  return branch?.city || branch?.name || '';
};

const buildNotificationPayload = (doc, isRead = false) => ({
  id: String(doc._id),
  attendanceId: String(doc.attendanceId),
  subjectType: doc.subjectType || 'EMPLOYEE',
  employeeId: doc.employeeId ? String(doc.employeeId) : null,
  clientProfileId: doc.clientProfileId ? String(doc.clientProfileId) : null,
  employeeCode: doc.employeeCode || '',
  clientCode: doc.clientCode || '',
  employeeName: doc.employeeName || doc.subjectName || '',
  subjectName: doc.subjectName || doc.employeeName || '',
  branchId: String(doc.branchId),
  branchName: doc.branchName || '',
  deviceId: doc.deviceId ? String(doc.deviceId) : null,
  deviceName: doc.deviceName || 'eSSL X2008',
  biometricUserId: doc.biometricUserId || '',
  eventType: doc.eventType,
  eventLabel: getEventLabel(doc.eventType),
  eventTime: doc.eventTime,
  formattedTime: doc.formattedTime || formatKolkataTime(doc.eventTime),
  title: doc.title,
  message: doc.message,
  isRead,
  createdAt: doc.createdAt,
});

/**
 * Persist an AttendanceNotification after DB attendance persistence.
 * Duplicate-safe via unique attendanceId & rawEventReference indexes.
 */
const persistNotification = async ({
  attendance,
  subjectType,
  employeeId = null,
  clientProfileId = null,
  employeeCode = '',
  clientCode = '',
  subjectName,
  branchName,
  device,
  title,
  message,
}) => {
  const eventType = attendance.eventType || 'CHECK_IN';
  const eventTime = attendance.checkInTime || new Date();
  const formattedTime = formatKolkataTime(eventTime);
  const deviceLabel = device?.deviceName || device?.model || 'eSSL X2008';

  try {
    const doc = await AttendanceNotification.create({
      attendanceId: attendance._id,
      rawEventReference: attendance.rawEventReference || undefined,
      subjectType,
      employeeId,
      clientProfileId,
      employeeCode,
      clientCode,
      employeeName: subjectName,
      subjectName,
      branchId: attendance.branchId,
      branchName,
      deviceId: device?._id || null,
      deviceName: deviceLabel,
      biometricUserId: attendance.biometricUserId || '',
      eventType,
      eventTime,
      formattedTime,
      title,
      message,
    });

    return buildNotificationPayload(doc, false);
  } catch (err) {
    // 11000 duplicate key means this attendance event already generated a notification
    if (err.code === 11000) {
      return null;
    }
    console.error('Attendance notification error:', err.message);
    return null;
  }
};

/**
 * Create a persisted AttendanceNotification after DB attendance persistence,
 * then emit it over Socket.IO to authorized admins.
 */
const createAndEmitForEmployeeAttendance = async ({ attendance, employee, device }) => {
  if (!attendance?._id || !employee?._id || employee.employmentStatus !== 'ACTIVE') {
    return null;
  }

  const branchName = await resolveBranchName(device?.branchId || attendance.branchId);
  const eventType = attendance.eventType || 'CHECK_IN';
  const eventTime = attendance.checkInTime || new Date();
  const formattedTime = formatKolkataTime(eventTime);
  const title = getTitleForEvent(eventType, 'EMPLOYEE');
  const eventLabel = getEventLabel(eventType);
  const message = `${employee.fullName} (${employee.employeeId}) — ${eventLabel} at ${formattedTime}${branchName ? ` (${branchName})` : ''}`;

  const payload = await persistNotification({
    attendance,
    subjectType: 'EMPLOYEE',
    employeeId: employee._id,
    employeeCode: employee.employeeId || '',
    subjectName: employee.fullName,
    branchName,
    device,
    title,
    message,
  });

  if (payload) {
    emitEmployeeAttendanceNotification(payload);
  }
  return payload;
};

/**
 * Create a persisted AttendanceNotification for a client biometric punch,
 * then emit it over Socket.IO to authorized admins.
 */
const createAndEmitForClientAttendance = async ({ attendance, client, device }) => {
  if (!attendance?._id || !client?._id) {
    return null;
  }

  const branchName = await resolveBranchName(device?.branchId || attendance.branchId);
  const eventType = attendance.eventType || 'CHECK_IN';
  const title = getTitleForEvent(eventType, 'CLIENT', attendance.attendanceStatus);
  const locationLabel = [branchName, device?.deviceName || device?.model || 'Main Entrance']
    .filter(Boolean)
    .join(' ');
  const isFlagged = String(attendance.attendanceStatus || '').startsWith('FLAGGED_');
  const message = isFlagged
    ? `${client.name} access flagged (${attendance.attendanceStatus}) at ${locationLabel}.`
    : `${client.name} successfully verified at ${locationLabel}.`;

  const payload = await persistNotification({
    attendance,
    subjectType: 'CLIENT',
    clientProfileId: client._id,
    clientCode: client.clientId || '',
    subjectName: client.name,
    branchName,
    device,
    title,
    message,
  });

  if (payload) {
    emitClientAttendanceNotification(payload);
  }
  return payload;
};

const listAdminNotifications = async (adminUser, { limit = 30, branchId = 'ALL', since = null } = {}) => {
  const adminId = adminUser._id;
  const adminBranch = adminUser?.branchId?._id || adminUser?.branchId;

  const filter = {
    clearedBy: { $ne: adminId },
  };

  if (adminBranch) {
    filter.branchId = new mongoose.Types.ObjectId(adminBranch);
  } else if (branchId && branchId !== 'ALL' && mongoose.Types.ObjectId.isValid(branchId)) {
    filter.branchId = new mongoose.Types.ObjectId(branchId);
  }

  const unreadFilter = {
    ...filter,
    readBy: { $ne: adminId },
  };

  if (since) {
    const sinceDate = new Date(since);
    if (!Number.isNaN(sinceDate.getTime())) {
      filter.createdAt = { $gt: sinceDate };
    }
  }

  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));

  const [docs, unreadCount] = await Promise.all([
    AttendanceNotification.find(filter)
      .sort({ eventTime: -1, createdAt: -1 })
      .limit(parsedLimit)
      .lean(),
    AttendanceNotification.countDocuments(unreadFilter),
  ]);

  const notifications = docs.map((d) =>
    buildNotificationPayload(
      d,
      (d.readBy || []).some((id) => String(id) === String(adminId))
    )
  );

  return { notifications, unreadCount };
};

const markAsRead = async (notificationId, adminUser) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    const err = new Error('Invalid notification ID.');
    err.statusCode = 400;
    throw err;
  }

  const adminBranch = adminUser?.branchId?._id || adminUser?.branchId;
  const filter = { _id: notificationId };
  if (adminBranch) filter.branchId = adminBranch;

  const updated = await AttendanceNotification.findOneAndUpdate(
    filter,
    { $addToSet: { readBy: adminUser._id } },
    { new: true }
  ).lean();

  if (!updated) {
    const err = new Error('Notification not found.');
    err.statusCode = 404;
    throw err;
  }

  return { id: String(updated._id), isRead: true };
};

const markAllAsRead = async (adminUser) => {
  const adminBranch = adminUser?.branchId?._id || adminUser?.branchId;
  const filter = {
    clearedBy: { $ne: adminUser._id },
    readBy: { $ne: adminUser._id },
  };
  if (adminBranch) filter.branchId = adminBranch;

  const res = await AttendanceNotification.updateMany(filter, {
    $addToSet: { readBy: adminUser._id },
  });

  return { modifiedCount: res.modifiedCount || 0 };
};

const clearHistory = async (adminUser) => {
  const adminBranch = adminUser?.branchId?._id || adminUser?.branchId;
  const filter = { clearedBy: { $ne: adminUser._id } };
  if (adminBranch) filter.branchId = adminBranch;

  const res = await AttendanceNotification.updateMany(filter, {
    $addToSet: { clearedBy: adminUser._id, readBy: adminUser._id },
  });

  return { clearedCount: res.modifiedCount || 0 };
};

module.exports = {
  createAndEmitForEmployeeAttendance,
  createAndEmitForClientAttendance,
  listAdminNotifications,
  markAsRead,
  markAllAsRead,
  clearHistory,
};
