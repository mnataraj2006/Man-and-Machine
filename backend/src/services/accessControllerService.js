const crypto = require('crypto');
const mongoose = require('mongoose');
const AccessController = require('../models/AccessController');
const AccessControlEvent = require('../models/AccessControlEvent');
const ClientProfile = require('../models/ClientProfile');
const { evaluateFacilityAccessEligibility } = require('./membershipEligibilityService');
const {
  ADAPTER_CATALOG,
  HARDWARE_DISCOVERY_CHECKLIST,
  createAdapterForController,
} = require('./accessControllers/adapterRegistry');

const getEncryptionKey = () => {
  const secret = process.env.ACCESS_CONTROLLER_SECRET || process.env.JWT_SECRET || 'mm-dev-controller-key';
  return crypto.createHash('sha256').update(String(secret)).digest();
};

const encryptCredentials = (credsObj) => {
  if (!credsObj || typeof credsObj !== 'object' || Object.keys(credsObj).length === 0) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const plaintext = JSON.stringify(credsObj);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
};

const decryptCredentials = (payload) => {
  if (!payload || typeof payload !== 'string' || !payload.includes(':')) return {};
  try {
    const [ivHex, tagHex, dataHex] = payload.split(':');
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getEncryptionKey(),
      Buffer.from(ivHex, 'hex')
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch {
    return {};
  }
};

const sanitizeControllerForResponse = (doc) => {
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  delete obj.encryptedCredentials;
  return obj;
};

const assertBranchScope = (adminUser, targetBranchId) => {
  const adminBranch = adminUser?.branchId?._id || adminUser?.branchId;
  if (!adminBranch || !targetBranchId) return;
  if (String(adminBranch) !== String(targetBranchId)) {
    const err = new Error('Access denied: controller belongs to a different branch.');
    err.statusCode = 403;
    throw err;
  }
};

const listControllers = async (adminUser, { branchId = 'ALL' } = {}) => {
  const filter = {};
  const adminBranch = adminUser?.branchId?._id || adminUser?.branchId;
  if (adminBranch) {
    filter.branchId = adminBranch;
  } else if (branchId && branchId !== 'ALL' && mongoose.Types.ObjectId.isValid(branchId)) {
    filter.branchId = branchId;
  }

  const controllers = await AccessController.find(filter)
    .populate('branchId', 'name city code')
    .sort({ createdAt: -1 })
    .lean();

  return {
    controllers: controllers.map(sanitizeControllerForResponse),
    adapterCatalog: ADAPTER_CATALOG,
    hardwareDiscoveryChecklist: HARDWARE_DISCOVERY_CHECKLIST,
  };
};

const registerController = async (payload, adminUser) => {
  const {
    branchId,
    name,
    doorName,
    adapterType = 'MOCK',
    manufacturer = 'Unknown',
    model = 'Unknown',
    connectionConfig = {},
    credentials = null,
    isEnabled = false,
  } = payload;

  if (!branchId || !mongoose.Types.ObjectId.isValid(branchId)) {
    const err = new Error('Valid branchId is required.');
    err.statusCode = 400;
    throw err;
  }
  assertBranchScope(adminUser, branchId);

  const encryptedCredentials = encryptCredentials(credentials);
  const tempController = { adapterType, connectionConfig };
  const adapter = createAdapterForController(tempController, credentials || {});
  const capabilities = adapter.getCapabilities();

  if (isEnabled && !capabilities.implemented) {
    const err = new Error(
      `Adapter "${adapterType}" is not yet implemented for live hardware. Keep disabled until vendor protocol is integrated.`
    );
    err.statusCode = 400;
    throw err;
  }

  const doc = await AccessController.create({
    branchId,
    name,
    doorName,
    adapterType,
    manufacturer,
    model,
    connectionConfig,
    encryptedCredentials,
    hasCredentials: Boolean(encryptedCredentials),
    capabilities,
    isEnabled: Boolean(isEnabled),
    status: isEnabled ? 'UNCONFIGURED' : 'DISABLED',
  });

  return sanitizeControllerForResponse(doc);
};

const updateController = async (id, payload, adminUser) => {
  const doc = await AccessController.findById(id).select('+encryptedCredentials');
  if (!doc) {
    const err = new Error('Access controller not found.');
    err.statusCode = 404;
    throw err;
  }
  assertBranchScope(adminUser, doc.branchId);

  if (payload.name !== undefined) doc.name = payload.name;
  if (payload.doorName !== undefined) doc.doorName = payload.doorName;
  if (payload.manufacturer !== undefined) doc.manufacturer = payload.manufacturer;
  if (payload.model !== undefined) doc.model = payload.model;
  if (payload.adapterType !== undefined) doc.adapterType = payload.adapterType;
  if (payload.connectionConfig !== undefined) {
    doc.connectionConfig = { ...(doc.connectionConfig || {}), ...payload.connectionConfig };
  }
  if (payload.credentials && Object.keys(payload.credentials).length > 0) {
    doc.encryptedCredentials = encryptCredentials(payload.credentials);
    doc.hasCredentials = true;
  }

  const adapter = createAdapterForController(doc, decryptCredentials(doc.encryptedCredentials));
  doc.capabilities = adapter.getCapabilities();

  if (payload.isEnabled !== undefined) {
    if (payload.isEnabled && !doc.capabilities.implemented) {
      const err = new Error(`Adapter "${doc.adapterType}" cannot be enabled without vendor protocol implementation.`);
      err.statusCode = 400;
      throw err;
    }
    doc.isEnabled = Boolean(payload.isEnabled);
    if (!doc.isEnabled) doc.status = 'DISABLED';
  }

  await doc.save();
  return sanitizeControllerForResponse(doc);
};

const toggleController = async (id, isEnabled, adminUser) => {
  return updateController(id, { isEnabled: Boolean(isEnabled) }, adminUser);
};

const testControllerConnection = async (id, adminUser) => {
  const doc = await AccessController.findById(id).select('+encryptedCredentials');
  if (!doc) {
    const err = new Error('Access controller not found.');
    err.statusCode = 404;
    throw err;
  }
  assertBranchScope(adminUser, doc.branchId);

  const credentials = decryptCredentials(doc.encryptedCredentials);
  const adapter = createAdapterForController(doc, credentials);
  const capabilities = adapter.getCapabilities();
  doc.capabilities = capabilities;

  if (!capabilities.implemented || !capabilities.supportsHealthCheck) {
    doc.lastHealthCheckAt = new Date();
    doc.status = doc.isEnabled ? 'DEGRADED' : 'DISABLED';
    doc.lastError = `Adapter "${doc.adapterType}" does not support live health checks yet.`;
    await doc.save();
    return {
      healthy: false,
      capabilities,
      controller: sanitizeControllerForResponse(doc),
      message: doc.lastError,
    };
  }

  try {
    const health = await adapter.healthCheck();
    doc.lastHealthCheckAt = new Date();
    doc.lastLatencyMs = health.latencyMs || null;
    doc.lastError = '';
    doc.status = doc.isEnabled ? 'ONLINE' : 'DISABLED';
    await doc.save();
    return {
      healthy: true,
      health,
      capabilities,
      controller: sanitizeControllerForResponse(doc),
    };
  } catch (err) {
    doc.lastHealthCheckAt = new Date();
    doc.lastError = err.message;
    doc.status = err.code === 'CONTROLLER_OFFLINE' ? 'OFFLINE' : 'DEGRADED';
    await doc.save();
    return {
      healthy: false,
      error: err.message,
      code: err.code || 'HEALTH_CHECK_FAILED',
      capabilities,
      controller: sanitizeControllerForResponse(doc),
    };
  }
};

/**
 * Authoritative, fail-closed unlock authorization pipeline.
 * 1. Prevents replay/duplicate commandId.
 * 2. Enforces branch authorization & enabled controller state.
 * 3. Evaluates centralized membership + biometric eligibility.
 * 4. Only ALLOWED proceeds to adapter.authorizeAccess(); never treats ack as physical unlock proof.
 */
const authorizeControllerAccess = async ({
  controllerId,
  clientProfileId,
  commandId = null,
  biometricDeviceId = null,
  biometricUserId = '',
  actorUser = null,
}) => {
  const controller = await AccessController.findById(controllerId).select('+encryptedCredentials');
  if (!controller) {
    return { decision: 'UNKNOWN', reason: 'CONTROLLER_NOT_FOUND', unlocked: false };
  }

  if (actorUser) {
    assertBranchScope(actorUser, controller.branchId);
  }

  const effectiveCommandId =
    commandId && String(commandId).trim()
      ? String(commandId).trim()
      : `cmd-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  // Replay / duplicate command guard
  const existingCmd = await AccessControlEvent.findOne({ commandId: effectiveCommandId }).lean();
  if (existingCmd) {
    return {
      decision: 'DENIED',
      reason: 'DUPLICATE_COMMAND',
      duplicate: true,
      commandId: effectiveCommandId,
      unlocked: false,
    };
  }

  const profile = clientProfileId ? await ClientProfile.findById(clientProfileId).lean() : null;
  const eligibility = await evaluateFacilityAccessEligibility(profile, {
    branchId: controller.branchId,
  });

  // Record membership authorization stage
  await AccessControlEvent.create({
    controllerId: controller._id,
    branchId: controller.branchId,
    clientProfileId: profile?._id || null,
    biometricDeviceId,
    biometricUserId,
    eventStage: 'MEMBERSHIP_AUTHORIZATION',
    decision: eligibility.eligible ? 'ALLOWED' : 'DENIED',
    reason: eligibility.reason,
    commandId: effectiveCommandId,
    actorUserId: actorUser?._id || null,
  });

  if (!eligibility.eligible) {
    await AccessControlEvent.create({
      controllerId: controller._id,
      branchId: controller.branchId,
      clientProfileId: profile?._id || null,
      biometricDeviceId,
      biometricUserId,
      eventStage: 'ACCESS_DENIED',
      decision: 'DENIED',
      reason: eligibility.reason,
      commandId: effectiveCommandId,
      physicalState: 'LOCKED',
      actorUserId: actorUser?._id || null,
    });
    return {
      decision: 'DENIED',
      reason: eligibility.reason,
      commandId: effectiveCommandId,
      unlocked: false,
    };
  }

  if (!controller.isEnabled) {
    await AccessControlEvent.create({
      controllerId: controller._id,
      branchId: controller.branchId,
      clientProfileId: profile?._id || null,
      biometricDeviceId,
      biometricUserId,
      eventStage: 'ACCESS_DENIED',
      decision: 'UNAVAILABLE',
      reason: 'CONTROLLER_DISABLED',
      commandId: effectiveCommandId,
      actorUserId: actorUser?._id || null,
    });
    return {
      decision: 'UNAVAILABLE',
      reason: 'CONTROLLER_DISABLED',
      commandId: effectiveCommandId,
      unlocked: false,
    };
  }

  const credentials = decryptCredentials(controller.encryptedCredentials);
  const adapter = createAdapterForController(controller, credentials);
  const caps = adapter.getCapabilities();

  if (!caps.implemented || !caps.supportsRemoteUnlock) {
    await AccessControlEvent.create({
      controllerId: controller._id,
      branchId: controller.branchId,
      clientProfileId: profile?._id || null,
      biometricDeviceId,
      biometricUserId,
      eventStage: 'ACCESS_DENIED',
      decision: 'UNAVAILABLE',
      reason: 'CAPABILITY_NOT_SUPPORTED',
      commandId: effectiveCommandId,
      actorUserId: actorUser?._id || null,
    });
    return {
      decision: 'UNAVAILABLE',
      reason: 'CAPABILITY_NOT_SUPPORTED',
      commandId: effectiveCommandId,
      unlocked: false,
    };
  }

  await AccessControlEvent.create({
    controllerId: controller._id,
    branchId: controller.branchId,
    clientProfileId: profile?._id || null,
    biometricDeviceId,
    biometricUserId,
    eventStage: 'UNLOCK_COMMAND',
    decision: 'ALLOWED',
    reason: 'AUTHORIZED_MEMBERSHIP_ACTIVE',
    commandId: effectiveCommandId,
    actorUserId: actorUser?._id || null,
  });

  try {
    const result = await adapter.authorizeAccess({
      commandId: effectiveCommandId,
      clientProfileId: String(profile._id),
      doorName: controller.doorName,
      durationSec: controller.connectionConfig?.unlockDurationSec || 5,
    });

    await AccessControlEvent.create({
      controllerId: controller._id,
      branchId: controller.branchId,
      clientProfileId: profile?._id || null,
      biometricDeviceId,
      biometricUserId,
      eventStage: 'CONTROLLER_ACKNOWLEDGEMENT',
      decision: 'ALLOWED',
      reason: result.physicalState === 'UNLOCKED_CONFIRMED'
        ? 'CONTROLLER_ACK_WITH_DOOR_SENSOR'
        : 'CONTROLLER_ACK_NO_PHYSICAL_SENSOR',
      commandId: effectiveCommandId,
      acknowledged: Boolean(result.acknowledged),
      physicalState: result.physicalState || 'NO_SENSOR',
      actorUserId: actorUser?._id || null,
    });

    return {
      decision: 'ALLOWED',
      reason: 'AUTHORIZED',
      commandId: effectiveCommandId,
      acknowledged: Boolean(result.acknowledged),
      physicalState: result.physicalState || 'NO_SENSOR',
      emergencyEgressIndependent: Boolean(result.emergencyEgressIndependent),
    };
  } catch (err) {
    await AccessControlEvent.create({
      controllerId: controller._id,
      branchId: controller.branchId,
      clientProfileId: profile?._id || null,
      biometricDeviceId,
      biometricUserId,
      eventStage: 'ACCESS_DENIED',
      decision: 'UNAVAILABLE',
      reason: err.code || 'CONTROLLER_COMMUNICATION_ERROR',
      commandId: effectiveCommandId,
      actorUserId: actorUser?._id || null,
      metadata: { error: err.message },
    });

    return {
      decision: 'UNAVAILABLE',
      reason: err.code || 'CONTROLLER_COMMUNICATION_ERROR',
      error: err.message,
      commandId: effectiveCommandId,
      unlocked: false,
    };
  }
};

const listControllerEvents = async (controllerId, adminUser, { limit = 50 } = {}) => {
  const controller = await AccessController.findById(controllerId).lean();
  if (!controller) {
    const err = new Error('Access controller not found.');
    err.statusCode = 404;
    throw err;
  }
  assertBranchScope(adminUser, controller.branchId);

  const parsedLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
  const events = await AccessControlEvent.find({ controllerId })
    .populate('clientProfileId', 'clientId name')
    .sort({ createdAt: -1 })
    .limit(parsedLimit)
    .lean();

  return { events };
};

module.exports = {
  listControllers,
  registerController,
  updateController,
  toggleController,
  testControllerConnection,
  authorizeControllerAccess,
  listControllerEvents,
  HARDWARE_DISCOVERY_CHECKLIST,
};
