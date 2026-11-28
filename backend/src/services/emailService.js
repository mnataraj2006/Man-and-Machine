const mongoose = require('mongoose');
const EmailTemplate = require('../models/EmailTemplate');
const EmailLog = require('../models/EmailLog');
const User = require('../models/User');
const {
  ALL_SMS_NOTIFICATIONS,
  SMS_CATALOG_MAP,
  getEmailTemplateDefaults,
} = require('../utils/smsCatalog');
const smsService = require('./smsService');
const emailProviderService = require('./emailProviderService');

const escapeHtml = (str) =>
  String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const validateSafeEmailHtml = (html) => {
  const raw = String(html || '').trim();
  if (!raw) return '';
  if (/<script\b|<iframe\b|<object\b|<embed\b|<form\b|<meta\b|<base\b|<link\b/i.test(raw)) {
    const err = new Error('Unsafe HTML tags (<script>, <iframe>, <object>, <embed>, <form>, <link>, <meta>, <base>) are not permitted in email templates.');
    err.statusCode = 400;
    throw err;
  }
  if (/\son[a-z]+\s*=|javascript:|vbscript:|data:text\/html/i.test(raw)) {
    const err = new Error('Inline event handlers and script URIs are not permitted in email templates.');
    err.statusCode = 400;
    throw err;
  }
  // Block unexpected external resources (images/stylesheets/urls) unless explicitly allowlisted
  const externalUrls = raw.match(/(?:src|href|action|poster|background)\s*=\s*["']?\s*(?:https?:)?\/\/[^\s"'<>]+/gi) || [];
  const cssExternalUrls = raw.match(/url\(\s*["']?\s*(?:https?:)?\/\/[^\s"')]+/gi) || [];
  const allowedOrigin = (process.env.EMAIL_ASSET_ORIGIN || '').trim().toLowerCase();
  for (const match of [...externalUrls, ...cssExternalUrls]) {
    if (!allowedOrigin || !match.toLowerCase().includes(allowedOrigin)) {
      const err = new Error('External resource URLs are not permitted in custom email HTML templates unless matching EMAIL_ASSET_ORIGIN.');
      err.statusCode = 400;
      throw err;
    }
  }
  return raw;
};

const ensureEmailTemplatesSeeded = async () => {
  const existing = await EmailTemplate.find({}).select('key').lean();
  const existingKeys = new Set(existing.map((t) => t.key));
  const missing = ALL_SMS_NOTIFICATIONS.filter((item) => !existingKeys.has(item.key)).map((item) => {
    const defaults = getEmailTemplateDefaults(item);
    return {
      key: item.key,
      audience: item.audience,
      label: item.label,
      subject: defaults.subject,
      body: defaults.body,
      htmlBody: '',
      isActive: true,
    };
  });
  if (missing.length > 0) {
    await EmailTemplate.insertMany(missing, { ordered: false }).catch(() => {});
  }
};

const listEmailTemplates = async () => {
  await ensureEmailTemplatesSeeded();
  return EmailTemplate.find({}).sort({ audience: 1, label: 1 }).lean();
};

const renderEmailString = (str, variables = {}) => {
  const rendered = String(str || '').replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const val = variables[key];
    if (val === undefined || val === null || String(val).trim() === '') {
      return match;
    }
    return String(val);
  });
  const unresolved = rendered.match(/\{\{(\w+)\}\}/g);
  if (unresolved && unresolved.length > 0) {
    throw new Error(`Unresolved template placeholders: ${unresolved.join(', ')}`);
  }
  return rendered;
};

const wrapInBrandedHtml = ({ subject, bodyText, customHtml = '', branchName = 'Man & Machine Fitness' }) => {
  const contentHtml = customHtml && String(customHtml).trim()
    ? validateSafeEmailHtml(customHtml)
    : String(bodyText || '')
        .split(/\r?\n/)
        .map((line) => (line.trim() ? `<p style="margin:0 0 12px 0;line-height:1.6;color:#1f2937;font-size:15px;">${escapeHtml(line)}</p>` : '<div style="height:8px;"></div>'))
        .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f172a;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,0.35);">
          <tr>
            <td style="background:linear-gradient(135deg,#111827 0%,#1f2937 100%);padding:24px 28px;border-bottom:3px solid #f59e0b;">
              <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#f59e0b;font-weight:700;">MAN &amp; MACHINE FITNESS</div>
              <div style="font-size:20px;font-weight:700;color:#ffffff;margin-top:6px;">${escapeHtml(subject)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 20px 28px;background-color:#ffffff;">
              ${contentHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;background-color:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.5;">
              <div style="font-weight:600;color:#334155;">Man &amp; Machine Fitness — ${escapeHtml(branchName)}</div>
              <div style="margin-top:4px;">This is an automated service notification from Man &amp; Machine HRMS.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const buildSamplePreviewVariables = () => ({
  memberName: 'Arjun Kumar',
  memberId: 'MM000101',
  membershipName: 'Annual Transformation Plan',
  expiryDate: '28 Dec 2026',
  paymentAmount: '4500',
  dueAmount: '1500',
  branchName: 'Kovilpatti',
  trainerName: 'Coach Vikram',
  workoutPlan: 'Hypertrophy Push/Pull Split',
  sessionDate: '29 Nov 2026',
  sessionTime: '06:30 AM',
  lockerNumber: 'L-14',
  ownerName: 'Branch Owner',
});

const updateEmailTemplate = async (key, payload = {}, adminUser = null) => {
  await ensureEmailTemplatesSeeded();
  const template = await EmailTemplate.findOne({ key });
  if (!template) {
    const err = new Error(`Email template "${key}" not found.`);
    err.statusCode = 404;
    throw err;
  }
  if (payload.subject !== undefined) {
    const cleanSubject = String(payload.subject || '').trim();
    if (!cleanSubject) {
      const err = new Error('Email subject cannot be empty.');
      err.statusCode = 400;
      throw err;
    }
    template.subject = cleanSubject;
  }
  if (payload.body !== undefined) {
    const cleanBody = String(payload.body || '').trim();
    if (!cleanBody) {
      const err = new Error('Email body cannot be empty.');
      err.statusCode = 400;
      throw err;
    }
    template.body = cleanBody;
  }
  if (payload.htmlBody !== undefined) {
    template.htmlBody = validateSafeEmailHtml(payload.htmlBody);
  }
  if (payload.isActive !== undefined) {
    template.isActive = Boolean(payload.isActive);
  }
  template.updatedBy = adminUser?._id || null;
  await template.save();
  return template.toObject();
};

const previewEmailTemplate = async (key, payload = {}) => {
  await ensureEmailTemplatesSeeded();
  const template = await EmailTemplate.findOne({ key }).lean();
  if (!template) {
    const err = new Error(`Email template "${key}" not found.`);
    err.statusCode = 404;
    throw err;
  }
  const vars = { ...buildSamplePreviewVariables(), ...(payload.variables || {}) };
  const rawSubject = payload.subject !== undefined ? payload.subject : template.subject;
  const rawBody = payload.body !== undefined ? payload.body : template.body;
  const rawHtml = payload.htmlBody !== undefined ? payload.htmlBody : template.htmlBody;

  const subject = renderEmailString(rawSubject, vars);
  const text = renderEmailString(rawBody, vars);
  const renderedCustomHtml = rawHtml && String(rawHtml).trim() ? renderEmailString(rawHtml, vars) : '';
  const html = wrapInBrandedHtml({
    subject,
    bodyText: text,
    customHtml: renderedCustomHtml,
    branchName: vars.branchName || 'Man & Machine Fitness',
  });

  return { subject, text, html };
};

const isEmailNotificationEnabled = (settings, notificationKey) => {
  if (!settings || settings.emailEnabled !== true) return false;
  const meta = SMS_CATALOG_MAP.get(notificationKey);
  if (!meta) return false;
  if (meta.audience === 'MEMBER') {
    return settings.emailMemberNotifications?.[notificationKey] === true;
  }
  return settings.emailStaffNotifications?.[notificationKey] === true;
};

const getOwnerEmailRecipient = async () => {
  const { settings } = await smsService.getOrCreateSettings();
  let ownerEmail = settings.ownerEmail || '';
  let ownerName = settings.ownerName || 'Owner';
  if (!ownerEmail) {
    const admin = await User.findOne({ role: 'ADMIN', status: 'ACTIVE' })
      .sort({ createdAt: 1 })
      .select('name email')
      .lean();
    if (admin) {
      ownerEmail = admin.email || '';
      if (!settings.ownerName && admin.name) ownerName = admin.name;
    }
  }
  return { ownerName, ownerEmail };
};

const sendEmailNotification = async ({
  notificationKey,
  recipientEmail,
  recipientName = '',
  recipientType = 'MEMBER',
  clientProfileId = null,
  trainerId = null,
  branchId = null,
  variables = {},
  attachments = [],
  eventKey = undefined,
}) => {
  const meta = SMS_CATALOG_MAP.get(notificationKey);
  if (!meta) return { ok: false, skipped: true, reason: 'UNKNOWN_KEY' };
  if (meta.supported === false) return { ok: false, skipped: true, reason: 'UNSUPPORTED_NOTIFICATION' };

  const { settings } = await smsService.getOrCreateSettings();
  if (settings.emailEnabled !== true) {
    return { ok: false, skipped: true, reason: 'GLOBAL_EMAIL_DISABLED' };
  }
  if (!isEmailNotificationEnabled(settings, notificationKey)) {
    return { ok: false, skipped: true, reason: 'DISABLED' };
  }

  await ensureEmailTemplatesSeeded();
  const template = await EmailTemplate.findOne({ key: notificationKey }).lean();
  if (template && template.isActive === false) {
    return { ok: false, skipped: true, reason: 'TEMPLATE_INACTIVE' };
  }

  const defaults = getEmailTemplateDefaults(meta);
  const rawSubject = template?.subject || defaults.subject;
  const rawBody = template?.body || defaults.body;
  const rawHtml = template?.htmlBody || '';

  const normalizedEmail = String(recipientEmail || '').trim().toLowerCase();
  if (!emailProviderService.isValidEmail(normalizedEmail)) {
    try {
      const log = await EmailLog.create({
        eventKey,
        notificationKey,
        audience: meta.audience,
        recipientType,
        recipientName,
        recipientEmail: normalizedEmail,
        clientProfileId,
        trainerId,
        branchId,
        subject: rawSubject,
        status: 'FAILED',
        failureReason: 'Invalid or missing recipient email address.',
      });
      return { ok: false, reason: 'INVALID_EMAIL', log };
    } catch (err) {
      if (err.code === 11000 && eventKey) return { ok: false, duplicate: true };
      throw err;
    }
  }

  const allVars = { ownerName: settings.ownerName || 'Owner', ...variables };
  let subject = '';
  let text = '';
  let html = '';
  try {
    subject = renderEmailString(rawSubject, allVars);
    text = renderEmailString(rawBody, allVars);
    const customHtml = rawHtml && String(rawHtml).trim() ? renderEmailString(rawHtml, allVars) : '';
    html = wrapInBrandedHtml({
      subject,
      bodyText: text,
      customHtml,
      branchName: allVars.branchName || 'Man & Machine Fitness',
    });
  } catch (renderErr) {
    try {
      const log = await EmailLog.create({
        eventKey,
        notificationKey,
        audience: meta.audience,
        recipientType,
        recipientName,
        recipientEmail: normalizedEmail,
        clientProfileId,
        trainerId,
        branchId,
        subject: rawSubject,
        status: 'FAILED',
        failureReason: renderErr.message,
      });
      return { ok: false, reason: 'UNRESOLVED_PLACEHOLDERS', log };
    } catch (err) {
      if (err.code === 11000 && eventKey) return { ok: false, duplicate: true };
      throw err;
    }
  }

  const safeAttachments = Array.isArray(attachments)
    ? attachments.filter((a) => a && a.filename && (a.content || a.path))
    : [];

  if (eventKey) {
    const existing = await EmailLog.findOne({ eventKey }).select('_id').lean();
    if (existing) {
      return { ok: false, duplicate: true, reason: 'DUPLICATE_EVENT' };
    }
  }

  let logDoc = null;
  try {
    logDoc = await EmailLog.create({
      eventKey,
      notificationKey,
      audience: meta.audience,
      recipientType,
      recipientName,
      recipientEmail: normalizedEmail,
      clientProfileId,
      trainerId,
      branchId,
      subject,
      messagePreview: text.slice(0, 240),
      status: 'PENDING',
      hasAttachments: safeAttachments.length > 0,
      attachmentNames: safeAttachments.map((a) => String(a.filename)),
    });
  } catch (err) {
    if (err.code === 11000 && eventKey) {
      return { ok: false, duplicate: true, reason: 'DUPLICATE_EVENT' };
    }
    throw err;
  }

  const dbSmtp = await smsService.getInternalSmtpConfig();
  const providerRes = await emailProviderService.sendEmail({
    to: normalizedEmail,
    recipientName,
    subject,
    html,
    text,
    attachments: safeAttachments,
    dbSmtp,
  });

  logDoc.attempts = providerRes.attempts || 1;
  logDoc.providerMessageId = providerRes.providerMessageId || '';
  logDoc.providerResponse = providerRes.providerResponse || '';

  if (providerRes.ok) {
    logDoc.status = providerRes.status === 'DELIVERED' ? 'DELIVERED' : 'SENT';
    logDoc.sentAt = new Date();
    if (logDoc.status === 'DELIVERED') logDoc.deliveredAt = new Date();
  } else {
    logDoc.status = 'FAILED';
    logDoc.failureReason = providerRes.failureReason || 'Email send failed';
  }
  await logDoc.save();

  return {
    ok: Boolean(providerRes.ok),
    status: logDoc.status,
    log: logDoc.toObject(),
  };
};

const listEmailLogs = async (query = {}) => {
  const filter = {};
  if (query.audience && query.audience !== 'ALL') filter.audience = query.audience;
  if (query.notificationKey && query.notificationKey !== 'ALL') filter.notificationKey = query.notificationKey;
  if (query.status && query.status !== 'ALL') filter.status = query.status;
  if (query.branchId && query.branchId !== 'ALL' && mongoose.Types.ObjectId.isValid(query.branchId)) {
    filter.branchId = query.branchId;
  }
  if (query.recipientType && query.recipientType !== 'ALL') {
    filter.recipientType = query.recipientType;
  }
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(`${String(query.from).slice(0, 10)}T00:00:00+05:30`);
    if (query.to) filter.createdAt.$lte = new Date(`${String(query.to).slice(0, 10)}T23:59:59.999+05:30`);
  }
  if (query.search && query.search.trim()) {
    const safe = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safe, 'i');
    filter.$or = [
      { recipientName: regex },
      { recipientEmail: regex },
      { subject: regex },
      { messagePreview: regex },
    ];
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [total, logs] = await Promise.all([
    EmailLog.countDocuments(filter),
    EmailLog.find(filter)
      .populate('branchId', 'name city')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    logs,
  };
};

const getEmailLogById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return EmailLog.findById(id).populate('branchId', 'name city').lean();
};

module.exports = {
  ensureEmailTemplatesSeeded,
  listEmailTemplates,
  updateEmailTemplate,
  previewEmailTemplate,
  renderEmailString,
  wrapInBrandedHtml,
  getOwnerEmailRecipient,
  sendEmailNotification,
  listEmailLogs,
  getEmailLogById,
};
