const mongoose = require('mongoose');

const whatsappMessageSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
  phoneNumber: { type: String, required: true, trim: true },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppTemplate', default: null },
  templateName: { type: String, trim: true, default: '' },
  messageType: { type: String, required: true, trim: true, index: true },
  variables: { type: mongoose.Schema.Types.Mixed, default: {} },
  providerMessageId: { type: String, trim: true, default: '', index: true },
  status: { type: String, enum: ['QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED'], default: 'QUEUED', index: true },
  sentAt: { type: Date, default: null }, deliveredAt: { type: Date, default: null }, readAt: { type: Date, default: null }, failedAt: { type: Date, default: null },
  failureReason: { type: String, trim: true, default: '' },
  triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  eventKey: { type: String, trim: true, default: null },
  retryCount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

whatsappMessageSchema.index({ eventKey: 1 }, { unique: true, sparse: true });
whatsappMessageSchema.index({ providerMessageId: 1 }, { sparse: true });
module.exports = mongoose.model('WhatsAppMessage', whatsappMessageSchema);
