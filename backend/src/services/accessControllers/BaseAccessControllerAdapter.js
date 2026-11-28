class AdapterCapabilityError extends Error {
  constructor(operation, adapterType) {
    super(`Operation "${operation}" is not supported by adapter "${adapterType}".`);
    this.name = 'AdapterCapabilityError';
    this.code = 'CAPABILITY_NOT_SUPPORTED';
    this.statusCode = 501;
  }
}

class BaseAccessControllerAdapter {
  constructor(controller, credentials = {}) {
    this.controller = controller;
    this.credentials = credentials || {};
    this.adapterType = controller?.adapterType || 'BASE';
  }

  getCapabilities() {
    return {
      supportsRemoteUnlock: false,
      supportsDenyFeedback: false,
      supportsDoorStatus: false,
      supportsLastAccessEvent: false,
      supportsDeviceInfo: false,
      supportsHealthCheck: false,
      supportsCredentialSync: false,
      emergencyEgressIndependent: true,
      implemented: false,
    };
  }

  async connect() {
    throw new AdapterCapabilityError('connect', this.adapterType);
  }

  async disconnect() {
    return { disconnected: true };
  }

  async getConnectionStatus() {
    return {
      connected: false,
      status: this.controller?.status || 'UNCONFIGURED',
    };
  }

  async healthCheck() {
    throw new AdapterCapabilityError('healthCheck', this.adapterType);
  }

  async getDeviceInformation() {
    throw new AdapterCapabilityError('getDeviceInformation', this.adapterType);
  }

  async authorizeAccess() {
    throw new AdapterCapabilityError('authorizeAccess', this.adapterType);
  }

  async denyAccess() {
    throw new AdapterCapabilityError('denyAccess', this.adapterType);
  }

  async getDoorStatus() {
    throw new AdapterCapabilityError('getDoorStatus', this.adapterType);
  }

  async getLastAccessEvent() {
    throw new AdapterCapabilityError('getLastAccessEvent', this.adapterType);
  }
}

module.exports = {
  BaseAccessControllerAdapter,
  AdapterCapabilityError,
};
