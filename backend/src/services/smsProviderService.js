const SmsLog = require('../models/SmsLog');

let customProviderAdapter = null;

const setProviderAdapterForTests = (adapterFn) => {
  customProviderAdapter = typeof adapterFn === 'function' ? adapterFn : null;
};

const resetProviderAdapter = () => {
  customProviderAdapter = null;
};

const getProviderConfig = () => ({
  providerUrl: (process.env.SMS_PROVIDER_URL || '').trim(),
  apiKey: (process.env.SMS_API_KEY || '').trim(),
  senderId: (process.env.SMS_SENDER_ID || '').trim().toUpperCase(),
  dltEntityId: (process.env.SMS_DLT_ENTITY_ID || '').trim(),
});

const getPublicProviderStatus = () => {
  const cfg = getProviderConfig();
  return {
    configured: Boolean(cfg.providerUrl && cfg.apiKey),
    hasSenderId: Boolean(cfg.senderId),
    hasDltEntityId: Boolean(cfg.dltEntityId),
    senderIdPreview: cfg.senderId || '',
    dltEntityIdPreview: cfg.dltEntityId ? `***${cfg.dltEntityId.slice(-4)}` : '',
  };
};

const isInsufficientCreditsError = (statusCode, text = '') =>
  statusCode === 402 || /insufficient|credit|balance|low\s*balance/i.test(String(text));

const sendSms = async ({
  to,
  message,
  senderId = '',
  dltTemplateId = '',
  dltEntityId = '',
  classification = 'SERVICE_IMPLICIT',
}) => {
  const cfg = getProviderConfig();
  const effectiveSenderId = (senderId || cfg.senderId || '').trim().toUpperCase();
  const effectiveEntityId = (dltEntityId || cfg.dltEntityId || '').trim();

  if (customProviderAdapter) {
    return customProviderAdapter({
      to,
      message,
      senderId: effectiveSenderId,
      dltTemplateId,
      dltEntityId: effectiveEntityId,
      classification,
    });
  }

  if (!cfg.providerUrl || !cfg.apiKey) {
    return {
      ok: false,
      code: 'NOT_CONFIGURED',
      providerMessageId: '',
      providerResponse: 'SMS_PROVIDER_NOT_CONFIGURED',
      error: 'SMS provider credentials are not configured on the server.',
    };
  }

  if (!effectiveSenderId) {
    return {
      ok: false,
      code: 'DLT_SENDER_MISSING',
      providerMessageId: '',
      providerResponse: 'DLT_SENDER_ID_REQUIRED',
      error: 'TRAI/DLT approved Sender ID is required.',
    };
  }

  try {
    const response = await fetch(cfg.providerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
        'x-api-key': cfg.apiKey,
      },
      body: JSON.stringify({
        to,
        message,
        sender_id: effectiveSenderId,
        dlt_template_id: dltTemplateId || undefined,
        dlt_entity_id: effectiveEntityId || undefined,
        route: classification === 'TRANSACTIONAL' ? 'transactional' : 'service_implicit',
      }),
    });

    const rawText = await response.text().catch(() => '');
    let parsed = {};
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = { raw: rawText.slice(0, 200) };
    }

    if (!response.ok || parsed.success === false || parsed.status === 'error') {
      const errMsg = parsed.message || parsed.error || rawText || `HTTP ${response.status}`;
      if (isInsufficientCreditsError(response.status, errMsg)) {
        return {
          ok: false,
          code: 'INSUFFICIENT_CREDITS',
          providerMessageId: '',
          providerResponse: `HTTP ${response.status}: INSUFFICIENT_CREDITS`,
          error: 'Insufficient SMS credits in provider account.',
        };
      }
      return {
        ok: false,
        code: 'PROVIDER_ERROR',
        providerMessageId: '',
        providerResponse: `HTTP ${response.status}: ${String(errMsg).slice(0, 160)}`,
        error: String(errMsg).slice(0, 300),
      };
    }

    const msgId = parsed.messageId || parsed.id || parsed.request_id || '';
    return {
      ok: true,
      status: 'SENT', // Never mark DELIVERED until DLR webhook confirms
      providerMessageId: String(msgId),
      providerResponse: `HTTP ${response.status}: ACCEPTED`,
      error: '',
    };
  } catch (err) {
    return {
      ok: false,
      code: 'NETWORK_ERROR',
      providerMessageId: '',
      providerResponse: 'NETWORK_ERROR',
      error: err.message || 'SMS provider request failed.',
    };
  }
};

const processDeliveryReceipt = async ({
  providerMessageId,
  status,
  providerResponse = '',
  failureReason = '',
}) => {
  if (typeof providerMessageId !== 'string' || !providerMessageId.trim()) return null;
  const upper = String(status || '').trim().toUpperCase();
  if (!['DELIVERED', 'FAILED'].includes(upper)) return null;

  const update = {
    status: upper,
    providerResponse: String(providerResponse || upper).slice(0, 500),
  };
  if (upper === 'DELIVERED') update.deliveredAt = new Date();
  if (upper === 'FAILED') {
    update.failedAt = new Date();
    update.failureReason = String(failureReason || 'Delivery failed at carrier').slice(0, 300);
  }
  return SmsLog.findOneAndUpdate(
    { providerMessageId: providerMessageId.trim() },
    { $set: update },
    { returnDocument: 'after' }
  ).lean();
};

module.exports = {
  setProviderAdapterForTests,
  resetProviderAdapter,
  getProviderConfig,
  getPublicProviderStatus,
  sendSms,
  processDeliveryReceipt,
};
