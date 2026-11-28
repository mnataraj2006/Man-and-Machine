const crypto = require('crypto');
const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');

let customTestAdapter = null;

const setEmailProviderAdapterForTests = (fn) => {
  customTestAdapter = typeof fn === 'function' ? fn : null;
};

const resetEmailProviderAdapter = () => {
  customTestAdapter = null;
};

const getEncryptionKey = () => {
  const secret = String(
    process.env.COMMUNICATION_ENCRYPTION_KEY || process.env.SMTP_ENCRYPTION_KEY || ''
  ).trim();
  if (secret.length < 16) {
    return null;
  }
  return crypto.createHash('sha256').update(secret).digest();
};

const encryptSecret = (plainText) => {
  const raw = String(plainText || '');
  if (!raw) return '';
  const key = getEncryptionKey();
  if (!key) {
    const err = new Error(
      'COMMUNICATION_ENCRYPTION_KEY (minimum 16 characters) must be configured on the server before storing SMTP credentials.'
    );
    err.statusCode = 500;
    throw err;
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(raw, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
};

const decryptSecret = (cipherText) => {
  const raw = String(cipherText || '');
  if (!raw) return '';
  const key = getEncryptionKey();
  if (!key) return '';
  const parts = raw.split(':');
  if (parts.length !== 3) return '';
  try {
    const [ivHex, tagHex, dataHex] = parts;
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
};

const isValidEmail = (email) => {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 254) return false;
  if (/[\r\n]/.test(trimmed)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
};

const isTransientError = (err) => {
  const msg = String(err?.message || '');
  const code = String(err?.code || '');
  const responseCode = Number(err?.responseCode || 0);
  if (responseCode >= 400 && responseCode < 500 && responseCode !== 421) return false;
  if (responseCode === 421) return true;
  if (responseCode >= 500 && responseCode < 600) return false;
  return /ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|ENETUNREACH|timed out|timeout|421/i.test(
    `${code} ${msg}`
  );
};

const resolveEffectiveSmtp = (dbSmtp = {}) => {
  const host = String(dbSmtp?.host || process.env.SMTP_HOST || '').trim();
  const port = Number(dbSmtp?.port || process.env.SMTP_PORT || 587);
  const secure =
    dbSmtp?.host
      ? Boolean(dbSmtp.secure || port === 465)
      : process.env.SMTP_SECURE === 'true' || port === 465;
  const username = String(dbSmtp?.username || process.env.SMTP_USER || '').trim();
  const decryptedDbPass = dbSmtp?.passwordEncrypted ? decryptSecret(dbSmtp.passwordEncrypted) : '';
  const password = decryptedDbPass || String(process.env.SMTP_PASS || '');
  const senderEmail = String(
    dbSmtp?.senderEmail ||
      process.env.EMAIL_FROM ||
      process.env.SMTP_FROM ||
      username ||
      'no-reply@manandmachine.com'
  ).trim();
  const senderName = String(dbSmtp?.senderName || 'Man & Machine Fitness').trim();
  const replyTo = String(dbSmtp?.replyTo || '').trim();

  return {
    configured: Boolean(host && username && password),
    source: dbSmtp?.host ? 'ADMIN_SMTP' : host ? 'ENV_SMTP' : 'NONE',
    host,
    port,
    secure,
    username,
    password,
    senderEmail,
    senderName,
    replyTo,
  };
};

const getPublicEmailProviderStatus = (dbSmtp = {}) => {
  const smtp = resolveEffectiveSmtp(dbSmtp);
  const hasHttpsFallback = Boolean(process.env.BREVO_API_KEY || process.env.RESEND_API_KEY);
  return {
    configured: Boolean(customTestAdapter || smtp.configured || hasHttpsFallback),
    mode: customTestAdapter
      ? 'TEST_ADAPTER'
      : smtp.configured
        ? smtp.source
        : process.env.BREVO_API_KEY
          ? 'ENV_BREVO_API'
          : process.env.RESEND_API_KEY
            ? 'ENV_RESEND_API'
            : 'UNCONFIGURED',
    hasSmtpHost: Boolean(smtp.host),
    hasPassword: Boolean(smtp.password),
    senderEmail: smtp.senderEmail,
    senderName: smtp.senderName,
  };
};

const createSmtpTransporter = (smtp) =>
  nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    family: 4,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 7000,
    auth: {
      user: smtp.username,
      pass: smtp.password,
    },
  });

const sendViaEnvHttpsApi = async ({ to, recipientName, subject, html, text, smtp }) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    if (process.env.BREVO_API_KEY) {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'api-key': process.env.BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { name: smtp.senderName, email: smtp.senderEmail },
          to: [{ email: to, name: recipientName || to }],
          ...(smtp.replyTo ? { replyTo: { email: smtp.replyTo } } : {}),
          subject,
          htmlContent: html,
          textContent: text,
        }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          ok: false,
          status: 'FAILED',
          transient: response.status >= 500 || response.status === 429,
          providerResponse: JSON.stringify(data).slice(0, 400),
          failureReason: data.message || `Brevo API error (${response.status})`,
        };
      }
      return {
        ok: true,
        status: 'SENT',
        providerMessageId: String(data.messageId || `brevo-${Date.now()}`),
        providerResponse: 'Accepted by Brevo HTTPS API (delivery pending confirmation)',
      };
    }

    if (process.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `"${smtp.senderName}" <${smtp.senderEmail}>`,
          to: [to],
          ...(smtp.replyTo ? { reply_to: smtp.replyTo } : {}),
          subject,
          html,
          text,
        }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          ok: false,
          status: 'FAILED',
          transient: response.status >= 500 || response.status === 429,
          providerResponse: JSON.stringify(data).slice(0, 400),
          failureReason: data.message || `Resend API error (${response.status})`,
        };
      }
      return {
        ok: true,
        status: 'SENT',
        providerMessageId: String(data.id || `resend-${Date.now()}`),
        providerResponse: 'Accepted by Resend HTTPS API (delivery pending confirmation)',
      };
    }

    return null;
  } finally {
    clearTimeout(timer);
  }
};

