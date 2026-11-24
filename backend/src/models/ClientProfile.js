const mongoose = require('mongoose');

const clientProfileSchema = new mongoose.Schema(
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
    fitnessGoal: {
      type: String,
      enum: [
        'Muscle Building',
        'Weight Loss',
        'Strength Training',
        'General Fitness',
        'Stamina & Conditioning',
        'Other',
        'MUSCLE_BUILDING',
        'WEIGHT_LOSS',
        'STRENGTH_TRAINING',
        'GENERAL_FITNESS',
        'STAMINA_CONDITIONING',
        'OTHER',
      ],
      default: 'General Fitness',
    },
    experienceLevel: {
      type: String,
      enum: [
        'Beginner',
        'Intermediate',
        'Advanced',
        'BEGINNER',
        'INTERMEDIATE',
        'ADVANCED',
      ],
      default: 'Beginner',
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    membershipId: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const ClientProfile = mongoose.model('ClientProfile', clientProfileSchema);

module.exports = ClientProfile;
