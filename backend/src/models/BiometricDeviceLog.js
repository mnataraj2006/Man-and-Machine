const mongoose = require('mongoose');

const biometricDeviceLogSchema = new mongoose.Schema(
  {
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BiometricDevice',
      default: null,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    category: {
      type: String,
      enum: ['HEARTBEAT', 'ATTENDANCE_SYNC', 'USER_SYNC', 'CONNECTION_TEST', 'ERROR', 'RETRY', 'ADMIN_ACTION'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'WARNING', 'ERROR', 'INFO'],
      default: 'INFO',
    },
    action: {
      type: String,
      trim: true,
      default: '',
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

biometricDeviceLogSchema.index({ deviceId: 1, createdAt: -1 });
biometricDeviceLogSchema.index({ createdAt: -1 });

const BiometricDeviceLog = mongoose.model('BiometricDeviceLog', biometricDeviceLogSchema);

module.exports = BiometricDeviceLog;
