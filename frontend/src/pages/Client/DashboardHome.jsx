import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Dumbbell,
  ShieldCheck,
  Flame,
  ArrowRight,
  UserCheck,
  Clock,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Activity,
  CheckCircle2,
  CreditCard,
} from 'lucide-react';
import clientService from '../../services/clientService.js';

export default function DashboardHome({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await clientService.getDashboardSummary();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleNav = (path) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-10 bg-[#181818] rounded-xl w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-28 bg-[#181818] rounded-2xl" />
          <div className="h-28 bg-[#181818] rounded-2xl" />
          <div className="h-28 bg-[#181818] rounded-2xl" />
          <div className="h-28 bg-[#181818] rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-[#181818] rounded-2xl" />
          <div className="h-72 bg-[#181818] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-[#181818] border border-red-500/30 flex flex-col items-center justify-center text-center gap-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <div className="flex flex-col gap-1">
          <span className="text-base font-bold text-[#F5F5F5] uppercase">Unable to Load Dashboard</span>
          <p className="text-xs text-[#B8B8B8] max-w-md">{error}</p>
        </div>
        <button
          type="button"
          onClick={fetchDashboard}
          className="px-5 py-2.5 rounded-xl bg-[#EB3E2E] text-white font-bold text-xs uppercase tracking-wider cursor-pointer hover:bg-[#FF493B]"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { stats, todaysWorkout, weeklyActivity, membership, trainer, recentActivities, client } = data || {};
  const isTrainerAssigned = Boolean(data?.trainerAssigned);
  const hasActiveMembership = Boolean(data?.hasActiveMembership);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* ── 1. WELCOME GREETING BANNER ── */}
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181818] border border-[#303030] text-[10px] uppercase font-bold tracking-widest text-[#EB3E2E] w-fit">
          <span>{client?.branch?.name || 'MAN & MACHINE'}</span>
          <span>•</span>
          <span>{isTrainerAssigned ? 'COACHED ATHLETE' : 'SELF-TRAINED ATHLETE'}</span>
        </div>

        <h1
          className="uppercase font-bold tracking-tight text-[#F5F5F5]"
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 'clamp(1.75rem, 3.2vw, 2.75rem)',
            lineHeight: '1.1',
          }}
        >
          WELCOME, <span className="text-[#EB3E2E]">{client?.name || 'ATHLETE'}.</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#B8B8B8]">
          {isTrainerAssigned
            ? 'Every rep counts. Follow your coach’s prescribed split and stay consistent.'
            : 'Discipline over shortcuts. Full access to the facility floor and training stations.'}
        </p>
      </div>

      {/* ── 2. QUICK STATISTICS (4 CARDS) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Stat 1: Monthly Attendance */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col justify-between hover:border-[#EB3E2E]/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-[#B8B8B8] uppercase tracking-wider">MONTHLY VISITS</span>
            <div className="w-7 h-7 rounded-lg bg-[#EB3E2E]/10 flex items-center justify-center text-[#EB3E2E]">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
              {stats?.attendanceThisMonth ?? 0}
            </span>
            <span className="text-[11px] text-[#B8B8B8]">sessions</span>
          </div>
        </div>

        {/* Stat 2: Conditional Workouts Done (Coached) vs Training Track (Self-Trained) */}
        {isTrainerAssigned ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col justify-between hover:border-[#EB3E2E]/40 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-[#B8B8B8] uppercase tracking-wider">WORKOUTS DONE</span>
              <div className="w-7 h-7 rounded-lg bg-[#EB3E2E]/10 flex items-center justify-center text-[#EB3E2E]">
                <Dumbbell className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                {stats?.completedWorkouts ?? 0}
              </span>
              <span className="text-[11px] text-[#B8B8B8]">logged</span>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col justify-between hover:border-[#EB3E2E]/40 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-[#B8B8B8] uppercase tracking-wider">TRAINING TRACK</span>
              <div className="w-7 h-7 rounded-lg bg-[#EB3E2E]/10 flex items-center justify-center text-[#EB3E2E]">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-bold text-[#EB3E2E] uppercase tracking-tight">
                SELF-TRAINED
              </span>
              <span className="text-[10px] text-[#B8B8B8]">
                Open gym floor access
              </span>
            </div>
          </div>
        )}

        {/* Stat 3: Current Membership */}
        <div
          onClick={() => handleNav('/client/membership')}
          className="p-4 sm:p-5 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col justify-between hover:border-[#EB3E2E]/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-[#B8B8B8] uppercase tracking-wider">MEMBERSHIP</span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                hasActiveMembership
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-[#EB3E2E]/10 text-[#EB3E2E]'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col">
            <span
              className={`text-base sm:text-lg font-bold uppercase tracking-tight truncate ${
                hasActiveMembership ? 'text-emerald-400' : 'text-[#EB3E2E]'
              }`}
            >
              {hasActiveMembership ? membership?.status || 'ACTIVE' : 'NO MEMBERSHIP'}
            </span>
            <span className="text-[10px] text-[#B8B8B8] truncate">
              {hasActiveMembership
                ? `${membership?.daysRemaining} days left`
                : 'Buy membership →'}
            </span>
          </div>
        </div>

        {/* Stat 4: Training Streak */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col justify-between hover:border-[#EB3E2E]/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-[#B8B8B8] uppercase tracking-wider">CURRENT STREAK</span>
            <div className="w-7 h-7 rounded-lg bg-[#EB3E2E]/10 flex items-center justify-center text-[#EB3E2E]">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-[#EB3E2E]" style={{ fontFamily: "'Oswald', sans-serif" }}>
              {stats?.trainingStreak ?? 0}
            </span>
            <span className="text-[11px] text-[#B8B8B8]">days consistency</span>
          </div>
        </div>
      </div>

      {/* ── 3. TODAY'S WORKOUT & WEEKLY ACTIVITY ROW ── */}
      {isTrainerAssigned ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left (2 Cols): Today's Workout Card */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col justify-between shadow-[0_4px_24px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#EB3E2E]/5 rounded-full blur-3xl pointer-events-none" />

            {todaysWorkout ? (
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between border-b border-[#303030] pb-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-mono text-[#EB3E2E] uppercase tracking-wider font-bold">
                      TODAY'S PRESCRIBED SESSION • {todaysWorkout.day}
                    </span>
                    <h3
                      className="text-xl sm:text-2xl font-bold uppercase text-[#F5F5F5]"
                      style={{ fontFamily: "'Oswald', sans-serif" }}
                    >
                      {todaysWorkout.focus}
                    </h3>
                  </div>
                  {todaysWorkout.isRestDay ? (
                    <span className="px-3 py-1 rounded-lg bg-[#202020] border border-[#303030] text-[#B8B8B8] text-xs font-bold uppercase">
                      REST &amp; RECOVER
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-lg bg-[#EB3E2E]/10 border border-[#EB3E2E]/30 text-[#EB3E2E] text-xs font-bold uppercase">
                      {todaysWorkout.exerciseCount} EXERCISES
                    </span>
                  )}
                </div>

                {todaysWorkout.isRestDay ? (
                  <div className="py-8 flex flex-col items-center justify-center text-center gap-2 text-[#B8B8B8]">
                    <Sparkles className="w-8 h-8 text-[#EB3E2E]" />
                    <p className="text-sm">Scheduled active recovery day. Hydrate, stretch, and nourish the machine.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <span className="text-xs font-bold uppercase text-[#B8B8B8]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                      SAMPLE EXERCISES PREVIEW:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {todaysWorkout.exercises.map((ex, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-[#202020] border border-[#303030] flex flex-col gap-1">
                          <span className="text-xs font-bold text-[#F5F5F5] truncate">{ex.name}</span>
                          <span className="text-[11px] font-mono text-[#EB3E2E]">
                            {ex.sets} sets × {ex.reps} reps
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-[#303030] flex items-center justify-between">
                  <span className="text-xs text-[#B8B8B8]">
                    Trainer: <strong className="text-[#F5F5F5]">{todaysWorkout.trainerName || 'Assigned Coach'}</strong>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleNav(`/client/workouts/${todaysWorkout.planId}`)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(235,62,46,0.25)] cursor-pointer"
                  >
                    <span>START WORKOUT</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* Empty State */
              <div className="py-8 sm:py-12 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#202020] border border-[#303030] flex items-center justify-center text-[#EB3E2E]">
                  <Dumbbell className="w-6 h-6" />
                </div>
                <div className="flex flex-col gap-1">
                  <span
                    className="text-base sm:text-lg font-bold uppercase text-[#F5F5F5]"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    YOUR NEXT SESSION STARTS HERE
                  </span>
                  <p className="text-xs sm:text-sm text-[#B8B8B8] max-w-sm">
                    Your trainer hasn't assigned a structured workout yet. You can still view assigned programs anytime.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleNav('/client/workouts')}
                  className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#202020] hover:border-[#EB3E2E] text-[#F5F5F5] border border-[#303030] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <span>OPEN WORKOUT ROSTER</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Right (1 Col): Weekly Activity Visualization */}
          <div className="p-6 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col justify-between">
            <div className="flex flex-col gap-1 border-b border-[#303030] pb-3">
              <span className="text-[10px] font-mono text-[#EB3E2E] uppercase tracking-wider font-bold">
                ATTENDANCE &amp; ACTIVITY
              </span>
              <h3
                className="text-lg font-bold uppercase text-[#F5F5F5]"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                THIS WEEK'S MATRIX
              </h3>
            </div>

            {/* Visual Weekly Day Bars */}
            <div className="grid grid-cols-7 gap-1.5 py-6">
              {weeklyActivity?.map((item) => (
                <div key={item.day} className="flex flex-col items-center gap-2">
                  <div
                    className={`w-full h-24 rounded-xl flex flex-col justify-end p-1 transition-all border ${
                      item.attended
                        ? 'bg-[#EB3E2E]/20 border-[#EB3E2E]'
                        : 'bg-[#202020] border-[#303030]'
                    }`}
                  >
                    {item.attended ? (
                      <div className="w-full bg-[#EB3E2E] rounded-lg py-1 flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    ) : (
                      <div className="w-full h-1 bg-[#303030] rounded" />
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-[#B8B8B8] font-bold">{item.day}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#303030] flex items-center justify-between text-xs text-[#B8B8B8]">
              <span>Orange indicates confirmed check-in.</span>
              <button
                type="button"
                onClick={() => handleNav('/client/attendance')}
                className="text-[#EB3E2E] hover:underline font-bold uppercase text-[11px]"
              >
                FULL CALENDAR →
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Self-Trained Row 3: Weekly Attendance Matrix & Facility Privileges */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left (2 Cols): Expanded Weekly Attendance Matrix */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col justify-between shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#303030] pb-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-mono text-[#EB3E2E] uppercase tracking-wider font-bold">
                  TRAINING CONSISTENCY • ATTENDANCE LOG
                </span>
                <h3
                  className="text-xl sm:text-2xl font-bold uppercase text-[#F5F5F5]"
                  style={{ fontFamily: "'Oswald', sans-serif" }}
                >
                  THIS WEEK'S GYM SESSIONS
                </h3>
              </div>
              <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase w-fit">
                ACTIVE MEMBER
              </span>
            </div>

            {/* Visual Weekly Day Bars */}
            <div className="grid grid-cols-7 gap-2 sm:gap-3 py-6">
              {weeklyActivity?.map((item) => (
                <div key={item.day} className="flex flex-col items-center gap-2">
                  <div
                    className={`w-full h-28 rounded-xl flex flex-col justify-end p-1.5 transition-all border ${
                      item.attended
                        ? 'bg-[#EB3E2E]/20 border-[#EB3E2E] shadow-[0_0_12px_rgba(235,62,46,0.2)]'
                        : 'bg-[#202020] border-[#303030]'
                    }`}
                  >
                    {item.attended ? (
                      <div className="w-full bg-[#EB3E2E] rounded-lg py-1.5 flex flex-col items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      </div>
                    ) : (
                      <div className="w-full h-1 bg-[#303030] rounded" />
                    )}
                  </div>
                  <span className="text-[10px] sm:text-xs font-mono text-[#B8B8B8] font-bold">{item.day}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#303030] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#B8B8B8]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[#EB3E2E]" />
                <span>Confirmed facility attendance</span>
              </div>
              <button
                type="button"
                onClick={() => handleNav('/client/attendance')}
                className="inline-flex items-center gap-1.5 text-[#EB3E2E] hover:text-[#FF493B] font-bold uppercase text-xs tracking-wider cursor-pointer"
              >
                <span>VIEW COMPLETE ATTENDANCE LEDGER</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right (1 Col): Facility Operating Schedule & Rules */}
          <div className="p-6 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col justify-between">
            <div className="flex flex-col gap-1 border-b border-[#303030] pb-3">
              <span className="text-[10px] font-mono text-[#EB3E2E] uppercase tracking-wider font-bold">
                FACILITY PROTOCOLS
              </span>
              <h3
                className="text-lg font-bold uppercase text-[#F5F5F5]"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                OPERATING SCHEDULE
              </h3>
            </div>

            <div className="py-4 flex flex-col gap-3">
              <div className="p-3 rounded-xl bg-[#202020] border border-[#303030] flex flex-col gap-1">
                <span className="text-[10px] font-mono text-[#B8B8B8] uppercase">BRANCH FACILITY</span>
                <span className="text-xs font-bold text-[#F5F5F5] uppercase">
                  {client?.branch?.name || 'MAN & MACHINE'}
                </span>
                <span className="text-[11px] text-[#B8B8B8]">
                  {client?.branch?.city || 'Main Branch'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-[#202020] border border-[#303030] flex flex-col gap-0.5">
                  <span className="text-[9.5px] font-mono text-[#EB3E2E] uppercase font-bold">MORNING SHIFT</span>
                  <span className="text-xs font-bold text-[#F5F5F5]">05:30 AM - 11:30 AM</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#202020] border border-[#303030] flex flex-col gap-0.5">
                  <span className="text-[9.5px] font-mono text-[#EB3E2E] uppercase font-bold">EVENING SHIFT</span>
                  <span className="text-xs font-bold text-[#F5F5F5]">04:30 PM - 09:30 PM</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#303030] flex items-center justify-between text-xs text-[#B8B8B8]">
              <span>Sunday: 06:00 AM - 12:00 PM</span>
              <span className="text-emerald-400 font-bold text-[10px] uppercase">OPEN TODAY</span>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. MEMBERSHIP SUMMARY & ASSIGNED TRAINER ROW ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Membership Summary */}
        <div className="p-6 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col justify-between">
          <div className="flex flex-col gap-1 border-b border-[#303030] pb-3">
            <span className="text-[10px] font-mono text-[#EB3E2E] uppercase tracking-wider font-bold">
              MEMBERSHIP INTEGRITY
            </span>
            <h3
              className="text-lg font-bold uppercase text-[#F5F5F5]"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              MEMBERSHIP SUMMARY
            </h3>
          </div>

          {hasActiveMembership && membership ? (
            <div className="py-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#F5F5F5]">{membership.planName}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {membership.status || 'ACTIVE'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-[#202020] border border-[#303030] flex flex-col gap-0.5">
                  <span className="text-[10px] font-mono text-[#B8B8B8]">EXPIRY DATE</span>
                  <span className="text-xs font-bold text-[#F5F5F5]">
                    {new Date(membership.expiryDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#202020] border border-[#303030] flex flex-col gap-0.5">
                  <span className="text-[10px] font-mono text-[#B8B8B8]">DAYS REMAINING</span>
                  <span className="text-xs font-bold text-[#EB3E2E]">{membership.daysRemaining} Days</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#202020] border border-[#303030] flex items-center justify-between text-xs">
                <span className="text-[#B8B8B8]">Training Track:</span>
                <span className="font-bold text-[#F5F5F5] uppercase">
                  {isTrainerAssigned ? `Personal Trainer (${trainer?.name || 'Assigned Coach'})` : 'Self-Trained'}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#EB3E2E]/10 border border-[#EB3E2E]/20 flex items-center justify-center text-[#EB3E2E]">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  NO ACTIVE MEMBERSHIP
                </h4>
                <p className="text-xs text-[#B8B8B8] max-w-sm">
                  Choose a membership plan to start your journey at Man &amp; Machine Fitness Gym.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleNav('/client/membership')}
                className="mt-1 px-5 py-2.5 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(235,62,46,0.25)]"
              >
                BUY MEMBERSHIP
              </button>
            </div>
          )}

          <div className="pt-3 border-t border-[#303030]">
            <button
              type="button"
              onClick={() => handleNav('/client/membership')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#EB3E2E] hover:text-[#FF493B] uppercase tracking-wider"
            >
              <span>{hasActiveMembership ? 'VIEW MEMBERSHIP DETAILS' : 'EXPLORE ALL PLANS'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Coached: Trainer Card | Self-Trained: Floor Privileges & Coaching Inquiry */}
        {isTrainerAssigned ? (
          <div className="p-6 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col justify-between">
            <div className="flex flex-col gap-1 border-b border-[#303030] pb-3">
              <span className="text-[10px] font-mono text-[#EB3E2E] uppercase tracking-wider font-bold">
                COACHING PARTNER
              </span>
              <h3
                className="text-lg font-bold uppercase text-[#F5F5F5]"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                ASSIGNED TRAINER
              </h3>
            </div>

            {trainer ? (
              <div className="py-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#202020] border border-[#303030] flex items-center justify-center text-[#EB3E2E] font-bold text-lg shrink-0">
                  {trainer.name ? trainer.name.charAt(0).toUpperCase() : 'T'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold uppercase text-[#F5F5F5] truncate">{trainer.name}</span>
                  <span className="text-xs text-[#EB3E2E] truncate">{trainer.specialization}</span>
                  <span className="text-[11px] text-[#B8B8B8] truncate">{trainer.experienceYears} Years Experience</span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[#B8B8B8]">
                Your trainer assignment is pending. The branch will assign a coach to your account.
              </div>
            )}

            <div className="pt-3 border-t border-[#303030]">
              <button
                type="button"
                onClick={() => handleNav('/client/my-trainer')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#EB3E2E] hover:text-[#FF493B] uppercase tracking-wider"
              >
                <span>VIEW TRAINER PROFILE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col justify-between">
            <div className="flex flex-col gap-1 border-b border-[#303030] pb-3">
              <span className="text-[10px] font-mono text-[#EB3E2E] uppercase tracking-wider font-bold">
                GYM PRIVILEGES
              </span>
              <h3
                className="text-lg font-bold uppercase text-[#F5F5F5]"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                SELF-TRAINED ATHLETE STATUS
              </h3>
            </div>

            <div className="py-4 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-xs text-[#F5F5F5]">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Full access to strength equipment and cardio stations.</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#F5F5F5]">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Personal locker facilities and shower access included.</span>
              </div>
              <p className="text-[11px] text-[#B8B8B8] leading-relaxed pt-1">
                Want 1-on-1 personal coaching? Browse certified coaches at your branch and schedule an introductory session based on their availability.
              </p>
            </div>

            <div className="pt-3 border-t border-[#303030] flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleNav('/client/my-trainer')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#EB3E2E] hover:text-[#FF493B] uppercase tracking-wider cursor-pointer"
              >
                <span>BROWSE AVAILABLE TRAINERS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-emerald-400 font-semibold uppercase">READY TO ASSIGN</span>
            </div>
          </div>
        )}
      </div>

      {/* ── 5. RECENT GENUINE ACTIVITY LEDGER ── */}
      <div className="p-6 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#303030] pb-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-[#EB3E2E] uppercase tracking-wider font-bold">
              VERIFIED TIMELINE
            </span>
            <h3
              className="text-base sm:text-lg font-bold uppercase text-[#F5F5F5]"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              RECENT ACTIVITY
            </h3>
          </div>
          <Activity className="w-5 h-5 text-[#B8B8B8]" />
        </div>

        {recentActivities && recentActivities.length > 0 ? (
          <div className="flex flex-col divide-y divide-[#303030]">
            {recentActivities.map((act) => (
              <div key={act.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#EB3E2E] mt-1.5 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-bold text-[#F5F5F5]">{act.title}</span>
                    <span className="text-[#B8B8B8]">{act.description}</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#B8B8B8] shrink-0">
                  {new Date(act.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-[#B8B8B8]">
            Your training journey starts with your first visit. Log workouts and check-in to build your timeline.
          </div>
        )}
      </div>
    </div>
  );
}
