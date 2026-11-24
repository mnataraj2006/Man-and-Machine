const mongoose = require('mongoose');

const workoutPlanSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Workout plan title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    goal: {
      type: String,
      default: 'Muscle Building',
    },
    isTemplate: {
      type: Boolean,
      default: false,
      index: true,
    },
    mode: {
      type: String,
      enum: ['TRAINER_MANAGED', 'SELF_MANAGED'],
      default: 'TRAINER_MANAGED',
    },
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    schedule: [
      {
        day: {
          type: String,
          enum: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
          ],
        },
        focus: String,
        isRestDay: {
          type: Boolean,
          default: false,
        },
      },
    ],
    exercises: [
      {
        name: {
          type: String,
          required: true,
        },
        sets: {
          type: Number,
          default: 3,
        },
        reps: {
          type: String,
          default: '8-10',
        },
        prescribedWeight: {
          type: String,
          default: '',
        },
        restSeconds: {
          type: Number,
          default: 90,
        },
        instructions: {
          type: String,
          default: '',
        },
        trainerNotes: {
          type: String,
          default: '',
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const WorkoutPlan = mongoose.model('WorkoutPlan', workoutPlanSchema);

module.exports = WorkoutPlan;
