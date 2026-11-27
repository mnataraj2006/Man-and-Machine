import authService from './auth.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class WebsiteService {
  getAuthHeaders(isFormData = false) {
    const token =
      (authService && typeof authService.getToken === 'function' ? authService.getToken() : null) ||
      localStorage.getItem('mm_auth_token') ||
      '';
    const headers = {
      Authorization: token ? `Bearer ${token}` : '',
    };
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  }

  async adminRequest(endpoint, options = {}) {
    const isFormData = options.body instanceof FormData;
    const url = `${API_BASE_URL}/admin/website${endpoint}`;
    const headers = { ...this.getAuthHeaders(isFormData), ...options.headers };

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
  }

  // Public APIs
  async getPublicGallery(category = 'ALL') {
    const qs = category && category !== 'ALL' ? `?category=${encodeURIComponent(category)}` : '';
    const res = await fetch(`${API_BASE_URL}/public/gallery${qs}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to load gallery');
    return data;
  }

  async getPublicContent() {
    const res = await fetch(`${API_BASE_URL}/public/website-content`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to load website content');
    return data;
  }

  // Admin Gallery APIs
  getAdminGallery(params = {}) {
    const clean = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') clean[k] = v;
    });
    const qs = new URLSearchParams(clean).toString();
    return this.adminRequest(`/gallery${qs ? `?${qs}` : ''}`);
  }

  createGalleryMedia(formData) {
    return this.adminRequest('/gallery', {
      method: 'POST',
      body: formData,
    });
  }

  updateGalleryMedia(id, formData) {
    return this.adminRequest(`/gallery/${id}`, {
      method: 'PUT',
      body: formData,
    });
  }

  toggleGalleryStatus(id, payload) {
    return this.adminRequest(`/gallery/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  reorderGallery(orderedIds) {
    return this.adminRequest('/gallery/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ orderedIds }),
    });
  }

  deleteGalleryMedia(id) {
    return this.adminRequest(`/gallery/${id}`, {
      method: 'DELETE',
    });
  }

  // Admin Content APIs
  getAdminContent() {
    return this.adminRequest('/content');
  }

  updateContentSection(section, data, imageFile = null) {
    if (imageFile) {
      const formData = new FormData();
      Object.entries(data || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null) formData.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      });
      formData.append('image', imageFile);
      return this.adminRequest(`/content/${section}`, {
        method: 'PUT',
        body: formData,
      });
    }
    return this.adminRequest(`/content/${section}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export default new WebsiteService();
