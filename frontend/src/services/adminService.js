import authService from './auth.js';
import { cachedFetch, clearRequestCache, invalidateRequestCachePrefix } from '../utils/requestCache.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

if (typeof window !== 'undefined') {
  window.addEventListener('mm:attendance-updated', () => {
    invalidateRequestCachePrefix('admin:/attendance');
    invalidateRequestCachePrefix('admin:/dashboard');
  });
}

class AdminService {
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
    const method = (options.method || 'GET').toUpperCase();
    const isCacheableGet =
      method === 'GET' &&
      !options.skipCache &&
      (endpoint.startsWith('/dashboard') ||
        endpoint === '/branches' ||
        endpoint.startsWith('/clients') ||
        endpoint.startsWith('/trainers') ||
        endpoint.startsWith('/membership-plans') ||
        endpoint.startsWith('/memberships') ||
        endpoint.startsWith('/attendance') ||
        endpoint.startsWith('/payments') ||
        endpoint.startsWith('/notifications') ||
        endpoint.startsWith('/settings') ||
        endpoint.startsWith('/reports'));

    const execute = async () => {
      const url = `${API_BASE_URL}/admin${endpoint}`;
      const headers = { ...this.getAuthHeaders(), ...options.headers };
      if (options.body instanceof FormData) {
        delete headers['Content-Type'];
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 25000);

      try {
        const response = await fetch(url, {
          ...options,
          headers,
          signal: options.signal || controller.signal,
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (response.status === 401) {
            clearRequestCache();
            authService.logout();
            window.location.href = '/login';
          }
          const apiError = new Error(data.message || `Request failed with status ${response.status}`);
          apiError.status = response.status;
          apiError.data = data;
          throw apiError;
        }

        if (method !== 'GET') {
          clearRequestCache();
        }

        return data;
      } catch (err) {
        if (err.name === 'AbortError') {
          const timeoutErr = new Error('Request timed out while waiting for the server. Please refresh and check if the record was created.');
          console.error(`Admin API Timeout [${endpoint}]:`, timeoutErr);
          throw timeoutErr;
        }
        console.error(`Admin API Error [${endpoint}]:`, err);
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    if (isCacheableGet) {
      return cachedFetch(`admin:${endpoint}`, execute, 30000);
    }
    return execute();
  }

  // 1. Dashboard & KPIs
  async getDashboardOverview(branchId = 'ALL', range = 'thisMonth') {
    return this.request(`/dashboard?branchId=${branchId}&range=${range}`);
  }

  // 2. Branch Management
  async getBranches() {
    return this.request('/branches');
  }

  async getBranchDetails(id) {
    return this.request(`/branches/${id}`);
  }

  async createBranch(branchData) {
    return this.request('/branches', {
      method: 'POST',
      body: JSON.stringify(branchData),
    });
  }

  async updateBranch(id, branchData) {
    return this.request(`/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(branchData),
    });
  }

  async toggleBranchStatus(id) {
    return this.request(`/branches/${id}/toggle`, {
      method: 'PUT',
    });
  }

  // 3. Client Management
  async getClients(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/clients?${query}`);
  }

  async getClientDetails(id) {
    return this.request(`/clients/${id}`);
  }

  async createClient(clientData) {
    return this.request('/clients', {
      method: 'POST',
      body: JSON.stringify(clientData),
    });
  }

  async updateClient(id, clientData) {
    return this.request(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(clientData),
    });
  }

  async createClientLoginAccess(id) {
    return this.request(`/clients/${id}/login-access`, { method: 'POST' });
  }

  async updateClientStatus(id, status) {
    return this.request(`/clients/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async assignTrainer(id, trainerId) {
    return this.request(`/clients/${id}/assign-trainer`, {
      method: 'PUT',
      body: JSON.stringify({ trainerId }),
    });
  }

  async changeClientBranch(id, branchId) {
    return this.request(`/clients/${id}/change-branch`, {
      method: 'PUT',
      body: JSON.stringify({ branchId }),
    });
  }

  async resetClientPassword(id, newPassword) {
    return this.request(`/clients/${id}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    });
  }

