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

module.exports = router;
