const mongoose = require('mongoose');

const biometricDeviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: Number,
      required: [true, 'Device ID is required'],
      min: 1,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'Branch is required'],
      index: true,
    },
    deviceName: {
      type: String,
      required: [true, 'Device name is required'],
      trim: true,
    },
    manufacturer: {
      type: String,
      trim: true,
      default: 'eSSL',
    },
    model: {
      type: String,
      trim: true,
      default: 'X2008',
    },
    serialNumber: {
      type: String,
      required: [true, 'Serial number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    macAddress: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    localIp: {
      type: String,
      trim: true,
      default: '',
    },
    tcpPort: {
      type: Number,
      default: 4370,
    },
    communicationProtocol: {
      type: String,
      enum: ['ADMS', 'TCP'],
      default: 'ADMS',
    },
    admsServerAddress: {
      type: String,
      trim: true,
      default: '',
    },
    admsServerPort: {
      type: Number,
      default: 8081,
    },
    status: {
      type: String,
      enum: ['ONLINE', 'OFFLINE', 'CONNECTING', 'SYNCING', 'ERROR', 'DISABLED'],
      default: 'OFFLINE',
      index: true,
    },
    lastSeenAt: {
      type: Date,
      default: null,
    },
    lastSyncAt: {
      type: Date,
      default: null,
    },
    lastEventAt: {
      type: Date,
      default: null,
    },
    firmwareVersion: {
      type: String,
      trim: true,
      default: '',
    },
    userCapacity: { type: Number, default: 1000 },
    fingerprintCapacity: { type: Number, default: 5000 },
    faceCapacity: { type: Number, default: 1500 },
    userCount: { type: Number, default: 0 },
    fingerprintCount: { type: Number, default: 0 },
    faceCount: { type: Number, default: 0 },
    heartbeatTimeoutSeconds: {
      type: Number,
      default: 180,
    },
    errorMessage: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Server-side ADMS key (never exposed to frontend)
    admsSecretKey: {
      type: String,
      select: false,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

biometricDeviceSchema.index({ branchId: 1, deviceId: 1 }, { unique: true });

const BiometricDevice = mongoose.model('BiometricDevice', biometricDeviceSchema);

module.exports = BiometricDevice;
