const { BaseAccessControllerAdapter } = require('./BaseAccessControllerAdapter');

/**
 * Simulation adapter for development, testing, and hardware-free verification.
 * Supports configurable failure/timeout/sensor modes via connectionConfig.mockOptions.
 */
class MockAccessControllerAdapter extends BaseAccessControllerAdapter {
  constructor(controller, credentials = {}) {
    super(controller, credentials);
    this.mockOptions = controller?.connectionConfig?.mockOptions || {};
    this.connected = false;
  }

  getCapabilities() {
    return {
      supportsRemoteUnlock: true,
      supportsDenyFeedback: true,
      supportsDoorStatus: Boolean(this.mockOptions.hasDoorSensor),
      supportsLastAccessEvent: true,
      supportsDeviceInfo: true,
      supportsHealthCheck: true,
      supportsCredentialSync: false,
      emergencyEgressIndependent: true,
      implemented: true,
    };
  }

  _assertCredentials() {
    if (this.mockOptions.requireSecret && !this.credentials?.apiKey && !this.credentials?.token) {
      const err = new Error('Invalid or missing controller credentials.');
      err.code = 'INVALID_CREDENTIALS';
      err.statusCode = 401;
      throw err;
    }
    if (this.mockOptions.expectedToken && this.credentials?.token !== this.mockOptions.expectedToken) {
      const err = new Error('Controller authentication rejected: invalid token.');
      err.code = 'INVALID_CREDENTIALS';
      err.statusCode = 401;
      throw err;
    }
  }

  async _simulateTransport() {
    if (this.mockOptions.offline) {
      const err = new Error('Mock controller is offline.');
      err.code = 'CONTROLLER_OFFLINE';
      err.statusCode = 503;
      throw err;
    }
    if (this.mockOptions.networkError) {
      const err = new Error('Simulated network failure communicating with controller.');
      err.code = 'NETWORK_FAILURE';
      err.statusCode = 502;
      throw err;
    }
    if (this.mockOptions.timeout) {
      const timeoutMs = this.controller?.connectionConfig?.timeoutMs || 3000;
      const err = new Error(`Controller command timed out after ${timeoutMs}ms.`);
      err.code = 'COMMAND_TIMEOUT';
      err.statusCode = 504;
      throw err;
    }
  }

  async connect() {
    this._assertCredentials();
    await this._simulateTransport();
    this.connected = true;
    return { connected: true };
  }

  async disconnect() {
    this.connected = false;
    return { disconnected: true };
  }

  async getConnectionStatus() {
    return {
      connected: this.connected && !this.mockOptions.offline,
      status: this.mockOptions.offline ? 'OFFLINE' : 'ONLINE',
    };
  }

  async healthCheck() {
    const start = Date.now();
    this._assertCredentials();
    await this._simulateTransport();
    return {
      healthy: true,
      status: 'ONLINE',
      latencyMs: Math.max(1, Date.now() - start),
      emergencyEgressIndependent: true,
    };
  }

  async getDeviceInformation() {
    this._assertCredentials();
    await this._simulateTransport();
    return {
      manufacturer: this.controller?.manufacturer || 'Simulated',
      model: this.controller?.model || 'MockDoorController-v1',
      firmwareVersion: 'SIM-1.0.0',
      emergencyEgressIndependent: true,
    };
  }

  async authorizeAccess({ commandId, doorName, durationSec = 5 }) {
    this._assertCredentials();
    await this._simulateTransport();
    const hasDoorSensor = Boolean(this.mockOptions.hasDoorSensor);
    return {
      commandId,
      acknowledged: true,
      doorName: doorName || this.controller?.doorName,
      durationSec,
      // Only report UNLOCKED_CONFIRMED when physical door sensor feedback exists
      physicalState: hasDoorSensor ? 'UNLOCKED_CONFIRMED' : 'NO_SENSOR',
      emergencyEgressIndependent: true,
    };
  }

  async denyAccess({ commandId, reason }) {
    this._assertCredentials();
    await this._simulateTransport();
    return {
      commandId,
      acknowledged: true,
      denied: true,
      reason,
    };
  }

  async getDoorStatus() {
    this._assertCredentials();
    await this._simulateTransport();
    return {
      hasSensor: Boolean(this.mockOptions.hasDoorSensor),
      state: this.mockOptions.hasDoorSensor ? 'LOCKED' : 'UNKNOWN',
      emergencyEgressIndependent: true,
    };
  }

  async getLastAccessEvent() {
    this._assertCredentials();
    await this._simulateTransport();
    return {
      event: null,
      note: 'Mock adapter reads events from AccessControlEvent audit log.',
    };
  }
}

module.exports = MockAccessControllerAdapter;
