const mongoose = require('mongoose');

const trainerNoteSchema = new mongoose.Schema(
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
    noteType: {
      type: String,
      enum: ['OBSERVATION', 'FEEDBACK', 'RECOMMENDATION', 'CORRECTION', 'GENERAL'],
      default: 'GENERAL',
    },
    visibility: {
      type: String,
      enum: ['PRIVATE', 'CLIENT_FACING'],
      default: 'PRIVATE',
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    actionRequired: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

trainerNoteSchema.index({ trainerId: 1, clientId: 1, createdAt: -1 });

const TrainerNote = mongoose.model('TrainerNote', trainerNoteSchema);

module.exports = TrainerNote;
