const mongoose = require('mongoose');

const membershipPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    durationMonths: {
      type: Number,
      required: true,
      enum: [1, 3, 6, 12, 24],
      default: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    features: {
      type: [String],
      default: [],
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null, // null means valid across all branches
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

const MembershipPlan = mongoose.model('MembershipPlan', membershipPlanSchema);

module.exports = MembershipPlan;
