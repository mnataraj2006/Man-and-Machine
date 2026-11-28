const smsService = require('../services/smsService');
const smsSchedulerService = require('../services/smsSchedulerService');
const smsProviderService = require('../services/smsProviderService');
const emailService = require('../services/emailService');
const emailProviderService = require('../services/emailProviderService');

const getSmsSettings = async (req, res, next) => {
  try {
    const data = await smsService.getOrCreateSettings();
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const updateSmsSettings = async (req, res, next) => {
  try {
    const data = await smsService.updateSettings(req.body, req.user);
    res.status(200).json({
      success: true,
      message: 'SMS notification settings saved.',
      ...data,
    });
  } catch (err) {
    next(err);
  }
};

const listSmsTemplates = async (req, res, next) => {
  try {
    const templates = await smsService.listTemplates();
    res.status(200).json({ success: true, templates });
  } catch (err) {
    next(err);
  }
};

const updateSmsTemplate = async (req, res, next) => {
  try {
    const template = await smsService.updateTemplate(req.params.key, req.body, req.user);
    res.status(200).json({
      success: true,
      message: 'SMS template updated.',
      template,
    });
  } catch (err) {
    next(err);
  }
};

const listSmsLogs = async (req, res, next) => {
  try {
    const data = await smsService.listSmsLogs(req.query);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const runScheduledPassNow = async (req, res, next) => {
  try {
    const summary = await smsSchedulerService.runScheduledSmsPass();
    res.status(200).json({ success: true, summary });
  } catch (err) {
    next(err);
  }
};

const handleDeliveryReceipt = async (req, res, next) => {
  try {
    const updated = await smsProviderService.processDeliveryReceipt(req.body || {});
    res.status(200).json({ success: true, log: updated });
  } catch (err) {
    next(err);
  }
};

const listEmailTemplates = async (req, res, next) => {
  try {
    const templates = await emailService.listEmailTemplates();
    res.status(200).json({ success: true, templates });
  } catch (err) {
    next(err);
  }
};

const updateEmailTemplate = async (req, res, next) => {
  try {
    const template = await emailService.updateEmailTemplate(req.params.key, req.body, req.user);
    res.status(200).json({
      success: true,
      message: 'Email template updated.',
      template,
    });
  } catch (err) {
    next(err);
  }
};

const previewEmailTemplate = async (req, res, next) => {
  try {
    const preview = await emailService.previewEmailTemplate(req.params.key, req.body || {});
    res.status(200).json({ success: true, preview });
  } catch (err) {
    next(err);
  }
};

const listEmailLogs = async (req, res, next) => {
  try {
    const data = await emailService.listEmailLogs(req.query);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const getEmailLogById = async (req, res, next) => {
  try {
    const log = await emailService.getEmailLogById(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Email log not found.' });
    }
    return res.status(200).json({ success: true, log });
  } catch (err) {
    return next(err);
  }
};

const testSmtpConnection = async (req, res, next) => {
  try {
    const dbSmtp = await smsService.getInternalSmtpConfig();
    const result = await emailProviderService.testSmtpConnection(dbSmtp);
    res.status(result.ok ? 200 : 400).json({ success: result.ok, ...result });
  } catch (err) {
    next(err);
  }
};

const sendTestEmail = async (req, res, next) => {
  try {
    const toEmail = String(req.body?.toEmail || req.user?.email || '').trim().toLowerCase();
    if (!emailProviderService.isValidEmail(toEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid recipient email address.' });
    }
    const dbSmtp = await smsService.getInternalSmtpConfig();
    const html = emailService.wrapInBrandedHtml({
      subject: 'Man & Machine SMTP Test Email',
      bodyText: 'This is a test email from Man & Machine HRMS Communication Settings.\nIf you received this message, your SMTP settings are working.',
      branchName: 'System Test',
    });
    const result = await emailProviderService.sendEmail({
      to: toEmail,
      recipientName: req.user?.name || 'Admin',
      subject: 'Man & Machine SMTP Test Email',
      html,
      text: 'This is a test email from Man & Machine HRMS Communication Settings.',
      dbSmtp,
    });
    return res.status(result.ok ? 200 : 400).json({
      success: Boolean(result.ok),
      status: result.status,
      providerMessageId: result.providerMessageId,
      providerResponse: result.providerResponse,
      failureReason: result.failureReason,
      message: result.ok
        ? `Test email accepted for ${toEmail} (Status: ${result.status}). Delivery depends on the recipient mail server.`
        : result.failureReason || 'Test email failed.',
    });
  } catch (err) {
    return next(err);
  }
};

const handleEmailDeliveryReceipt = async (req, res, next) => {
  try {
    const updated = await emailProviderService.processEmailDeliveryReceipt(req.body || {});
    res.status(200).json({ success: true, log: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSmsSettings,
  updateSmsSettings,
  listSmsTemplates,
  updateSmsTemplate,
  listSmsLogs,
  runScheduledPassNow,
  handleDeliveryReceipt,
  listEmailTemplates,
  updateEmailTemplate,
  previewEmailTemplate,
  listEmailLogs,
  getEmailLogById,
  testSmtpConnection,
  sendTestEmail,
  handleEmailDeliveryReceipt,
};
