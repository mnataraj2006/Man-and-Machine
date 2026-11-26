import authService from './auth.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class BiometricService {
  getAuthHeaders() {
    const token =
      (authService && typeof authService.getToken === 'function' ? authService.getToken() : null) ||
      localStorage.getItem('mm_auth_token') ||
      '';
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    };
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}/biometric${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: { ...this.getAuthHeaders(), ...options.headers },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) {
        authService.logout();
        window.location.href = '/login';
      }
      throw new Error(data.message || `Request failed (${response.status})`);
    }
    return data;
  }

  getDevices(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/devices${qs ? `?${qs}` : ''}`);
  }

  registerDevice(payload) {
    return this.request('/devices', { method: 'POST', body: JSON.stringify(payload) });
  }

  getDeviceDetails(id) {
    return this.request(`/devices/${id}`);
  }

  updateDevice(id, payload) {
    return this.request(`/devices/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }

  toggleDevice(id, isActive) {
    return this.request(`/devices/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }

  testConnection(id) {
    return this.request(`/devices/${id}/test-connection`, { method: 'POST' });
  }

  syncDevice(id) {
    return this.request(`/devices/${id}/sync`, { method: 'POST' });
  }

  mapUser(payload) {
    return this.request('/mappings', { method: 'POST', body: JSON.stringify(payload) });
  }

  unmapUser(mappingId) {
    return this.request(`/mappings/${mappingId}`, { method: 'DELETE' });
  }

  getAttendance(params = {}) {
    const clean = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'ALL') clean[k] = v;
    });
    const qs = new URLSearchParams(clean).toString();
    return this.request(`/attendance${qs ? `?${qs}` : ''}`);
  }

  getEnrollmentOverview(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/enrollments/overview${qs ? `?${qs}` : ''}`);
  }

  listEnrollments(params = {}) {
    const clean = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'ALL') clean[k] = v;
    });
    const qs = new URLSearchParams(clean).toString();
    return this.request(`/enrollments${qs ? `?${qs}` : ''}`);
  }

  getEnrollmentDetails(id) {
    return this.request(`/enrollments/${id}`);
  }

  completeManualEnrollment(payload) {
    const ep = payload.enrollmentId ? `/enrollments/${payload.enrollmentId}/manual-complete` : '/enrollments/manual';
    return this.request(ep, { method: 'POST', body: JSON.stringify(payload) });
  }

  initiateRemoteEnrollment(payload) {
    const ep = payload.enrollmentId ? `/enrollments/${payload.enrollmentId}/remote-enroll` : '/enrollments/remote-enroll';
    return this.request(ep, { method: 'POST', body: JSON.stringify(payload) });
  }

  approveEnrollment(id, payload = {}) {
    return this.request(`/enrollments/${id}/approve`, { method: 'POST', body: JSON.stringify(payload) });
  }

  rejectEnrollment(id, reason) {
    return this.request(`/enrollments/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
  }

  analyzeMigration(payload) {
    return this.request('/migration/analyze', { method: 'POST', body: JSON.stringify(payload) });
  }
}

export default new BiometricService();