const sendEmailAttempt = async ({ to, recipientName, subject, html, text, attachments = [], smtp }) => {
  if (customTestAdapter) {
    return customTestAdapter({ to, recipientName, subject, html, text, attachments, smtp });
  }

  if (smtp.configured) {
    const transporter = createSmtpTransporter(smtp);
    try {
      const info = await transporter.sendMail({
        from: `"${smtp.senderName}" <${smtp.senderEmail}>`,
        to,
        ...(smtp.replyTo && isValidEmail(smtp.replyTo) ? { replyTo: smtp.replyTo } : {}),
        subject,
        text,
        html,
        ...(Array.isArray(attachments) && attachments.length > 0 ? { attachments } : {}),
      });
      return {
        ok: true,
        status: 'SENT',
        providerMessageId: String(info?.messageId || `smtp-${Date.now()}`),
        providerResponse: String(info?.response || 'Accepted by SMTP server (delivery pending confirmation)').slice(
          0,
          400
        ),
      };
    } catch (err) {
      return {
        ok: false,
        status: 'FAILED',
        transient: isTransientError(err),
        providerResponse: String(err?.response || '').slice(0, 400),
        failureReason: String(err?.message || 'SMTP send failed').slice(0, 400),
      };
    } finally {
      try {
        transporter.close();
      } catch {}
    }
  }

  const envRes = await sendViaEnvHttpsApi({ to, recipientName, subject, html, text, smtp });
  if (envRes) return envRes;

  return {
    ok: false,
    status: 'FAILED',
    transient: false,
    providerResponse: 'EMAIL_PROVIDER_NOT_CONFIGURED',
    failureReason: 'SMTP is not configured. Configure SMTP settings or set BREVO_API_KEY / RESEND_API_KEY.',
  };
};

/**
 * Send email with bounded retry for transient failures (max 2 retries = 3 total attempts).
 */
const sendEmail = async ({ to, recipientName, subject, html, text, attachments = [], dbSmtp = {} }) => {
  if (!isValidEmail(to)) {
    return {
      ok: false,
      status: 'FAILED',
      attempts: 0,
      providerMessageId: '',
      providerResponse: 'INVALID_EMAIL',
      failureReason: 'Invalid recipient email address',
    };
  }

  const smtp = resolveEffectiveSmtp(dbSmtp);
  const maxAttempts = 3;
  let lastResult = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    lastResult = await sendEmailAttempt({
      to: to.trim(),
      recipientName,
      subject,
      html,
      text,
      attachments,
      smtp,
    });
    if (lastResult?.ok) {
      return {
        ...lastResult,
        status: lastResult.status || 'SENT',
        attempts: attempt,
      };
    }
    if (!lastResult?.transient || attempt === maxAttempts) {
      return {
        ...lastResult,
        status: 'FAILED',
        attempts: attempt,
      };
    }
    await new Promise((r) => setTimeout(r, 150 * attempt));
  }

  return {
    ...(lastResult || {}),
    ok: false,
    status: 'FAILED',
    attempts: maxAttempts,
  };
};

const testSmtpConnection = async (dbSmtp = {}) => {
  if (customTestAdapter) {
    return {
      ok: true,
      mode: 'TEST_ADAPTER',
      message: 'Test adapter active. Connection verified (delivery is not confirmed until send).',
    };
  }
  const smtp = resolveEffectiveSmtp(dbSmtp);
  if (!smtp.configured) {
    return {
      ok: false,
      mode: 'UNCONFIGURED',
      message: 'SMTP host, username, and password are required to test SMTP connection.',
    };
  }
  const transporter = createSmtpTransporter(smtp);
  try {
    await transporter.verify();
    return {
      ok: true,
      mode: smtp.source,
      message: `SMTP handshake succeeded with ${smtp.host}:${smtp.port}. Note: connection verification does not guarantee inbox delivery.`,
    };
  } catch (err) {
    return {
      ok: false,
      mode: smtp.source,
      message: err?.message || 'SMTP connection verification failed.',
    };
  } finally {
    try {
      transporter.close();
    } catch {}
  }
};

const processEmailDeliveryReceipt = async ({
  providerMessageId,
  status,
  providerResponse = '',
  failureReason = '',
}) => {
  if (!providerMessageId) return null;
  const normalized = String(status || '').toUpperCase();
  if (!['DELIVERED', 'FAILED'].includes(normalized)) return null;

  const update = {
    status: normalized,
    providerResponse: String(providerResponse || normalized).slice(0, 500),
  };
  if (normalized === 'DELIVERED') {
    update.deliveredAt = new Date();
  } else {
    update.failureReason = String(failureReason || 'Delivery failed at mail server').slice(0, 500);
  }

  return EmailLog.findOneAndUpdate(
    { providerMessageId: String(providerMessageId) },
    { $set: update },
    { returnDocument: 'after' }
  );
};

module.exports = {
  encryptSecret,
  decryptSecret,
  isValidEmail,
  resolveEffectiveSmtp,
  getPublicEmailProviderStatus,
  sendEmail,
  testSmtpConnection,
  processEmailDeliveryReceipt,
  setEmailProviderAdapterForTests,
  resetEmailProviderAdapter,
};
