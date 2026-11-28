const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema(
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
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 8000,
    },
    htmlBody: {
      type: String,
      default: '',
      maxlength: 25000,
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

const EmailTemplate = mongoose.model('EmailTemplate', emailTemplateSchema);

module.exports = EmailTemplate;