  // 4. Trainer Management
  async getTrainers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/trainers?${query}`);
  }

  async getTrainerDetails(id) {
    return this.request(`/trainers/${id}`);
  }

  async createTrainer(trainerData, photoFile = null) {
    if (photoFile) {
      const formData = new FormData();
      Object.entries(trainerData || {}).forEach(([key, val]) => {
        if (val !== undefined && val !== null) formData.append(key, String(val));
      });
      formData.append('photo', photoFile);
      return this.request('/trainers', {
        method: 'POST',
        body: formData,
      });
    }
    return this.request('/trainers', {
      method: 'POST',
      body: JSON.stringify(trainerData),
    });
  }

  async updateTrainer(id, trainerData, { photoFile = null, removePhoto = false } = {}) {
    if (photoFile || removePhoto) {
      const formData = new FormData();
      Object.entries(trainerData || {}).forEach(([key, val]) => {
        if (val !== undefined && val !== null) formData.append(key, String(val));
      });
      if (photoFile) {
        formData.append('photo', photoFile);
      } else if (removePhoto) {
        formData.append('removePhoto', 'true');
      }
      return this.request(`/trainers/${id}`, {
        method: 'PUT',
        body: formData,
      });
    }
    return this.request(`/trainers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(trainerData),
    });
  }

  async uploadTrainerPhoto(id, photoFile) {
    const formData = new FormData();
    formData.append('photo', photoFile);
    return this.request(`/trainers/${id}/photo`, {
      method: 'POST',
      body: formData,
    });
  }

  async deleteTrainerPhoto(id) {
    return this.request(`/trainers/${id}/photo`, {
      method: 'DELETE',
    });
  }

  async updateTrainerStatus(id, status) {
    return this.request(`/trainers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async resendTrainerInvitation(id) {
    return this.request(`/trainers/${id}/resend-invitation`, {
      method: 'POST',
    });
  }

  async resetTrainerPassword(id) {
    return this.request(`/trainers/${id}/reset-password`, {
      method: 'POST',
    });
  }

  async deleteTrainer(id) {
    return this.request(`/trainers/${id}`, {
      method: 'DELETE',
    });
  }

  async getTrainerBookings(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/trainer-bookings${query ? `?${query}` : ''}`);
  }

  async confirmTrainerBookingPayment(id, data = {}) {
    return this.request(`/trainer-bookings/${id}/confirm-payment`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 5. Membership Plans Management
  async getMembershipPlans(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/membership-plans${query ? `?${query}` : ''}`);
  }

  async getMembershipPlanById(id) {
    return this.request(`/membership-plans/${id}`);
  }

  async createMembershipPlan(planData) {
    return this.request('/membership-plans', {
      method: 'POST',
      body: JSON.stringify(planData),
    });
  }

  async updateMembershipPlan(id, planData) {
    return this.request(`/membership-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(planData),
    });
  }

  async toggleMembershipPlanStatus(id, isActive) {
    return this.request(`/membership-plans/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }

  async duplicateMembershipPlan(id) {
    return this.request(`/membership-plans/${id}/duplicate`, {
      method: 'POST',
    });
  }

  async deleteMembershipPlan(id) {
    return this.request(`/membership-plans/${id}`, {
      method: 'DELETE',
    });
  }

  async getClientMemberships(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/memberships?${query}`);
  }

  async createClientMembership(data) {
    return this.request('/memberships', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateClientMembershipStatus(id, actionData) {
    return this.request(`/memberships/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(actionData),
    });
  }

  // 6. Attendance Management
  async getAttendance(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/attendance?${query}`);
  }

  async recordAttendance(data) {
    return this.request('/attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async correctAttendance(id, data) {
    return this.request(`/attendance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // 7. Workout Management
  async getExercises(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/exercises?${query}`);
  }

  async createExercise(exerciseData) {
    return this.request('/exercises', {
      method: 'POST',
      body: JSON.stringify(exerciseData),
    });
  }

  async getWorkoutTemplates() {
    return this.request('/workouts/templates');
  }

  async createWorkoutTemplate(templateData) {
    return this.request('/workouts/templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    });
  }

  async assignWorkout(data) {
    return this.request('/workouts/assign', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 8. Payments & Finance
  async getFinancialOverview(branchId = 'ALL') {
    return this.request(`/payments/overview?branchId=${branchId}`);
  }

  async getPayments(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/payments?${query}`);
  }

  async recordOfflinePayment(paymentData) {
    return this.request('/payments/offline', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async updatePaymentStatus(id, status) {
    return this.request(`/payments/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Record a partial or full payment against an existing invoice
  async recordInvoicePayment(invoiceId, data) {
    return this.request(`/invoices/${invoiceId}/record-payment`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Get all invoices for a client
  async getClientInvoices(clientId) {
    return this.request(`/clients/${clientId}/invoices`);
  }

  // 9. Reports & Analytics
  async getReportsData(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/reports?${query}`);
  }

  // 10. Notifications & Announcements
  async getAnnouncements() {
    return this.request('/notifications/announcements');
  }

  async createAnnouncement(announcementData) {
    return this.request('/notifications/announcements', {
      method: 'POST',
      body: JSON.stringify(announcementData),
    });
  }

  // 11. Enquiries & Lead Management
  async getEnquiries(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/enquiries?${query}`);
  }

  async createEnquiry(enquiryData) {
    return this.request('/enquiries', {
      method: 'POST',
      body: JSON.stringify(enquiryData),
    });
  }

  async updateEnquiry(id, enquiryData) {
    return this.request(`/enquiries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(enquiryData),
    });
  }

  async convertEnquiryToClient(id, data = {}) {
    return this.request(`/enquiries/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 12. Settings
  async getSettings() {
    return this.request('/settings');
  }

  async changeAdminPassword(data) {
    return this.request('/settings/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // CSV Export utility
  exportToCSV(data, filename = 'export.csv') {
    if (!data || !data.length) {
      alert('No records available to export.');
      return;
    }
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map((header) => {
        const val = row[header] === null || row[header] === undefined ? '' : row[header];
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export default new AdminService();
