const express = require('express');
const router = express.Router();
const smsController = require('../controllers/smsController');

// Protected by protect + authorize('ADMIN') in adminRoutes.js
router.get('/settings', smsController.getSmsSettings);
router.put('/settings', smsController.updateSmsSettings);
router.get('/templates', smsController.listSmsTemplates);
router.put('/templates/:key', smsController.updateSmsTemplate);
router.get('/logs', smsController.listSmsLogs);
router.post('/scheduler/run', smsController.runScheduledPassNow);
router.post('/dlr', smsController.handleDeliveryReceipt);
router.post('/test', smsController.sendTestSms);

// Email Templates, Logs, SMTP Test & Delivery Receipts
router.get('/email/templates', smsController.listEmailTemplates);
router.put('/email/templates/:key', smsController.updateEmailTemplate);
router.post('/email/templates/:key/preview', smsController.previewEmailTemplate);
router.get('/email/logs', smsController.listEmailLogs);
router.get('/email/logs/:id', smsController.getEmailLogById);
router.post('/email/test-connection', smsController.testSmtpConnection);
router.post('/email/send-test', smsController.sendTestEmail);
router.post('/email/dlr', smsController.handleEmailDeliveryReceipt);

module.exports = router;
