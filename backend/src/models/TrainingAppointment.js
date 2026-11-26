const mongoose = require('mongoose');

const trainingAppointmentSchema = new mongoose.Schema(
  {
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },
    durationMinutes: {
      type: Number,
      default: 60,
    },
    sessionType: {
      type: String,
      enum: [
        'Personal Training',
        'Strength Training',
        'Cardio & Conditioning',
        'Assessment',
        'Follow-up',
        'Form Correction',
      ],
      default: 'Personal Training',
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED'],
      default: 'SCHEDULED',
      index: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    completedData: {
      completedAt: {
        type: Date,
        default: null,
      },
      exercisesPerformed: [
        {
          name: String,
          setsCompleted: Number,
          repsCompleted: String,
          weightKg: Number,
          notes: String,
        },
      ],
      trainingIntensity: {
        type: String,
        enum: ['Low', 'Moderate', 'High', 'Maximum'],
        default: 'Moderate',
      },
      trainerObservations: {
        type: String,
        default: '',
      },
      nextSessionRecommendations: {
        type: String,
        default: '',
      },
    },
  },
  {
    timestamps: true,
  }
);

trainingAppointmentSchema.index({ trainerId: 1, scheduledAt: 1 });
trainingAppointmentSchema.index({ trainerId: 1, status: 1, updatedAt: -1 });
trainingAppointmentSchema.index({ trainerId: 1, status: 1, scheduledAt: 1 });
trainingAppointmentSchema.index({ clientId: 1, scheduledAt: 1 });

const TrainingAppointment = mongoose.model(
  'TrainingAppointment',
  trainingAppointmentSchema
);

module.exports = TrainingAppointment;
