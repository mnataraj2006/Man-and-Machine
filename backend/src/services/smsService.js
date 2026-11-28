const mongoose = require('mongoose');
const SmsSettings = require('../models/SmsSettings');
const SmsTemplate = require('../models/SmsTemplate');
const SmsLog = require('../models/SmsLog');
const {
  MEMBER_NOTIFICATIONS,
  STAFF_NOTIFICATIONS,
  ALL_SMS_NOTIFICATIONS,
  SMS_CATALOG_MAP,
  defaultToggleMap,
} = require('../utils/smsCatalog');
const { normalizeIndianPhone } = require('../utils/phone');
const smsProviderService = require('./smsProviderService');
const emailProviderService = require('./emailProviderService');

const serializeMap = (val) => {
  if (!val) return {};
  if (val instanceof Map) return Object.fromEntries(val.entries());
  return { ...val };
};

const ensureTemplatesSeeded = async () => {
  const existing = await SmsTemplate.find({}).select('key').lean();
  const existingKeys = new Set(existing.map((t) => t.key));
  const missing = ALL_SMS_NOTIFICATIONS.filter((item) => !existingKeys.has(item.key)).map((item) => ({
    key: item.key,
    audience: item.audience,
    label: item.label,
    body: item.defaultBody,
    classification: item.classification || 'SERVICE_IMPLICIT',
    isActive: true,
  }));
  if (missing.length > 0) {
    await SmsTemplate.insertMany(missing, { ordered: false }).catch(() => {});
  }
};

const getOrCreateSettings = async () => {
  let doc = await SmsSettings.findOne({ scopeKey: 'GLOBAL' });
  if (!doc) {
    doc = await SmsSettings.create({
      scopeKey: 'GLOBAL',
      memberNotifications: defaultToggleMap(MEMBER_NOTIFICATIONS),
      staffNotifications: defaultToggleMap(STAFF_NOTIFICATIONS),
    });
  }
  await ensureTemplatesSeeded();

  const memberMap = { ...defaultToggleMap(MEMBER_NOTIFICATIONS), ...serializeMap(doc.memberNotifications) };
  const staffMap = { ...defaultToggleMap(STAFF_NOTIFICATIONS), ...serializeMap(doc.staffNotifications) };
  const emailMemberMap = {
    ...defaultToggleMap(MEMBER_NOTIFICATIONS),
    ...serializeMap(doc.emailMemberNotifications),
  };
  const emailStaffMap = {
    ...defaultToggleMap(STAFF_NOTIFICATIONS),
    ...serializeMap(doc.emailStaffNotifications),
  };
  const rawWithSecret = await SmsSettings.findOne({ scopeKey: 'GLOBAL' }).select('+smtpConfig.passwordEncrypted').lean();
  const dbSmtp = rawWithSecret?.smtpConfig || doc.smtpConfig || {};

  return {
    settings: {
      _id: doc._id,
      smsEnabled: doc.smsEnabled !== false,
      emailEnabled: Boolean(doc.emailEnabled),
      memberNotifications: memberMap,
      staffNotifications: staffMap,
      emailMemberNotifications: emailMemberMap,
      emailStaffNotifications: emailStaffMap,
      membershipExpiryNotificationDays: doc.membershipExpiryNotificationDays ?? 7,
      dailySummaryTime: doc.dailySummaryTime || '21:00',
      absentAlertDays: doc.absentAlertDays ?? 7,
      balancePreNotifyDays: doc.balancePreNotifyDays ?? 3,
      sessionPreNotifyMinutes: doc.sessionPreNotifyMinutes ?? 60,
      ownerName: doc.ownerName || 'Owner',
      ownerPhone: doc.ownerPhone || '',
      ownerEmail: doc.ownerEmail || '',
      dltConfig: {
        senderId: doc.dltConfig?.senderId || '',
        entityId: doc.dltConfig?.entityId || '',
        providerName: doc.dltConfig?.providerName || 'DLT_HTTP_GATEWAY',
      },
      smtpConfig: {
        host: dbSmtp.host || '',
        port: dbSmtp.port || 587,
        secure: Boolean(dbSmtp.secure),
        username: dbSmtp.username || '',
        hasPassword: Boolean(dbSmtp.passwordEncrypted),
        senderEmail: dbSmtp.senderEmail || '',
        senderName: dbSmtp.senderName || 'Man & Machine Fitness',
        replyTo: dbSmtp.replyTo || '',
      },
      updatedAt: doc.updatedAt,
    },
    catalog: {
      member: MEMBER_NOTIFICATIONS.map((m) => ({
        key: m.key,
        label: m.label,
        classification: m.classification,
        supported: m.supported !== false,
        unsupportedReason: m.unsupportedReason || '',
      })),
      staff: STAFF_NOTIFICATIONS.map((s) => ({
        key: s.key,
        label: s.label,
        recipientRole: s.recipientRole,
        classification: s.classification,
        supported: s.supported !== false,
        unsupportedReason: s.unsupportedReason || '',
      })),
    },
    provider: smsProviderService.getPublicProviderStatus(),
    emailProvider: emailProviderService.getPublicEmailProviderStatus(dbSmtp),
  };
};

