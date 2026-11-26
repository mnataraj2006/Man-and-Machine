import authService from './auth.js';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const request = async (path, options = {}) => {
  const token = authService.getToken?.() || localStorage.getItem('mm_auth_token') || '';
  const response = await fetch(`${BASE}/whatsapp${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'WhatsApp request failed');
  return data;
};

export default {
  connection: () => request('/connection'), testConnection: () => request('/connection/test', { method: 'POST' }),
  templates: () => request('/templates'), createTemplate: (data) => request('/templates', { method: 'POST', body: JSON.stringify(data) }),
  logs: (params = {}) => request(`/logs?${new URLSearchParams(params)}`), retry: (id) => request(`/logs/${id}/retry`, { method: 'POST' }),
  automations: () => request('/automation'), updateAutomation: (key, data) => request(`/automation/${key}`, { method: 'PUT', body: JSON.stringify(data) }),
  summary: () => request('/summary'),
};
