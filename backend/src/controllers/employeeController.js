const employeeService = require('../services/employeeService');
const attendanceNotificationService = require('../services/attendanceNotificationService');

const getNextEmployeeId = async (req, res, next) => {
  try {
    const nextEmployeeId = await employeeService.previewNextEmployeeId();
    res.status(200).json({ success: true, nextEmployeeId });
  } catch (err) {
    next(err);
  }
};

const getOverview = async (req, res, next) => {
  try {
    const overview = await employeeService.getEmployeeOverview(req.query, req.user);
    res.status(200).json({ success: true, ...overview });
  } catch (err) {
    next(err);
  }
};

const listEmployees = async (req, res, next) => {
  try {
    const data = await employeeService.listEmployees(req.query, req.user);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const getEmployeeById = async (req, res, next) => {
  try {
    const data = await employeeService.getEmployeeById(req.params.id, req.user);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const getEmployeeAttendance = async (req, res, next) => {
  try {
    const data = await employeeService.getEmployeeAttendance(req.params.id, req.query, req.user);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const createEmployee = async (req, res, next) => {
  try {
    const employee = await employeeService.createEmployee(req.body, req.file || null, req.user);
    res.status(201).json({
      success: true,
      message: 'Employee created successfully.',
      employee,
    });
  } catch (err) {
    next(err);
  }
};

const updateEmployee = async (req, res, next) => {
  try {
    const employee = await employeeService.updateEmployee(req.params.id, req.body, req.file || null, req.user);
    res.status(200).json({
      success: true,
      message: 'Employee updated successfully.',
      employee,
    });
  } catch (err) {
    next(err);
  }
};

const updateEmployeeBiometric = async (req, res, next) => {
  try {
    const employee = await employeeService.updateEmployeeBiometric(req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      message: 'Employee biometric mapping updated successfully.',
      employee,
    });
  } catch (err) {
    next(err);
  }
};

const deactivateEmployee = async (req, res, next) => {
  try {
    const employee = await employeeService.deactivateEmployee(req.params.id, req.body || {}, req.user);
    res.status(200).json({
      success: true,
      message: 'Employee deactivated safely. Historical attendance and biometric mapping preserved.',
      employee,
    });
  } catch (err) {
    next(err);
  }
};

const reactivateEmployee = async (req, res, next) => {
  try {
    const employee = await employeeService.reactivateEmployee(req.params.id, req.body || {}, req.user);
    res.status(200).json({
      success: true,
      message: 'Employee reactivated successfully.',
      employee,
    });
  } catch (err) {
    next(err);
  }
};

const listAttendanceNotifications = async (req, res, next) => {
  try {
    const data = await attendanceNotificationService.listAdminNotifications(req.user, req.query);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const markAttendanceNotificationRead = async (req, res, next) => {
  try {
    const data = await attendanceNotificationService.markAsRead(req.params.id, req.user);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const markAllAttendanceNotificationsRead = async (req, res, next) => {
  try {
    const data = await attendanceNotificationService.markAllAsRead(req.user);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const clearAttendanceNotifications = async (req, res, next) => {
  try {
    const data = await attendanceNotificationService.clearHistory(req.user);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getNextEmployeeId,
  getOverview,
  listEmployees,
  getEmployeeById,
  getEmployeeAttendance,
  createEmployee,
  updateEmployee,
  updateEmployeeBiometric,
  deactivateEmployee,
  reactivateEmployee,
  listAttendanceNotifications,
  markAttendanceNotificationRead,
  markAllAttendanceNotificationsRead,
  clearAttendanceNotifications,
};
