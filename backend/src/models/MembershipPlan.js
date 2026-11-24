const mongoose = require('mongoose');

const branchPricingSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'Branch ID is required'],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price cannot be negative'],
    },
    joiningFee: {
      type: Number,
      default: 0,
      min: [0, 'Joining fee cannot be negative'],
    },
    discountType: {
      type: String,
      enum: ['NONE', 'FIXED', 'PERCENTAGE'],
      default: 'NONE',
    },
    discountValue: {
      type: Number,
      default: 0,
      min: [0, 'Discount value cannot be negative'],
    },
    finalPrice: {
      type: Number,
      required: true,
      min: [0, 'Final price cannot be negative'],
    },
  },
  { _id: true }
);

const membershipPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
      index: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    planType: {
      type: String,
      enum: ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM'],
      default: 'MONTHLY',
      index: true,
    },
    durationDays: {
      type: Number,
      required: [true, 'Duration in days is required'],
      min: [1, 'Duration must be at least 1 day'],
      default: 30,
    },
    durationMonths: {
      type: Number,
      default: 1,
    },
    benefits: {
      type: [String],
      default: [
        'Full gym floor access',
        'Air-conditioned facility',
        'Steam bath access',
        'Locker privileges',
      ],
    },
    // Backward compatibility alias for features
    features: {
      type: [String],
      default: [],
    },
    branchPricing: {
      type: [branchPricingSchema],
      default: [],
    },
    // Legacy single-branch reference (null = all branches)
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    // Legacy price fallback
    price: {
      type: Number,
      default: 0,
      min: 0,
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to ensure benefits and features stay synchronized
membershipPlanSchema.pre('save', function () {
  if (this.benefits && this.benefits.length > 0) {
    this.features = this.benefits;
  } else if (this.features && this.features.length > 0) {
    this.benefits = this.features;
  }
  if (!this.durationMonths && this.durationDays) {
    this.durationMonths = Math.max(1, Math.round(this.durationDays / 30));
  }
});

const MembershipPlan = mongoose.model('MembershipPlan', membershipPlanSchema);

module.exports = MembershipPlan;
