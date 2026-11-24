const mongoose = require('mongoose');

const progressRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    source: {
      type: String,
      enum: ['CLIENT', 'TRAINER_ASSESSMENT'],
      default: 'CLIENT',
      index: true,
    },
    type: {
      type: String,
      enum: ['BODY_WEIGHT', 'STRENGTH_PR', 'ASSESSMENT'],
      required: true,
      index: true,
    },
    weightKg: {
      type: Number,
      default: null,
    },
    exerciseName: {
      type: String,
      default: '',
      trim: true,
    },
    weightLiftedKg: {
      type: Number,
      default: null,
    },
    reps: {
      type: Number,
      default: null,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    trainerAssessment: {
      postureScore: {
        type: Number,
        min: 1,
        max: 10,
        default: null,
      },
      mobilityNotes: {
        type: String,
        default: '',
      },
      recommendations: {
        type: String,
        default: '',
      },
      metrics: {
        chestCm: Number,
        waistCm: Number,
        hipsCm: Number,
        armsCm: Number,
        bodyFatPercentage: Number,
      },
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

progressRecordSchema.index({ userId: 1, type: 1, date: -1 });

const ProgressRecord = mongoose.model('ProgressRecord', progressRecordSchema);

module.exports = ProgressRecord;
