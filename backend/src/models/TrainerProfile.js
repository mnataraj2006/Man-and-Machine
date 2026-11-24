const mongoose = require('mongoose');

const trainerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    specialization: {
      type: String,
      default: 'Strength & Hypertrophy Conditioning',
      trim: true,
    },
    experienceYears: {
      type: Number,
      default: 5,
    },
    bio: {
      type: String,
      default: '',
      trim: true,
    },
    contactPhone: {
      type: String,
      default: '',
      trim: true,
    },
    contactEmail: {
      type: String,
      default: '',
      trim: true,
    },
    activeClientsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const TrainerProfile = mongoose.model('TrainerProfile', trainerProfileSchema);

module.exports = TrainerProfile;
