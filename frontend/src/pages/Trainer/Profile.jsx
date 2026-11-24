import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Save,
  CheckCircle2,
  Building,
  Mail,
  Phone,
  Award,
  AlertCircle,
} from 'lucide-react';
import trainerService from '../../services/trainerService.js';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({
    name: '',
    contactPhone: '',
    contactEmail: '',
    specialization: '',
    experienceYears: 5,
    bio: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await trainerService.getProfile();
        setUser(res.user);
        setProfile(res.profile);
        setForm({
          name: res.user?.name || '',
          contactPhone: res.profile?.contactPhone || res.user?.phone || '',
          contactEmail: res.profile?.contactEmail || res.user?.email || '',
          specialization: res.profile?.specialization || 'Strength & Hypertrophy Conditioning',
          experienceYears: res.profile?.experienceYears || 5,
          bio: res.profile?.bio || '',
        });
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    try {
      setSaving(true);
      await trainerService.updateProfile(form);
      setSuccessMsg('Coach profile updated successfully');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-96 bg-[#141414] rounded-2xl animate-pulse" />;
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl mx-auto">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-mono text-[#E58A32] uppercase tracking-wider font-bold">
          COACHING CREDENTIALS
        </span>
        <h1
          className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          COACH PROFILE & SPECIALIZATION.
        </h1>
        <p className="text-xs text-[#A3A3A3]">
          Manage your floor bio, coaching methodology, and contact details visible to assigned athletes.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── FORM ── */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-2xl bg-[#141414] border border-[#292929] flex flex-col gap-6">
        <div className="flex items-center gap-4 pb-6 border-b border-[#292929]">
          <div className="w-16 h-16 rounded-2xl bg-[#1C1C1C] border border-[#292929] flex items-center justify-center text-[#E58A32] text-2xl font-black">
            {form.name ? form.name.charAt(0).toUpperCase() : 'T'}
          </div>
          <div className="flex flex-col">
            <h2 className="text-lg font-bold uppercase text-white">{form.name || 'Coach'}</h2>
            <span className="text-xs text-[#A3A3A3]">{user?.email}</span>
            <span className="text-[10px] font-mono text-[#E58A32] uppercase mt-0.5">
              {user?.branchId?.name || 'Kovilpatti'} Branch
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono uppercase text-[#A3A3A3]">FULL NAME</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="p-3 rounded-xl bg-[#181818] border border-[#292929] text-xs text-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono uppercase text-[#A3A3A3]">PRIMARY SPECIALIZATION</label>
            <input
              type="text"
              value={form.specialization}
              onChange={(e) => setForm({ ...form, specialization: e.target.value })}
              className="p-3 rounded-xl bg-[#181818] border border-[#292929] text-xs text-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono uppercase text-[#A3A3A3]">CONTACT PHONE</label>
            <input
              type="text"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              className="p-3 rounded-xl bg-[#181818] border border-[#292929] text-xs text-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono uppercase text-[#A3A3A3]">COACHING EXPERIENCE (YEARS)</label>
            <input
              type="number"
              min="0"
              max="50"
              value={form.experienceYears}
              onChange={(e) => setForm({ ...form, experienceYears: Number(e.target.value) })}
              className="p-3 rounded-xl bg-[#181818] border border-[#292929] text-xs text-white"
            />
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-[10px] font-mono uppercase text-[#A3A3A3]">COACHING PHILOSOPHY & BIO</label>
            <textarea
              rows="4"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Detail your background, certifications, and biomechanical training principles..."
              className="p-3 rounded-xl bg-[#181818] border border-[#292929] text-xs text-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-[#292929]">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#E58A32] hover:bg-[#F09A43] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(229,138,50,0.25)]"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Updating...' : 'Save Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
