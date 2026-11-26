const mongoose = require('mongoose');

const whatsappAutomationSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  label: { type: String, required: true, trim: true },
  enabled: { type: Boolean, default: false },
  timings: { type: [Number], default: [] },
  templateName: { type: String, trim: true, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('WhatsAppAutomation', whatsappAutomationSchema);
