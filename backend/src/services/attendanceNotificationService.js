const mongoose = require('mongoose');
const AttendanceNotification = require('../models/AttendanceNotification');
const Branch = require('../models/Branch');
const { emitEmployeeAttendanceNotification } = require('./socketService');

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

const getTitleForEvent = (eventType) => {
  if (eventType === 'CHECK_OUT') return 'Employee Check-out';
  if (eventType === 'CHECK_IN') return 'New Employee Check-in';
  return 'Employee Attendance Event';
};

const getEventLabel = (eventType) => {
  if (eventType === 'CHECK_OUT') return 'Check-out';
  if (eventType === 'CHECK_IN') return 'Check-in';
  return 'Attendance';
};

/**
 * Create a persisted AttendanceNotification after DB attendance persistence,
 * then emit it over Socket.IO to authorized admins.
 * Duplicate-safe via unique attendanceId & rawEventReference indexes.
 */
const createAndEmitForEmployeeAttendance = async ({ attendance, employee, device }) => {
  if (!attendance?._id || !employee?._id || employee.employmentStatus !== 'ACTIVE') {
    return null;
  }

  let branchName = '';
  if (device?.branchId) {
    const branch = await Branch.findById(device.branchId).select('city name').lean();
    branchName = branch?.city || branch?.name || '';
  }

  const eventType = attendance.eventType || 'CHECK_IN';
  const eventTime = attendance.checkInTime || new Date();
  const formattedTime = formatKolkataTime(eventTime);
  const title = getTitleForEvent(eventType);
  const eventLabel = getEventLabel(eventType);
  const deviceLabel = device?.model || device?.deviceName || 'eSSL X2008';

  const message = `${employee.fullName} (${employee.employeeId}) — ${eventLabel} at ${formattedTime}${branchName ? ` (${branchName})` : ''}`;

  try {
    const doc = await AttendanceNotification.create({
      attendanceId: attendance._id,
      rawEventReference: attendance.rawEventReference || undefined,
      employeeId: employee._id,
      employeeCode: employee.employeeId,
      employeeName: employee.fullName,
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

    const payload = {
      id: String(doc._id),
      attendanceId: String(doc.attendanceId),
      employeeId: String(doc.employeeId),
      employeeCode: doc.employeeCode,
      employeeName: doc.employeeName,
      branchId: String(doc.branchId),
      branchName: doc.branchName,
      deviceName: doc.deviceName,
      biometricUserId: doc.biometricUserId,
      eventType: doc.eventType,
      eventLabel,
      eventTime: doc.eventTime,
      formattedTime: doc.formattedTime,
      title: doc.title,
      message: doc.message,
      isRead: false,
      createdAt: doc.createdAt,
    };

    emitEmployeeAttendanceNotification(payload);
    return payload;
  } catch (err) {
    // 11000 duplicate key means this attendance event already generated a notification
    if (err.code === 11000) {
      return null;
    }
    console.error('Attendance notification error:', err.message);
    return null;
  }
};

const listAdminNotifications = async (adminUser, { limit = 30, branchId = 'ALL' } = {}) => {
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

  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));

  const [docs, unreadCount] = await Promise.all([
    AttendanceNotification.find(filter)
      .sort({ eventTime: -1, createdAt: -1 })
      .limit(parsedLimit)
      .lean(),
    AttendanceNotification.countDocuments({
      ...filter,
      readBy: { $ne: adminId },
    }),
  ]);

  const notifications = docs.map((d) => ({
    id: String(d._id),
    attendanceId: String(d.attendanceId),
    employeeId: String(d.employeeId),
    employeeCode: d.employeeCode,
    employeeName: d.employeeName,
    branchId: String(d.branchId),
    branchName: d.branchName,
    deviceName: d.deviceName,
    biometricUserId: d.biometricUserId,
    eventType: d.eventType,
    eventLabel: getEventLabel(d.eventType),
    eventTime: d.eventTime,
    formattedTime: d.formattedTime || formatKolkataTime(d.eventTime),
    title: d.title,
    message: d.message,
    isRead: (d.readBy || []).some((id) => String(id) === String(adminId)),
    createdAt: d.createdAt,
  }));

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
  listAdminNotifications,
  markAsRead,
  markAllAsRead,
  clearHistory,
};
