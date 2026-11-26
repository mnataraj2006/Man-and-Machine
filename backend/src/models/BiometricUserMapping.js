const mongoose = require('mongoose');

const biometricUserMappingSchema = new mongoose.Schema(
  {
    biometricUserId: {
      type: String,
      required: [true, 'Biometric user ID is required'],
      trim: true,
    },
    clientProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientProfile',
      required: [true, 'Client profile is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BiometricDevice',
      required: [true, 'Biometric device is required'],
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'Branch is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

biometricUserMappingSchema.index({ deviceId: 1, biometricUserId: 1 }, { unique: true });

const BiometricUserMapping = mongoose.model('BiometricUserMapping', biometricUserMappingSchema);

module.exports = BiometricUserMapping;
