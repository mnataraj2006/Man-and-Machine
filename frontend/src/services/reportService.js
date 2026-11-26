import authService from './auth.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ReportService {
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

  async request(endpoint, params = {}) {
    const cleanParams = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'ALL') {
        cleanParams[k] = v;
      }
    });
    const qs = new URLSearchParams(cleanParams).toString();
    const url = `${API_BASE_URL}/reports${endpoint}${qs ? `?${qs}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        authService.logout();
        window.location.href = '/login';
      }
      throw new Error(data.message || `Failed to load report (${response.status})`);
    }
    return data;
  }

  getSummary(params = {}) {
    return this.request('/summary', params);
  }
  getMembersReport(params = {}) {
    return this.request('/members', params);
  }
  getMembershipsReport(params = {}) {
    return this.request('/memberships', params);
  }
  getAttendanceReport(params = {}) {
    return this.request('/attendance', params);
  }
  getRevenueReport(params = {}) {
    return this.request('/revenue', params);
  }
  getPaymentsReport(params = {}) {
    return this.request('/payments', params);
  }
  getExpensesReport(params = {}) {
    return this.request('/expenses', params);
  }
  getTrainersReport(params = {}) {
    return this.request('/trainers', params);
  }
  getLeadsReport(params = {}) {
    return this.request('/leads', params);
  }
  getBranchesReport(params = {}) {
    return this.request('/branches', params);
  }

  // ── EXPORTS (CSV, Excel, PDF) ──

  formatCell(val) {
    if (val === null || val === undefined) return '';
    return String(val);
  }

  exportCSV(rows, columns, filename = 'report.csv') {
    const header = columns.map((c) => `"${String(c.label).replace(/"/g, '""')}"`).join(',');
    const body = rows.map((row) =>
      columns
        .map((c) => {
          const raw = typeof c.accessor === 'function' ? c.accessor(row) : row[c.key];
          return `"${this.formatCell(raw).replace(/"/g, '""')}"`;
        })
        .join(',')
    );
    const csv = [header, ...body].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportExcel(rows, columns, title = 'MAN & MACHINE Report', filename = 'report.xls') {
    const ths = columns.map((c) => `<th style="background:#181818;color:#fff;padding:8px;border:1px solid #303030;">${c.label}</th>`).join('');
    const trs = rows
      .map(
        (row) =>
          `<tr>${columns
            .map((c) => {
              const raw = typeof c.accessor === 'function' ? c.accessor(row) : row[c.key];
              return `<td style="padding:6px;border:1px solid #ccc;">${this.formatCell(raw)}</td>`;
            })
            .join('')}</tr>`
      )
      .join('');

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8" /></head>
        <body>
          <h3>${title}</h3>
          <table border="1" cellspacing="0" cellpadding="4">
            <thead><tr>${ths}</tr></thead>
            <tbody>${trs}</tbody>
          </table>
        </body>
      </html>
    `;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportPDF(rows, columns, title = 'MAN & MACHINE Report', subtitle = '', kpis = []) {
    const win = window.open('', '_blank', 'width=1000,height=720');
    if (!win) return;

    const kpiHtml = kpis.length
      ? `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0;">
          ${kpis
            .map(
              (k) =>
                `<div style="border:1px solid #ddd;padding:10px;border-radius:6px;">
                  <div style="font-size:10px;text-transform:uppercase;color:#666;">${k.label}</div>
                  <div style="font-size:16px;font-weight:bold;margin-top:4px;">${k.value}</div>
                </div>`
            )
            .join('')}
        </div>`
      : '';

    const ths = columns.map((c) => `<th style="text-align:left;padding:8px;border-bottom:2px solid #111;font-size:11px;text-transform:uppercase;">${c.label}</th>`).join('');
    const trs = rows
      .map(
        (row) =>
          `<tr>${columns
            .map((c) => {
              const raw = typeof c.accessor === 'function' ? c.accessor(row) : row[c.key];
              return `<td style="padding:7px 8px;border-bottom:1px solid #e5e5e5;font-size:11px;">${this.formatCell(raw)}</td>`;
            })
            .join('')}</tr>`
      )
      .join('');

    win.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #111; }
            h1 { margin: 0; font-size: 20px; letter-spacing: 0.5px; }
            .sub { color: #555; font-size: 12px; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>MAN &amp; MACHINE FITNESS — ${title}</h1>
          <div class="sub">${subtitle} • Generated ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</div>
          ${kpiHtml}
          <table>
            <thead><tr>${ths}</tr></thead>
            <tbody>${trs || '<tr><td colspan="' + columns.length + '" style="padding:16px;text-align:center;color:#777;">No data available for the selected period.</td></tr>'}</tbody>
          </table>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    win.document.close();
  }
}

export default new ReportService();