const getInternalSmtpConfig = async () => {
  const doc = await SmsSettings.findOne({ scopeKey: 'GLOBAL' })
    .select('+smtpConfig.passwordEncrypted')
    .lean();
  return doc?.smtpConfig || {};
};

const updateSettings = async (payload = {}, adminUser = null) => {
  const { settings: current } = await getOrCreateSettings();
  const doc = await SmsSettings.findOne({ scopeKey: 'GLOBAL' }).select('+smtpConfig.passwordEncrypted');

  if (payload.smsEnabled !== undefined) {
    doc.smsEnabled = Boolean(payload.smsEnabled);
  }
  if (payload.emailEnabled !== undefined) {
    doc.emailEnabled = Boolean(payload.emailEnabled);
  }

  if (payload.memberNotifications && typeof payload.memberNotifications === 'object') {
    for (const item of MEMBER_NOTIFICATIONS) {
      if (payload.memberNotifications[item.key] !== undefined) {
        doc.memberNotifications.set(item.key, Boolean(payload.memberNotifications[item.key]));
      }
    }
  }

  if (payload.staffNotifications && typeof payload.staffNotifications === 'object') {
    for (const item of STAFF_NOTIFICATIONS) {
      if (payload.staffNotifications[item.key] !== undefined) {
        doc.staffNotifications.set(item.key, Boolean(payload.staffNotifications[item.key]));
      }
    }
  }

  if (payload.emailMemberNotifications && typeof payload.emailMemberNotifications === 'object') {
    for (const item of MEMBER_NOTIFICATIONS) {
      if (payload.emailMemberNotifications[item.key] !== undefined) {
        doc.emailMemberNotifications.set(item.key, Boolean(payload.emailMemberNotifications[item.key]));
      }
    }
  }

  if (payload.emailStaffNotifications && typeof payload.emailStaffNotifications === 'object') {
    for (const item of STAFF_NOTIFICATIONS) {
      if (payload.emailStaffNotifications[item.key] !== undefined) {
        doc.emailStaffNotifications.set(item.key, Boolean(payload.emailStaffNotifications[item.key]));
      }
    }
  }

  if (payload.membershipExpiryNotificationDays !== undefined) {
    const days = Number(payload.membershipExpiryNotificationDays);
    if (!Number.isInteger(days) || days < 1 || days > 90) {
      const err = new Error('Membership Expiry Notification Days must be an integer between 1 and 90.');
      err.statusCode = 400;
      throw err;
    }
    doc.membershipExpiryNotificationDays = days;
  }

  if (payload.dailySummaryTime !== undefined) {
    const timeStr = String(payload.dailySummaryTime).trim();
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr)) {
      const err = new Error('Daily Summary Time must be in HH:mm (24-hour) format.');
      err.statusCode = 400;
      throw err;
    }
    doc.dailySummaryTime = timeStr;
  }

  if (payload.absentAlertDays !== undefined) {
    const d = Number(payload.absentAlertDays);
    if (!Number.isInteger(d) || d < 1 || d > 60) {
      const err = new Error('Absent Alert Days must be between 1 and 60.');
      err.statusCode = 400;
      throw err;
    }
    doc.absentAlertDays = d;
  }

  if (payload.balancePreNotifyDays !== undefined) {
    const d = Number(payload.balancePreNotifyDays);
    if (!Number.isInteger(d) || d < 1 || d > 30) {
      const err = new Error('Balance Pre-Notification Days must be between 1 and 30.');
      err.statusCode = 400;
      throw err;
    }
    doc.balancePreNotifyDays = d;
  }

  if (payload.sessionPreNotifyMinutes !== undefined) {
    const m = Number(payload.sessionPreNotifyMinutes);
    if (!Number.isInteger(m) || m < 15 || m > 1440) {
      const err = new Error('Session Pre-Notification Minutes must be between 15 and 1440.');
      err.statusCode = 400;
      throw err;
    }
    doc.sessionPreNotifyMinutes = m;
  }

  if (payload.ownerName !== undefined) {
    doc.ownerName = String(payload.ownerName || '').trim() || 'Owner';
  }

  if (payload.ownerPhone !== undefined) {
    const rawPhone = String(payload.ownerPhone || '').trim();
    if (rawPhone) {
      const normalized = normalizeIndianPhone(rawPhone);
      if (!normalized) {
        const err = new Error('Owner Phone must be a valid 10-digit Indian mobile number.');
        err.statusCode = 400;
        throw err;
      }
      doc.ownerPhone = normalized;
    } else {
      doc.ownerPhone = '';
    }
  }

  if (payload.ownerEmail !== undefined) {
    const rawEmail = String(payload.ownerEmail || '').trim().toLowerCase();
    if (rawEmail && !emailProviderService.isValidEmail(rawEmail)) {
      const err = new Error('Owner Email must be a valid email address.');
      err.statusCode = 400;
      throw err;
    }
    doc.ownerEmail = rawEmail;
  }

  if (payload.dltConfig && typeof payload.dltConfig === 'object') {
    doc.dltConfig = {
      senderId: String(payload.dltConfig.senderId ?? current.dltConfig.senderId ?? '').trim().toUpperCase(),
      entityId: String(payload.dltConfig.entityId ?? current.dltConfig.entityId ?? '').trim(),
      providerName: String(payload.dltConfig.providerName ?? current.dltConfig.providerName ?? 'DLT_HTTP_GATEWAY').trim(),
    };
  }

  if (payload.smtpConfig && typeof payload.smtpConfig === 'object') {
    const portNum = Number(payload.smtpConfig.port ?? current.smtpConfig.port ?? 587);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      const err = new Error('SMTP port must be an integer between 1 and 65535.');
      err.statusCode = 400;
      throw err;
    }
    const senderEmail = String(
      payload.smtpConfig.senderEmail ?? current.smtpConfig.senderEmail ?? ''
    ).trim().toLowerCase();
    if (senderEmail && !emailProviderService.isValidEmail(senderEmail)) {
      const err = new Error('SMTP Sender Email must be a valid email address.');
      err.statusCode = 400;
      throw err;
    }
    const replyTo = String(payload.smtpConfig.replyTo ?? current.smtpConfig.replyTo ?? '').trim().toLowerCase();
    if (replyTo && !emailProviderService.isValidEmail(replyTo)) {
      const err = new Error('SMTP Reply-To must be a valid email address.');
      err.statusCode = 400;
      throw err;
    }
    let passwordEncrypted = doc.smtpConfig?.passwordEncrypted || '';
    if (payload.smtpConfig.clearPassword) {
      passwordEncrypted = '';
    } else if (payload.smtpConfig.password && String(payload.smtpConfig.password).trim() !== '') {
      passwordEncrypted = emailProviderService.encryptSecret(String(payload.smtpConfig.password));
    }

    doc.smtpConfig = {
      host: String(payload.smtpConfig.host ?? current.smtpConfig.host ?? '').trim(),
      port: portNum,
      secure: payload.smtpConfig.secure !== undefined ? Boolean(payload.smtpConfig.secure) : Boolean(current.smtpConfig.secure),
      username: String(payload.smtpConfig.username ?? current.smtpConfig.username ?? '').trim(),
      passwordEncrypted,
      senderEmail,
      senderName: String(payload.smtpConfig.senderName ?? current.smtpConfig.senderName ?? 'Man & Machine Fitness').trim() || 'Man & Machine Fitness',
      replyTo,
    };
  }

  doc.updatedBy = adminUser?._id || null;
  await doc.save();

  return getOrCreateSettings();
};

