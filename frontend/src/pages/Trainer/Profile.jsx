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
import TrainerAvatar from '../../components/UI/TrainerAvatar.jsx';

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
    return <div className="h-96 bg-[#111111] rounded-2xl animate-pulse" />;
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl mx-auto">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-mono text-[#EB3E2E] uppercase tracking-wider font-bold">
          COACHING CREDENTIALS
        </span>
        <h1
          className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight"
          style={{ fontFamily: "'Oswald', sans-serif" }}
        >
          COACH PROFILE & SPECIALIZATION.
        </h1>
        <p className="text-xs text-[#B8B8B8]">
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
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-2xl bg-[#111111] border border-[#303030] flex flex-col gap-6">
        <div className="flex items-center gap-4 pb-6 border-b border-[#303030]">
          <TrainerAvatar
            src={profile?.profilePhoto?.url || profile?.profileImage || ''}
            name={form.name || user?.name || 'Coach'}
            size="lg"
            rounded="rounded-2xl"
            lazy={false}
          />
          <div className="flex flex-col">
            <h2 className="text-lg font-bold uppercase text-white">{form.name || 'Coach'}</h2>
            <span className="text-xs text-[#B8B8B8]">{user?.email}</span>
            <span className="text-[10px] font-mono text-[#EB3E2E] uppercase mt-0.5">
              {user?.branchId?.name || 'Kovilpatti'} Branch
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono uppercase text-[#B8B8B8]">FULL NAME</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="p-3 rounded-xl bg-[#181818] border border-[#303030] text-xs text-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono uppercase text-[#B8B8B8]">PRIMARY SPECIALIZATION</label>
            <input
              type="text"
              value={form.specialization}
              onChange={(e) => setForm({ ...form, specialization: e.target.value })}
              className="p-3 rounded-xl bg-[#181818] border border-[#303030] text-xs text-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono uppercase text-[#B8B8B8]">CONTACT PHONE</label>
            <input
              type="text"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              className="p-3 rounded-xl bg-[#181818] border border-[#303030] text-xs text-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono uppercase text-[#B8B8B8]">COACHING EXPERIENCE (YEARS)</label>
            <input
              type="number"
              min="0"
              max="50"
              value={form.experienceYears}
              onChange={(e) => setForm({ ...form, experienceYears: Number(e.target.value) })}
              className="p-3 rounded-xl bg-[#181818] border border-[#303030] text-xs text-white"
            />
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-[10px] font-mono uppercase text-[#B8B8B8]">COACHING PHILOSOPHY & BIO</label>
            <textarea
              rows="4"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Detail your background, certifications, and biomechanical training principles..."
              className="p-3 rounded-xl bg-[#181818] border border-[#303030] text-xs text-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-[#303030]">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(235,62,46,0.25)]"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Updating...' : 'Save Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
