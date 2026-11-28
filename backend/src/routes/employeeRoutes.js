const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { handleTrainerPhotoUpload } = require('../services/trainerPhotoService');

// All routes here are already protected by protect + authorize('ADMIN') in adminRoutes.js
router.get('/next-id', employeeController.getNextEmployeeId);
router.get('/overview', employeeController.getOverview);
router.get('/', employeeController.listEmployees);
router.post('/', handleTrainerPhotoUpload, employeeController.createEmployee);
router.get('/:id', employeeController.getEmployeeById);
router.get('/:id/attendance', employeeController.getEmployeeAttendance);
router.put('/:id', handleTrainerPhotoUpload, employeeController.updateEmployee);
router.put('/:id/biometric', employeeController.updateEmployeeBiometric);
router.patch('/:id/deactivate', employeeController.deactivateEmployee);
router.patch('/:id/reactivate', employeeController.reactivateEmployee);

module.exports = router;
