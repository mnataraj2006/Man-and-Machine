const WhatsAppMessage = require('../models/WhatsAppMessage');
const WhatsAppTemplate = require('../models/WhatsAppTemplate');
const { normalizeIndianPhone } = require('../utils/phone');

const API_URL = () => (process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v21.0').replace(/\/$/, '');
const configured = () => Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
const allowedVariables = new Set(['member_name', 'membership_name', 'expiry_date', 'amount', 'branch_name', 'trainer_name', 'payment_link', 'invoice_number', 'payment_method', 'balance_amount']);

const providerRequest = async (path, options = {}) => {
  const response = await fetch(`${API_URL()}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || 'WhatsApp provider request failed');
  return body;
};

const assertVariables = (variables = {}, expected = []) => {
  for (const key of expected) if (!allowedVariables.has(key) || variables[key] === undefined || variables[key] === null) throw new Error(`Missing or unsupported template variable: ${key}`);
};

const sendQueuedMessage = async (messageId) => {
  const message = await WhatsAppMessage.findById(messageId);
  if (!message || !['QUEUED', 'FAILED'].includes(message.status)) return;
  if (!configured()) {
    message.status = 'FAILED'; message.failedAt = new Date(); message.failureReason = 'WhatsApp is not configured.'; await message.save(); return;
  }
  message.status = 'SENDING'; message.failureReason = ''; await message.save();
  try {
    const template = message.templateId ? await WhatsAppTemplate.findById(message.templateId) : null;
    if (!template || template.status !== 'APPROVED') throw new Error('An approved WhatsApp template is required.');
    assertVariables(message.variables, template.variables);
    const parameters = template.variables.map((key) => ({ type: 'text', text: String(message.variables[key]).slice(0, 1024) }));
    const payload = { messaging_product: 'whatsapp', to: message.phoneNumber.slice(1), type: 'template', template: { name: template.providerTemplateName || template.name, language: { code: template.language }, components: parameters.length ? [{ type: 'body', parameters }] : [] } };
    const result = await providerRequest(`/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, { method: 'POST', body: JSON.stringify(payload) });
    message.status = 'SENT'; message.sentAt = new Date(); message.providerMessageId = result?.messages?.[0]?.id || ''; await message.save();
  } catch (error) {
    message.status = 'FAILED'; message.failedAt = new Date(); message.failureReason = String(error.message || 'Unable to send message').slice(0, 500); await message.save();
  }
};

const queueTemplateMessage = async ({ clientId = null, branchId = null, phoneNumber, templateName, messageType, variables = {}, triggeredBy = null, eventKey = null }) => {
  const normalized = normalizeIndianPhone(phoneNumber);
  if (!normalized) throw new Error('A valid Indian WhatsApp number is required.');
  const template = await WhatsAppTemplate.findOne({ name: String(templateName).toLowerCase() });
  if (!template) throw new Error(`WhatsApp template '${templateName}' does not exist.`);
  assertVariables(variables, template.variables);
  let message;
  try { message = await WhatsAppMessage.create({ clientId, branchId, phoneNumber: normalized, templateId: template._id, templateName: template.name, messageType, variables, triggeredBy, eventKey }); }
  catch (err) { if (err.code === 11000 && eventKey) return WhatsAppMessage.findOne({ eventKey }); throw err; }
  setImmediate(() => sendQueuedMessage(message._id));
  return message;
};

const testConnection = async () => {
  if (!configured()) return { status: 'NOT_CONFIGURED', message: 'WhatsApp is not configured.' };
  try { const account = await providerRequest(`/${process.env.WHATSAPP_PHONE_NUMBER_ID}?fields=id,display_phone_number,verified_name`); return { status: 'CONNECTED', businessName: account.verified_name || '', displayNumber: account.display_phone_number || '', phoneNumberId: account.id || process.env.WHATSAPP_PHONE_NUMBER_ID }; }
  catch (error) { return { status: 'FAILED', message: String(error.message || 'Connection test failed') }; }
};

const processWebhookEvent = async (payload) => {
  const changes = payload?.entry?.flatMap((entry) => entry.changes || []) || [];
  for (const change of changes) for (const status of change?.value?.statuses || []) {
    const state = String(status.status || '').toUpperCase();
    const update = { status: state === 'DELIVERED' ? 'DELIVERED' : state === 'READ' ? 'READ' : state === 'FAILED' ? 'FAILED' : 'SENT' };
    if (update.status === 'DELIVERED') update.deliveredAt = new Date(Number(status.timestamp || Date.now() / 1000) * 1000);
    if (update.status === 'READ') update.readAt = new Date(Number(status.timestamp || Date.now() / 1000) * 1000);
    if (update.status === 'FAILED') { update.failedAt = new Date(); update.failureReason = status.errors?.[0]?.title || 'Provider reported delivery failure'; }
    await WhatsAppMessage.findOneAndUpdate({ providerMessageId: status.id }, { $set: update });
  }
};

module.exports = { configured, testConnection, queueTemplateMessage, sendQueuedMessage, processWebhookEvent, allowedVariables };
