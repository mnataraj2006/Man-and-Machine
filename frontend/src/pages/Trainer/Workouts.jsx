import React, { useState, useEffect } from 'react';
import {
  Dumbbell,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Copy,
  Edit,
  ArrowRight,
  AlertCircle,
  Eye,
  Sparkles,
} from 'lucide-react';
import trainerService from '../../services/trainerService.js';

export default function Workouts({ onNavigate }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await trainerService.getWorkoutPlans({
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setPlans(res.plans || []);
    } catch (err) {
      console.error('Failed to load workout plans:', err);
      setError(err.message || 'Failed to load workout plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [search, statusFilter]);

  const handlePublish = async (planId) => {
    try {
      await trainerService.publishWorkoutPlan(planId);
      fetchPlans();
    } catch (err) {
      alert(err.message || 'Failed to publish plan');
    }
  };

  const handleDuplicate = async (planId) => {
    try {
      await trainerService.duplicateWorkoutPlan(planId);
      fetchPlans();
    } catch (err) {
      alert(err.message || 'Failed to duplicate plan');
    }
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-[#EB3E2E] uppercase tracking-wider font-bold">
            PROGRAMMING MATRIX
          </span>
          <h1
            className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            TRAINING PROGRAMS & WORKOUTS.
          </h1>
          <p className="text-xs text-[#B8B8B8]">
            Curate, calibrate, and publish multi-day training splits for your assigned athletes.
          </p>
        </div>

        <button
          onClick={() => onNavigate?.('/trainer/workouts/create')}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(235,62,46,0.25)] shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Program</span>
        </button>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div className="p-4 rounded-2xl bg-[#111111] border border-[#303030] flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#858585]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plans by title or assigned athlete..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#181818] border border-[#303030] text-xs text-white placeholder-[#858585] focus:outline-none focus:border-[#EB3E2E]"
          />
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'PUBLISHED', 'DRAFT'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === s
                  ? 'bg-[#EB3E2E] text-white'
                  : 'bg-[#181818] text-[#B8B8B8] hover:text-white border border-[#303030]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── PLANS LIST ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-[#111111] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-center">
          {error}
        </div>
      ) : plans.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#111111] border border-[#303030] text-center flex flex-col items-center justify-center gap-3">
          <Dumbbell className="w-10 h-10 text-[#303030]" />
          <h3 className="text-sm font-bold uppercase text-white" style={{ fontFamily: "'Oswald', sans-serif" }}>
            NO WORKOUT PROGRAMS FOUND
          </h3>
          <p className="text-xs text-[#B8B8B8] max-w-sm">
            Build a custom multi-day training program for your athletes or select a library template.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan._id}
              className="p-5 rounded-2xl bg-[#111111] border border-[#303030] hover:border-[#EB3E2E]/40 transition-all flex flex-col justify-between gap-4"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                      plan.status === 'PUBLISHED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {plan.status}
                  </span>
                  <span className="text-[10px] font-mono text-[#B8B8B8]">
                    {plan.weeklyFrequency || 4} Days / Wk
                  </span>
                </div>

                <h3
                  className="text-base font-bold uppercase text-white"
                  style={{ fontFamily: "'Oswald', sans-serif" }}
                >
                  {plan.title}
                </h3>
                <p className="text-xs text-[#B8B8B8] line-clamp-2">
                  {plan.description || plan.trainerInstructions || 'Structured biomechanical progression.'}
                </p>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#202020] text-[#EB3E2E] font-semibold">
                    {plan.goal}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#202020] text-[#B8B8B8]">
                    {plan.trainingLevel || 'All Levels'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#202020] text-[#B8B8B8]">
                    {plan.exercises?.length || 0} Exercises
                  </span>
                </div>
              </div>

              {/* Assigned Athlete Footer */}
              <div className="pt-3 border-t border-[#303030] flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] font-mono text-[#858585] uppercase">ASSIGNED TO:</span>
                  <span className="font-bold text-white truncate max-w-[140px]">
                    {plan.assignedTo?.name || (plan.isTemplate ? 'Template' : 'Unassigned')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDuplicate(plan._id)}
                    title="Duplicate as new draft"
                    className="p-2 rounded-xl bg-[#181818] hover:bg-[#202020] border border-[#303030] text-[#B8B8B8] hover:text-white transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {plan.status === 'DRAFT' && plan.assignedTo && (
                    <button
                      onClick={() => handlePublish(plan._id)}
                      className="flex-1 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase transition-colors"
                    >
                      Publish
                    </button>
                  )}
                  <button
                    onClick={() => onNavigate?.(`/trainer/workouts/${plan._id}`)}
                    className="flex-1 py-2 rounded-xl bg-[#202020] hover:bg-[#EB3E2E] hover:text-white border border-[#303030] text-[#B8B8B8] text-xs font-bold uppercase transition-all flex items-center justify-center gap-1"
                  >
                    <span>View / Edit</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
