const express = require('express');
const router = express.Router();
const biometricController = require('../controllers/biometricController');
const { protect, authorize } = require('../middleware/authMiddleware');

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

module.exports = router;
