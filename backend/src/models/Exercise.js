const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Exercise name is required'],
      trim: true,
      unique: true,
    },
    category: {
      type: String,
      enum: ['STRENGTH', 'HYPERTROPHY', 'CARDIO', 'MOBILITY', 'CORE', 'OLYMPIC'],
      default: 'STRENGTH',
      index: true,
    },
    muscleGroup: {
      type: String,
      enum: [
        'Chest',
        'Back',
        'Shoulders',
        'Biceps',
        'Triceps',
        'Legs (Quads/Hamstrings)',
        'Calves',
        'Core/Abs',
        'Full Body',
      ],
      default: 'Full Body',
      index: true,
    },
    equipment: {
      type: String,
      enum: ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Kettlebell', 'Other'],
      default: 'Barbell',
    },
    instructions: {
      type: String,
      trim: true,
      default: '',
    },
    difficulty: {
      type: String,
      enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
      default: 'INTERMEDIATE',
    },
    defaultSets: {
      type: Number,
      default: 3,
    },
    defaultReps: {
      type: String,
      default: '8-12',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Exercise = mongoose.model('Exercise', exerciseSchema);

module.exports = Exercise;
