import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  ShieldAlert,
  KeyRound,
  Building,
  CheckCircle2,
  Lock,
  Server,
  Database,
  Smartphone,
} from 'lucide-react';
import adminService from '../../services/adminService.js';
import { useAdmin } from '../../components/Admin/AdminLayout.jsx';

export default function Settings() {
  const { branches } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [settingsData, setSettingsData] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await adminService.getSettings();
      setSettingsData(res);
    } catch (err) {
      setError(err.message || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    try {
      await adminService.changeAdminPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setSuccess('Admin credentials successfully updated!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message || 'Password update failed');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── HEADER ── */}
      <div>
        <h2
          className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#F5F5F5]"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          ADMIN SETTINGS &amp; SYSTEM ENVIRONMENT
        </h2>
        <p className="text-xs text-[#A3A3A3]">
          Manage security access credentials, multi-branch network parameters, and system infrastructure.
        </p>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{error}</div>}
      {success && <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs">{success}</div>}

      {/* ── PROFILE & SECURITY SECTION ── */}
      <div className="bg-[#181818] border border-[#292929] rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-[#292929]">
          <div className="w-10 h-10 rounded-xl bg-[#E58A32]/10 border border-[#E58A32]/30 flex items-center justify-center text-[#E58A32]">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase text-[#F5F5F5]">Security &amp; Password Management</h3>
            <p className="text-xs text-[#A3A3A3]">Update your root administrator password credentials.</p>
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div>
            <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">
              Current Admin Password
            </label>
            <input
              type="password"
              required
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">
                New Password (Min 8)
              </label>
              <input
                type="password"
                required
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] hover:bg-[#F09A43] text-black cursor-pointer shadow-lg shadow-[#E58A32]/10"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Update Admin Password
          </button>
        </form>
      </div>

      {/* ── PLATFORM TOPOLOGY & BRANCH HUBS ── */}
      <div className="bg-[#181818] border border-[#292929] rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-[#292929]">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase text-[#F5F5F5]">Active Branch Network Hubs</h3>
            <p className="text-xs text-[#A3A3A3]">Confirmed locations operating under single administrator scope.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {branches.map((b) => (
            <div key={b._id} className="p-3.5 rounded-xl bg-[#121212] border border-[#292929] space-y-1">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#252525] text-[#E58A32] font-bold">
                {b.code || b.city.slice(0, 3).toUpperCase()}
              </span>
              <h4 className="text-sm font-bold text-[#F5F5F5]">{b.city} Branch</h4>
              <p className="text-[11px] text-[#A3A3A3] line-clamp-1">{b.name}</p>
              <span className="text-[10px] font-mono text-green-400 block pt-1">
                {b.isActive ? 'Active Hub' : 'Inactive'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SYSTEM ENVIRONMENT ── */}
      <div className="bg-[#181818] border border-[#292929] rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-[#292929]">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase text-[#F5F5F5]">System Environment &amp; Role-Based Access</h3>
            <p className="text-xs text-[#A3A3A3]">Operating parameters for Man &amp; Machine production environment.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#121212] border border-[#222222]">
            <span className="text-[10px] font-mono uppercase text-[#A3A3A3] block">SYSTEM ROLE</span>
            <span className="font-bold text-[#E58A32]">ADMIN (Full Multi-Branch)</span>
          </div>
          <div className="p-3 rounded-xl bg-[#121212] border border-[#222222]">
            <span className="text-[10px] font-mono uppercase text-[#A3A3A3] block">NO SUPER_ADMIN</span>
            <span className="font-bold text-green-400">Enforced</span>
          </div>
          <div className="p-3 rounded-xl bg-[#121212] border border-[#222222]">
            <span className="text-[10px] font-mono uppercase text-[#A3A3A3] block">DATABASE</span>
            <span className="font-bold text-[#F5F5F5]">MongoDB Atlas</span>
          </div>
          <div className="p-3 rounded-xl bg-[#121212] border border-[#222222]">
            <span className="text-[10px] font-mono uppercase text-[#A3A3A3] block">PLATFORM VERSION</span>
            <span className="font-mono text-[#F5F5F5]">v2.1.0 (Admin Suite)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
