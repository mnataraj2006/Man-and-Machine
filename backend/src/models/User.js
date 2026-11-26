const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
      index: true,
    },
    phone: {
      type: String,
      required: [
        function () {
          return this.status !== 'PENDING_ACTIVATION';
        },
        'Please provide your mobile number',
      ],
      trim: true,
      default: '',
    },
    password: {
      type: String,
      required: [
        function () {
          return this.status !== 'PENDING_ACTIVATION';
        },
        'Please provide a password',
      ],
      minlength: [8, 'Password must be at least 8 characters'],
      default: undefined,
    },
    role: {
      type: String,
      enum: ['ADMIN', 'TRAINER', 'CLIENT'],
      default: 'CLIENT',
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING_ACTIVATION', 'ACTIVE', 'PENDING', 'SUSPENDED', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    activationTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    activationTokenExpiresAt: {
      type: Date,
      default: null,
    },
    activationSentAt: {
      type: Date,
      default: null,
    },
    activationUsedAt: {
      type: Date,
      default: null,
    },
    passwordResetTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetTokenExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
    passwordResetRequestedAt: {
      type: Date,
      default: null,
    },
    preferences: {
      theme: {
        type: String,
        enum: ['dark', 'light', 'system'],
        default: 'dark',
      },
    },
    // Consent is deliberately stored with the client identity, not with a provider account.
    whatsappOptIn: { type: Boolean, default: false },
    whatsappOptInAt: { type: Date, default: null },
    whatsappOptOutAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving if modified and present
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with hashed password safely
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password || !enteredPassword) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Derive public invitation status without exposing token hashes
userSchema.methods.getInvitationStatus = function () {
  if (this.activationUsedAt || (this.status === 'ACTIVE' && this.password)) {
    return 'ACTIVATED';
  }
  if (this.status === 'PENDING_ACTIVATION') {
    if (this.activationTokenExpiresAt && new Date(this.activationTokenExpiresAt) < new Date()) {
      return 'EXPIRED';
    }
    return 'PENDING';
  }
  return this.status;
};

// Safe JSON representation: never include password or cryptographic token hashes
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    branchId: this.branchId,
    status: this.status,
    invitationStatus: this.getInvitationStatus(),
    activationSentAt: this.activationSentAt,
    activationUsedAt: this.activationUsedAt,
    preferences: {
      theme: this.preferences?.theme || 'dark',
    },
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

userSchema.index({ role: 1, branchId: 1, status: 1 });
userSchema.index({ role: 1, branchId: 1, createdAt: -1 });
userSchema.index({ role: 1, createdAt: -1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
