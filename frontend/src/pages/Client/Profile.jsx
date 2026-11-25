import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Target,
  Dumbbell,
} from 'lucide-react';
import clientService from '../../services/clientService.js';
import authService from '../../services/auth.js';

export default function Profile() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    fitnessGoal: 'Muscle Building',
    experienceLevel: 'Beginner',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusNotice, setStatusNotice] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await clientService.getProfile();
        if (isMounted && res.user) {
          setProfileData(res);
          setFormData({
            name: res.user.name || '',
            phone: res.user.phone || '',
            fitnessGoal: res.profile?.fitnessGoal || 'Muscle Building',
            experienceLevel: res.profile?.experienceLevel || 'Beginner',
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusNotice(null);

    try {
      await clientService.updateProfile(formData);
      // Refresh local auth cache
      await authService.getMe();
      setStatusNotice({
        type: 'success',
        message: 'Your athlete profile details have been successfully updated.',
      });
    } catch (err) {
      setStatusNotice({
        type: 'error',
        message: err.message || 'Failed to update profile.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-10 bg-[#181818] rounded-xl w-64" />
        <div className="h-96 bg-[#181818] rounded-2xl" />
      </div>
    );
  }

  const { user, profile } = profileData || {};

  return (
    <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-mono text-[#EB3E2E] uppercase tracking-wider font-bold">
          ACCOUNT IDENTITY
        </span>
        <h1
          className="uppercase font-bold tracking-tight text-[#F5F5F5]"
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)',
          }}
        >
          ATHLETE PROFILE.
        </h1>
        <p className="text-xs sm:text-sm text-[#B8B8B8]">
          Manage your personal information, contact credentials, and primary fitness goals.
        </p>
      </div>

      {/* Notice Banner */}
      {statusNotice && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-3 ${
            statusNotice.type === 'success'
              ? 'bg-[#181818] border-emerald-500/80 text-emerald-400'
              : 'bg-[#181818] border-red-500/80 text-red-400'
          }`}
        >
          {statusNotice.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{statusNotice.message}</span>
        </div>
      )}

      {/* ── PROFILE FORM CARD ── */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col gap-6">
        <div className="flex items-center gap-4 border-b border-[#303030] pb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#202020] border border-[#303030] flex items-center justify-center text-[#EB3E2E] text-2xl font-bold">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'M'}
          </div>
          <div className="flex flex-col">
            <span
              className="text-lg sm:text-xl font-bold uppercase text-[#F5F5F5]"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              {user?.name}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#EB3E2E]/10 text-[#EB3E2E] border border-[#EB3E2E]/30">
                ROLE: {user?.role || 'CLIENT'}
              </span>
              <span className="text-xs text-[#B8B8B8]">{user?.branchId?.city || 'Kovilpatti'} Branch</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Editable: Full Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-[#F5F5F5]">
                FULL NAME
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="bg-[#202020] border border-[#303030] rounded-xl px-4 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#EB3E2E]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-[#F5F5F5]">
                MOBILE NUMBER
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 XXXXXXXXXX"
                className="bg-[#202020] border border-[#303030] rounded-xl px-4 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#EB3E2E]"
              />
            </div>
          </div>

          {/* Read-Only: Email & Branch (Locked for security) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase text-[#B8B8B8]">
                  REGISTERED EMAIL
                </label>
                <span className="text-[10px] text-[#B8B8B8]/70">Locked to identity</span>
              </div>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="bg-[#202020]/50 border border-[#303030]/50 rounded-xl px-4 py-3 text-sm text-[#B8B8B8] cursor-not-allowed"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase text-[#B8B8B8]">
                  PRIMARY BRANCH ASSIGNMENT
                </label>
                <span className="text-[10px] text-[#B8B8B8]/70">Admin managed</span>
              </div>
              <input
                type="text"
                disabled
                value={`${user?.branchId?.city || 'Kovilpatti'} (${user?.branchId?.name || 'HQ'})`}
                className="bg-[#202020]/50 border border-[#303030]/50 rounded-xl px-4 py-3 text-sm text-[#B8B8B8] cursor-not-allowed"
              />
            </div>
          </div>

          {/* Editable Goals & Experience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-[#F5F5F5]">
                PRIMARY FITNESS GOAL
              </label>
              <select
                name="fitnessGoal"
                value={formData.fitnessGoal}
                onChange={handleChange}
                className="bg-[#202020] border border-[#303030] rounded-xl px-4 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#EB3E2E]"
              >
                <option value="Muscle Building">Muscle Building / Hypertrophy</option>
                <option value="Weight Loss">Fat Loss &amp; Lean Toning</option>
                <option value="Strength Training">Pure Strength &amp; Power</option>
                <option value="General Fitness">General Health &amp; Mobility</option>
                <option value="Stamina &amp; Conditioning">Stamina &amp; Conditioning</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-[#F5F5F5]">
                EXPERIENCE LEVEL
              </label>
              <select
                name="experienceLevel"
                value={formData.experienceLevel}
                onChange={handleChange}
                className="bg-[#202020] border border-[#303030] rounded-xl px-4 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#EB3E2E]"
              >
                <option value="Beginner">Beginner (0 — 6 months)</option>
                <option value="Intermediate">Intermediate (6 months — 2 years)</option>
                <option value="Advanced">Advanced (2+ years dedicated)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-[#303030] flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(235,62,46,0.25)] cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <span>SAVING CHANGES...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>SAVE PROFILE CHANGES</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
