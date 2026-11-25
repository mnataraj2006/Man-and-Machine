import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Lock,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import trainerService from '../../services/trainerService.js';
import authService from '../../services/auth.js';

export default function Settings({ onLogout }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    if (newPassword !== confirmPassword) {
      setMessage({ text: 'New passwords do not match.', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ text: 'New password must be at least 6 characters.', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      await trainerService.changePassword({ currentPassword, newPassword });
      setMessage({ text: 'Password successfully changed.', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage({ text: err.message || 'Failed to change password.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    if (onLogout) {
      onLogout();
    } else {
      authService.logout();
      window.location.href = '/login';
    }
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl mx-auto">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-mono text-[#EB3E2E] uppercase tracking-wider font-bold">
          ACCOUNT SECURITY
        </span>
        <h1
          className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight"
          style={{ fontFamily: "'Oswald', sans-serif" }}
        >
          TRAINER SETTINGS & SECURITY.
        </h1>
        <p className="text-xs text-[#B8B8B8]">
          Update your authentication password and configure your trainer account preferences.
        </p>
      </div>

      {message.text && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* ── PASSWORD CHANGE CARD ── */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#111111] border border-[#303030] flex flex-col gap-6">
        <div className="flex items-center gap-3 pb-4 border-b border-[#303030]">
          <Lock className="w-5 h-5 text-[#EB3E2E]" />
          <h2
            className="text-sm font-bold uppercase text-white"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            CHANGE PASSWORD
          </h2>
        </div>

        <form onSubmit={handlePasswordChange} className="flex flex-col gap-4 max-w-md">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono uppercase text-[#B8B8B8]">CURRENT PASSWORD</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="p-3 rounded-xl bg-[#181818] border border-[#303030] text-xs text-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono uppercase text-[#B8B8B8]">NEW PASSWORD</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="p-3 rounded-xl bg-[#181818] border border-[#303030] text-xs text-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono uppercase text-[#B8B8B8]">CONFIRM NEW PASSWORD</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="p-3 rounded-xl bg-[#181818] border border-[#303030] text-xs text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 py-3 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(235,62,46,0.25)]"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* ── SESSION LOGOUT CARD ── */}
      <div className="p-6 rounded-2xl bg-[#111111] border border-[#303030] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-sm font-bold uppercase text-white">SIGN OUT OF TRAINER PORTAL</span>
          <span className="text-xs text-[#B8B8B8]">Terminate your active coaching session on this terminal.</span>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold uppercase transition-colors shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
