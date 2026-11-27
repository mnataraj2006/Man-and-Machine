import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  Activity,
  Dumbbell,
  CheckCircle2,
  Clock,
  TrendingUp,
  Plus,
  ArrowRight,
  AlertCircle,
  CalendarCheck,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import trainerService from '../../services/trainerService.js';
import TrainerAvatar from '../../components/UI/TrainerAvatar.jsx';

export default function DashboardHome({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await trainerService.getDashboardOverview();
      setData(res);
    } catch (err) {
      console.error('Failed to load trainer dashboard:', err);
      setError(err.message || 'Failed to load trainer dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-20 bg-[#111111] rounded-2xl w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-[#111111] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex flex-col items-center gap-3 text-center">
        <AlertCircle className="w-8 h-8 text-rose-400" />
        <span className="font-bold">{error}</span>
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 rounded-xl bg-[#202020] text-xs font-bold uppercase tracking-wider text-white hover:bg-[#252525]"
        >
          Retry Load
        </button>
      </div>
    );
  }

  const { trainer, kpis, todaySchedule = [], assignedClients = [], recentCompletions = [] } = data || {};

  const kpiCards = [
    {
      label: 'Active Assigned Clients',
      value: kpis?.activeClients || 0,
      sub: 'Dedicated roster',
      icon: Users,
      color: 'text-[#EB3E2E]',
      bg: 'bg-[#EB3E2E]/10',
      action: () => onNavigate?.('/trainer/clients'),
    },
    {
      label: "Today's Sessions",
      value: kpis?.todaySessions || 0,
      sub: 'Floor appointments',
      icon: Calendar,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      action: () => onNavigate?.('/trainer/schedule'),
    },
    {
      label: 'Sessions Completed (Mo)',
      value: kpis?.completedSessionsThisMonth || 0,
      sub: 'This calendar month',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      action: () => onNavigate?.('/trainer/sessions'),
    },
    {
      label: 'Active Workout Plans',
      value: kpis?.activeWorkoutPlans || 0,
      sub: 'Published programs',
      icon: Dumbbell,
      color: 'text-[#F5F5F5]',
      bg: 'bg-[#202020]',
      action: () => onNavigate?.('/trainer/workouts'),
    },
    {
      label: 'Pending Assessments',
      value: kpis?.pendingAssessments || 0,
      sub: 'Due for 30-day review',
      icon: TrendingUp,
      color: 'text-[#EB3E2E]',
      bg: 'bg-[#EB3E2E]/10',
      action: () => onNavigate?.('/trainer/progress'),
    },
    {
      label: 'Session Completion Rate',
      value: `${kpis?.attendanceRate || 100}%`,
      sub: 'Fulfilled appointments',
      icon: CalendarCheck,
      color: 'text-[#EB3E2E]',
      bg: 'bg-[#EB3E2E]/10',
      action: () => onNavigate?.('/trainer/attendance'),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* ── HEADER BANNER ── */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#111111] border border-[#303030] relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#EB3E2E]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4">
          <TrainerAvatar trainer={trainer} size="lg" rounded="rounded-2xl" lazy={false} />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1
                className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                COACH {trainer?.name || 'TRAINER'}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#EB3E2E]/10 text-[#EB3E2E] border border-[#EB3E2E]/30">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-[#B8B8B8] flex items-center gap-2">
              <span>{trainer?.specialization || 'Head Strength Coach'}</span>
              <span>•</span>
              <span className="text-[#EB3E2E]">{trainer?.branch?.name || 'Kovilpatti'} Branch</span>
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate?.('/trainer/workouts/create')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(235,62,46,0.25)]"
          >
            <Plus className="w-4 h-4" />
            <span>New Workout</span>
          </button>
          <button
            onClick={() => onNavigate?.('/trainer/schedule')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#202020] hover:bg-[#252525] border border-[#303030] text-white text-xs font-bold uppercase tracking-wider transition-all"
          >
            <Calendar className="w-4 h-4 text-[#EB3E2E]" />
            <span>Schedule</span>
          </button>
          <button
            onClick={() => onNavigate?.('/trainer/sessions')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#202020] hover:bg-[#252525] border border-[#303030] text-white text-xs font-bold uppercase tracking-wider transition-all"
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Log Session</span>
          </button>
        </div>
      </div>

      {/* ── 6 KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              onClick={kpi.action}
              className="p-5 rounded-2xl bg-[#111111] border border-[#303030] hover:border-[#EB3E2E]/40 transition-all flex items-center justify-between cursor-pointer group shadow-sm"
            >
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-mono text-[#B8B8B8] uppercase tracking-wider">
                  {kpi.label}
                </span>
                <span
                  className="text-3xl font-black text-white group-hover:text-[#EB3E2E] transition-colors"
                  style={{ fontFamily: "'Oswald', sans-serif" }}
                >
                  {kpi.value}
                </span>
                <span className="text-[10px] text-[#858585]">{kpi.sub}</span>
              </div>
              <div className={`w-12 h-12 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-6 h-6 ${kpi.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── TWO COLUMN SECTION: TODAY'S SCHEDULE & ASSIGNED CLIENTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule Timeline */}
        <div className="p-6 rounded-2xl bg-[#111111] border border-[#303030] flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#303030]">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#EB3E2E]" />
              <h2
                className="text-base font-bold uppercase text-white tracking-wide"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                TODAY'S FLOOR SCHEDULE
              </h2>
            </div>
            <button
              onClick={() => onNavigate?.('/trainer/schedule')}
              className="text-xs text-[#EB3E2E] hover:text-[#FF493B] font-bold uppercase flex items-center gap-1"
            >
              <span>Full Schedule</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {todaySchedule.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-[#858585]">
              <Clock className="w-8 h-8 text-[#303030]" />
              <span className="text-xs font-semibold text-[#B8B8B8]">No sessions booked for today</span>
              <p className="text-[11px] max-w-xs">Use the schedule planner to book floor sessions with your clients.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {todaySchedule.map((item) => (
                <div
                  key={item._id}
                  className="p-4 rounded-xl bg-[#181818] border border-[#303030] flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#202020] border border-[#303030] flex items-center justify-center text-[#EB3E2E] font-bold text-sm">
                      {item.clientId?.name?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white uppercase">{item.clientId?.name || 'Client'}</span>
                      <span className="text-[11px] text-[#B8B8B8]">{item.sessionType}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-mono font-bold text-[#EB3E2E]">
                      {new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold uppercase border border-emerald-500/20">
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assigned Clients Summary */}
        <div className="p-6 rounded-2xl bg-[#111111] border border-[#303030] flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#303030]">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#EB3E2E]" />
              <h2
                className="text-base font-bold uppercase text-white tracking-wide"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                ASSIGNED CLIENT ROSTER
              </h2>
            </div>
            <button
              onClick={() => onNavigate?.('/trainer/clients')}
              className="text-xs text-[#EB3E2E] hover:text-[#FF493B] font-bold uppercase flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {assignedClients.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-[#858585]">
              <Users className="w-8 h-8 text-[#303030]" />
              <span className="text-xs font-semibold text-[#B8B8B8]">No clients assigned yet</span>
              <p className="text-[11px] max-w-xs">Facility management will assign new branch athletes to your roster.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {assignedClients.slice(0, 5).map((client) => (
                <div
                  key={client.id}
                  onClick={() => onNavigate?.(`/trainer/clients/${client.id}`)}
                  className="p-3.5 rounded-xl bg-[#181818] border border-[#303030] hover:border-[#EB3E2E]/40 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#202020] border border-[#303030] flex items-center justify-center text-[#EB3E2E] font-bold text-xs">
                      {client.name ? client.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">{client.name}</span>
                      <span className="text-[11px] text-[#B8B8B8]">{client.fitnessGoal}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#202020] text-[#B8B8B8] border border-[#303030]">
                      {client.experienceLevel}
                    </span>
                    <ArrowRight className="w-4 h-4 text-[#858585]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
