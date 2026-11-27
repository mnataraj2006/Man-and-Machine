const biometricDeviceService = require('../services/biometricDeviceService');
const biometricEnrollmentService = require('../services/biometricEnrollmentService');

const getScopedQuery = (req) => {
  const adminBranch = req.user?.branchId?._id || req.user?.branchId;
  if (!adminBranch) return req.query;
  return { ...req.query, branchId: String(adminBranch) };
};

const getDevices = async (req, res, next) => {
  try {
    const data = await biometricDeviceService.getDevicesOverview(getScopedQuery(req));
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const registerDevice = async (req, res, next) => {
  try {
    biometricDeviceService.assertAdminBranchAccess(req.user, req.body?.branchId);
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
    biometricDeviceService.assertAdminBranchAccess(req.user, data.device?.branchId?._id || data.device?.branchId);
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
    const data = await biometricDeviceService.getBiometricAttendance(getScopedQuery(req));
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const getEnrollmentOverview = async (req, res, next) => {
  try {
    const data = await biometricEnrollmentService.getEnrollmentOverview(getScopedQuery(req));
    res.status(200).json({ success: true, overview: data });
  } catch (err) {
    next(err);
  }
};

const listEnrollments = async (req, res, next) => {
  try {
    const data = await biometricEnrollmentService.listEnrollments(getScopedQuery(req));
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const getEnrollmentDetails = async (req, res, next) => {
  try {
    const data = await biometricEnrollmentService.getEnrollmentDetails(req.params.id);
    biometricDeviceService.assertAdminBranchAccess(req.user, data.enrollment?.branchId?._id || data.enrollment?.branchId);
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

const initiatePhysicalEnrollment = async (req, res, next) => {
  try {
    const enrollment = await biometricEnrollmentService.initiatePhysicalEnrollment(req.body, req.user);
    res.status(200).json({
      success: true,
      message: 'Physical biometric enrollment request queued. Capture face on the X2008 terminal to complete.',
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
    const summary = await biometricEnrollmentService.analyzeMigration(req.body, req.user);
    res.status(200).json({ success: true, ...summary });
  } catch (err) {
    next(err);
  }
};

const getMigrationPreview = async (req, res, next) => {
  try {
    const data = await biometricEnrollmentService.getMigrationPreview(req.query, req.user);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const bulkMapMigration = async (req, res, next) => {
  try {
    const data = await biometricEnrollmentService.bulkMapDiscoveredUsers(req.body, req.user);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const getDeviceCommands = async (req, res, next) => {
  try {
    const data = await biometricDeviceService.getDeviceCommands(req.params.id, req.query, req.user);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const queueDeviceCommand = async (req, res, next) => {
  try {
    const command = await biometricDeviceService.queueDeviceCommand(req.params.id, req.body, req.user);
    res.status(201).json({
      success: true,
      message: `Read-only command ${command.commandType} queued for device.`,
      command,
    });
  } catch (err) {
    next(err);
  }
};

const cancelDeviceCommand = async (req, res, next) => {
  try {
    const command = await biometricDeviceService.cancelDeviceCommand(req.params.commandId, req.user);
    res.status(200).json({ success: true, message: 'Device command cancelled.', command });
  } catch (err) {
    next(err);
  }
};

const getClientBiometricLogs = async (req, res, next) => {
  try {
    const logs = await biometricEnrollmentService.getClientBiometricLogs(req.params.clientId, getScopedQuery(req));
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
  initiatePhysicalEnrollment,
  initiateRemoteEnrollment,
  approveEnrollment,
  rejectEnrollment,
  analyzeMigration,
  getMigrationPreview,
  bulkMapMigration,
  getDeviceCommands,
  queueDeviceCommand,
  cancelDeviceCommand,
};
