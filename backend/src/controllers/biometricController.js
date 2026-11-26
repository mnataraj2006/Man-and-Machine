const biometricDeviceService = require('../services/biometricDeviceService');

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
};
