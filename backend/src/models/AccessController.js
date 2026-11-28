const mongoose = require('mongoose');

const accessControllerSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Controller name is required'],
      trim: true,
    },
    doorName: {
      type: String,
      required: [true, 'Door / turnstile name is required'],
      trim: true,
    },
    adapterType: {
      type: String,
      enum: [
        'MOCK',
        'HTTP_REST',
        'TCP_IP',
        'WEBSOCKET',
        'RS485_GATEWAY',
        'VENDOR_SDK',
        'LOCAL_RELAY_GPIO',
      ],
      required: true,
      default: 'MOCK',
      index: true,
    },
    manufacturer: {
      type: String,
      trim: true,
      default: 'Unknown',
    },
    model: {
      type: String,
      trim: true,
      default: 'Unknown',
    },
    connectionConfig: {
      endpointUrl: { type: String, trim: true, default: '' },
      host: { type: String, trim: true, default: '' },
      port: { type: Number, default: null },
      serialPort: { type: String, trim: true, default: '' },
      baudRate: { type: Number, default: 9600 },
      timeoutMs: { type: Number, default: 3000, min: 500, max: 15000 },
      useTls: { type: Boolean, default: true },
      authType: {
        type: String,
        enum: ['NONE', 'BEARER', 'API_KEY', 'BASIC', 'HMAC'],
        default: 'NONE',
      },
      unlockDurationSec: { type: Number, default: 5, min: 1, max: 30 },
      // Simulation-only config for MOCK adapter
      mockOptions: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    encryptedCredentials: {
      type: String,
      default: '',
      select: false,
    },
    hasCredentials: {
      type: Boolean,
      default: false,
    },
    capabilities: {
      supportsRemoteUnlock: { type: Boolean, default: false },
      supportsDenyFeedback: { type: Boolean, default: false },
      supportsDoorStatus: { type: Boolean, default: false },
      supportsLastAccessEvent: { type: Boolean, default: false },
      supportsDeviceInfo: { type: Boolean, default: false },
      supportsHealthCheck: { type: Boolean, default: false },
      supportsCredentialSync: { type: Boolean, default: false },
      emergencyEgressIndependent: { type: Boolean, default: true },
    },
    isEnabled: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ['ONLINE', 'OFFLINE', 'DEGRADED', 'DISABLED', 'UNCONFIGURED'],
      default: 'DISABLED',
      index: true,
    },
    lastHealthCheckAt: {
      type: Date,
      default: null,
    },
    lastLatencyMs: {
      type: Number,
      default: null,
    },
    lastError: {
      type: String,
      trim: true,
      default: '',
    },
    linkedBiometricDeviceIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BiometricDevice',
      },
    ],
  },
  {
    timestamps: true,
  }
);

accessControllerSchema.index({ branchId: 1, isEnabled: 1 });

const AccessController = mongoose.model('AccessController', accessControllerSchema);

module.exports = AccessController;
