const mongoose = require('mongoose');

const whatsappTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, lowercase: true, match: /^[a-z0-9_]+$/ },
  category: { type: String, enum: ['UTILITY', 'MARKETING', 'AUTHENTICATION'], default: 'UTILITY' },
  language: { type: String, default: 'en', trim: true },
  content: { type: String, required: true, trim: true, maxlength: 4096 },
  variables: { type: [String], default: [] },
  status: { type: String, enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DISABLED'], default: 'DRAFT', index: true },
  providerTemplateName: { type: String, trim: true, default: '' },
  rejectionReason: { type: String, trim: true, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

whatsappTemplateSchema.index({ name: 1, language: 1 }, { unique: true });
module.exports = mongoose.model('WhatsAppTemplate', whatsappTemplateSchema);
