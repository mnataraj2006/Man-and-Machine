const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { createRateLimiter } = require('../middleware/rateLimitMiddleware');

const clientBioLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyPrefix: 'bio-client',
  message: 'Too many biometric requests. Please wait a moment.',
});

const clientCaptureLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyPrefix: 'bio-capture',
  message: 'Too many capture attempts. Please wait a minute and try again.',
});

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
router.get('/membership/plans', clientController.getAvailableMembershipPlans);
router.post('/membership/checkout', clientController.checkoutMembership);
router.post('/membership/purchase', clientController.purchaseMembership);
router.post('/membership/renewal-request', clientController.requestMembershipRenewal);

// 7. Payments
router.get('/payments', clientController.getPayments);

// 8. Trainer & Coaching Discovery
router.get('/trainer', clientController.getTrainer);
router.get('/trainers', clientController.getAvailableTrainers);
router.get('/trainers/:trainerId', clientController.getTrainerPublicProfile);
router.get('/trainers/:trainerId/availability', clientController.getTrainerAvailability);
router.post('/trainers/:trainerId/book', clientController.bookTrainerSession);
router.get('/my-trainer-bookings', clientController.getClientBookings);

// 9. Notifications
router.get('/notifications', clientController.getNotifications);
router.put('/notifications/:id/read', clientController.markNotificationAsRead);
router.put('/notifications/read-all', clientController.markAllNotificationsAsRead);

// 10. Settings
router.put('/settings/password', clientController.changePassword);

// 11. Biometric Self-Enrollment
router.get('/biometric/status', clientBioLimiter, clientController.getBiometricStatus);
router.post('/biometric/consent', authorize('CLIENT'), clientBioLimiter, clientController.recordBiometricConsent);
router.post('/biometric/consent/withdraw', authorize('CLIENT'), clientBioLimiter, clientController.withdrawBiometricConsent);
router.post('/biometric/capture', clientCaptureLimiter, clientController.submitBiometricCapture);

module.exports = router;
