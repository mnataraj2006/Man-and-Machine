const accessControllerService = require('../services/accessControllerService');

const listControllers = async (req, res, next) => {
  try {
    const data = await accessControllerService.listControllers(req.user, req.query);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const registerController = async (req, res, next) => {
  try {
    const controller = await accessControllerService.registerController(req.body, req.user);
    res.status(201).json({ success: true, controller });
  } catch (err) {
    next(err);
  }
};

const updateController = async (req, res, next) => {
  try {
    const controller = await accessControllerService.updateController(req.params.id, req.body, req.user);
    res.status(200).json({ success: true, controller });
  } catch (err) {
    next(err);
  }
};

const toggleController = async (req, res, next) => {
  try {
    const controller = await accessControllerService.toggleController(
      req.params.id,
      req.body?.isEnabled,
      req.user
    );
    res.status(200).json({ success: true, controller });
  } catch (err) {
    next(err);
  }
};

const testControllerConnection = async (req, res, next) => {
  try {
    const result = await accessControllerService.testControllerConnection(req.params.id, req.user);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const authorizeControllerAccess = async (req, res, next) => {
  try {
    const result = await accessControllerService.authorizeControllerAccess({
      controllerId: req.params.id,
      clientProfileId: req.body?.clientProfileId,
      commandId: req.body?.commandId,
      biometricDeviceId: req.body?.biometricDeviceId || null,
      biometricUserId: req.body?.biometricUserId || '',
      actorUser: req.user,
    });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const listControllerEvents = async (req, res, next) => {
  try {
    const data = await accessControllerService.listControllerEvents(req.params.id, req.user, req.query);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listControllers,
  registerController,
  updateController,
  toggleController,
  testControllerConnection,
  authorizeControllerAccess,
  listControllerEvents,
};
