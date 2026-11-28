const crypto = require('crypto');
const express = require('express');
const emailProviderService = require('../services/emailProviderService');
const smsProviderService = require('../services/smsProviderService');

const router = express.Router();

const verifySignature = (req, secret) => {
  const sigHeader = String(
    req.get('x-webhook-signature') || req.get('x-hub-signature-256') || ''
  ).trim();
  if (!secret || !sigHeader) return false;

  const providedHex = sigHeader.startsWith('sha256=') ? sigHeader.slice(7) : sigHeader;
  if (!/^[a-f0-9]{64}$/i.test(providedHex)) return false;

  const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
  const expectedHex = crypto.createHmac('sha256', secret).update(raw).digest('hex');

  const a = Buffer.from(providedHex.toLowerCase(), 'utf8');
  const b = Buffer.from(expectedHex.toLowerCase(), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const validateWebhookPayload = (body = {}) => {
  const providerMessageId =
    typeof body.providerMessageId === 'string' ? body.providerMessageId.trim() : '';
  if (!providerMessageId || providerMessageId.length > 200 || /[\r\n\0]/.test(providerMessageId)) {
    return { ok: false, message: 'Valid providerMessageId is required.' };
  }
  const status = String(body.status || '').trim().toUpperCase();
  if (!['DELIVERED', 'FAILED'].includes(status)) {
    return { ok: false, message: 'Unsupported delivery status. Allowed: DELIVERED, FAILED.' };
  }
  return {
    ok: true,
    providerMessageId,
    status,
    providerResponse: String(body.providerResponse || status).slice(0, 500),
    failureReason: String(body.failureReason || '').slice(0, 500),
  };
};

router.post('/email', async (req, res, next) => {
  try {
    const secret = process.env.EMAIL_WEBHOOK_SECRET || process.env.COMMUNICATION_WEBHOOK_SECRET || '';
    if (!verifySignature(req, secret)) {
      return res.status(401).json({ success: false, message: 'Invalid or missing webhook signature.' });
    }

    const parsed = validateWebhookPayload(req.body);
    if (!parsed.ok) {
      return res.status(400).json({ success: false, message: parsed.message });
    }

    const updated = await emailProviderService.processEmailDeliveryReceipt(parsed);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Matching EmailLog not found.' });
    }

    return res.status(200).json({
      success: true,
      id: updated._id,
      status: updated.status,
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/sms', async (req, res, next) => {
  try {
    const secret = process.env.SMS_WEBHOOK_SECRET || process.env.COMMUNICATION_WEBHOOK_SECRET || '';
    if (!verifySignature(req, secret)) {
      return res.status(401).json({ success: false, message: 'Invalid or missing webhook signature.' });
    }

    const parsed = validateWebhookPayload(req.body);
    if (!parsed.ok) {
      return res.status(400).json({ success: false, message: parsed.message });
    }

    const updated = await smsProviderService.processDeliveryReceipt(parsed);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Matching SmsLog not found.' });
    }

    return res.status(200).json({
      success: true,
      id: updated._id,
      status: updated.status,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
