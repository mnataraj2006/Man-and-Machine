const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    clientProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientProfile',
      default: null,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
      index: true,
    },
    subjectType: {
      type: String,
      enum: ['CLIENT', 'EMPLOYEE', 'UNKNOWN'],
      default: 'CLIENT',
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    checkInTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    checkOutTime: {
      type: Date,
      default: null,
    },
    method: {
      type: String,
      enum: ['STAFF_CHECKIN', 'QR_SCAN', 'MANUAL', 'BIOMETRIC'],
      default: 'STAFF_CHECKIN',
    },
    // Biometric ADMS fields
    biometricUserId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BiometricDevice',
      default: null,
      index: true,
    },
    eventType: {
      type: String,
      enum: ['CHECK_IN', 'CHECK_OUT', 'UNKNOWN'],
      default: 'CHECK_IN',
    },
    verificationMethod: {
      type: String,
      enum: ['FACE', 'FINGERPRINT', 'PASSWORD', 'CARD', 'UNKNOWN', 'MANUAL'],
      default: 'MANUAL',
    },
    source: {
      type: String,
      enum: ['BIOMETRIC_ADMS', 'ADMIN_MANUAL', 'QR'],
      default: 'ADMIN_MANUAL',
      index: true,
    },
    membershipStatusAtEvent: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'NOT_FOUND', 'SUSPENDED', 'FROZEN', 'CANCELLED', 'NO_MEMBERSHIP', 'N/A'],
      default: 'N/A',
    },
    attendanceStatus: {
      type: String,
      enum: ['SUCCESS', 'FLAGGED_EXPIRED', 'FLAGGED_SUSPENDED', 'FLAGGED_FROZEN', 'FLAGGED_CANCELLED', 'FLAGGED_NO_MEMBERSHIP', 'UNMAPPED_USER'],
      default: 'SUCCESS',
      index: true,
    },
    faceAuthStatus: {
      type: String,
      enum: ['SUCCESS', 'N/A'],
      default: 'N/A',
    },
    accessDecision: {
      type: String,
      enum: ['ALLOWED', 'DENIED', 'N/A'],
      default: 'N/A',
      index: true,
    },
    accessDenialReason: {
      type: String,
      trim: true,
      default: '',
    },
    rawEventReference: {
      type: String,
      trim: true,
      default: undefined,
    },
    correctionHistory: [
      {
        correctedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        correctedAt: { type: Date, default: Date.now },
        reason: { type: String, trim: true, default: '' },
        previousEventType: { type: String, default: '' },
        newEventType: { type: String, default: '' },
        previousCheckInTime: { type: Date, default: null },
        newCheckInTime: { type: Date, default: null },
        previousCheckOutTime: { type: Date, default: null },
        newCheckOutTime: { type: Date, default: null },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly fetch user and branch attendance by date
attendanceSchema.index({ userId: 1, date: -1 });
attendanceSchema.index({ employeeId: 1, date: -1 });
attendanceSchema.index({ branchId: 1, date: -1 });
attendanceSchema.index(
  { deviceId: 1, rawEventReference: 1 },
  { unique: true, partialFilterExpression: { rawEventReference: { $type: 'string' } } }
);

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
