/**
 * api.js
 * ------
 * Central API service layer.
 * This module will communicate with the Node.js / Express backend.
 *
 * Base URL is read from the Vite environment variable:
 *   VITE_API_URL=http://localhost:5000/api
 *
 * Usage (once backend is ready):
 *   import api from '../services/api';
 *   const plans = await api.getMembershipPlans();
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = {
  // ── Membership ──────────────────────────────────────────
  // getMembershipPlans: () => fetch(`${BASE_URL}/memberships`).then(r => r.json()),
  // submitEnquiry:  (data) => fetch(`${BASE_URL}/enquiries`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Contact ─────────────────────────────────────────────
  // submitContact:  (data) => fetch(`${BASE_URL}/contact`,  { method: 'POST', body: JSON.stringify(data) }),

  // ── Reviews ─────────────────────────────────────────────
  // getReviews: () => fetch(`${BASE_URL}/reviews`).then(r => r.json()),

  // ── Trainers ────────────────────────────────────────────
  // getTrainers: () => fetch(`${BASE_URL}/trainers`).then(r => r.json()),
};

export default api;
