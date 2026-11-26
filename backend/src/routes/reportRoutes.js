const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Admin-only report endpoints
router.get('/summary', authorize('ADMIN'), reportController.getSummary);
router.get('/members', authorize('ADMIN'), reportController.getMembers);
router.get('/memberships', authorize('ADMIN'), reportController.getMemberships);
router.get('/attendance', authorize('ADMIN'), reportController.getAttendance);
router.get('/revenue', authorize('ADMIN'), reportController.getRevenue);
router.get('/payments', authorize('ADMIN'), reportController.getPayments);
router.get('/expenses', authorize('ADMIN'), reportController.getExpenses);
router.get('/leads', authorize('ADMIN'), reportController.getLeads);
router.get('/branches', authorize('ADMIN'), reportController.getBranches);

// Trainer reports: Admin sees all; Trainer is strictly scoped to own data in service layer
router.get('/trainers', authorize('ADMIN', 'TRAINER'), reportController.getTrainers);

module.exports = router;
