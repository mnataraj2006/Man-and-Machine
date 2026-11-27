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
    qualification: {
      type: String,
      default: '',
      trim: true,
    },
    profileImage: {
      type: String,
      default: '',
      trim: true,
    },
    profilePhoto: {
      url: { type: String, default: '', trim: true },
      storageKey: { type: String, default: '', trim: true },
      uploadedAt: { type: Date, default: null },
      mimeType: { type: String, default: '', trim: true },
      sizeBytes: { type: Number, default: 0 },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
    },
    employmentStatus: {
      type: String,
      enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE'],
      default: 'FULL_TIME',
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
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    acceptingClients: {
      type: Boolean,
      default: true,
      index: true,
    },
    rating: {
      type: Number,
      default: 4.9,
    },
    ratingCount: {
      type: Number,
      default: 18,
    },
    pricing: {
      singleSession: {
        price: { type: Number, default: 500 },
        enabled: { type: Boolean, default: true },
      },
      package10: {
        price: { type: Number, default: 4500 },
        sessionsCount: { type: Number, default: 10 },
        enabled: { type: Boolean, default: true },
      },
      monthlyPT: {
        price: { type: Number, default: 6000 },
        enabled: { type: Boolean, default: true },
      },
    },
    availability: {
      workingDays: {
        type: [String],
        default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      },
      startTime: {
        type: String,
        default: '06:00',
      },
      endTime: {
        type: String,
        default: '21:00',
      },
      breakPeriods: [
        {
          startTime: { type: String, default: '12:00' },
          endTime: { type: String, default: '16:00' },
        },
      ],
      slotDurationMinutes: {
        type: Number,
        default: 60,
      },
      blockedDates: {
        type: [Date],
        default: [],
      },
    },
  },
  {
    timestamps: true,
  }
);

const TrainerProfile = mongoose.model('TrainerProfile', trainerProfileSchema);

module.exports = TrainerProfile;
