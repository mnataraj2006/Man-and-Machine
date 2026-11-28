const mongoose = require('mongoose');

const smsLogSchema = new mongoose.Schema(
  {
    eventKey: {
      type: String,
      trim: true,
      default: undefined,
    },
    notificationKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    notificationLabel: {
      type: String,
      trim: true,
      default: '',
    },
    audience: {
      type: String,
      enum: ['MEMBER', 'STAFF'],
      required: true,
      index: true,
    },
    recipientType: {
      type: String,
      enum: ['MEMBER', 'TRAINER', 'OWNER', 'STAFF'],
      default: 'MEMBER',
    },
    recipientName: {
      type: String,
      trim: true,
      default: '',
    },
    recipientPhone: {
      type: String,
      trim: true,
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
    messagePreview: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    dltTemplateId: {
      type: String,
      trim: true,
      default: '',
    },
    senderId: {
      type: String,
      trim: true,
      default: '',
    },
    classification: {
      type: String,
      enum: ['TRANSACTIONAL', 'SERVICE_IMPLICIT', 'SERVICE_EXPLICIT'],
      default: 'SERVICE_IMPLICIT',
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
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

smsLogSchema.index({ createdAt: -1 });
smsLogSchema.index(
  { eventKey: 1 },
  { unique: true, partialFilterExpression: { eventKey: { $type: 'string' } } }
);

const SmsLog = mongoose.model('SmsLog', smsLogSchema);

module.exports = SmsLog;
