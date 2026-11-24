/**
 * auth.js
 * -------
 * Authentication service layer abstraction for Man & Machine Fitness.
 * Isolates all member authentication requests for future backend integration.
 *
 * Base API URL is configured via Vite environment variable:
 *   VITE_API_URL=http://localhost:5000/api
 *
 * NOTE: The backend authentication service is currently in preparation.
 * No mock credentials or fake storage are used. When the real API is ready,
 * endpoints can be connected here without altering any UI components.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const authService = {
  /**
   * Submit credentials for member login.
   * @param {Object} credentials - { email, password }
   * @returns {Promise<Object>} API response
   */
  login: async ({ email, password }) => {
    // Structured for future Node.js / Express backend integration:
    // const response = await fetch(`${BASE_URL}/auth/login`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ email, password }),
    // });
    // if (!response.ok) {
    //   const err = await response.json().catch(() => ({}));
    //   throw new Error(err.message || 'Invalid credentials');
    // }
    // return response.json();

    // Intentional fallback while backend authentication endpoints are being constructed:
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            'The member authentication backend is currently in development. Please contact your local branch or Kovilpatti HQ (+91 75988 85566) for account assistance.'
          )
        );
      }, 600);
    });
  },

  /**
   * Request password reset instructions.
   * @param {string} email
   */
  requestPasswordReset: async (email) => {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            'Password reset service is launching soon. Please reach out to reception at your branch.'
          )
        );
      }, 500);
    });
  },

  /**
   * Register a new member account.
   * @param {Object} userData
   */
  register: async (userData) => {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            'Online registration will be available shortly. Visit any Man & Machine facility to register.'
          )
        );
      }, 500);
    });
  },
};

export default authService;