const listTemplates = async () => {
  await ensureTemplatesSeeded();
  return SmsTemplate.find({}).sort({ audience: 1, label: 1 }).lean();
};

const updateTemplate = async (key, payload = {}, adminUser = null) => {
  await ensureTemplatesSeeded();
  const template = await SmsTemplate.findOne({ key });
  if (!template) {
    const err = new Error(`SMS template "${key}" not found.`);
    err.statusCode = 404;
    throw err;
  }
  if (payload.body !== undefined) {
    const cleanBody = String(payload.body || '').trim();
    if (!cleanBody) {
      const err = new Error('Template body cannot be empty.');
      err.statusCode = 400;
      throw err;
    }
    template.body = cleanBody;
  }
  if (payload.dltTemplateId !== undefined) template.dltTemplateId = String(payload.dltTemplateId || '').trim();
  if (payload.senderId !== undefined) template.senderId = String(payload.senderId || '').trim().toUpperCase();
  if (payload.classification !== undefined && ['TRANSACTIONAL', 'SERVICE_IMPLICIT', 'SERVICE_EXPLICIT'].includes(payload.classification)) {
    template.classification = payload.classification;
  }
  if (payload.isActive !== undefined) template.isActive = Boolean(payload.isActive);
  template.updatedBy = adminUser?._id || null;
  await template.save();
  return template.toObject();
};

