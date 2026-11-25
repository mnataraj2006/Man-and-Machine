/**
 * settingsService.js
 * ------------------
 * API client for per-user authenticated appearance & UI settings.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'mm_auth_token';

const getAuthHeaders = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const settingsService = {
  getSettings: async () => {
    const res = await fetch(`${BASE_URL}/settings`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Failed to load user settings');
    }
    return data;
  },

  updateSettings: async (theme) => {
    const res = await fetch(`${BASE_URL}/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        preferences: { theme },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Failed to save theme preference');
    }
    return data;
  },
};

export default settingsService;
