const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['CREATED', 'UPDATED', 'DEACTIVATED', 'REACTIVATED', 'BIOMETRIC_UPDATED'],
      required: true,
    },
    fromStatus: {
      type: String,
      default: '',
    },
    toStatus: {
      type: String,
      default: '',
    },
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const employeeSchema = new mongoose.Schema(
  {
    // Company Employee ID (e.g. EMP001) — separate from MongoDB _id and physical Biometric User ID
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    // Personal Information
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY', ''],
      default: '',
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    profilePhoto: {
      type: String,
      trim: true,
      default: '',
    },

    // Employment Information
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      index: true,
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'Branch is required'],
      index: true,
    },
    joiningDate: {
      type: Date,
      required: [true, 'Joining date is required'],
      default: Date.now,
    },
    employmentType: {
      type: String,
      enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'OTHER'],
      default: 'FULL_TIME',
    },
    employmentStatus: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
    exitDate: {
      type: Date,
      default: null,
    },

    // Biometric Information (stored as string to preserve leading zeros)
    biometricUserId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    assignedDeviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BiometricDevice',
      default: null,
      index: true,
    },
    biometricEnrollmentStatus: {
      type: String,
      enum: ['NOT_LINKED', 'LINKED', 'PENDING_VERIFICATION', 'VERIFIED', 'ERROR'],
      default: 'NOT_LINKED',
      index: true,
    },
    biometricError: {
      type: String,
      trim: true,
      default: '',
    },
    biometricLinkedAt: {
      type: Date,
      default: null,
    },
    biometricVerifiedAt: {
      type: Date,
      default: null,
    },

    // Safe Deactivation / Reactivation Audit Fields
    deactivatedAt: {
      type: Date,
      default: null,
    },
    deactivatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    deactivationReason: {
      type: String,
      trim: true,
      default: '',
    },
    reactivatedAt: {
      type: Date,
      default: null,
    },
    reactivatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for filtering and device-scoped active biometric uniqueness
employeeSchema.index({ branchId: 1, employmentStatus: 1, department: 1 });
employeeSchema.index(
  { assignedDeviceId: 1, biometricUserId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      employmentStatus: 'ACTIVE',
      biometricUserId: { $gt: '' },
      assignedDeviceId: { $type: 'objectId' },
    },
  }
);

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = Employee;
