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
    rawEventReference: {
      type: String,
      trim: true,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly fetch user attendance by date
attendanceSchema.index({ userId: 1, date: -1 });
attendanceSchema.index(
  { deviceId: 1, rawEventReference: 1 },
  { unique: true, partialFilterExpression: { rawEventReference: { $type: 'string' } } }
);

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
