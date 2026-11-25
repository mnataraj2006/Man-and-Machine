import authService from './auth.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class FinanceService {
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
    const url = `${API_BASE_URL}/admin/finance${endpoint}`;
    const headers = { ...this.getAuthHeaders(), ...options.headers };
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
          authService.logout();
          window.location.href = '/login';
        }
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out while contacting the finance server.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  buildQuery(params = {}) {
    const clean = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        clean[k] = v;
      }
    });
    return new URLSearchParams(clean).toString();
  }

  getSummary(params = {}) {
    const q = this.buildQuery(params);
    return this.request(`/summary${q ? `?${q}` : ''}`);
  }

  getInvoices(params = {}) {
    const q = this.buildQuery(params);
    return this.request(`/invoices${q ? `?${q}` : ''}`);
  }

  getTodayInvoices(params = {}) {
    const q = this.buildQuery(params);
    return this.request(`/invoices/today${q ? `?${q}` : ''}`);
  }

  getInvoiceById(id) {
    return this.request(`/invoices/${id}`);
  }

  createInvoice(payload) {
    return this.request('/invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  recordInvoicePayment(invoiceId, payload) {
    return this.request(`/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  cancelInvoice(invoiceId, reason) {
    return this.request(`/invoices/${invoiceId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  }

  refundInvoice(invoiceId, reason) {
    return this.request(`/invoices/${invoiceId}/refund`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  }

  sendInvoiceReminder(invoiceId) {
    return this.request(`/invoices/${invoiceId}/reminder`, {
      method: 'POST',
    });
  }

  getPaymentReceipt(paymentId) {
    return this.request(`/payments/${paymentId}/receipt`);
  }

  getDailyCollections(params = {}) {
    const q = this.buildQuery(params);
    return this.request(`/collections/daily${q ? `?${q}` : ''}`);
  }

  getMonthlyCollections(params = {}) {
    const q = this.buildQuery(params);
    return this.request(`/collections/monthly${q ? `?${q}` : ''}`);
  }

  getExpenses(params = {}) {
    const q = this.buildQuery(params);
    return this.request(`/expenses${q ? `?${q}` : ''}`);
  }

  createExpense(payload) {
    return this.request('/expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  updateExpense(id, payload) {
    return this.request(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  cancelExpense(id, reason) {
    return this.request(`/expenses/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  }

  getConfig() {
    return this.request('/config');
  }

  updateConfig(payload) {
    return this.request('/config', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  exportToCSV(rows, filename = 'finance_export.csv') {
    if (!rows || !rows.length) {
      alert('No records available to export.');
      return;
    }
    const headers = Object.keys(rows[0]);
    const csvRows = [headers.join(',')];
    for (const row of rows) {
      const vals = headers.map((h) => {
        const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
        return `"${val.replace(/"/g, '""')}"`;
      });
      csvRows.push(vals.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    this.triggerDownload(blob, filename);
  }

  exportToExcel(rows, filename = 'finance_export.xls', sheetName = 'Finance Report') {
    if (!rows || !rows.length) {
      alert('No records available to export.');
      return;
    }
    const headers = Object.keys(rows[0]);
    const escapeHtml = (str) =>
      String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const headCells = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
    const bodyRows = rows
      .map(
        (r) =>
          `<tr>${headers
            .map((h) => `<td>${escapeHtml(r[h])}</td>`)
            .join('')}</tr>`
      )
      .join('');

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8" /></head>
        <body>
          <table border="1">
            <caption><strong>${escapeHtml(sheetName)}</strong></caption>
            <thead><tr>${headCells}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </body>
      </html>
    `;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    this.triggerDownload(blob, filename.endsWith('.xls') ? filename : `${filename}.xls`);
  }

  triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export default new FinanceService();
