const mongoose = require('mongoose');

const biometricConsentSchema = new mongoose.Schema(
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
    consentGiven: {
      type: Boolean,
      required: true,
    },
    consentVersion: {
      type: String,
      default: 'v1.0',
    },
    purpose: {
      type: String,
      default: 'Gym access control and attendance verification via branch biometric terminal.',
    },
    consentedAt: {
      type: Date,
      default: Date.now,
    },
    withdrawnAt: {
      type: Date,
      default: null,
    },
    ipAddress: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['GRANTED', 'WITHDRAWN'],
      default: 'GRANTED',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const BiometricConsent = mongoose.model('BiometricConsent', biometricConsentSchema);

module.exports = BiometricConsent;
