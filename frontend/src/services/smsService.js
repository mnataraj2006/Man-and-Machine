import authService from './auth.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class SmsService {
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
    const url = `${API_BASE_URL}/admin/sms${endpoint}`;
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

  getSettings() {
    return this.request('/settings');
  }

  updateSettings(payload) {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  getTemplates() {
    return this.request('/templates');
  }

  updateTemplate(key, payload) {
    return this.request(`/templates/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  getLogs(params = {}) {
    const clean = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'ALL') clean[k] = v;
    });
    const qs = new URLSearchParams(clean).toString();
    return this.request(`/logs${qs ? `?${qs}` : ''}`);
  }

  getEmailTemplates() {
    return this.request('/email/templates');
  }

  updateEmailTemplate(key, payload) {
    return this.request(`/email/templates/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  previewEmailTemplate(key, payload = {}) {
    return this.request(`/email/templates/${encodeURIComponent(key)}/preview`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  getEmailLogs(params = {}) {
    const clean = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'ALL') clean[k] = v;
    });
    const qs = new URLSearchParams(clean).toString();
    return this.request(`/email/logs${qs ? `?${qs}` : ''}`);
  }

  getEmailLogById(id) {
    return this.request(`/email/logs/${encodeURIComponent(id)}`);
  }

  testSmtpConnection() {
    return this.request('/email/test-connection', {
      method: 'POST',
    });
  }

  sendTestEmail(toEmail) {
    return this.request('/email/send-test', {
      method: 'POST',
      body: JSON.stringify({ toEmail }),
    });
  }

  sendTestSms(toPhone) {
    return this.request('/test', {
      method: 'POST',
      body: JSON.stringify({ toPhone }),
    });
  }
}

export default new SmsService();
