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
    trainingLevel: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
      default: 'Intermediate',
    },
    weeklyFrequency: {
      type: Number,
      default: 4,
    },
    trainerInstructions: {
      type: String,
      default: '',
      trim: true,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
      default: 'PUBLISHED',
      index: true,
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
      index: true,
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
        targetMuscle: {
          type: String,
          default: 'General',
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
        dayOfWeek: {
          type: String,
          default: 'Monday',
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

workoutPlanSchema.index({ assignedTo: 1, isActive: 1 });
workoutPlanSchema.index({ trainerId: 1, status: 1 });

const WorkoutPlan = mongoose.model('WorkoutPlan', workoutPlanSchema);

module.exports = WorkoutPlan;
