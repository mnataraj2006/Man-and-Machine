const mongoose = require('mongoose');

const accessControlEventSchema = new mongoose.Schema(
  {
    controllerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AccessController',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    clientProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientProfile',
      default: null,
      index: true,
    },
    biometricDeviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BiometricDevice',
      default: null,
    },
    biometricUserId: {
      type: String,
      trim: true,
      default: '',
    },
    eventStage: {
      type: String,
      enum: [
        'FACE_AUTHENTICATION',
        'MEMBERSHIP_AUTHORIZATION',
        'UNLOCK_COMMAND',
        'CONTROLLER_ACKNOWLEDGEMENT',
        'PHYSICAL_DOOR_STATE',
        'ACCESS_DENIED',
      ],
      required: true,
      index: true,
    },
    decision: {
      type: String,
      enum: ['ALLOWED', 'DENIED', 'UNAVAILABLE', 'UNKNOWN', 'N/A'],
      default: 'N/A',
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    commandId: {
      type: String,
      trim: true,
      default: undefined,
    },
    acknowledged: {
      type: Boolean,
      default: false,
    },
    physicalState: {
      type: String,
      enum: ['UNKNOWN', 'UNLOCKED_CONFIRMED', 'LOCKED', 'NO_SENSOR'],
      default: 'UNKNOWN',
    },
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

accessControlEventSchema.index({ controllerId: 1, createdAt: -1 });
accessControlEventSchema.index(
  { commandId: 1, eventStage: 1 },
  { unique: true, partialFilterExpression: { commandId: { $type: 'string' } } }
);

const AccessControlEvent = mongoose.model('AccessControlEvent', accessControlEventSchema);

module.exports = AccessControlEvent;
