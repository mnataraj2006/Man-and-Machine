const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All client endpoints require authentication and CLIENT role
router.use(protect);
router.use(authorize('CLIENT', 'ADMIN')); // Allow ADMIN to preview if needed

// 1. Dashboard
router.get('/dashboard', clientController.getDashboardSummary);

// 2. Profile
router.get('/profile', clientController.getClientProfile);
router.put('/profile', clientController.updateClientProfile);

// 3. Workouts
router.get('/workouts', clientController.getClientWorkouts);
router.get('/workouts/:id', clientController.getWorkoutById);
router.post('/workouts/:id/sessions', clientController.logWorkoutSession);
router.get('/workout-sessions', clientController.getWorkoutSessions);

// 4. Attendance
router.get('/attendance', clientController.getAttendance);

// 5. Progress Records
router.get('/progress', clientController.getProgress);
router.post('/progress', clientController.addProgressRecord);

// 6. Membership
router.get('/membership', clientController.getMembership);
router.post('/membership/renewal-request', clientController.requestMembershipRenewal);

// 7. Payments
router.get('/payments', clientController.getPayments);

// 8. Trainer
router.get('/trainer', clientController.getTrainer);

// 9. Notifications
router.get('/notifications', clientController.getNotifications);
router.put('/notifications/:id/read', clientController.markNotificationAsRead);
router.put('/notifications/read-all', clientController.markAllNotificationsAsRead);

// 10. Settings
router.put('/settings/password', clientController.changePassword);

module.exports = router;
