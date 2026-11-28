const { BaseAccessControllerAdapter } = require('./BaseAccessControllerAdapter');

/**
 * Generic authenticated HTTP/REST controller adapter.
 * Requires explicit endpointUrl and validated configuration; never sends requests
 * unless enabled and configured.
 */
class HttpRestAccessControllerAdapter extends BaseAccessControllerAdapter {
  getCapabilities() {
    return {
      supportsRemoteUnlock: true,
      supportsDenyFeedback: false,
      supportsDoorStatus: false,
      supportsLastAccessEvent: false,
      supportsDeviceInfo: true,
      supportsHealthCheck: true,
      supportsCredentialSync: false,
      emergencyEgressIndependent: true,
      implemented: true,
    };
  }

  _buildHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const authType = this.controller?.connectionConfig?.authType || 'NONE';
    if (authType === 'BEARER' && this.credentials?.token) {
      headers.Authorization = `Bearer ${this.credentials.token}`;
    } else if (authType === 'API_KEY' && this.credentials?.apiKey) {
      headers['X-API-Key'] = this.credentials.apiKey;
    } else if (authType === 'BASIC' && this.credentials?.username) {
      const encoded = Buffer.from(`${this.credentials.username}:${this.credentials.password || ''}`).toString('base64');
      headers.Authorization = `Basic ${encoded}`;
    }
    return headers;
  }

  _getBaseUrl() {
    const raw = String(this.controller?.connectionConfig?.endpointUrl || '').trim().replace(/\/+$/, '');
    if (!raw || !/^https?:\/\//i.test(raw)) {
      const err = new Error('HTTP_REST controller requires a valid http(s) endpointUrl.');
      err.code = 'INVALID_ENDPOINT';
      err.statusCode = 400;
      throw err;
    }
    return raw;
  }

  async _fetchWithTimeout(path, options = {}) {
    const baseUrl = this._getBaseUrl();
    const timeoutMs = Math.min(15000, Math.max(500, Number(this.controller?.connectionConfig?.timeoutMs) || 3000));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: { ...this._buildHeaders(), ...(options.headers || {}) },
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data?.message || `Controller HTTP error (${res.status})`);
        err.statusCode = res.status === 401 || res.status === 403 ? 401 : 502;
        err.code = res.status === 401 || res.status === 403 ? 'INVALID_CREDENTIALS' : 'CONTROLLER_HTTP_ERROR';
        throw err;
      }
      return data;
    } catch (err) {
      if (err.name === 'AbortError') {
        const timeoutErr = new Error(`Controller HTTP request timed out after ${timeoutMs}ms.`);
        timeoutErr.code = 'COMMAND_TIMEOUT';
        timeoutErr.statusCode = 504;
        throw timeoutErr;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async healthCheck() {
    const start = Date.now();
    const data = await this._fetchWithTimeout('/health', { method: 'GET' });
    return {
      healthy: true,
      status: 'ONLINE',
      latencyMs: Math.max(1, Date.now() - start),
      details: data,
      emergencyEgressIndependent: true,
    };
  }

  async getDeviceInformation() {
    return this._fetchWithTimeout('/info', { method: 'GET' });
  }

  async authorizeAccess({ commandId, doorName, durationSec = 5 }) {
    const data = await this._fetchWithTimeout('/unlock', {
      method: 'POST',
      body: JSON.stringify({ commandId, doorName, durationSec }),
    });
    return {
      commandId,
      acknowledged: true,
      doorName: doorName || this.controller?.doorName,
      durationSec,
      // Only mark UNLOCKED_CONFIRMED if the HTTP endpoint explicitly returns doorSensorConfirmed: true
      physicalState: data?.doorSensorConfirmed === true ? 'UNLOCKED_CONFIRMED' : 'NO_SENSOR',
      emergencyEgressIndependent: true,
    };
  }
}

module.exports = HttpRestAccessControllerAdapter;
