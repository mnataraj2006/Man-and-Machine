import authService from './auth.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class EmployeeService {
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
    const url = `${API_BASE_URL}/admin/employees${endpoint}`;
    const headers = { ...this.getAuthHeaders(), ...options.headers };
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    const response = await fetch(url, { ...options, headers });
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

  getNextEmployeeId() {
    return this.request('/next-id');
  }

  getOverview(params = {}) {
    const clean = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'ALL') clean[k] = v;
    });
    const qs = new URLSearchParams(clean).toString();
    return this.request(`/overview${qs ? `?${qs}` : ''}`);
  }

  listEmployees(params = {}) {
    const clean = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'ALL') clean[k] = v;
    });
    const qs = new URLSearchParams(clean).toString();
    return this.request(`${qs ? `?${qs}` : ''}`);
  }

  getEmployee(id) {
    return this.request(`/${id}`);
  }

  getEmployeeAttendance(id, params = {}) {
    const clean = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') clean[k] = v;
    });
    const qs = new URLSearchParams(clean).toString();
    return this.request(`/${id}/attendance${qs ? `?${qs}` : ''}`);
  }

  createEmployee(payload) {
    const body = payload instanceof FormData ? payload : JSON.stringify(payload);
    return this.request('', { method: 'POST', body });
  }

  updateEmployee(id, payload) {
    const body = payload instanceof FormData ? payload : JSON.stringify(payload);
    return this.request(`/${id}`, { method: 'PUT', body });
  }

  updateEmployeeBiometric(id, payload) {
    return this.request(`/${id}/biometric`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  deactivateEmployee(id, payload = {}) {
    return this.request(`/${id}/deactivate`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  reactivateEmployee(id, payload = {}) {
    return this.request(`/${id}/reactivate`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }
}

export default new EmployeeService();
