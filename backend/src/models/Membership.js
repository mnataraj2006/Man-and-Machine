const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    planName: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
      default: 'Annual Athlete Elite',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'PAUSED', 'CANCELLED', 'PENDING'],
      default: 'ACTIVE',
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    durationMonths: {
      type: Number,
      default: 12,
    },
    amount: {
      type: Number,
      default: 0,
    },
    renewalRequested: {
      type: Boolean,
      default: false,
    },
    renewalRequestedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Membership = mongoose.model('Membership', membershipSchema);

module.exports = Membership;
