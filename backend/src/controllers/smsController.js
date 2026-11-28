const smsService = require('../services/smsService');
const smsSchedulerService = require('../services/smsSchedulerService');
const smsProviderService = require('../services/smsProviderService');

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

module.exports = {
  getSmsSettings,
  updateSmsSettings,
  listSmsTemplates,
  updateSmsTemplate,
  listSmsLogs,
  runScheduledPassNow,
  handleDeliveryReceipt,
};
