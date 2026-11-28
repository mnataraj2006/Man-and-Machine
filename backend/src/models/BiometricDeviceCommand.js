const mongoose = require('mongoose');

const biometricDeviceCommandSchema = new mongoose.Schema(
  {
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
    commandId: {
      type: String,
      required: true,
      trim: true,
    },
    commandType: {
      type: String,
      enum: ['INFO', 'CHECK', 'DATA_QUERY_USERINFO', 'DATA_UPDATE_USERINFO'],
      required: true,
    },
    commandPayload: {
      type: String,
      required: true,
      trim: true,
    },
    syncJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BiometricDeviceSyncJob',
      default: null,
      index: true,
    },
    targetPin: {
      type: String,
      trim: true,
      default: '',
    },
    isTestCommand: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'ACKNOWLEDGED', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    sentAt: { type: Date, default: null },
    acknowledgedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    retryCount: { type: Number, default: 0, min: 0 },
    maxRetries: { type: Number, default: 3, min: 0 },
    response: { type: String, trim: true, default: '' },
    error: { type: String, trim: true, default: '' },
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

biometricDeviceCommandSchema.index({ deviceId: 1, commandId: 1 }, { unique: true });
biometricDeviceCommandSchema.index({ deviceId: 1, status: 1, createdAt: 1 });
biometricDeviceCommandSchema.index({ branchId: 1, createdAt: -1 });

const BiometricDeviceCommand = mongoose.model('BiometricDeviceCommand', biometricDeviceCommandSchema);

module.exports = BiometricDeviceCommand;
