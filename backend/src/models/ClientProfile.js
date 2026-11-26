const mongoose = require('mongoose');
const ClientSequence = require('./ClientSequence');

const clientProfileSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      trim: true,
      uppercase: true,
      immutable: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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
    trainingPreference: {
      type: String,
      enum: ['SELF_TRAINED', 'PERSONAL_TRAINER'],
      default: 'SELF_TRAINED',
    },
    membershipId: {
      type: String,
      trim: true,
      default: '',
    },
    name: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    gender: { type: String, trim: true, default: '' },
    dateOfBirth: { type: Date, default: null },
    address: { type: String, trim: true, default: '' },
    emergencyContact: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    registrationSource: { type: String, enum: ['SELF_REGISTERED', 'ADMIN_REGISTERED'], default: 'SELF_REGISTERED' },
    accountAccessStatus: { type: String, enum: ['ACTIVE', 'NOT_CREATED', 'INVITATION_PENDING'], default: 'ACTIVE', index: true },
  },
  {
    timestamps: true,
  }
);

clientProfileSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } }
);
clientProfileSchema.index(
  { clientId: 1 },
  { unique: true, partialFilterExpression: { clientId: { $type: 'string' } } }
);
clientProfileSchema.index({ branchId: 1, trainerId: 1, createdAt: -1 });

// Automatically assign permanent sequential clientId on creation
clientProfileSchema.pre('save', async function () {
  if (this.isNew && !this.clientId) {
    const session = typeof this.$session === 'function' ? this.$session() : null;
    this.clientId = await ClientSequence.getNextClientId(session);
  }
});

// Prevent clientId modification via findOneAndUpdate / updateOne
clientProfileSchema.pre(['findOneAndUpdate', 'updateOne'], function () {
  const update = this.getUpdate();
  if (!update) return;
  if (update.clientId !== undefined) delete update.clientId;
  if (update.$set && update.$set.clientId !== undefined) delete update.$set.clientId;
});

const ClientProfile = mongoose.model('ClientProfile', clientProfileSchema);

module.exports = ClientProfile;
