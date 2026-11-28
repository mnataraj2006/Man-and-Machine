const mongoose = require('mongoose');

const attendanceNotificationSchema = new mongoose.Schema(
  {
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance',
      required: true,
      unique: true,
      index: true,
    },
    rawEventReference: {
      type: String,
      trim: true,
      default: undefined,
    },
    subjectType: {
      type: String,
      enum: ['EMPLOYEE', 'CLIENT'],
      default: 'EMPLOYEE',
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
      index: true,
    },
    clientProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientProfile',
      default: null,
      index: true,
    },
    employeeCode: {
      type: String,
      trim: true,
      default: '',
    },
    clientCode: {
      type: String,
      trim: true,
      default: '',
    },
    employeeName: {
      type: String,
      trim: true,
      default: '',
    },
    subjectName: {
      type: String,
      trim: true,
      default: '',
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    branchName: {
      type: String,
      trim: true,
      default: '',
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BiometricDevice',
      default: null,
    },
    deviceName: {
      type: String,
      trim: true,
      default: 'eSSL X2008',
    },
    biometricUserId: {
      type: String,
      trim: true,
      default: '',
    },
    eventType: {
      type: String,
      enum: ['CHECK_IN', 'CHECK_OUT', 'UNKNOWN'],
      default: 'CHECK_IN',
      index: true,
    },
    eventTime: {
      type: Date,
      required: true,
      index: true,
    },
    formattedTime: {
      type: String,
      trim: true,
      default: '',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    clearedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

attendanceNotificationSchema.index({ branchId: 1, eventTime: -1 });
attendanceNotificationSchema.index(
  { rawEventReference: 1 },
  { unique: true, partialFilterExpression: { rawEventReference: { $type: 'string' } } }
);

const AttendanceNotification = mongoose.model('AttendanceNotification', attendanceNotificationSchema);

module.exports = AttendanceNotification;
