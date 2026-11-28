import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Save,
  CheckCircle2,
  AlertCircle,
  Users,
  UserCog,
  FileText,
  History,
  ShieldCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import smsService from '../../services/smsService.js';

const STATUS_BADGE = {
  PENDING: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  SENT: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  DELIVERED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  FAILED: 'bg-red-500/10 text-red-400 border-red-500/30',
};

function ToggleSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer ${
        checked
          ? 'bg-emerald-600 border-emerald-500'
          : 'bg-[#252525] border-[#3A3A3A]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function SmsSettings() {
  const [activeTab, setActiveTab] = useState('settings'); // 'settings' | 'templates' | 'history'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [catalog, setCatalog] = useState({ member: [], staff: [] });
  const [providerStatus, setProviderStatus] = useState(null);
  const [form, setForm] = useState({
    memberNotifications: {},
    staffNotifications: {},
    membershipExpiryNotificationDays: 7,
    dailySummaryTime: '21:00',
    absentAlertDays: 7,
    balancePreNotifyDays: 3,
    sessionPreNotifyMinutes: 60,
    ownerName: 'Owner',
    ownerPhone: '',
    dltConfig: { senderId: '', entityId: '', providerName: 'DLT_HTTP_GATEWAY' },
  });

  // Templates
  const [templates, setTemplates] = useState([]);
  const [editingTpl, setEditingTpl] = useState(null);
  const [tplSaving, setTplSaving] = useState(false);

  // History
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilters, setLogFilters] = useState({
    audience: 'ALL',
    notificationKey: 'ALL',
    status: 'ALL',
    from: '',
    to: '',
    search: '',
    page: 1,
  });
  const [logPagination, setLogPagination] = useState({ total: 0, totalPages: 1 });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await smsService.getSettings();
      if (res.settings) setForm(res.settings);
      if (res.catalog) setCatalog(res.catalog);
      if (res.provider) setProviderStatus(res.provider);
    } catch (err) {
      setError(err.message || 'Failed to load SMS settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await smsService.getTemplates();
      setTemplates(res.templates || []);
    } catch (err) {
      setError(err.message || 'Failed to load SMS templates.');
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await smsService.getLogs({ ...logFilters, limit: 15 });
      setLogs(res.logs || []);
      setLogPagination({ total: res.total || 0, totalPages: res.totalPages || 1 });
    } catch (err) {
      setError(err.message || 'Failed to load SMS history.');
    } finally {
      setLogsLoading(false);
    }
  }, [logFilters]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (activeTab === 'templates') loadTemplates();
    if (activeTab === 'history') loadLogs();
  }, [activeTab, loadTemplates, loadLogs]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await smsService.updateSettings(form);
      if (res.settings) setForm(res.settings);
      if (res.provider) setProviderStatus(res.provider);
      setSuccess(res.message || 'SMS settings saved successfully.');
    } catch (err) {
      setError(err.message || 'Failed to save SMS settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!editingTpl) return;
    setTplSaving(true);
    setError('');
    setSuccess('');
    try {
      await smsService.updateTemplate(editingTpl.key, {
        body: editingTpl.body,
        dltTemplateId: editingTpl.dltTemplateId,
        senderId: editingTpl.senderId,
        classification: editingTpl.classification,
        isActive: editingTpl.isActive,
      });
      setSuccess(`Template "${editingTpl.label}" updated.`);
      setEditingTpl(null);
      loadTemplates();
    } catch (err) {
      setError(err.message || 'Failed to update template.');
    } finally {
      setTplSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl min-w-0">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#252525]">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#EB3E2E] block mb-1">
            TRAI / DLT &amp; AUTOMATED ALERTS
          </span>
          <h1 className="mm-page-title text-2xl sm:text-3xl flex items-center gap-2.5">
            <MessageSquare className="w-7 h-7 text-[#EB3E2E]" />
            <span>SMS SETTINGS &amp; NOTIFICATIONS</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#B8B8B8] mt-1">
            Configure member &amp; staff SMS triggers, reminder schedules, DLT templates, and delivery history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
              providerStatus?.configured
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}
          >
            Gateway: {providerStatus?.configured ? 'Configured' : 'Server Env Pending'}
          </span>
        </div>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'settings', label: 'SMS Settings', icon: MessageSquare },
          { key: 'templates', label: 'SMS Templates', icon: FileText },
          { key: 'history', label: 'SMS History', icon: History },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                active
                  ? 'bg-[#EB3E2E] text-white'
                  : 'bg-[#181818] border border-[#303030] text-[#B8B8B8] hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/35 text-xs text-red-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError('')} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/35 text-xs text-emerald-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
          <button type="button" onClick={() => setSuccess('')} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {loading ? (
            <div className="p-10 bg-[#181818] border border-[#303030] rounded-2xl text-center text-xs text-[#858585]">
              Loading SMS configuration...
            </div>
          ) : (
            <>
              {/* SCHEDULE, OWNER & DLT CONFIGURATION */}
              <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-[#252525] pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]">
                    Schedule, Owner Recipient &amp; TRAI/DLT Configuration
                  </h3>
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-[#858585]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#EB3E2E]" />
                    API keys remain strictly server-side
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                      Membership Expiry Notification - Days
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={form.membershipExpiryNotificationDays}
                      onChange={(e) =>
                        setForm({ ...form, membershipExpiryNotificationDays: Number(e.target.value) })
                      }
                      className="mm-input"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                      Daily Summary Time (IST)
                    </label>
                    <input
                      type="time"
                      value={form.dailySummaryTime}
                      onChange={(e) => setForm({ ...form, dailySummaryTime: e.target.value })}
                      className="mm-input"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                      Owner Name
                    </label>
                    <input
                      type="text"
                      value={form.ownerName}
                      onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                      placeholder="Owner"
                      className="mm-input"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                      Owner Mobile Number
                    </label>
                    <input
                      type="text"
                      value={form.ownerPhone}
                      onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })}
                      placeholder="+91 9876543210"
                      className="mm-input"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                      Absent Alert Threshold (Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={form.absentAlertDays}
                      onChange={(e) => setForm({ ...form, absentAlertDays: Number(e.target.value) })}
                      className="mm-input"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                      Balance Pre-Notify (Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={form.balancePreNotifyDays}
                      onChange={(e) => setForm({ ...form, balancePreNotifyDays: Number(e.target.value) })}
                      className="mm-input"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                      DLT Sender ID (6 chars)
                    </label>
                    <input
                      type="text"
                      value={form.dltConfig?.senderId || ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          dltConfig: { ...form.dltConfig, senderId: e.target.value.toUpperCase() },
                        })
                      }
                      placeholder="e.g. MANMAC"
                      className="mm-input font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                      DLT Entity ID
                    </label>
                    <input
                      type="text"
                      value={form.dltConfig?.entityId || ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          dltConfig: { ...form.dltConfig, entityId: e.target.value },
                        })
                      }
                      placeholder="TRAI DLT Entity ID"
                      className="mm-input font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* TWO SEPARATE PANELS: MEMBER (22) & STAFF (23) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* PANEL A: MEMBER */}
                <div className="bg-[#181818] border border-[#303030] rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 bg-[#141414] border-b border-[#2A2A2A] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#EB3E2E]" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-[#F5F5F5]">
                        MEMBER ({catalog.member.length})
                      </h3>
                    </div>
                    <span className="text-[11px] text-[#858585]">Sent to Member Mobile</span>
                  </div>

                  <div className="divide-y divide-[#252525] max-h-[620px] overflow-y-auto">
                    {catalog.member.map((item) => (
                      <div key={item.key} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-[#1E1E1E]">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[#F5F5F5]">{item.label}</div>
                          <div className="text-[10px] font-mono text-[#858585]">{item.classification}</div>
                        </div>
                        <ToggleSwitch
                          label={item.label}
                          checked={Boolean(form.memberNotifications?.[item.key])}
                          onChange={(val) =>
                            setForm((prev) => ({
                              ...prev,
                              memberNotifications: { ...prev.memberNotifications, [item.key]: val },
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* PANEL B: STAFF */}
                <div className="bg-[#181818] border border-[#303030] rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 bg-[#141414] border-b border-[#2A2A2A] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCog className="w-4 h-4 text-[#EB3E2E]" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-[#F5F5F5]">
                        STAFF ({catalog.staff.length})
                      </h3>
                    </div>
                    <span className="text-[11px] text-[#858585]">Owner &amp; Assigned Trainer</span>
                  </div>

                  <div className="divide-y divide-[#252525] max-h-[620px] overflow-y-auto">
                    {catalog.staff.map((item) => (
                      <div key={item.key} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-[#1E1E1E]">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[#F5F5F5]">{item.label}</div>
                          <div className="text-[10px] font-mono text-[#858585]">
                            Recipient: {item.recipientRole === 'TRAINER' ? 'Assigned Trainer' : 'Configured Owner'}
                          </div>
                        </div>
                        <ToggleSwitch
                          label={item.label}
                          checked={Boolean(form.staffNotifications?.[item.key])}
                          onChange={(val) =>
                            setForm((prev) => ({
                              ...prev,
                              staffNotifications: { ...prev.staffNotifications, [item.key]: val },
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving Settings...' : 'Save Settings'}</span>
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {/* TAB 2: TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#181818] border border-[#303030] text-xs text-[#B8B8B8]">
            <strong className="text-[#F5F5F5]">Supported Placeholders:</strong>{' '}
            <span className="font-mono text-[11px]">
              {'{{memberName}} {{memberId}} {{membershipName}} {{expiryDate}} {{paymentAmount}} {{dueAmount}} {{branchName}} {{trainerName}} {{workoutPlan}} {{sessionDate}} {{sessionTime}} {{lockerNumber}} {{ownerName}}'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tpl) => (
              <div key={tpl.key} className="bg-[#181818] border border-[#303030] rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#202020] text-[#EB3E2E] mr-2">
                      {tpl.audience}
                    </span>
                    <strong className="text-[#F5F5F5]">{tpl.label}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingTpl({ ...tpl })}
                    className="px-3 py-1 rounded-lg bg-[#202020] hover:bg-[#2A2A2A] border border-[#303030] text-[11px] font-bold uppercase text-white cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-[#B8B8B8] bg-[#111111] border border-[#252525] rounded-xl p-3 font-mono text-[11px]">
                  {tpl.body}
                </p>
                <div className="flex items-center justify-between text-[10px] text-[#858585] font-mono">
                  <span>DLT ID: {tpl.dltTemplateId || 'Not set'}</span>
                  <span>{tpl.classification}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SMS HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#858585] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search recipient or text..."
                value={logFilters.search}
                onChange={(e) => setLogFilters({ ...logFilters, search: e.target.value, page: 1 })}
                className="mm-input pl-9"
              />
            </div>

            <select
              value={logFilters.audience}
              onChange={(e) => setLogFilters({ ...logFilters, audience: e.target.value, page: 1 })}
              className="mm-select"
            >
              <option value="ALL">All Audiences (Member &amp; Staff)</option>
              <option value="MEMBER">Member</option>
              <option value="STAFF">Staff</option>
            </select>

            <select
              value={logFilters.status}
              onChange={(e) => setLogFilters({ ...logFilters, status: e.target.value, page: 1 })}
              className="mm-select"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="SENT">Sent</option>
              <option value="DELIVERED">Delivered</option>
              <option value="FAILED">Failed</option>
            </select>

            <input
              type="date"
              value={logFilters.from}
              onChange={(e) => setLogFilters({ ...logFilters, from: e.target.value, page: 1 })}
              className="mm-input"
            />
            <input
              type="date"
              value={logFilters.to}
              onChange={(e) => setLogFilters({ ...logFilters, to: e.target.value, page: 1 })}
              className="mm-input"
            />
          </div>

          <div className="bg-[#181818] border border-[#303030] rounded-2xl overflow-hidden">
            {logsLoading ? (
              <div className="p-10 text-center text-xs text-[#858585]">Loading SMS history...</div>
            ) : logs.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#858585]">No SMS logs match your filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[850px] text-xs">
                  <thead>
                    <tr className="bg-[#141414] border-b border-[#2A2A2A] text-[10px] font-bold uppercase text-[#858585]">
                      <th className="py-3 px-4">Date &amp; Time (IST)</th>
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Notification Type</th>
                      <th className="py-3 px-4">Message Preview</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Provider / Failure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252525]">
                    {logs.map((l) => (
                      <tr key={l._id} className="hover:bg-[#1E1E1E]">
                        <td className="py-3 px-4 font-mono text-[#B8B8B8] whitespace-nowrap">
                          {new Date(l.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#F5F5F5]">{l.recipientName || '—'}</div>
                          <div className="text-[11px] font-mono text-[#858585]">
                            {l.recipientPhone} ({l.recipientType})
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#D4D4D4]">{l.notificationLabel || l.notificationKey}</div>
                          <div className="text-[10px] text-[#858585]">{l.audience}</div>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-[#B8B8B8]" title={l.messagePreview}>
                          {l.messagePreview || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              STATUS_BADGE[l.status] || STATUS_BADGE.PENDING
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-[#858585]">
                          {l.failureReason || l.providerResponse || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {logPagination.totalPages > 1 && (
              <div className="px-4 py-3 bg-[#141414] border-t border-[#2A2A2A] flex items-center justify-between text-xs text-[#858585]">
                <span>
                  Page {logFilters.page} of {logPagination.totalPages} ({logPagination.total} total)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={logFilters.page <= 1}
                    onClick={() => setLogFilters({ ...logFilters, page: logFilters.page - 1 })}
                    className="p-2 rounded-lg bg-[#202020] border border-[#303030] disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={logFilters.page >= logPagination.totalPages}
                    onClick={() => setLogFilters({ ...logFilters, page: logFilters.page + 1 })}
                    className="p-2 rounded-lg bg-[#202020] border border-[#303030] disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT TEMPLATE MODAL */}
      {editingTpl && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#141414] border border-[#303030] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold uppercase text-[#F5F5F5]">
                Edit Template — {editingTpl.label}
              </h3>
              <button type="button" onClick={() => setEditingTpl(null)} className="text-[#858585] hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#B8B8B8] mb-1">
                  Message Body
                </label>
                <textarea
                  rows={4}
                  required
                  value={editingTpl.body}
                  onChange={(e) => setEditingTpl({ ...editingTpl, body: e.target.value })}
                  className="mm-input font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#B8B8B8] mb-1">
                    DLT Template ID
                  </label>
                  <input
                    type="text"
                    value={editingTpl.dltTemplateId || ''}
                    onChange={(e) => setEditingTpl({ ...editingTpl, dltTemplateId: e.target.value })}
                    className="mm-input font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#B8B8B8] mb-1">
                    Classification
                  </label>
                  <select
                    value={editingTpl.classification}
                    onChange={(e) => setEditingTpl({ ...editingTpl, classification: e.target.value })}
                    className="mm-select"
                  >
                    <option value="TRANSACTIONAL">TRANSACTIONAL</option>
                    <option value="SERVICE_IMPLICIT">SERVICE_IMPLICIT</option>
                    <option value="SERVICE_EXPLICIT">SERVICE_EXPLICIT</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTpl(null)}
                  className="px-4 py-2 rounded-xl bg-[#202020] text-[#B8B8B8] text-xs font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={tplSaving}
                  className="px-4 py-2 rounded-xl bg-[#EB3E2E] text-white text-xs font-bold uppercase cursor-pointer disabled:opacity-50"
                >
                  {tplSaving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
