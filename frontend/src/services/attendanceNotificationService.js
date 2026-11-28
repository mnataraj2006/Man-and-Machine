import authService from './auth.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class AttendanceNotificationService {
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
    const url = `${API_BASE_URL}/admin/attendance-notifications${endpoint}`;
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

  list(params = {}) {
    const clean = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'ALL') clean[k] = v;
    });
    const qs = new URLSearchParams(clean).toString();
    return this.request(`${qs ? `?${qs}` : ''}`);
  }

  markRead(id) {
    return this.request(`/${id}/read`, { method: 'PATCH' });
  }

  markAllRead() {
    return this.request('/read-all', { method: 'PATCH' });
  }

  clearHistory() {
    return this.request('/clear', { method: 'DELETE' });
  }
}

export default new AttendanceNotificationService();
