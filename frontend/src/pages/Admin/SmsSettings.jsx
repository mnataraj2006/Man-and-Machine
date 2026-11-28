import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Mail,
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
  Eye,
  Server,
  Send,
  PlugZap,
} from 'lucide-react';
import smsService from '../../services/smsService.js';

const STATUS_BADGE = {
  PENDING: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  SENT: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  DELIVERED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  FAILED: 'bg-red-500/10 text-red-400 border-red-500/30',
};

const PLACEHOLDERS = [
  '{{memberName}}',
  '{{memberId}}',
  '{{membershipName}}',
  '{{expiryDate}}',
  '{{paymentAmount}}',
  '{{dueAmount}}',
  '{{branchName}}',
  '{{trainerName}}',
  '{{workoutPlan}}',
  '{{sessionDate}}',
  '{{sessionTime}}',
  '{{lockerNumber}}',
  '{{ownerName}}',
];

function ToggleSwitch({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      } ${checked ? 'bg-emerald-600 border-emerald-500' : 'bg-[#252525] border-[#3A3A3A]'}`}
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
  const [activeTab, setActiveTab] = useState('settings'); // 'settings' | 'sms_templates' | 'email_templates' | 'sms_history' | 'email_history'
  const [channelScope, setChannelScope] = useState('BOTH'); // 'BOTH' | 'SMS' | 'EMAIL'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [catalog, setCatalog] = useState({ member: [], staff: [] });
  const [providerStatus, setProviderStatus] = useState(null);
  const [emailProviderStatus, setEmailProviderStatus] = useState(null);
  const [form, setForm] = useState({
    smsEnabled: true,
    emailEnabled: false,
    memberNotifications: {},
    staffNotifications: {},
    emailMemberNotifications: {},
    emailStaffNotifications: {},
    membershipExpiryNotificationDays: 7,
    dailySummaryTime: '21:00',
    absentAlertDays: 7,
    balancePreNotifyDays: 3,
    sessionPreNotifyMinutes: 60,
    ownerName: 'Owner',
    ownerPhone: '',
    ownerEmail: '',
    dltConfig: { senderId: '', entityId: '', providerName: 'DLT_HTTP_GATEWAY' },
    smtpConfig: {
      host: '',
      port: 587,
      secure: false,
      username: '',
      password: '',
      hasPassword: false,
      senderEmail: '',
      senderName: 'Man & Machine Fitness',
      replyTo: '',
    },
  });

  // SMTP Test
  const [testingConn, setTestingConn] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState('');
  const [smtpNotice, setSmtpNotice] = useState(null);

  // SMS Templates
  const [smsTemplates, setSmsTemplates] = useState([]);
  const [editingSmsTpl, setEditingSmsTpl] = useState(null);

  // Email Templates
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [editingEmailTpl, setEditingEmailTpl] = useState(null);
  const [emailPreview, setEmailPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [tplSaving, setTplSaving] = useState(false);

  // SMS History
  const [smsLogs, setSmsLogs] = useState([]);
  const [smsLogsLoading, setSmsLogsLoading] = useState(false);
  const [smsLogFilters, setSmsLogFilters] = useState({
    audience: 'ALL',
    notificationKey: 'ALL',
    status: 'ALL',
    from: '',
    to: '',
    search: '',
    page: 1,
  });
  const [smsLogPagination, setSmsLogPagination] = useState({ total: 0, totalPages: 1 });

  // Email History
  const [emailLogs, setEmailLogs] = useState([]);
  const [emailLogsLoading, setEmailLogsLoading] = useState(false);
  const [emailLogFilters, setEmailLogFilters] = useState({
    audience: 'ALL',
    recipientType: 'ALL',
    notificationKey: 'ALL',
    status: 'ALL',
    from: '',
    to: '',
    search: '',
    page: 1,
  });
  const [emailLogPagination, setEmailLogPagination] = useState({ total: 0, totalPages: 1 });
  const [inspectEmailLog, setInspectEmailLog] = useState(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await smsService.getSettings();
      if (res.settings) {
        setForm({
          ...res.settings,
          smtpConfig: {
            ...(res.settings.smtpConfig || {}),
            password: '',
          },
        });
      }
      if (res.catalog) setCatalog(res.catalog);
      if (res.provider) setProviderStatus(res.provider);
      if (res.emailProvider) setEmailProviderStatus(res.emailProvider);
    } catch (err) {
      setError(err.message || 'Failed to load communication settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSmsTemplates = useCallback(async () => {
    try {
      const res = await smsService.getTemplates();
      setSmsTemplates(res.templates || []);
    } catch (err) {
      setError(err.message || 'Failed to load SMS templates.');
    }
  }, []);

  const loadEmailTemplates = useCallback(async () => {
    try {
      const res = await smsService.getEmailTemplates();
      setEmailTemplates(res.templates || []);
    } catch (err) {
      setError(err.message || 'Failed to load Email templates.');
    }
  }, []);

  const loadSmsLogs = useCallback(async () => {
    setSmsLogsLoading(true);
    try {
      const res = await smsService.getLogs({ ...smsLogFilters, limit: 15 });
      setSmsLogs(res.logs || []);
      setSmsLogPagination({ total: res.total || 0, totalPages: res.totalPages || 1 });
    } catch (err) {
      setError(err.message || 'Failed to load SMS history.');
    } finally {
      setSmsLogsLoading(false);
    }
  }, [smsLogFilters]);

  const loadEmailLogs = useCallback(async () => {
    setEmailLogsLoading(true);
    try {
      const res = await smsService.getEmailLogs({ ...emailLogFilters, limit: 15 });
      setEmailLogs(res.logs || []);
      setEmailLogPagination({ total: res.total || 0, totalPages: res.totalPages || 1 });
    } catch (err) {
      setError(err.message || 'Failed to load Email history.');
    } finally {
      setEmailLogsLoading(false);
    }
  }, [emailLogFilters]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (activeTab === 'sms_templates') loadSmsTemplates();
    if (activeTab === 'email_templates') loadEmailTemplates();
    if (activeTab === 'sms_history') loadSmsLogs();
    if (activeTab === 'email_history') loadEmailLogs();
  }, [activeTab, loadSmsTemplates, loadEmailTemplates, loadSmsLogs, loadEmailLogs]);

  const toggleSmsMember = (key, value) => {
    setForm((prev) => ({
      ...prev,
      memberNotifications: { ...prev.memberNotifications, [key]: value },
    }));
  };

  const toggleSmsStaff = (key, value) => {
    setForm((prev) => ({
      ...prev,
      staffNotifications: { ...prev.staffNotifications, [key]: value },
    }));
  };

  const toggleEmailMember = (key, value) => {
    setForm((prev) => ({
      ...prev,
      emailMemberNotifications: { ...prev.emailMemberNotifications, [key]: value },
    }));
  };

  const toggleEmailStaff = (key, value) => {
    setForm((prev) => ({
      ...prev,
      emailStaffNotifications: { ...prev.emailStaffNotifications, [key]: value },
    }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await smsService.updateSettings(form);
      if (res.settings) {
        setForm({
          ...res.settings,
          smtpConfig: { ...(res.settings.smtpConfig || {}), password: '' },
        });
      }
      if (res.provider) setProviderStatus(res.provider);
      if (res.emailProvider) setEmailProviderStatus(res.emailProvider);
      setSuccess('Communication settings saved to database.');
    } catch (err) {
      setError(err.message || 'Failed to save communication settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtpConnection = async () => {
    setTestingConn(true);
    setSmtpNotice(null);
    try {
      const res = await smsService.testSmtpConnection();
      setSmtpNotice({ ok: true, text: res.message || 'SMTP handshake succeeded.' });
    } catch (err) {
      setSmtpNotice({ ok: false, text: err.message || 'SMTP connection test failed.' });
    } finally {
      setTestingConn(false);
    }
  };

  const handleSendTestEmail = async () => {
    setSendingTest(true);
    setSmtpNotice(null);
    try {
      const res = await smsService.sendTestEmail(testEmailTo || form.ownerEmail);
      setSmtpNotice({ ok: true, text: res.message || 'Test email accepted.' });
    } catch (err) {
      setSmtpNotice({ ok: false, text: err.message || 'Failed to send test email.' });
    } finally {
      setSendingTest(false);
    }
  };

  const handleSaveSmsTemplate = async (e) => {
    e.preventDefault();
    if (!editingSmsTpl) return;
    setTplSaving(true);
    setError('');
    setSuccess('');
    try {
      await smsService.updateTemplate(editingSmsTpl.key, {
        body: editingSmsTpl.body,
        dltTemplateId: editingSmsTpl.dltTemplateId,
        senderId: editingSmsTpl.senderId,
        classification: editingSmsTpl.classification,
        isActive: editingSmsTpl.isActive,
      });
      setEditingSmsTpl(null);
      setSuccess('SMS template updated.');
      await loadSmsTemplates();
    } catch (err) {
      setError(err.message || 'Failed to save SMS template.');
    } finally {
      setTplSaving(false);
    }
  };

  const handlePreviewEmailTemplate = async (tpl) => {
    setPreviewLoading(true);
    setError('');
    try {
      const res = await smsService.previewEmailTemplate(tpl.key, {
        subject: tpl.subject,
        body: tpl.body,
        htmlBody: tpl.htmlBody,
      });
      setEmailPreview(res.preview || null);
    } catch (err) {
      setError(err.message || 'Preview failed (check placeholders).');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSaveEmailTemplate = async (e) => {
    e.preventDefault();
    if (!editingEmailTpl) return;
    setTplSaving(true);
    setError('');
    setSuccess('');
    try {
      await smsService.updateEmailTemplate(editingEmailTpl.key, {
        subject: editingEmailTpl.subject,
        body: editingEmailTpl.body,
        htmlBody: editingEmailTpl.htmlBody,
        isActive: editingEmailTpl.isActive,
      });
      setEditingEmailTpl(null);
      setEmailPreview(null);
      setSuccess('Email template updated.');
      await loadEmailTemplates();
    } catch (err) {
      setError(err.message || 'Failed to save Email template.');
    } finally {
      setTplSaving(false);
    }
  };

  const allNotificationOptions = [...catalog.member, ...catalog.staff];

  const renderToggleSection = (title, Icon, items, smsMap, emailMap, onSmsChange, onEmailChange) => (
    <div className="bg-[#141414] border border-[#252525] rounded-2xl p-6">
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[#222222]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{title}</h2>
            <p className="text-xs text-[#888888]">{items.length} independent channel toggles</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-[#1E1E1E]">
        {items.map((item, idx) => (
          <div
            key={item.key}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-2 rounded-lg hover:bg-[#191919] transition-colors"
          >
            <div>
              <div className="text-sm font-medium text-white">
                {idx + 1}. {item.label}
              </div>
              <div className="text-[11px] text-[#777777] font-mono">
                {item.key}
                {item.recipientRole ? ` • ${item.recipientRole}` : ''}
              </div>
            </div>

            <div className="flex items-center gap-5 shrink-0">
              {(channelScope === 'BOTH' || channelScope === 'SMS') && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                    SMS
                  </span>
                  <ToggleSwitch
                    checked={Boolean(smsMap?.[item.key])}
                    onChange={(val) => onSmsChange(item.key, val)}
                    label={`${item.label} SMS`}
                    disabled={!form.smsEnabled}
                  />
                </div>
              )}

              {(channelScope === 'BOTH' || channelScope === 'EMAIL') && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-400">
                    Email
                  </span>
                  <ToggleSwitch
                    checked={Boolean(emailMap?.[item.key])}
                    onChange={(val) => onEmailChange(item.key, val)}
                    label={`${item.label} Email`}
                    disabled={!form.emailEnabled}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-amber-400" />
            Communication Settings (SMS &amp; Email)
          </h1>
          <p className="text-sm text-[#999999] mt-1">
            Independent SMS and Email channel controls for Member and Staff notifications, templates, SMTP, and delivery history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-[#2A2A2A] bg-[#161616] text-[#B3B3B3]">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>SMS: {providerStatus?.configured ? 'Configured' : 'Env Pending'}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-[#2A2A2A] bg-[#161616] text-[#B3B3B3]">
            <Mail className="w-3.5 h-3.5 text-sky-400" />
            <span>Email: {emailProviderStatus?.configured ? emailProviderStatus.mode : 'Not Configured'}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#252525] pb-2">
        {[
          { id: 'settings', label: 'Notification Settings', icon: MessageSquare },
          { id: 'sms_templates', label: 'SMS Templates', icon: FileText },
          { id: 'email_templates', label: 'Email Templates', icon: Mail },
          { id: 'sms_history', label: 'SMS History', icon: History },
          { id: 'email_history', label: 'Email History', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-amber-500 text-black'
                  : 'bg-[#161616] text-[#B3B3B3] hover:text-white border border-[#262626]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* TAB 1: CENTRALIZED SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {loading ? (
            <div className="p-8 text-center text-[#999999]">Loading communication settings...</div>
          ) : (
            <>
              {/* Global Channel Master Switches & View Filter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#141414] border border-[#252525] rounded-2xl p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Global SMS Channel</div>
                      <div className="text-xs text-[#888888]">
                        Master switch. Turning OFF pauses all SMS without erasing individual toggles.
                      </div>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={Boolean(form.smsEnabled)}
                    onChange={(val) => setForm((p) => ({ ...p, smsEnabled: val }))}
                    label="Global SMS Channel"
                  />
                </div>

                <div className="bg-[#141414] border border-[#252525] rounded-2xl p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Global Email Channel</div>
                      <div className="text-xs text-[#888888]">
                        Master switch. Turning OFF pauses all Emails without erasing individual toggles.
                      </div>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={Boolean(form.emailEnabled)}
                    onChange={(val) => setForm((p) => ({ ...p, emailEnabled: val }))}
                    label="Global Email Channel"
                  />
                </div>
              </div>

              {/* Channel Filter + Save */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-1 bg-[#141414] border border-[#252525] rounded-xl p-1">
                  {[
                    { id: 'BOTH', label: 'All Channels (SMS & Email)' },
                    { id: 'SMS', label: 'SMS Only' },
                    { id: 'EMAIL', label: 'Email Only' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setChannelScope(opt.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        channelScope === opt.id
                          ? 'bg-[#262626] text-white'
                          : 'text-[#888888] hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm disabled:opacity-60 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save All Communication Settings'}
                </button>
              </div>

              {/* A. MEMBER & B. STAFF */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {renderToggleSection(
                  'A. MEMBER NOTIFICATIONS',
                  Users,
                  catalog.member,
                  form.memberNotifications,
                  form.emailMemberNotifications,
                  toggleSmsMember,
                  toggleEmailMember
                )}
                {renderToggleSection(
                  'B. STAFF & OWNER NOTIFICATIONS',
                  UserCog,
                  catalog.staff,
                  form.staffNotifications,
                  form.emailStaffNotifications,
                  toggleSmsStaff,
                  toggleEmailStaff
                )}
              </div>

              {/* Schedule, Owner & DLT Config */}
              <div className="bg-[#141414] border border-[#252525] rounded-2xl p-6 space-y-4">
                <h2 className="text-base font-bold text-white">Schedule, Owner Recipient &amp; DLT Settings</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-[#999999] mb-1">Membership Expiry Notification Days</label>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={form.membershipExpiryNotificationDays}
                      onChange={(e) => setForm((p) => ({ ...p, membershipExpiryNotificationDays: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#999999] mb-1">Daily Summary Time (IST HH:mm)</label>
                    <input
                      type="time"
                      value={form.dailySummaryTime}
                      onChange={(e) => setForm((p) => ({ ...p, dailySummaryTime: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#999999] mb-1">Absent Alert Threshold (Days)</label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={form.absentAlertDays}
                      onChange={(e) => setForm((p) => ({ ...p, absentAlertDays: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#999999] mb-1">Balance Pre-Notify Days</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={form.balancePreNotifyDays}
                      onChange={(e) => setForm((p) => ({ ...p, balancePreNotifyDays: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#999999] mb-1">Owner / Admin Name</label>
                    <input
                      type="text"
                      value={form.ownerName}
                      onChange={(e) => setForm((p) => ({ ...p, ownerName: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#999999] mb-1">Owner Mobile (SMS Alerts)</label>
                    <input
                      type="text"
                      placeholder="10-digit mobile"
                      value={form.ownerPhone}
                      onChange={(e) => setForm((p) => ({ ...p, ownerPhone: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#999999] mb-1">Owner Email (Summary &amp; Alerts)</label>
                    <input
                      type="email"
                      placeholder="owner@manandmachine.com"
                      value={form.ownerEmail || ''}
                      onChange={(e) => setForm((p) => ({ ...p, ownerEmail: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#999999] mb-1">TRAI DLT Sender ID</label>
                    <input
                      type="text"
                      maxLength={12}
                      placeholder="MANMCH"
                      value={form.dltConfig?.senderId || ''}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          dltConfig: { ...p.dltConfig, senderId: e.target.value.toUpperCase() },
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#999999] mb-1">TRAI DLT Entity ID</label>
                    <input
                      type="text"
                      placeholder="1101XXXXXXXXXXXX"
                      value={form.dltConfig?.entityId || ''}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          dltConfig: { ...p.dltConfig, entityId: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* SMTP Configuration */}
              <div className="bg-[#141414] border border-[#252525] rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Server className="w-5 h-5 text-sky-400" />
                    <div>
                      <h2 className="text-base font-bold text-white">SMTP Email Provider Configuration</h2>
                      <p className="text-xs text-[#888888]">
                        Credentials are encrypted at rest on the backend and never exposed to the browser.
                      </p>
                    </div>
                  </div>
                  {form.smtpConfig?.hasPassword && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      Password Stored Securely
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-[#999999] mb-1">SMTP Host</label>
                    <input
                      type="text"
                      placeholder="smtp.gmail.com"
                      value={form.smtpConfig?.host || ''}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, smtpConfig: { ...p.smtpConfig, host: e.target.value } }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#999999] mb-1">SMTP Port</label>
                    <input
                      type="number"
                      min={1}
                      max={65535}
                      value={form.smtpConfig?.port || 587}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          smtpConfig: { ...p.smtpConfig, port: Number(e.target.value) },
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#999999] mb-1">SMTP Username</label>
                    <input
                      type="text"
                      placeholder="notifications@domain.com"
                      value={form.smtpConfig?.username || ''}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, smtpConfig: { ...p.smtpConfig, username: e.target.value } }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#999999] mb-1">
                      SMTP Password / App Password {form.smtpConfig?.hasPassword ? '(leave blank to keep)' : ''}
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder={form.smtpConfig?.hasPassword ? '••••••••••••' : 'Enter password'}
                      value={form.smtpConfig?.password || ''}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, smtpConfig: { ...p.smtpConfig, password: e.target.value } }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#999999] mb-1">Sender Email</label>
                    <input
                      type="email"
                      placeholder="no-reply@manandmachine.com"
                      value={form.smtpConfig?.senderEmail || ''}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, smtpConfig: { ...p.smtpConfig, senderEmail: e.target.value } }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#999999] mb-1">Sender Display Name</label>
                    <input
                      type="text"
                      placeholder="Man & Machine Fitness"
                      value={form.smtpConfig?.senderName || ''}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, smtpConfig: { ...p.smtpConfig, senderName: e.target.value } }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#999999] mb-1">Reply-To Address</label>
                    <input
                      type="email"
                      placeholder="support@manandmachine.com"
                      value={form.smtpConfig?.replyTo || ''}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, smtpConfig: { ...p.smtpConfig, replyTo: e.target.value } }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="inline-flex items-center gap-2.5 text-sm text-white cursor-pointer">
                      <ToggleSwitch
                        checked={Boolean(form.smtpConfig?.secure)}
                        onChange={(val) =>
                          setForm((p) => ({ ...p, smtpConfig: { ...p.smtpConfig, secure: val } }))
                        }
                        label="Use TLS/SSL (Port 465)"
                      />
                      <span className="text-xs text-[#CCCCCC]">Use SSL/TLS</span>
                    </label>
                  </div>
                </div>

                {/* Test Connection & Test Email */}
                <div className="pt-3 border-t border-[#222222] flex flex-col sm:flex-row sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTestSmtpConnection}
                    disabled={testingConn}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1D1D1D] border border-[#333333] text-sm text-white hover:bg-[#252525] disabled:opacity-50"
                  >
                    <PlugZap className="w-4 h-4 text-sky-400" />
                    {testingConn ? 'Testing...' : 'Test SMTP Connection'}
                  </button>

                  <div className="flex items-center gap-2 flex-1 max-w-md">
                    <input
                      type="email"
                      placeholder="Recipient email for test..."
                      value={testEmailTo}
                      onChange={(e) => setTestEmailTo(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleSendTestEmail}
                      disabled={sendingTest}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      {sendingTest ? 'Sending...' : 'Send Test Email'}
                    </button>
                  </div>
                </div>

                {smtpNotice && (
                  <div
                    className={`p-3 rounded-xl text-xs border ${
                      smtpNotice.ok
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}
                  >
                    {smtpNotice.text}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm disabled:opacity-60 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {/* TAB 2: SMS TEMPLATES */}
      {activeTab === 'sms_templates' && (
        <div className="bg-[#141414] border border-[#252525] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">SMS Templates &amp; DLT Mapping</h2>
              <p className="text-xs text-[#888888]">
                Supported placeholders: {PLACEHOLDERS.join(', ')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {smsTemplates.map((tpl) => (
              <div key={tpl.key} className="p-4 rounded-xl bg-[#0F0F0F] border border-[#242424] flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white">{tpl.label}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#1E1E1E] text-[#AAAAAA]">
                      {tpl.audience}
                    </span>
                  </div>
                  <p className="text-xs text-[#999999] mt-2 leading-relaxed">{tpl.body}</p>
                  <div className="text-[11px] text-[#666666] mt-2 font-mono">
                    DLT ID: {tpl.dltTemplateId || 'Not set'} • {tpl.classification}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingSmsTpl({ ...tpl })}
                  className="self-start px-3 py-1.5 rounded-lg bg-[#1D1D1D] hover:bg-[#282828] border border-[#2F2F2F] text-xs text-amber-400 font-medium"
                >
                  Edit SMS Template
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: EMAIL TEMPLATES */}
      {activeTab === 'email_templates' && (
        <div className="bg-[#141414] border border-[#252525] rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-white">Email Templates (Branded HTML + Plain Text)</h2>
            <p className="text-xs text-[#888888]">
              Edit Subject &amp; Body with dynamic placeholders — Man &amp; Machine branded header &amp; footer are applied automatically. Preview before saving.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emailTemplates.map((tpl) => (
              <div key={tpl.key} className="p-4 rounded-xl bg-[#0F0F0F] border border-[#242424] flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white">{tpl.label}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
                      {tpl.audience}
                    </span>
                  </div>
                  <div className="text-xs text-amber-300/90 mt-2 font-medium">Subject: {tpl.subject}</div>
                  <p className="text-xs text-[#999999] mt-1 leading-relaxed">{tpl.body}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingEmailTpl({ ...tpl });
                    setEmailPreview(null);
                  }}
                  className="self-start px-3 py-1.5 rounded-lg bg-[#1D1D1D] hover:bg-[#282828] border border-[#2F2F2F] text-xs text-sky-400 font-medium"
                >
                  Edit &amp; Preview Email
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SMS HISTORY */}
      {activeTab === 'sms_history' && (
        <div className="bg-[#141414] border border-[#252525] rounded-2xl p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#777777] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search name, phone, message..."
                value={smsLogFilters.search}
                onChange={(e) => setSmsLogFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
              />
            </div>
            <select
              value={smsLogFilters.audience}
              onChange={(e) => setSmsLogFilters((f) => ({ ...f, audience: e.target.value, page: 1 }))}
              className="px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
            >
              <option value="ALL">All Audiences</option>
              <option value="MEMBER">Member</option>
              <option value="STAFF">Staff</option>
            </select>
            <select
              value={smsLogFilters.status}
              onChange={(e) => setSmsLogFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
              className="px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="SENT">SENT</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="FAILED">FAILED</option>
            </select>
            <input
              type="date"
              value={smsLogFilters.from}
              onChange={(e) => setSmsLogFilters((f) => ({ ...f, from: e.target.value, page: 1 }))}
              className="px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
            />
            <input
              type="date"
              value={smsLogFilters.to}
              onChange={(e) => setSmsLogFilters((f) => ({ ...f, to: e.target.value, page: 1 }))}
              className="px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#252525] text-[#888888] text-xs">
                  <th className="py-2.5 pr-4">Date &amp; Time</th>
                  <th className="py-2.5 pr-4">Recipient</th>
                  <th className="py-2.5 pr-4">Notification</th>
                  <th className="py-2.5 pr-4">Preview</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5">Provider / Failure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1E1E]">
                {smsLogsLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#888888]">
                      Loading SMS logs...
                    </td>
                  </tr>
                ) : smsLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#888888]">
                      No SMS logs found.
                    </td>
                  </tr>
                ) : (
                  smsLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-[#191919]">
                      <td className="py-3 pr-4 text-xs text-[#CCCCCC] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </td>
                      <td className="py-3 pr-4 text-xs">
                        <div className="text-white font-medium">{log.recipientName || '—'}</div>
                        <div className="text-[#888888] font-mono">{log.recipientPhone}</div>
                      </td>
                      <td className="py-3 pr-4 text-xs text-white">{log.notificationLabel || log.notificationKey}</td>
                      <td className="py-3 pr-4 text-xs text-[#AAAAAA] max-w-xs truncate">{log.messagePreview || '—'}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full border ${STATUS_BADGE[log.status] || ''}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-[#888888] max-w-xs truncate">
                        {log.failureReason || log.providerResponse || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2 text-xs text-[#888888]">
            <span>Total records: {smsLogPagination.total}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={smsLogFilters.page <= 1}
                onClick={() => setSmsLogFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))}
                className="p-1.5 rounded-lg border border-[#2C2C2C] disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                Page {smsLogFilters.page} / {smsLogPagination.totalPages}
              </span>
              <button
                type="button"
                disabled={smsLogFilters.page >= smsLogPagination.totalPages}
                onClick={() => setSmsLogFilters((f) => ({ ...f, page: f.page + 1 }))}
                className="p-1.5 rounded-lg border border-[#2C2C2C] disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: EMAIL HISTORY */}
      {activeTab === 'email_history' && (
        <div className="bg-[#141414] border border-[#252525] rounded-2xl p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#777777] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search email, name, subject..."
                value={emailLogFilters.search}
                onChange={(e) => setEmailLogFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
              />
            </div>
            <select
              value={emailLogFilters.audience}
              onChange={(e) => setEmailLogFilters((f) => ({ ...f, audience: e.target.value, page: 1 }))}
              className="px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
            >
              <option value="ALL">Member &amp; Staff</option>
              <option value="MEMBER">Member</option>
              <option value="STAFF">Staff</option>
            </select>
            <select
              value={emailLogFilters.notificationKey}
              onChange={(e) => setEmailLogFilters((f) => ({ ...f, notificationKey: e.target.value, page: 1 }))}
              className="px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
            >
              <option value="ALL">All Notification Types</option>
              {allNotificationOptions.map((n) => (
                <option key={n.key} value={n.key}>
                  {n.label}
                </option>
              ))}
            </select>
            <select
              value={emailLogFilters.status}
              onChange={(e) => setEmailLogFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
              className="px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="SENT">SENT</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="FAILED">FAILED</option>
            </select>
            <input
              type="date"
              value={emailLogFilters.from}
              onChange={(e) => setEmailLogFilters((f) => ({ ...f, from: e.target.value, page: 1 }))}
              className="px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
            />
            <input
              type="date"
              value={emailLogFilters.to}
              onChange={(e) => setEmailLogFilters((f) => ({ ...f, to: e.target.value, page: 1 }))}
              className="px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#252525] text-[#888888] text-xs">
                  <th className="py-2.5 pr-4">Date &amp; Time</th>
                  <th className="py-2.5 pr-4">Recipient</th>
                  <th className="py-2.5 pr-4">Notification</th>
                  <th className="py-2.5 pr-4">Subject &amp; Preview</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5 pr-4">Provider / Failure</th>
                  <th className="py-2.5">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1E1E]">
                {emailLogsLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#888888]">
                      Loading Email logs...
                    </td>
                  </tr>
                ) : emailLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#888888]">
                      No Email logs found.
                    </td>
                  </tr>
                ) : (
                  emailLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-[#191919]">
                      <td className="py-3 pr-4 text-xs text-[#CCCCCC] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </td>
                      <td className="py-3 pr-4 text-xs">
                        <div className="text-white font-medium">{log.recipientName || '—'}</div>
                        <div className="text-[#888888] font-mono">{log.recipientEmail || '—'}</div>
                      </td>
                      <td className="py-3 pr-4 text-xs text-white">{log.notificationKey}</td>
                      <td className="py-3 pr-4 text-xs max-w-xs">
                        <div className="text-white font-medium truncate">{log.subject || '—'}</div>
                        <div className="text-[#888888] truncate">{log.messagePreview || '—'}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full border ${STATUS_BADGE[log.status] || ''}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-[#888888] max-w-xs truncate">
                        {log.failureReason || log.providerResponse || '—'}
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => setInspectEmailLog(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1E1E1E] hover:bg-[#2A2A2A] text-xs text-sky-400"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2 text-xs text-[#888888]">
            <span>Total records: {emailLogPagination.total}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={emailLogFilters.page <= 1}
                onClick={() => setEmailLogFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))}
                className="p-1.5 rounded-lg border border-[#2C2C2C] disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                Page {emailLogFilters.page} / {emailLogPagination.totalPages}
              </span>
              <button
                type="button"
                disabled={emailLogFilters.page >= emailLogPagination.totalPages}
                onClick={() => setEmailLogFilters((f) => ({ ...f, page: f.page + 1 }))}
                className="p-1.5 rounded-lg border border-[#2C2C2C] disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit SMS Template Modal */}
      {editingSmsTpl && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSmsTemplate}
            className="w-full max-w-lg bg-[#141414] border border-[#2C2C2C] rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Edit SMS Template — {editingSmsTpl.label}</h3>
              <button type="button" onClick={() => setEditingSmsTpl(null)} className="text-[#888888] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs text-[#999999] mb-1">Message Body</label>
              <textarea
                rows={4}
                required
                value={editingSmsTpl.body}
                onChange={(e) => setEditingSmsTpl((p) => ({ ...p, body: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#999999] mb-1">DLT Template ID</label>
                <input
                  type="text"
                  value={editingSmsTpl.dltTemplateId || ''}
                  onChange={(e) => setEditingSmsTpl((p) => ({ ...p, dltTemplateId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#999999] mb-1">Sender ID Override</label>
                <input
                  type="text"
                  maxLength={12}
                  value={editingSmsTpl.senderId || ''}
                  onChange={(e) => setEditingSmsTpl((p) => ({ ...p, senderId: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingSmsTpl(null)}
                className="px-4 py-2 rounded-xl border border-[#2C2C2C] text-sm text-[#CCCCCC]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={tplSaving}
                className="px-4 py-2 rounded-xl bg-amber-500 text-black font-semibold text-sm disabled:opacity-60"
              >
                {tplSaving ? 'Saving...' : 'Save SMS Template'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit & Preview Email Template Modal */}
      {editingEmailTpl && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveEmailTemplate}
            className="w-full max-w-3xl bg-[#141414] border border-[#2C2C2C] rounded-2xl p-6 space-y-4 my-8"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Edit Email Template — {editingEmailTpl.label}</h3>
              <button
                type="button"
                onClick={() => {
                  setEditingEmailTpl(null);
                  setEmailPreview(null);
                }}
                className="text-[#888888] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-[11px] text-[#888888]">
              Placeholders: {PLACEHOLDERS.join(', ')}
            </div>

            <div>
              <label className="block text-xs text-[#999999] mb-1">Email Subject</label>
              <input
                type="text"
                required
                value={editingEmailTpl.subject}
                onChange={(e) => setEditingEmailTpl((p) => ({ ...p, subject: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-[#999999] mb-1">Email Body (Plain Text — Branded HTML generated automatically)</label>
              <textarea
                rows={4}
                required
                value={editingEmailTpl.body}
                onChange={(e) => setEditingEmailTpl((p) => ({ ...p, body: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-sm"
              />
            </div>

            <details className="text-xs text-[#999999]">
              <summary className="cursor-pointer hover:text-white">Optional Custom HTML Body (Advanced)</summary>
              <textarea
                rows={4}
                value={editingEmailTpl.htmlBody || ''}
                onChange={(e) => setEditingEmailTpl((p) => ({ ...p, htmlBody: e.target.value }))}
                placeholder="Leave blank to use the responsive Man & Machine branded layout automatically."
                className="w-full mt-2 px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#2C2C2C] text-white text-xs font-mono"
              />
            </details>

            {emailPreview && (
              <div className="border border-[#2C2C2C] rounded-xl overflow-hidden bg-white">
                <div className="bg-[#1A1A1A] px-3 py-2 text-xs text-[#CCCCCC] border-b border-[#2C2C2C]">
                  Preview Subject: <span className="text-white font-semibold">{emailPreview.subject}</span>
                </div>
                <iframe
                  title="Email Template Preview"
                  srcDoc={emailPreview.html}
                  className="w-full h-72 border-0"
                  sandbox=""
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => handlePreviewEmailTemplate(editingEmailTpl)}
                disabled={previewLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E1E1E] border border-[#333333] text-sm text-sky-400 hover:bg-[#282828]"
              >
                <Eye className="w-4 h-4" />
                {previewLoading ? 'Rendering...' : 'Preview Branded Email'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingEmailTpl(null);
                    setEmailPreview(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-[#2C2C2C] text-sm text-[#CCCCCC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={tplSaving}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-black font-semibold text-sm disabled:opacity-60"
                >
                  {tplSaving ? 'Saving...' : 'Save Email Template'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Inspect Email Log Modal */}
      {inspectEmailLog && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#141414] border border-[#2C2C2C] rounded-2xl p-6 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Email Attempt Details</h3>
              <button type="button" onClick={() => setInspectEmailLog(null)} className="text-[#888888] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div><span className="text-[#888888]">Status:</span> <span className="text-white font-semibold">{inspectEmailLog.status}</span></div>
              <div><span className="text-[#888888]">Recipient:</span> <span className="text-white">{inspectEmailLog.recipientName} ({inspectEmailLog.recipientEmail})</span></div>
              <div><span className="text-[#888888]">Type:</span> <span className="text-white font-mono">{inspectEmailLog.notificationKey}</span></div>
              <div><span className="text-[#888888]">Subject:</span> <span className="text-white">{inspectEmailLog.subject}</span></div>
              <div><span className="text-[#888888]">Preview:</span> <p className="mt-1 p-2.5 rounded-lg bg-[#0D0D0D] text-[#CCCCCC]">{inspectEmailLog.messagePreview || '—'}</p></div>
              <div><span className="text-[#888888]">Attempts:</span> <span className="text-white">{inspectEmailLog.attempts || 1}</span></div>
              <div><span className="text-[#888888]">Provider ID:</span> <span className="text-white font-mono">{inspectEmailLog.providerMessageId || '—'}</span></div>
              <div><span className="text-[#888888]">Provider Response:</span> <span className="text-white">{inspectEmailLog.providerResponse || '—'}</span></div>
              {inspectEmailLog.failureReason && (
                <div><span className="text-red-400">Failure Reason:</span> <span className="text-red-300">{inspectEmailLog.failureReason}</span></div>
              )}
              {inspectEmailLog.attachmentNames?.length > 0 && (
                <div><span className="text-[#888888]">Attachments:</span> <span className="text-white">{inspectEmailLog.attachmentNames.join(', ')}</span></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
