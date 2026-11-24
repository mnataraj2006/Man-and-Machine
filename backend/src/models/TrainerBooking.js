const mongoose = require('mongoose');

const trainerBookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      unique: true,
      required: true,
      index: true,
      trim: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    trainerId: {
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
    serviceType: {
      type: String,
      enum: ['SINGLE_SESSION', 'PACKAGE_10', 'MONTHLY_PT', 'Single Session', '10-Pack Sessions', 'Monthly PT Package'],
      default: 'SINGLE_SESSION',
      required: true,
    },
    serviceTitle: {
      type: String,
      default: '1-on-1 Personal Coaching Session',
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    startTime: {
      type: String, // e.g. "07:00 AM"
      required: true,
    },
    endTime: {
      type: String, // e.g. "08:00 AM"
      required: true,
    },
    durationMinutes: {
      type: Number,
      default: 60,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['UPI', 'CASH', 'CARD', 'NET_BANKING', 'COUNTER'],
      default: 'UPI',
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING_PAYMENT', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING_PAYMENT',
      index: true,
    },
    bookingStatus: {
      type: String,
      enum: ['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'EXPIRED'],
      default: 'PENDING_PAYMENT',
      index: true,
    },
    transactionId: {
      type: String,
      default: '',
      trim: true,
    },
    totalSessions: {
      type: Number,
      default: 1,
    },
    sessionsRemaining: {
      type: Number,
      default: 1,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TrainingAppointment',
      default: null,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for conflict lookups and client query history
trainerBookingSchema.index({ trainerId: 1, date: 1, startTime: 1 });
trainerBookingSchema.index({ clientId: 1, createdAt: -1 });
trainerBookingSchema.index({ branchId: 1, createdAt: -1 });

const TrainerBooking = mongoose.model('TrainerBooking', trainerBookingSchema);

module.exports = TrainerBooking;
