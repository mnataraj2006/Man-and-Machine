const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

// All admin routes require valid token and ADMIN role
router.use(protect);
router.use(authorize('ADMIN'));

// 1. Dashboard & KPIs
router.get('/dashboard', adminController.getDashboardOverview);

// 2. Branch Management
router.get('/branches', adminController.getBranches);
router.post('/branches', adminController.createBranch);
router.get('/branches/:id', adminController.getBranchDetails);
router.put('/branches/:id', adminController.updateBranch);
router.put('/branches/:id/toggle', adminController.toggleBranchStatus);

// 3. Client Management
router.get('/clients', adminController.getClients);
router.post('/clients', adminController.createClient);
router.get('/clients/:id', adminController.getClientDetails);
router.put('/clients/:id', adminController.updateClient);
router.put('/clients/:id/status', adminController.updateClientStatus);
router.put('/clients/:id/assign-trainer', adminController.assignTrainer);
router.put('/clients/:id/change-branch', adminController.changeClientBranch);
router.put('/clients/:id/reset-password', adminController.resetClientPassword);

// 4. Trainer Management
router.get('/trainers', adminController.getTrainers);
router.post('/trainers', adminController.createTrainer);
router.get('/trainers/:id', adminController.getTrainerDetails);
router.put('/trainers/:id', adminController.updateTrainer);
router.patch('/trainers/:id/status', adminController.updateTrainerStatus);
router.post('/trainers/:id/resend-invitation', adminController.resendTrainerInvitation);
router.post('/trainers/:id/reset-password', adminController.resetTrainerPassword);
router.delete('/trainers/:id', adminController.deleteTrainer);
router.get('/trainer-bookings', adminController.getTrainerBookings);
router.post('/trainer-bookings/:id/confirm-payment', adminController.confirmTrainerBookingPayment);

// 5. Membership Management
router.get('/membership-plans', adminController.getMembershipPlans);
router.post('/membership-plans', adminController.createMembershipPlan);
router.get('/membership-plans/:id', adminController.getMembershipPlanById);
router.put('/membership-plans/:id', adminController.updateMembershipPlan);
router.patch('/membership-plans/:id/status', adminController.toggleMembershipPlanStatus);
router.post('/membership-plans/:id/duplicate', adminController.duplicateMembershipPlan);
router.delete('/membership-plans/:id', adminController.deleteMembershipPlan);
router.get('/memberships', adminController.getClientMemberships);
router.post('/memberships', adminController.createClientMembership);
router.put('/memberships/:id/status', adminController.updateClientMembershipStatus);

// 6. Attendance Management
router.get('/attendance', adminController.getAttendanceOverview);
router.post('/attendance', adminController.recordAttendance);
router.put('/attendance/:id', adminController.correctAttendanceRecord);

// 7. Workout Management
router.get('/exercises', adminController.getExercises);
router.post('/exercises', adminController.createExercise);
router.get('/workouts/templates', adminController.getWorkoutTemplates);
router.post('/workouts/templates', adminController.createWorkoutTemplate);
router.post('/workouts/assign', adminController.assignWorkoutToClient);

// 8. Payments & Finance
router.get('/payments/overview', adminController.getFinancialOverview);
router.get('/payments', adminController.getPayments);
router.post('/payments/offline', adminController.recordOfflinePayment);
router.put('/payments/:id/status', adminController.updatePaymentStatus);

// 9. Reports & Analytics
router.get('/reports', adminController.getReportsData);

// 10. Notifications & Announcements
router.get('/notifications/announcements', adminController.getAnnouncements);
router.post('/notifications/announcements', adminController.createAnnouncement);

// 11. Enquiries & Lead Management
router.get('/enquiries', adminController.getEnquiries);
router.post('/enquiries', adminController.createEnquiry);
router.put('/enquiries/:id', adminController.updateEnquiry);
router.post('/enquiries/:id/convert', adminController.convertEnquiryToClient);

// 12. Settings
router.get('/settings', adminController.getSettings);
router.put('/settings/password', adminController.changeAdminPassword);

module.exports = router;
