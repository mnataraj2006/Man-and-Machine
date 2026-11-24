import authService from './auth.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class TrainerService {
  getAuthHeaders() {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    };
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}/trainer${endpoint}`;
    const headers = { ...this.getAuthHeaders(), ...options.headers };

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          authService.logout();
          window.location.href = '/login';
        }
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`Trainer API Error [${endpoint}]:`, err);
      throw err;
    }
  }

  // 1. Dashboard Overview
  async getDashboardOverview() {
    return this.request('/dashboard');
  }

  // 2. Client Management
  async getMyClients(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.goal) query.append('goal', params.goal);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/clients${qs}`);
  }

  async getClientDetails(clientId) {
    return this.request(`/clients/${clientId}`);
  }

  async getClientProgress(clientId) {
    return this.request(`/clients/${clientId}/progress`);
  }

  async addClientProgressAssessment(clientId, assessmentData) {
    return this.request(`/clients/${clientId}/progress`, {
      method: 'POST',
      body: JSON.stringify(assessmentData),
    });
  }

  async getClientWorkouts(clientId) {
    return this.request(`/clients/${clientId}/workouts`);
  }

  async getClientAttendance(clientId) {
    return this.request(`/clients/${clientId}/attendance`);
  }

  // 3. Trainer Notes
  async getClientNotes(clientId) {
    return this.request(`/clients/${clientId}/notes`);
  }

  async createClientNote(clientId, noteData) {
    return this.request(`/clients/${clientId}/notes`, {
      method: 'POST',
      body: JSON.stringify(noteData),
    });
  }

  async updateClientNote(noteId, noteData) {
    return this.request(`/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify(noteData),
    });
  }

  async deleteClientNote(noteId) {
    return this.request(`/notes/${noteId}`, {
      method: 'DELETE',
    });
  }

  // 4. Workout Plans
  async getWorkoutPlans(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.goal) query.append('goal', params.goal);
    if (params.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/workouts${qs}`);
  }

  async getWorkoutPlanById(workoutId) {
    return this.request(`/workouts/${workoutId}`);
  }

  async createWorkoutPlan(planData) {
    return this.request('/workouts', {
      method: 'POST',
      body: JSON.stringify(planData),
    });
  }

  async updateWorkoutPlan(workoutId, planData) {
    return this.request(`/workouts/${workoutId}`, {
      method: 'PUT',
      body: JSON.stringify(planData),
    });
  }

  async publishWorkoutPlan(workoutId) {
    return this.request(`/workouts/${workoutId}/publish`, {
      method: 'POST',
    });
  }

  async duplicateWorkoutPlan(workoutId) {
    return this.request(`/workouts/${workoutId}/duplicate`, {
      method: 'POST',
    });
  }

  // 5. Exercise Library
  async getExercises() {
    return this.request('/exercises');
  }

  async createExercise(exerciseData) {
    return this.request('/exercises', {
      method: 'POST',
      body: JSON.stringify(exerciseData),
    });
  }

  // 6. Scheduling
  async getSchedule(params = {}) {
    const query = new URLSearchParams();
    if (params.start) query.append('start', params.start);
    if (params.end) query.append('end', params.end);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/schedule${qs}`);
  }

  async scheduleSession(sessionData) {
    return this.request('/schedule', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  }

  async updateScheduleSession(appointmentId, sessionData) {
    return this.request(`/schedule/${appointmentId}`, {
      method: 'PUT',
      body: JSON.stringify(sessionData),
    });
  }

  async updateSessionStatus(appointmentId, status) {
    return this.request(`/schedule/${appointmentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // 7. Sessions & Live Logger
  async getSessions(params = {}) {
    const query = new URLSearchParams();
    if (params.clientId) query.append('clientId', params.clientId);
    if (params.status) query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/sessions${qs}`);
  }

  async completeSession(sessionData) {
    return this.request('/sessions/complete', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  }

  // 8. Attendance
  async getAttendance() {
    return this.request('/attendance');
  }

  // 9. Notifications & Messaging
  async getNotifications() {
    return this.request('/notifications');
  }

  async markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsRead() {
    return this.request('/notifications/read-all', {
      method: 'PATCH',
    });
  }

  async sendClientNotification(messageData) {
    return this.request('/notifications/send-client', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  // 10. Profile & Settings
  async getProfile() {
    return this.request('/profile');
  }

  async updateProfile(profileData) {
    return this.request('/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async changePassword(passwordData) {
    return this.request('/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  }
}

export default new TrainerService();
