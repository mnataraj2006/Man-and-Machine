const express = require('express');
const router = express.Router();
const biometricController = require('../controllers/biometricController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { createRateLimiter } = require('../middleware/rateLimitMiddleware');

router.use(
  createRateLimiter({
    windowMs: 60 * 1000,
    max: 120,
    keyPrefix: 'bio-admin',
    message: 'Too many biometric management requests. Please slow down.',
  })
);
router.use(protect, authorize('ADMIN'));

router.get('/devices', biometricController.getDevices);
router.post('/devices', biometricController.registerDevice);
router.get('/devices/:id', biometricController.getDeviceDetails);
router.put('/devices/:id', biometricController.updateDevice);
router.patch('/devices/:id/toggle', biometricController.toggleDevice);
router.post('/devices/:id/test-connection', biometricController.testConnection);
router.post('/devices/:id/sync', biometricController.syncDevice);

router.post('/mappings', biometricController.mapUser);
router.delete('/mappings/:id', biometricController.unmapUser);

router.get('/attendance', biometricController.getAttendance);
router.get('/clients/:clientId/logs', biometricController.getClientBiometricLogs);

// Enrollment & Migration endpoints
router.get('/enrollments/overview', biometricController.getEnrollmentOverview);
router.get('/enrollments', biometricController.listEnrollments);
router.get('/enrollments/:id', biometricController.getEnrollmentDetails);
router.post('/enrollments/manual', biometricController.completeManualEnrollment);
router.post('/enrollments/physical-request', biometricController.initiatePhysicalEnrollment);
router.post('/enrollments/:id/manual-complete', biometricController.completeManualEnrollment);
router.post('/enrollments/:id/remote-enroll', biometricController.initiateRemoteEnrollment);
router.post('/enrollments/remote-enroll', biometricController.initiateRemoteEnrollment);
router.post('/enrollments/:id/approve', biometricController.approveEnrollment);
router.post('/enrollments/:id/reject', biometricController.rejectEnrollment);
router.post('/enrollments/:id/retry-sync', biometricController.retryEnrollmentSync);
router.post('/migration/analyze', biometricController.analyzeMigration);
router.get('/migration/preview', biometricController.getMigrationPreview);
router.post('/migration/bulk-map', biometricController.bulkMapMigration);

router.get('/devices/:id/commands', biometricController.getDeviceCommands);
router.post('/devices/:id/commands', biometricController.queueDeviceCommand);
router.post('/commands/:commandId/cancel', biometricController.cancelDeviceCommand);

module.exports = router;
