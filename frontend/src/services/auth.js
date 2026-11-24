/**
 * auth.js
 * -------
 * Authentication service layer for Man & Machine Fitness.
 * Communicates directly with the Express + MongoDB backend.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TOKEN_KEY = 'mm_auth_token';
const USER_KEY = 'mm_auth_user';

export const authService = {
  /**
   * Submit credentials for member login.
   * @param {Object} credentials - { email, password }
   * @returns {Promise<Object>} API response { success, token, user }
   */
  login: async ({ email, password }) => {
    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Invalid email or password.');
      }

      if (data.token && data.user) {
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }

      return data;
    } catch (error) {
      if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to the server. Please try again.');
      }
      throw error;
    }
  },

  /**
   * Register a new member account.
   * @param {Object} userData - { name, email, password, phone, city }
   * @returns {Promise<Object>} API response { success, token, user }
   */
  register: async ({ name, email, password, phone, city }) => {
    try {
      const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, phone, city }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed.');
      }

      if (data.token && data.user) {
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }

      return data;
    } catch (error) {
      if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to the server. Please try again.');
      }
      throw error;
    }
  },

  /**
   * Retrieve currently authenticated member profile.
   * @returns {Promise<Object|null>}
   */
  getMe: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    try {
      const response = await fetch(`${BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        authService.logout();
        return null;
      }

      const data = await response.json();
      if (data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }
      return data.user;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get cached user from localStorage.
   */
  getUser: () => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  /**
   * Get JWT token.
   */
  getToken: () => {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Check if user is currently authenticated.
   */
  isAuthenticated: () => {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Remove auth session and log out.
   */
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export default authService;
