const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema(
  {
    notificationKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    audience: {
      type: String,
      enum: ['MEMBER', 'STAFF'],
      required: true,
      index: true,
    },
    recipientType: {
      type: String,
      enum: ['MEMBER', 'TRAINER', 'OWNER'],
      required: true,
    },
    recipientName: {
      type: String,
      trim: true,
      default: '',
    },
    recipientEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      index: true,
    },
    clientProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientProfile',
      default: null,
      index: true,
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
      index: true,
    },
    subject: {
      type: String,
      trim: true,
      default: '',
      maxlength: 300,
    },
    messagePreview: {
      type: String,
      trim: true,
      default: '',
      maxlength: 300,
    },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'DELIVERED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    providerMessageId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    providerResponse: {
      type: String,
      trim: true,
      default: '',
    },
    failureReason: {
      type: String,
      trim: true,
      default: '',
    },
    attempts: {
      type: Number,
      default: 0,
    },
    hasAttachments: {
      type: Boolean,
      default: false,
    },
    attachmentNames: {
      type: [String],
      default: [],
    },
    eventKey: {
      type: String,
      trim: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

emailLogSchema.index(
  { eventKey: 1 },
  { unique: true, partialFilterExpression: { eventKey: { $type: 'string' } } }
);
emailLogSchema.index({ createdAt: -1 });

const EmailLog = mongoose.model('EmailLog', emailLogSchema);

module.exports = EmailLog;
