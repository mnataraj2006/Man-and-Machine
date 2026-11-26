const mongoose = require('mongoose');

const workoutSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    loggedBy: {
      type: String,
      enum: ['CLIENT', 'TRAINER'],
      default: 'CLIENT',
    },
    workoutPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkoutPlan',
      default: null,
    },
    workoutTitle: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    durationMinutes: {
      type: Number,
      default: 45,
    },
    completedExercises: [
      {
        exerciseName: {
          type: String,
          required: true,
        },
        completedSets: [
          {
            setNumber: Number,
            reps: Number,
            weightKg: Number,
            completed: {
              type: Boolean,
              default: true,
            },
          },
        ],
      },
    ],
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['COMPLETED', 'IN_PROGRESS', 'ABANDONED'],
      default: 'COMPLETED',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

workoutSessionSchema.index({ userId: 1, date: -1 });
workoutSessionSchema.index({ userId: 1, status: 1, date: -1 });
workoutSessionSchema.index({ trainerId: 1, date: -1 });

const WorkoutSession = mongoose.model('WorkoutSession', workoutSessionSchema);

module.exports = WorkoutSession;
