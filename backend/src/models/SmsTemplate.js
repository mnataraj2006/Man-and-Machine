const mongoose = require('mongoose');

const smsTemplateSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    audience: {
      type: String,
      enum: ['MEMBER', 'STAFF'],
      required: true,
      index: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    dltTemplateId: {
      type: String,
      trim: true,
      default: '',
    },
    senderId: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    classification: {
      type: String,
      enum: ['TRANSACTIONAL', 'SERVICE_IMPLICIT', 'SERVICE_EXPLICIT'],
      default: 'SERVICE_IMPLICIT',
    },
    isActive: {
      type: Boolean,
      default: true,
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

const SmsTemplate = mongoose.model('SmsTemplate', smsTemplateSchema);

module.exports = SmsTemplate;
