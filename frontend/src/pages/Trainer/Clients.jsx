import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  ArrowRight,
  UserCheck,
  Dumbbell,
  Calendar,
  Activity,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import trainerService from '../../services/trainerService.js';

export default function Clients({ onNavigate }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [goalFilter, setGoalFilter] = useState('ALL');

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await trainerService.getMyClients({
        search: search.trim() || undefined,
        goal: goalFilter !== 'ALL' ? goalFilter : undefined,
      });
      setClients(res.clients || []);
    } catch (err) {
      console.error('Failed to load clients:', err);
      setError(err.message || 'Failed to load assigned clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchClients();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search, goalFilter]);

  const goals = [
    'ALL',
    'Muscle Building',
    'Weight Loss',
    'Strength Training',
    'General Fitness',
    'Stamina & Conditioning',
  ];

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-[#EB3E2E] uppercase tracking-wider font-bold">
            CLIENT ROSTER
          </span>
          <h1
            className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            MY ASSIGNED ATHLETES.
          </h1>
          <p className="text-xs text-[#B8B8B8]">
            Comprehensive training management for athletes under your direct floor coaching.
          </p>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div className="p-4 rounded-2xl bg-[#111111] border border-[#303030] flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#858585]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by athlete name, email, or phone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#181818] border border-[#303030] text-xs text-white placeholder-[#858585] focus:outline-none focus:border-[#EB3E2E]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-[10px] font-mono uppercase text-[#B8B8B8] shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3 text-[#EB3E2E]" /> GOAL:
          </span>
          {goals.map((g) => (
            <button
              key={g}
              onClick={() => setGoalFilter(g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                goalFilter === g
                  ? 'bg-[#EB3E2E] text-white'
                  : 'bg-[#181818] text-[#B8B8B8] hover:text-white border border-[#303030]'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* ── CLIENTS GRID ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 bg-[#111111] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-center flex flex-col items-center gap-2">
          <AlertCircle className="w-6 h-6 text-rose-400" />
          <span className="font-bold text-xs">{error}</span>
          <button
            onClick={fetchClients}
            className="px-4 py-1.5 rounded-lg bg-[#202020] text-xs font-bold uppercase text-white"
          >
            Retry
          </button>
        </div>
      ) : clients.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#111111] border border-[#303030] text-center flex flex-col items-center justify-center gap-3">
          <Users className="w-10 h-10 text-[#303030]" />
          <h3 className="text-sm font-bold uppercase text-white" style={{ fontFamily: "'Oswald', sans-serif" }}>
            NO ASSIGNED CLIENTS MATCH FILTER
          </h3>
          <p className="text-xs text-[#B8B8B8] max-w-sm">
            {search || goalFilter !== 'ALL'
              ? 'Try modifying your search or goal filter criteria.'
              : 'Clients assigned to your profile by branch administration will appear in this workspace.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <div
              key={client.id}
              className="p-5 rounded-2xl bg-[#111111] border border-[#303030] hover:border-[#EB3E2E]/40 transition-all flex flex-col justify-between gap-4 group"
            >
              {/* Client Info Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#202020] border border-[#303030] flex items-center justify-center text-[#EB3E2E] font-black text-base shrink-0">
                    {client.name ? client.name.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h3
                      className="text-sm font-bold uppercase text-white truncate group-hover:text-[#EB3E2E] transition-colors"
                      style={{ fontFamily: "'Oswald', sans-serif" }}
                    >
                      {client.name}
                    </h3>
                    <span className="text-[11px] text-[#B8B8B8] truncate">{client.email}</span>
                    <span className="text-[10px] font-mono text-[#858585]">{client.phone}</span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#EB3E2E]/10 text-[#EB3E2E] border border-[#EB3E2E]/30 shrink-0">
                  {client.fitnessGoal?.slice(0, 15)}
                </span>
              </div>

              {/* Status and Active Plan Pills */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#303030]">
                <div className="p-2.5 rounded-xl bg-[#181818] border border-[#303030] flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono text-[#858585] uppercase">ACTIVE PLAN</span>
                  <span className="text-xs font-bold text-white truncate">
                    {client.activePlan?.title || 'No Plan Active'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#181818] border border-[#303030] flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono text-[#858585] uppercase">EXPERIENCE</span>
                  <span className="text-xs font-bold text-emerald-400">
                    {client.experienceLevel || 'Beginner'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => onNavigate?.(`/trainer/clients/${client.id}`)}
                  className="flex-1 py-2 rounded-xl bg-[#202020] hover:bg-[#EB3E2E] hover:text-white text-xs font-bold uppercase tracking-wider text-[#B8B8B8] transition-all flex items-center justify-center gap-1.5 border border-[#303030]"
                >
                  <span>Open Dossier</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
