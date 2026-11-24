const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const trainerController = require('../controllers/trainerController');

// All routes require authentication and TRAINER or ADMIN role
router.use(protect);
router.use(authorize('TRAINER', 'ADMIN'));

// Dashboard Overview
router.get('/dashboard', trainerController.getDashboardOverview);

// My Clients & Client 360 Dossier
router.get('/clients', trainerController.getMyClients);
router.get('/clients/:clientId', trainerController.getClientDetails);
router.get('/clients/:clientId/progress', trainerController.getClientProgress);
router.post('/clients/:clientId/progress', trainerController.addClientProgressAssessment);
router.get('/clients/:clientId/workouts', trainerController.getClientWorkouts);
router.get('/clients/:clientId/attendance', trainerController.getClientAttendance);
router.get('/clients/:clientId/notes', trainerController.getClientNotes);
router.post('/clients/:clientId/notes', trainerController.createClientNote);

// Notes modification
router.put('/notes/:noteId', trainerController.updateClientNote);
router.delete('/notes/:noteId', trainerController.deleteClientNote);

// Workout Plans
router.get('/workouts', trainerController.getWorkoutPlans);
router.post('/workouts', trainerController.createWorkoutPlan);
router.get('/workouts/:workoutId', trainerController.getWorkoutPlanById);
router.put('/workouts/:workoutId', trainerController.updateWorkoutPlan);
router.post('/workouts/:workoutId/publish', trainerController.publishWorkoutPlan);
router.post('/workouts/:workoutId/duplicate', trainerController.duplicateWorkoutPlan);

// Exercises Library
router.get('/exercises', trainerController.getExercises);
router.post('/exercises', trainerController.createExercise);

// Scheduling & Appointments
router.get('/schedule', trainerController.getSchedule);
router.post('/schedule', trainerController.scheduleSession);
router.put('/schedule/:appointmentId', trainerController.updateScheduleSession);
router.patch('/schedule/:appointmentId/status', trainerController.updateSessionStatus);

// Sessions & Bookings
router.get('/sessions', trainerController.getSessions);
router.post('/sessions/complete', trainerController.completeSession);
router.get('/bookings', trainerController.getTrainerBookings);
router.put('/availability', trainerController.updateTrainerAvailability);

// Attendance
router.get('/attendance', trainerController.getAttendance);

// Notifications & Client Messaging
router.get('/notifications', trainerController.getNotifications);
router.patch('/notifications/read-all', trainerController.markAllNotificationsRead);
router.patch('/notifications/:id/read', trainerController.markNotificationRead);
router.post('/notifications/send-client', trainerController.sendClientNotification);

// Profile & Settings
router.get('/profile', trainerController.getProfile);
router.put('/profile', trainerController.updateProfile);
router.put('/change-password', trainerController.changePassword);

module.exports = router;
