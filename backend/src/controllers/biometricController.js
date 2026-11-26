const biometricDeviceService = require('../services/biometricDeviceService');
const biometricEnrollmentService = require('../services/biometricEnrollmentService');

const getDevices = async (req, res, next) => {
  try {
    const data = await biometricDeviceService.getDevicesOverview(req.query);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const registerDevice = async (req, res, next) => {
  try {
    const device = await biometricDeviceService.registerDevice(req.body, req.user);
    res.status(201).json({
      success: true,
      message: `${device.manufacturer} ${device.model} registered successfully.`,
      device,
    });
  } catch (err) {
    next(err);
  }
};

const getDeviceDetails = async (req, res, next) => {
  try {
    const data = await biometricDeviceService.getDeviceDetails(req.params.id);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const updateDevice = async (req, res, next) => {
  try {
    const device = await biometricDeviceService.updateDevice(req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      message: 'Biometric device updated successfully.',
      device,
    });
  } catch (err) {
    next(err);
  }
};

const toggleDevice = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const device = await biometricDeviceService.toggleDeviceStatus(req.params.id, isActive, req.user);
    res.status(200).json({
      success: true,
      message: `Device ${device.isActive ? 'enabled' : 'disabled'} successfully.`,
      device,
    });
  } catch (err) {
    next(err);
  }
};

const testConnection = async (req, res, next) => {
  try {
    const result = await biometricDeviceService.testDeviceConnection(req.params.id, req.user);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const syncDevice = async (req, res, next) => {
  try {
    const result = await biometricDeviceService.syncDevice(req.params.id, req.user);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const mapUser = async (req, res, next) => {
  try {
    const mapping = await biometricDeviceService.mapBiometricUser(req.body, req.user);
    res.status(201).json({
      success: true,
      message: 'Biometric user mapped successfully.',
      mapping,
    });
  } catch (err) {
    next(err);
  }
};

const unmapUser = async (req, res, next) => {
  try {
    await biometricDeviceService.unmapBiometricUser(req.params.id, req.user);
    res.status(200).json({
      success: true,
      message: 'Biometric user mapping removed.',
    });
  } catch (err) {
    next(err);
  }
};

const getAttendance = async (req, res, next) => {
  try {
    const data = await biometricDeviceService.getBiometricAttendance(req.query);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const getEnrollmentOverview = async (req, res, next) => {
  try {
    const data = await biometricEnrollmentService.getEnrollmentOverview(req.query);
    res.status(200).json({ success: true, overview: data });
  } catch (err) {
    next(err);
  }
};

const listEnrollments = async (req, res, next) => {
  try {
    const data = await biometricEnrollmentService.listEnrollments(req.query);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const getEnrollmentDetails = async (req, res, next) => {
  try {
    const data = await biometricEnrollmentService.getEnrollmentDetails(req.params.id);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const completeManualEnrollment = async (req, res, next) => {
  try {
    const enrollment = await biometricEnrollmentService.completeManualEnrollment(
      { ...req.body, enrollmentId: req.params.id || req.body.enrollmentId },
      req.user
    );
    res.status(200).json({
      success: true,
      message: 'Biometric enrollment confirmed and mapped.',
      enrollment,
    });
  } catch (err) {
    next(err);
  }
};

const initiateRemoteEnrollment = async (req, res, next) => {
  try {
    const enrollment = await biometricEnrollmentService.initiateRemoteEnrollment(
      { ...req.body, enrollmentId: req.params.id || req.body.enrollmentId },
      req.user
    );
    res.status(200).json({
      success: true,
      message: 'Remote enrollment initiated. Waiting for device capture.',
      enrollment,
    });
  } catch (err) {
    next(err);
  }
};

const approveEnrollment = async (req, res, next) => {
  try {
    const enrollment = await biometricEnrollmentService.approveEnrollment(
      req.params.id,
      req.user,
      req.body
    );
    res.status(200).json({
      success: true,
      message: 'Enrollment approved and queued for physical device capture.',
      enrollment,
    });
  } catch (err) {
    next(err);
  }
};

const rejectEnrollment = async (req, res, next) => {
  try {
    const enrollment = await biometricEnrollmentService.rejectEnrollment(
      req.params.id,
      req.user,
      req.body
    );
    res.status(200).json({
      success: true,
      message: 'Enrollment request rejected.',
      enrollment,
    });
  } catch (err) {
    next(err);
  }
};

const analyzeMigration = async (req, res, next) => {
  try {
    const summary = await biometricEnrollmentService.analyzeMigration(req.body);
    res.status(200).json({ success: true, ...summary });
  } catch (err) {
    next(err);
  }
};

const getClientBiometricLogs = async (req, res, next) => {
  try {
    const logs = await biometricEnrollmentService.getClientBiometricLogs(req.params.clientId, req.query);
    res.status(200).json({ success: true, ...logs });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDevices,
  registerDevice,
  getDeviceDetails,
  updateDevice,
  toggleDevice,
  testConnection,
  syncDevice,
  mapUser,
  unmapUser,
  getAttendance,
  getEnrollmentOverview,
  listEnrollments,
  getEnrollmentDetails,
  getClientBiometricLogs,
  completeManualEnrollment,
  initiateRemoteEnrollment,
  approveEnrollment,
  rejectEnrollment,
  analyzeMigration,
};
