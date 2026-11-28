const mongoose = require('mongoose');

const biometricDeviceSyncJobSchema = new mongoose.Schema(
  {
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BiometricEnrollment',
      required: true,
      index: true,
    },
    clientProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientProfile',
      required: true,
      index: true,
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BiometricDevice',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    biometricUserId: {
      type: String,
      required: true,
      trim: true,
    },
    clientName: {
      type: String,
      trim: true,
      default: '',
    },
    operation: {
      type: String,
      enum: ['CREATE_DEVICE_USER', 'VERIFY_DEVICE_USER'],
      default: 'CREATE_DEVICE_USER',
    },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'ACKNOWLEDGED', 'VERIFIED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    attemptCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
    responseStatus: {
      type: String,
      trim: true,
      default: '',
    },
    commandId: {
      type: String,
      trim: true,
      default: '',
    },
    deviceCommandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BiometricDeviceCommand',
      default: null,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      trim: true,
      default: '',
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    alreadyPresentOnDevice: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

biometricDeviceSyncJobSchema.index({ enrollmentId: 1, deviceId: 1, biometricUserId: 1 });
biometricDeviceSyncJobSchema.index({ deviceId: 1, status: 1, createdAt: -1 });

const BiometricDeviceSyncJob = mongoose.model('BiometricDeviceSyncJob', biometricDeviceSyncJobSchema);

module.exports = BiometricDeviceSyncJob;