const listSmsLogs = async (query = {}) => {
  const filter = {};
  if (query.audience && query.audience !== 'ALL') filter.audience = query.audience;
  if (query.notificationKey && query.notificationKey !== 'ALL') filter.notificationKey = query.notificationKey;
  if (query.status && query.status !== 'ALL') filter.status = query.status;
  if (query.branchId && query.branchId !== 'ALL' && mongoose.Types.ObjectId.isValid(query.branchId)) {
    filter.branchId = query.branchId;
  }
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(`${String(query.from).slice(0, 10)}T00:00:00+05:30`);
    if (query.to) filter.createdAt.$lte = new Date(`${String(query.to).slice(0, 10)}T23:59:59.999+05:30`);
  }
  if (query.search && query.search.trim()) {
    const safe = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safe, 'i');
    filter.$or = [{ recipientName: regex }, { recipientPhone: regex }, { messagePreview: regex }];
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [total, logs] = await Promise.all([
    SmsLog.countDocuments(filter),
    SmsLog.find(filter)
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

const renderTemplate = (body, variables = {}) => {
  const rendered = String(body || '').replace(/\{\{(\w+)\}\}/g, (match, key) => {
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

const isNotificationEnabled = (settings, notificationKey) => {
  const meta = SMS_CATALOG_MAP.get(notificationKey);
  if (!meta) return false;
  if (meta.audience === 'MEMBER') {
    return settings.memberNotifications?.[notificationKey] === true;
  }
  return settings.staffNotifications?.[notificationKey] === true;
};

const sendNotification = async ({
  notificationKey,
  recipientPhone,
  recipientName = '',
  recipientType = 'MEMBER',
  clientProfileId = null,
  trainerId = null,
  branchId = null,
  variables = {},
  eventKey = undefined,
}) => {
  const meta = SMS_CATALOG_MAP.get(notificationKey);
  if (!meta) return { ok: false, skipped: true, reason: 'UNKNOWN_KEY' };
  if (meta.supported === false) return { ok: false, skipped: true, reason: 'UNSUPPORTED_NOTIFICATION' };

  const { settings } = await getOrCreateSettings();
  if (settings.smsEnabled === false) {
    return { ok: false, skipped: true, reason: 'GLOBAL_SMS_DISABLED' };
  }
  if (!isNotificationEnabled(settings, notificationKey)) {
    return { ok: false, skipped: true, reason: 'DISABLED' };
  }

  const normalizedPhone = normalizeIndianPhone(recipientPhone);
  const template = await SmsTemplate.findOne({ key: notificationKey }).lean();
  const templateBody = template?.body || meta.defaultBody;
  const effectiveSenderId = template?.senderId || settings.dltConfig?.senderId || '';
  const effectiveDltTemplateId = template?.dltTemplateId || '';
  const classification = template?.classification || meta.classification || 'SERVICE_IMPLICIT';

  if (template && template.isActive === false) {
    return { ok: false, skipped: true, reason: 'TEMPLATE_INACTIVE' };
  }

  if (!normalizedPhone) {
    try {
      const log = await SmsLog.create({
        eventKey,
        notificationKey,
        notificationLabel: meta.label,
        audience: meta.audience,
        recipientType,
        recipientName,
        recipientPhone: String(recipientPhone || '').trim(),
        clientProfileId,
        trainerId,
        branchId,
        status: 'FAILED',
        failureReason: 'Invalid or missing Indian mobile number.',
        failedAt: new Date(),
      });
      return { ok: false, reason: 'INVALID_PHONE', log };
    } catch (err) {
      if (err.code === 11000 && eventKey) return { ok: false, duplicate: true };
      throw err;
    }
  }

  let renderedMessage = '';
  try {
    renderedMessage = renderTemplate(templateBody, {
      ownerName: settings.ownerName || 'Owner',
      ...variables,
    });
  } catch (renderErr) {
    try {
      const log = await SmsLog.create({
        eventKey,
        notificationKey,
        notificationLabel: meta.label,
        audience: meta.audience,
        recipientType,
        recipientName,
        recipientPhone: normalizedPhone,
        clientProfileId,
        trainerId,
        branchId,
        status: 'FAILED',
        failureReason: renderErr.message,
        failedAt: new Date(),
      });
      return { ok: false, reason: 'UNRESOLVED_PLACEHOLDERS', log };
    } catch (err) {
      if (err.code === 11000 && eventKey) return { ok: false, duplicate: true };
      throw err;
    }
  }

  let logDoc;
  try {
    logDoc = await SmsLog.create({
      eventKey,
      notificationKey,
      notificationLabel: meta.label,
      audience: meta.audience,
      recipientType,
      recipientName,
      recipientPhone: normalizedPhone,
      clientProfileId,
      trainerId,
      branchId,
      messagePreview: renderedMessage.slice(0, 500),
      dltTemplateId: effectiveDltTemplateId,
      senderId: effectiveSenderId,
      classification,
      status: 'PENDING',
    });
  } catch (err) {
    if (err.code === 11000 && eventKey) {
      const existing = await SmsLog.findOne({ eventKey }).lean();
      return { ok: false, duplicate: true, log: existing };
    }
    throw err;
  }

  const providerRes = await smsProviderService.sendSms({
    to: normalizedPhone,
    message: renderedMessage,
    senderId: effectiveSenderId,
    dltTemplateId: effectiveDltTemplateId,
    dltEntityId: settings.dltConfig?.entityId || '',
    classification,
  });

  if (providerRes.ok) {
    logDoc.status = 'SENT';
    logDoc.sentAt = new Date();
    logDoc.providerMessageId = providerRes.providerMessageId || '';
    logDoc.providerResponse = providerRes.providerResponse || 'ACCEPTED';
  } else {
    logDoc.status = 'FAILED';
    logDoc.failedAt = new Date();
    logDoc.providerResponse = providerRes.providerResponse || '';
    logDoc.failureReason = providerRes.error || 'SMS delivery failed.';
  }
  await logDoc.save();

  return { ok: providerRes.ok, log: logDoc.toObject() };
};

const getOwnerRecipient = async () => {
  const { settings } = await getOrCreateSettings();
  return {
    ownerName: settings.ownerName || 'Owner',
    ownerPhone: settings.ownerPhone || process.env.OWNER_PHONE || '',
  };
};

const formatDateIN = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// ==========================================
// BUSINESS EVENT TRIGGERS
// ==========================================

const safeTrigger = (fn) => async (...args) => {
  try {
    return await fn(...args);
  } catch (err) {
    console.error('SMS trigger error:', err.message);
    return null;
  }
};

const triggerClientWelcome = safeTrigger(async ({ client, branch }) => {
  if (!client?._id) return;
  const branchName = branch?.city || branch?.name || 'Man & Machine';
  const vars = {
    memberName: client.name || 'Member',
    memberId: client.clientId || String(client._id).slice(-6),
    branchName,
  };
  await sendNotification({
    notificationKey: 'MEMBER_WELCOME_GREETINGS',
    recipientPhone: client.phone,
    recipientName: client.name,
    recipientType: 'MEMBER',
    clientProfileId: client._id,
    branchId: branch?._id || client.branchId,
    variables: vars,
    eventKey: `member-welcome:${client._id}`,
  });

  const { ownerName, ownerPhone } = await getOwnerRecipient();
  if (ownerPhone) {
    await sendNotification({
      notificationKey: 'STAFF_MEMBER_WELCOME_GREETINGS',
      recipientPhone: ownerPhone,
      recipientName: ownerName,
      recipientType: 'OWNER',
      clientProfileId: client._id,
      branchId: branch?._id || client.branchId,
      variables: { ...vars, ownerName },
      eventKey: `staff-welcome:${client._id}`,
    });
  }
});

const triggerMembershipPayment = safeTrigger(async ({ client, branch, membership, amount, uniqueRef }) => {
  if (!client?._id) return;
  const branchName = branch?.city || branch?.name || 'Man & Machine';
  const vars = {
    memberName: client.name || 'Member',
    memberId: client.clientId || String(client._id).slice(-6),
    membershipName: membership?.planName || 'Membership',
    paymentAmount: Number(amount || 0).toFixed(0),
    branchName,
  };
  const ref = uniqueRef || `${membership?._id || client._id}:${Date.now()}`;

  await sendNotification({
    notificationKey: 'MEMBER_MEMBERSHIP_PAYMENT',
    recipientPhone: client.phone,
    recipientName: client.name,
    recipientType: 'MEMBER',
    clientProfileId: client._id,
    branchId: branch?._id || client.branchId,
    variables: vars,
    eventKey: `member-payment:${ref}`,
  });

  const { ownerName, ownerPhone } = await getOwnerRecipient();
  if (ownerPhone) {
    await sendNotification({
      notificationKey: 'STAFF_MEMBERSHIP_PAYMENT',
      recipientPhone: ownerPhone,
      recipientName: ownerName,
      recipientType: 'OWNER',
      clientProfileId: client._id,
      branchId: branch?._id || client.branchId,
      variables: { ...vars, ownerName },
      eventKey: `staff-payment:${ref}`,
    });
  }
});

const triggerMembershipStatusChange = safeTrigger(async ({ client, branch, membership, status, actionRef = '' }) => {
  if (!client?._id || !membership?._id) return;
  const branchName = branch?.city || branch?.name || 'Man & Machine';
  const upper = String(status || membership.status || '').toUpperCase();

  let memberKey = null;
  let staffKey = null;
  if (upper === 'FROZEN') {
    memberKey = 'MEMBER_MEMBERSHIP_FREEZE';
    staffKey = 'STAFF_MEMBERSHIP_FREEZE';
  } else if (upper === 'PAUSED' || upper === 'SUSPENDED') {
    memberKey = 'MEMBER_MEMBERSHIP_SUSPENSION';
    staffKey = 'STAFF_MEMBERSHIP_SUSPENDED';
  } else if (upper === 'CANCELLED') {
    memberKey = 'MEMBER_MEMBERSHIP_CANCELLATION';
    staffKey = 'STAFF_MEMBERSHIP_CANCELLED';
  } else if (upper === 'DELETED') {
    memberKey = 'MEMBER_MEMBERSHIP_DELETION';
    staffKey = 'STAFF_MEMBERSHIP_DELETED';
  } else if (upper === 'ACTIVE') {
    memberKey = 'MEMBER_MEMBERSHIP_ACTIVATION';
    staffKey = 'STAFF_MEMBERSHIP_ACTIVATED';
  } else if (upper === 'GIFT_DAYS') {
    memberKey = 'MEMBER_GIVING_GIFT_DAYS';
    staffKey = 'STAFF_GIVING_GIFT_DAYS';
  } else if (upper === 'UPDATED') {
    staffKey = 'STAFF_UPDATE_MEMBERSHIP_INFO';
  }

  const vars = {
    memberName: client.name || 'Member',
    memberId: client.clientId || String(client._id).slice(-6),
    membershipName: membership.planName || 'Membership',
    expiryDate: formatDateIN(membership.expiryDate),
    branchName,
  };
  const suffix = actionRef || `${membership._id}:${upper}:${new Date().toISOString().slice(0, 16)}`;

  if (memberKey) {
    await sendNotification({
      notificationKey: memberKey,
      recipientPhone: client.phone,
      recipientName: client.name,
      recipientType: 'MEMBER',
      clientProfileId: client._id,
      branchId: branch?._id || membership.branchId,
      variables: vars,
      eventKey: `${memberKey}:${suffix}`,
    });
  }

  const { ownerName, ownerPhone } = await getOwnerRecipient();
  if (staffKey && ownerPhone) {
    await sendNotification({
      notificationKey: staffKey,
      recipientPhone: ownerPhone,
      recipientName: ownerName,
      recipientType: 'OWNER',
      clientProfileId: client._id,
      branchId: branch?._id || membership.branchId,
      variables: { ...vars, ownerName },
      eventKey: `${staffKey}:${suffix}`,
    });
  }
});

const triggerClientUpdated = safeTrigger(async ({ client, branch }) => {
  if (!client?._id) return;
  const { ownerName, ownerPhone } = await getOwnerRecipient();
  if (!ownerPhone) return;
  await sendNotification({
    notificationKey: 'STAFF_UPDATE_MEMBER_INFO',
    recipientPhone: ownerPhone,
    recipientName: ownerName,
    recipientType: 'OWNER',
    clientProfileId: client._id,
    branchId: branch?._id || client.branchId,
    variables: {
      ownerName,
      memberName: client.name || 'Member',
      memberId: client.clientId || String(client._id).slice(-6),
      branchName: branch?.city || branch?.name || 'Man & Machine',
    },
    eventKey: `staff-member-update:${client._id}:${new Date().toISOString().slice(0, 16)}`,
  });
});

const triggerTrainerAssigned = safeTrigger(async ({ client, branch, trainerUser, trainerPhone }) => {
  if (!client?._id || !trainerUser?._id) return;
  const branchName = branch?.city || branch?.name || 'Man & Machine';
  const vars = {
    memberName: client.name || 'Member',
    memberId: client.clientId || String(client._id).slice(-6),
    trainerName: trainerUser.name || 'Coach',
    branchName,
  };
  const stamp = `${client._id}:${trainerUser._id}:${new Date().toISOString().slice(0, 16)}`;

  await sendNotification({
    notificationKey: 'MEMBER_TRAINER_ASSIGN_ALERT',
    recipientPhone: client.phone,
    recipientName: client.name,
    recipientType: 'MEMBER',
    clientProfileId: client._id,
    trainerId: trainerUser._id,
    branchId: branch?._id || client.branchId,
    variables: vars,
    eventKey: `member-trainer-assign:${stamp}`,
  });

  const targetTrainerPhone = trainerPhone || trainerUser.phone || '';
  if (targetTrainerPhone) {
    await sendNotification({
      notificationKey: 'STAFF_TRAINER_ASSIGN_ALERT',
      recipientPhone: targetTrainerPhone,
      recipientName: trainerUser.name,
      recipientType: 'TRAINER',
      clientProfileId: client._id,
      trainerId: trainerUser._id,
      branchId: branch?._id || client.branchId,
      variables: vars,
      eventKey: `staff-trainer-assign:${stamp}`,
    });
  }
});

const triggerWorkoutAssigned = safeTrigger(async ({ client, branch, workoutPlanName, trainerName }) => {
  if (!client?._id) return;
  await sendNotification({
    notificationKey: 'MEMBER_ASSIGN_WORKOUT_PLAN',
    recipientPhone: client.phone,
    recipientName: client.name,
    recipientType: 'MEMBER',
    clientProfileId: client._id,
    branchId: branch?._id || client.branchId,
    variables: {
      memberName: client.name || 'Member',
      workoutPlan: workoutPlanName || 'Custom Workout Plan',
      trainerName: trainerName || 'Coach',
    },
    eventKey: `workout-assign:${client._id}:${new Date().toISOString().slice(0, 16)}`,
  });
});

const triggerManualAttendance = safeTrigger(async ({ client, branch, attendance }) => {
  if (!client?._id || !attendance?._id) return;
  const dt = attendance.checkInTime ? new Date(attendance.checkInTime) : new Date();
  await sendNotification({
    notificationKey: 'MEMBER_MANUAL_ATTENDANCE_ADDED',
    recipientPhone: client.phone,
    recipientName: client.name,
    recipientType: 'MEMBER',
    clientProfileId: client._id,
    branchId: branch?._id || attendance.branchId,
    variables: {
      memberName: client.name || 'Member',
      branchName: branch?.city || branch?.name || 'Man & Machine',
      sessionDate: formatDateIN(dt),
      sessionTime: dt.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
    },
    eventKey: `manual-attendance:${attendance._id}`,
  });
});

module.exports = {
  getOrCreateSettings,
  getInternalSmtpConfig,
  updateSettings,
  listTemplates,
  updateTemplate,
  listSmsLogs,
  renderTemplate,
  sendNotification,
  getOwnerRecipient,
  formatDateIN,
  triggerClientWelcome,
  triggerMembershipPayment,
  triggerMembershipStatusChange,
  triggerClientUpdated,
  triggerTrainerAssigned,
  triggerWorkoutAssigned,
  triggerManualAttendance,
};
