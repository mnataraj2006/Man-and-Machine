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
        <div className="h-10 bg-[#151515] rounded-xl w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-28 bg-[#151515] rounded-2xl" />
          <div className="h-28 bg-[#151515] rounded-2xl" />
          <div className="h-28 bg-[#151515] rounded-2xl" />
          <div className="h-28 bg-[#151515] rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-[#151515] rounded-2xl" />
          <div className="h-72 bg-[#151515] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-[#151515] border border-red-500/30 flex flex-col items-center justify-center text-center gap-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <div className="flex flex-col gap-1">
          <span className="text-base font-bold text-[#F5F5F5] uppercase">Unable to Load Dashboard</span>
          <p className="text-xs text-[#A3A3A3] max-w-md">{error}</p>
        </div>
        <button
          type="button"
          onClick={fetchDashboard}
          className="px-5 py-2.5 rounded-xl bg-[#E58A32] text-white font-bold text-xs uppercase tracking-wider cursor-pointer hover:bg-[#F09A43]"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { stats, todaysWorkout, weeklyActivity, membership, trainer, recentActivities, client } = data || {};

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* ── 1. WELCOME GREETING BANNER ── */}
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#151515] border border-[#292929] text-[10px] uppercase font-bold tracking-widest text-[#E58A32] w-fit">
          <span>{client?.branch?.name || 'MAN & MACHINE'}</span>
          <span>•</span>
          <span>DISCIPLINE OVER SHORTCUTS</span>
        </div>

        <h1
          className="uppercase font-bold tracking-tight text-[#F5F5F5]"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(1.75rem, 3.2vw, 2.75rem)',
            lineHeight: '1.1',
          }}
        >
          WELCOME, <span className="text-[#E58A32]">{client?.name || 'ATHLETE'}.</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#A3A3A3]">
          Every rep counts. Keep building your strongest self.
        </p>
      </div>

      {/* ── 2. QUICK STATISTICS (4 CARDS) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Stat 1: Monthly Attendance */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#151515] border border-[#292929] flex flex-col justify-between hover:border-[#E58A32]/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-[#A3A3A3] uppercase tracking-wider">MONTHLY VISITS</span>
            <div className="w-7 h-7 rounded-lg bg-[#E58A32]/10 flex items-center justify-center text-[#E58A32]">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-[#F5F5F5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {stats?.attendanceThisMonth ?? 0}
            </span>
            <span className="text-[11px] text-[#A3A3A3]">sessions</span>
          </div>
        </div>

        {/* Stat 2: Completed Workouts */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#151515] border border-[#292929] flex flex-col justify-between hover:border-[#E58A32]/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-[#A3A3A3] uppercase tracking-wider">WORKOUTS DONE</span>
            <div className="w-7 h-7 rounded-lg bg-[#E58A32]/10 flex items-center justify-center text-[#E58A32]">
              <Dumbbell className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-[#F5F5F5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {stats?.completedWorkouts ?? 0}
            </span>
            <span className="text-[11px] text-[#A3A3A3]">logged</span>
          </div>
        </div>

        {/* Stat 3: Current Membership */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#151515] border border-[#292929] flex flex-col justify-between hover:border-[#E58A32]/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-[#A3A3A3] uppercase tracking-wider">MEMBERSHIP</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-bold text-emerald-400 uppercase tracking-tight truncate">
              {membership ? membership.status : 'INACTIVE'}
            </span>
            <span className="text-[10px] text-[#A3A3A3] truncate">
              {membership ? `${membership.daysRemaining} days left` : 'Pending activation'}
            </span>
          </div>
        </div>

        {/* Stat 4: Training Streak */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#151515] border border-[#292929] flex flex-col justify-between hover:border-[#E58A32]/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-[#A3A3A3] uppercase tracking-wider">CURRENT STREAK</span>
            <div className="w-7 h-7 rounded-lg bg-[#E58A32]/10 flex items-center justify-center text-[#E58A32]">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-[#E58A32]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {stats?.trainingStreak ?? 0}
            </span>
            <span className="text-[11px] text-[#A3A3A3]">days consistency</span>
          </div>
        </div>
      </div>

      {/* ── 3. TODAY'S WORKOUT & WEEKLY ACTIVITY ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 Cols): Today's Workout Card */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#151515] border border-[#292929] flex flex-col justify-between shadow-[0_4px_24px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#E58A32]/5 rounded-full blur-3xl pointer-events-none" />

          {todaysWorkout ? (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-[#292929] pb-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-mono text-[#E58A32] uppercase tracking-wider font-bold">
                    TODAY'S PRESCRIBED SESSION • {todaysWorkout.day}
                  </span>
                  <h3
                    className="text-xl sm:text-2xl font-bold uppercase text-[#F5F5F5]"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {todaysWorkout.focus}
                  </h3>
                </div>
                {todaysWorkout.isRestDay ? (
                  <span className="px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase">
                    REST &amp; RECOVER
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-lg bg-[#E58A32]/10 border border-[#E58A32]/30 text-[#E58A32] text-xs font-bold uppercase">
                    {todaysWorkout.exerciseCount} EXERCISES
                  </span>
                )}
              </div>

              {todaysWorkout.isRestDay ? (
                <div className="py-8 flex flex-col items-center justify-center text-center gap-2 text-[#A3A3A3]">
                  <Sparkles className="w-8 h-8 text-[#E58A32]" />
                  <p className="text-sm">Scheduled active recovery day. Hydrate, stretch, and nourish the machine.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <span className="text-xs font-bold uppercase text-[#A3A3A3]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    SAMPLE EXERCISES PREVIEW:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {todaysWorkout.exercises.map((ex, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-[#1C1C1C] border border-[#292929] flex flex-col gap-1">
                        <span className="text-xs font-bold text-[#F5F5F5] truncate">{ex.name}</span>
                        <span className="text-[11px] font-mono text-[#E58A32]">
                          {ex.sets} sets × {ex.reps} reps
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-[#292929] flex items-center justify-between">
                <span className="text-xs text-[#A3A3A3]">
                  Trainer: <strong className="text-[#F5F5F5]">{todaysWorkout.trainerName || 'Assigned Coach'}</strong>
                </span>

                <button
                  type="button"
                  onClick={() => handleNav(`/client/workouts/${todaysWorkout.planId}`)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E58A32] hover:bg-[#F09A43] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(229,138,50,0.25)] cursor-pointer"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <span>START WORKOUT</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="py-8 sm:py-12 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#1C1C1C] border border-[#292929] flex items-center justify-center text-[#E58A32]">
                <Dumbbell className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1">
                <span
                  className="text-base sm:text-lg font-bold uppercase text-[#F5F5F5]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  YOUR NEXT SESSION STARTS HERE
                </span>
                <p className="text-xs sm:text-sm text-[#A3A3A3] max-w-sm">
                  Your trainer hasn't assigned a structured workout yet. You can still log personal sessions anytime.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleNav('/client/workouts')}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1C1C1C] hover:border-[#E58A32] text-[#F5F5F5] border border-[#292929] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                <span>OPEN WORKOUT ROSTER</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Right (1 Col): Weekly Activity Visualization */}
        <div className="p-6 rounded-2xl bg-[#151515] border border-[#292929] flex flex-col justify-between">
          <div className="flex flex-col gap-1 border-b border-[#292929] pb-3">
            <span className="text-[10px] font-mono text-[#E58A32] uppercase tracking-wider font-bold">
              ATTENDANCE &amp; ACTIVITY
            </span>
            <h3
              className="text-lg font-bold uppercase text-[#F5F5F5]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
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
                      ? 'bg-[#E58A32]/20 border-[#E58A32]'
                      : 'bg-[#1C1C1C] border-[#292929]'
                  }`}
                >
                  {item.attended ? (
                    <div className="w-full bg-[#E58A32] rounded-lg py-1 flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  ) : (
                    <div className="w-full h-1 bg-[#292929] rounded" />
                  )}
                </div>
                <span className="text-[10px] font-mono text-[#A3A3A3] font-bold">{item.day}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#292929] flex items-center justify-between text-xs text-[#A3A3A3]">
            <span>Orange indicates confirmed check-in.</span>
            <button
              type="button"
              onClick={() => handleNav('/client/attendance')}
              className="text-[#E58A32] hover:underline font-bold uppercase text-[11px]"
            >
              FULL CALENDAR →
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. MEMBERSHIP SUMMARY & ASSIGNED TRAINER ROW ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Membership Summary */}
        <div className="p-6 rounded-2xl bg-[#151515] border border-[#292929] flex flex-col justify-between">
          <div className="flex flex-col gap-1 border-b border-[#292929] pb-3">
            <span className="text-[10px] font-mono text-[#E58A32] uppercase tracking-wider font-bold">
              MEMBERSHIP INTEGRITY
            </span>
            <h3
              className="text-lg font-bold uppercase text-[#F5F5F5]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              MEMBERSHIP SUMMARY
            </h3>
          </div>

          {membership ? (
            <div className="py-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#F5F5F5]">{membership.planName}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {membership.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-[#1C1C1C] border border-[#292929] flex flex-col gap-0.5">
                  <span className="text-[10px] font-mono text-[#A3A3A3]">EXPIRY DATE</span>
                  <span className="text-xs font-bold text-[#F5F5F5]">
                    {new Date(membership.expiryDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#1C1C1C] border border-[#292929] flex flex-col gap-0.5">
                  <span className="text-[10px] font-mono text-[#A3A3A3]">DAYS REMAINING</span>
                  <span className="text-xs font-bold text-[#E58A32]">{membership.daysRemaining} Days</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-[#A3A3A3]">
              Membership details will appear here once your account is updated by the gym.
            </div>
          )}

          <div className="pt-3 border-t border-[#292929]">
            <button
              type="button"
              onClick={() => handleNav('/client/membership')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E58A32] hover:text-[#F09A43] uppercase tracking-wider"
            >
              <span>VIEW MEMBERSHIP DETAILS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Trainer Card */}
        <div className="p-6 rounded-2xl bg-[#151515] border border-[#292929] flex flex-col justify-between">
          <div className="flex flex-col gap-1 border-b border-[#292929] pb-3">
            <span className="text-[10px] font-mono text-[#E58A32] uppercase tracking-wider font-bold">
              COACHING PARTNER
            </span>
            <h3
              className="text-lg font-bold uppercase text-[#F5F5F5]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              ASSIGNED TRAINER
            </h3>
          </div>

          {trainer ? (
            <div className="py-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#1C1C1C] border border-[#292929] flex items-center justify-center text-[#E58A32] font-bold text-lg shrink-0">
                {trainer.name ? trainer.name.charAt(0).toUpperCase() : 'T'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold uppercase text-[#F5F5F5] truncate">{trainer.name}</span>
                <span className="text-xs text-[#E58A32] truncate">{trainer.specialization}</span>
                <span className="text-[11px] text-[#A3A3A3] truncate">{trainer.experienceYears} Years Experience</span>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-[#A3A3A3]">
              Your trainer assignment is pending. The branch will assign a coach to your account.
            </div>
          )}

          <div className="pt-3 border-t border-[#292929]">
            <button
              type="button"
              onClick={() => handleNav('/client/trainer')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E58A32] hover:text-[#F09A43] uppercase tracking-wider"
            >
              <span>VIEW TRAINER PROFILE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 5. RECENT GENUINE ACTIVITY LEDGER ── */}
      <div className="p-6 rounded-2xl bg-[#151515] border border-[#292929] flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#292929] pb-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-[#E58A32] uppercase tracking-wider font-bold">
              VERIFIED TIMELINE
            </span>
            <h3
              className="text-base sm:text-lg font-bold uppercase text-[#F5F5F5]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              RECENT ACTIVITY
            </h3>
          </div>
          <Activity className="w-5 h-5 text-[#A3A3A3]" />
        </div>

        {recentActivities && recentActivities.length > 0 ? (
          <div className="flex flex-col divide-y divide-[#292929]">
            {recentActivities.map((act) => (
              <div key={act.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#E58A32] mt-1.5 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-bold text-[#F5F5F5]">{act.title}</span>
                    <span className="text-[#A3A3A3]">{act.description}</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#A3A3A3] shrink-0">
                  {new Date(act.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-[#A3A3A3]">
            Your training journey starts with your first visit. Log workouts and check-in to build your timeline.
          </div>
        )}
      </div>
    </div>
  );
}
