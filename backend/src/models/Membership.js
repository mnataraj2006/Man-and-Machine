const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    clientProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientProfile', default: null, index: true },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MembershipPlan',
      default: null,
      index: true,
    },
    planName: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'PAUSED', 'FROZEN', 'CANCELLED', 'PENDING', 'PENDING_PAYMENT'],
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
    durationDays: {
      type: Number,
      default: 30,
    },
    durationMonths: {
      type: Number,
      default: 1,
    },
    // Historical pricing snapshot fields
    basePrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    joiningFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountType: {
      type: String,
      enum: ['NONE', 'FIXED', 'PERCENTAGE'],
      default: 'NONE',
    },
    discountValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    trainingPreference: {
      type: String,
      enum: ['SELF_TRAINED', 'PERSONAL_TRAINER'],
      default: 'SELF_TRAINED',
    },
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    paymentMethod: {
      type: String,
      default: 'UPI',
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
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

// Pre-save hook to ensure amount and finalAmount stay synchronized
membershipSchema.pre('save', function () {
  if (this.finalAmount !== undefined && this.amount === 0) {
    this.amount = this.finalAmount;
  } else if (this.amount !== undefined && this.finalAmount === 0) {
    this.finalAmount = this.amount;
  }
});

const Membership = mongoose.model('Membership', membershipSchema);

module.exports = Membership;
