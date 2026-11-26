const mongoose = require('mongoose');

const enrollmentHistorySchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    fromStatus: { type: String, default: null },
    toStatus: { type: String, default: null },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    note: { type: String, trim: true, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const biometricEnrollmentSchema = new mongoose.Schema(
  {
    clientProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientProfile',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    assignedDeviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BiometricDevice',
      default: null,
      index: true,
    },
    biometricUserId: {
      type: String,
      trim: true,
      default: '',
    },
    enrollmentMethod: {
      type: String,
      enum: ['MANUAL_PHYSICAL', 'REMOTE_ADMIN', 'CLIENT_MOBILE'],
      default: 'MANUAL_PHYSICAL',
    },
    status: {
      type: String,
      enum: [
        'NOT_STARTED',
        'INVITED',
        'CAPTURE_IN_PROGRESS',
        'CAPTURE_SUBMITTED',
        'PENDING_REVIEW',
        'APPROVED',
        'REMOTE_ENROLLMENT_PENDING',
        'AWAITING_PHYSICAL_ENROLLMENT',
        'DEVICE_ENROLLMENT_IN_PROGRESS',
        'ENROLLED',
        'FAILED',
        'REJECTED',
        'REVOKED',
      ],
      default: 'NOT_STARTED',
      index: true,
    },
    mobileCaptureStatus: {
      type: String,
      enum: ['NOT_STARTED', 'CAPTURED', 'FAILED', 'RESUBMIT_REQUIRED'],
      default: 'NOT_STARTED',
    },
    identityVerificationStatus: {
      type: String,
      enum: ['NOT_VERIFIED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED'],
      default: 'NOT_VERIFIED',
    },
    adminApprovalStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    deviceEnrollmentStatus: {
      type: String,
      enum: ['NOT_STARTED', 'AWAITING_PHYSICAL', 'ADMIN_CONFIRMED', 'DEVICE_VERIFIED', 'FAILED'],
      default: 'NOT_STARTED',
    },
    faceEnrollmentStatus: {
      type: String,
      enum: ['NOT_ENROLLED', 'PENDING', 'ENROLLED', 'FAILED'],
      default: 'NOT_ENROLLED',
    },
    fingerprintEnrollmentStatus: {
      type: String,
      enum: ['NOT_ENROLLED', 'PENDING', 'ENROLLED', 'FAILED'],
      default: 'NOT_ENROLLED',
    },
    consentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BiometricConsent',
      default: null,
    },
    consentStatus: {
      type: String,
      enum: ['PENDING', 'GRANTED', 'WITHDRAWN'],
      default: 'PENDING',
    },
    captureQuality: {
      brightnessScore: { type: Number, default: 0 },
      sharpnessScore: { type: Number, default: 0 },
      livenessPassed: { type: Boolean, default: false },
      frameCount: { type: Number, default: 0 },
      capturedAt: { type: Date, default: null },
    },
    enrollmentRequestedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    enrolledAt: { type: Date, default: null },
    enrolledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    lastVerifiedAt: { type: Date, default: null },
    failureReason: { type: String, trim: true, default: '' },
    history: {
      type: [enrollmentHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

biometricEnrollmentSchema.index({ clientProfileId: 1, branchId: 1 }, { unique: true });
biometricEnrollmentSchema.index({ status: 1, branchId: 1, createdAt: -1 });

const BiometricEnrollment = mongoose.model('BiometricEnrollment', biometricEnrollmentSchema);

module.exports = BiometricEnrollment;
