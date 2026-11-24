import React, { useState } from 'react';
import {
  Lock,
  KeyRound,
  ShieldAlert,
  Bell,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import clientService from '../../services/clientService.js';
import authService from '../../services/auth.js';

export default function Settings({ onNavigate, onLogout }) {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [notice, setNotice] = useState(null);

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState({
    workoutReminders: true,
    renewalAlerts: true,
    branchAnnouncements: true,
  });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setNotice(null);

    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setNotice({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setNotice({ type: 'error', message: 'New password must be at least 8 characters long.' });
      return;
    }

    setIsChangingPass(true);
    try {
      await clientService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      setNotice({
        type: 'success',
        message: 'Account password changed successfully! Your next sign in will require the new credentials.',
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      setNotice({
        type: 'error',
        message: err.message || 'Failed to change password. Please verify current password.',
      });
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      authService.logout();
      if (onNavigate) onNavigate('/login');
    }
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-mono text-[#E58A32] uppercase tracking-wider font-bold">
          SECURITY &amp; PREFERENCES
        </span>
        <h1
          className="uppercase font-bold tracking-tight text-[#F5F5F5]"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)',
          }}
        >
          ACCOUNT SETTINGS.
        </h1>
        <p className="text-xs sm:text-sm text-[#A3A3A3]">
          Configure security credentials, notification channels, and active session controls.
        </p>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-3 ${
            notice.type === 'success'
              ? 'bg-[#151515] border-emerald-500/80 text-emerald-400'
              : 'bg-[#151515] border-red-500/80 text-red-400'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      {/* ── 1. CHANGE PASSWORD CARD ── */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#151515] border border-[#292929] flex flex-col gap-5">
        <div className="flex items-center gap-3 border-b border-[#292929] pb-4">
          <div className="w-9 h-9 rounded-xl bg-[#E58A32]/10 border border-[#E58A32]/30 flex items-center justify-center text-[#E58A32]">
            <KeyRound className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span
              className="text-base font-bold uppercase text-[#F5F5F5]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              UPDATE PASSWORD
            </span>
            <span className="text-xs text-[#A3A3A3]">Require current password and enforce minimum 8 characters</span>
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-[#A3A3A3]">CURRENT PASSWORD *</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter your current password"
                className="w-full bg-[#1C1C1C] border border-[#292929] rounded-xl px-4 pr-10 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#E58A32]"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#A3A3A3]"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-[#A3A3A3]">NEW PASSWORD *</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Min 8 characters"
                  className="w-full bg-[#1C1C1C] border border-[#292929] rounded-xl px-4 pr-10 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#E58A32]"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#A3A3A3]"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-[#A3A3A3]">CONFIRM NEW PASSWORD *</label>
              <input
                type="password"
                required
                value={passwordData.confirmNewPassword}
                onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmNewPassword: e.target.value }))}
                placeholder="Repeat new password"
                className="w-full bg-[#1C1C1C] border border-[#292929] rounded-xl px-4 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#E58A32]"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isChangingPass}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E58A32] hover:bg-[#F09A43] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(229,138,50,0.25)] cursor-pointer disabled:opacity-60"
            >
              {isChangingPass ? <span>UPDATING CREDENTIALS...</span> : <span>UPDATE PASSWORD</span>}
            </button>
          </div>
        </form>
      </div>

      {/* ── 2. NOTIFICATION PREFERENCES CARD ── */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#151515] border border-[#292929] flex flex-col gap-5">
        <div className="flex items-center gap-3 border-b border-[#292929] pb-4">
          <div className="w-9 h-9 rounded-xl bg-[#E58A32]/10 border border-[#E58A32]/30 flex items-center justify-center text-[#E58A32]">
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span
              className="text-base font-bold uppercase text-[#F5F5F5]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              DISPATCH PREFERENCES
            </span>
            <span className="text-xs text-[#A3A3A3]">Control alert frequency across channels</span>
          </div>
        </div>

        <div className="flex flex-col divide-y divide-[#292929]">
          <div className="py-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[#F5F5F5]">Workout Reminders</span>
              <span className="text-[11px] text-[#A3A3A3]">Receive reminders for scheduled training sessions</span>
            </div>
            <input
              type="checkbox"
              checked={notifPrefs.workoutReminders}
              onChange={(e) => setNotifPrefs((p) => ({ ...p, workoutReminders: e.target.checked }))}
              className="w-4 h-4 accent-[#E58A32] cursor-pointer"
            />
          </div>

          <div className="py-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[#F5F5F5]">Membership Expiry Alerts</span>
              <span className="text-[11px] text-[#A3A3A3]">Advance warning 14 and 7 days prior to plan renewal</span>
            </div>
            <input
              type="checkbox"
              checked={notifPrefs.renewalAlerts}
              onChange={(e) => setNotifPrefs((p) => ({ ...p, renewalAlerts: e.target.checked }))}
              className="w-4 h-4 accent-[#E58A32] cursor-pointer"
            />
          </div>

          <div className="py-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[#F5F5F5]">Branch Announcements</span>
              <span className="text-[11px] text-[#A3A3A3]">Holiday hours, facility upgrades, and special events</span>
            </div>
            <input
              type="checkbox"
              checked={notifPrefs.branchAnnouncements}
              onChange={(e) => setNotifPrefs((p) => ({ ...p, branchAnnouncements: e.target.checked }))}
              className="w-4 h-4 accent-[#E58A32] cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* ── 3. DANGER ZONE / LOGOUT CARD ── */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#151515] border border-red-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold uppercase text-red-400" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            TERMINATE CLIENT SESSION
          </span>
          <span className="text-xs text-[#A3A3A3]">
            Safely clear stored JWT authentication token and redirect to sign in portal.
          </span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/40 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>LOG OUT</span>
        </button>
      </div>
    </div>
  );
}
