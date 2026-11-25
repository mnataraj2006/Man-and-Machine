const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const financeController = require('../controllers/financeController');

// Strict defense-in-depth: every Finance endpoint requires authenticated ADMIN role
router.use(protect);
router.use(authorize('ADMIN'));

// Summary
router.get('/summary', financeController.getSummary);

// Invoices
router.get('/invoices', financeController.getInvoices);
router.get('/invoices/today', financeController.getTodayInvoices);
router.get('/invoices/:id', financeController.getInvoiceById);
router.post('/invoices', financeController.createInvoice);
router.post('/invoices/:id/payments', financeController.recordInvoicePayment);
router.patch('/invoices/:id/cancel', financeController.cancelInvoice);
router.patch('/invoices/:id/refund', financeController.refundInvoice);
router.post('/invoices/:id/reminder', financeController.sendInvoiceReminder);

// Receipts
router.get('/payments/:id/receipt', financeController.getPaymentReceipt);

// Collections
router.get('/collections/daily', financeController.getDailyCollections);
router.get('/collections/monthly', financeController.getMonthlyCollections);

// Expenses
router.get('/expenses', financeController.getExpenses);
router.post('/expenses', financeController.createExpense);
router.put('/expenses/:id', financeController.updateExpense);
router.patch('/expenses/:id/cancel', financeController.cancelExpense);

// Finance Config
router.get('/config', financeController.getConfig);
router.put('/config', financeController.updateConfig);

module.exports = router;
