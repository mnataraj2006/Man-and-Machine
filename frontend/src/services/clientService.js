/**
 * clientService.js
 * ----------------
 * Dedicated service layer for all Client Dashboard platform APIs.
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

export const clientService = {
  // ── 1. Dashboard ──────────────────────────────────────────
  getDashboardSummary: async () => {
    const res = await fetch(`${BASE_URL}/client/dashboard`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load dashboard summary');
    return res.json();
  },

  // ── 2. Profile ────────────────────────────────────────────
  getProfile: async () => {
    const res = await fetch(`${BASE_URL}/client/profile`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load profile');
    return res.json();
  },

  updateProfile: async (data) => {
    const res = await fetch(`${BASE_URL}/client/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update profile');
    }
    return res.json();
  },

  // ── 3. Workouts ───────────────────────────────────────────
  getWorkouts: async () => {
    const res = await fetch(`${BASE_URL}/client/workouts`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load workouts');
    return res.json();
  },

  getWorkoutById: async (id) => {
    const res = await fetch(`${BASE_URL}/client/workouts/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load workout details');
    return res.json();
  },

  logWorkoutSession: async (planId, sessionData) => {
    const res = await fetch(`${BASE_URL}/client/workouts/${planId}/sessions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(sessionData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to record workout session');
    }
    return res.json();
  },

  getWorkoutSessions: async () => {
    const res = await fetch(`${BASE_URL}/client/workout-sessions`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load workout sessions');
    return res.json();
  },

  // ── 4. Attendance ─────────────────────────────────────────
  getAttendance: async () => {
    const res = await fetch(`${BASE_URL}/client/attendance`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load attendance');
    return res.json();
  },

  // ── 5. Progress ───────────────────────────────────────────
  getProgress: async () => {
    const res = await fetch(`${BASE_URL}/client/progress`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load progress records');
    return res.json();
  },

  addProgressRecord: async (recordData) => {
    const res = await fetch(`${BASE_URL}/client/progress`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(recordData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to save progress entry');
    }
    return res.json();
  },

  // ── 6. Membership ─────────────────────────────────────────
  getMembership: async () => {
    const res = await fetch(`${BASE_URL}/client/membership`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load membership');
    return res.json();
  },

  getMembershipPlans: async () => {
    const res = await fetch(`${BASE_URL}/client/membership/plans`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load membership plans');
    return res.json();
  },

  checkoutMembership: async (payload) => {
    const res = await fetch(`${BASE_URL}/client/membership/checkout`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Checkout validation failed');
    }
    return res.json();
  },

  purchaseMembership: async (payload) => {
    const res = await fetch(`${BASE_URL}/client/membership/purchase`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Membership purchase failed');
    }
    return res.json();
  },

  requestRenewal: async () => {
    const res = await fetch(`${BASE_URL}/client/membership/renewal-request`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to submit renewal request');
    }
    return res.json();
  },

  // ── 7. Payments ───────────────────────────────────────────
  getPayments: async () => {
    const res = await fetch(`${BASE_URL}/client/payments`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load payments');
    return res.json();
  },

  // ── 8. Trainer & Coaching Discovery ───────────────────────
  getTrainer: async () => {
    const res = await fetch(`${BASE_URL}/client/trainer`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load trainer details');
    return res.json();
  },

  getAvailableTrainers: async (branchId) => {
    const query = branchId && branchId !== 'ALL' ? `?branchId=${branchId}` : '';
    const res = await fetch(`${BASE_URL}/client/trainers${query}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load available trainers');
    return res.json();
  },

  getTrainerPublicProfile: async (trainerId) => {
    const res = await fetch(`${BASE_URL}/client/trainers/${trainerId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load coach profile');
    return res.json();
  },

  getTrainerAvailability: async (trainerId, date) => {
    const res = await fetch(`${BASE_URL}/client/trainers/${trainerId}/availability?date=${date}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load trainer availability');
    return res.json();
  },

  bookTrainerSession: async (trainerId, bookingData) => {
    const res = await fetch(`${BASE_URL}/client/trainers/${trainerId}/book`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(bookingData),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Failed to complete booking');
    }
    return data;
  },

  getClientBookings: async () => {
    const res = await fetch(`${BASE_URL}/client/my-trainer-bookings`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load your trainer bookings');
    return res.json();
  },

  // ── 9. Notifications ─────────────────────────────────────
  getNotifications: async (category = 'ALL') => {
    const query = category !== 'ALL' ? `?category=${category}` : '';
    const res = await fetch(`${BASE_URL}/client/notifications${query}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load notifications');
    return res.json();
  },

  markNotificationAsRead: async (id) => {
    const res = await fetch(`${BASE_URL}/client/notifications/${id}/read`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to mark notification read');
    return res.json();
  },

  markAllNotificationsRead: async () => {
    const res = await fetch(`${BASE_URL}/client/notifications/read-all`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to mark all notifications read');
    return res.json();
  },

  // ── 10. Settings ──────────────────────────────────────────
  changePassword: async (currentPassword, newPassword) => {
    const res = await fetch(`${BASE_URL}/client/settings/password`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update password');
    }
    return res.json();
  },
};

export default clientService;
