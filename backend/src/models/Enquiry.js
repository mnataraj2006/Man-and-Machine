const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Contact phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    fitnessGoal: {
      type: String,
      trim: true,
      default: 'General Fitness',
    },
    source: {
      type: String,
      enum: ['WALK_IN', 'WEBSITE', 'INSTAGRAM', 'GOOGLE', 'FRIEND_REFERRAL', 'OTHER'],
      default: 'WEBSITE',
    },
    followUpDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['NEW', 'CONTACTED', 'VISIT_SCHEDULED', 'CONVERTED', 'LOST'],
      default: 'NEW',
      index: true,
    },
    convertedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

enquirySchema.index({ branchId: 1, status: 1, createdAt: -1 });

const Enquiry = mongoose.model('Enquiry', enquirySchema);

module.exports = Enquiry;
