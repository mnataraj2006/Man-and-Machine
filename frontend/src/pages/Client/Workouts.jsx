import React, { useState, useEffect } from 'react';
import {
  Dumbbell,
  Calendar,
  Clock,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  Sparkles,
  Flame,
  AlertCircle,
} from 'lucide-react';
import authService from '../../services/auth.js';
import clientService from '../../services/clientService.js';

export default function Workouts({ onNavigate }) {
  const [plans, setPlans] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notAssigned, setNotAssigned] = useState(false);

  useEffect(() => {
    let isMounted = false;
    isMounted = true;

    const user = authService.getUser();
    if (user && user.trainerAssigned === false) {
      setNotAssigned(true);
      setLoading(false);
      return;
    }

    const fetchWorkoutData = async () => {
      try {
        setLoading(true);
        const [plansRes, sessionsRes] = await Promise.all([
          clientService.getWorkouts(),
          clientService.getWorkoutSessions(),
        ]);
        if (isMounted) {
          setPlans(plansRes.plans || []);
          setSessions(sessionsRes.sessions || []);
        }
      } catch (err) {
        if (isMounted) {
          const msg = err.message || '';
          if (msg.includes('trainer') || msg.includes('403') || msg.includes('Forbidden') || msg.includes('assigned')) {
            setNotAssigned(true);
          } else {
            setError(msg || 'Failed to load workouts');
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchWorkoutData();
    return () => {
      isMounted = false;
    };
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
        <div className="h-64 bg-[#181818] rounded-2xl" />
        <div className="h-48 bg-[#181818] rounded-2xl" />
      </div>
    );
  }

  // Self-Trained / No Trainer Assigned Empty & Protected State
  if (notAssigned) {
    return (
      <div className="flex flex-col gap-6 sm:gap-8">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-mono text-[#EB3E2E] uppercase tracking-wider font-bold">
            TRAINING MATRIX
          </span>
          <h1
            className="uppercase font-bold tracking-tight text-[#F5F5F5]"
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)',
            }}
          >
            MY WORKOUTS.
          </h1>
        </div>

        <div className="p-8 sm:p-12 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col items-center justify-center text-center gap-5 shadow-[0_4px_30px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#EB3E2E]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="w-16 h-16 rounded-2xl bg-[#202020] border border-[#303030] flex items-center justify-center text-[#EB3E2E]">
            <Dumbbell className="w-8 h-8 text-[#EB3E2E]" />
          </div>

          <div className="flex flex-col gap-2 max-w-lg">
            <span className="px-3 py-1 rounded-full bg-[#EB3E2E]/10 border border-[#EB3E2E]/30 text-[#EB3E2E] text-[10px] font-bold uppercase tracking-wider w-fit mx-auto">
              SELF-TRAINED ATHLETE
            </span>
            <h2
              className="text-xl sm:text-2xl font-bold uppercase text-[#F5F5F5]"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              My Workouts is available when you have an assigned trainer.
            </h2>
            <p className="text-xs sm:text-sm text-[#B8B8B8] leading-relaxed">
              Clients at Man &amp; Machine are self-trained by default. Once gym administration assigns a personal coach to your profile, your customized workout split and exercise routines will appear here.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleNav('/client/dashboard')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(235,62,46,0.30)] cursor-pointer"
            >
              <span>RETURN TO DASHBOARD</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activePlan = plans.find((p) => p.isActive) || plans[0];

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-mono text-[#EB3E2E] uppercase tracking-wider font-bold">
          TRAINING MATRIX
        </span>
        <h1
          className="uppercase font-bold tracking-tight text-[#F5F5F5]"
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)',
          }}
        >
          MY WORKOUT PROGRAMS.
        </h1>
        <p className="text-xs sm:text-sm text-[#B8B8B8]">
          Trainer-prescribed exercise programming and logged performance history.
        </p>
      </div>

      {/* ── ACTIVE PLAN SPOTLIGHT ── */}
      {activePlan ? (
        <div className="p-6 sm:p-8 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col gap-6 relative overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#EB3E2E]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#303030] pb-6">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-[#EB3E2E] uppercase font-bold tracking-wider">
                CURRENT ACTIVE SPLIT
              </span>
              <h2
                className="text-xl sm:text-2xl font-bold uppercase text-[#F5F5F5]"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                {activePlan.title}
              </h2>
              <p className="text-xs text-[#B8B8B8] max-w-xl">{activePlan.description || 'Structured strength and hypertrophy regime.'}</p>
            </div>

            <button
              type="button"
              onClick={() => handleNav(`/client/workouts/${activePlan._id}`)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(235,62,46,0.30)] cursor-pointer shrink-0"
            >
              <span>VIEW FULL EXERCISES</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Schedule Grid */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#B8B8B8]" style={{ fontFamily: "'Oswald', sans-serif" }}>
              WEEKLY ROTATION SCHEDULE:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
              {activePlan.schedule?.map((item) => (
                <div
                  key={item.day}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2 ${
                    item.isRestDay
                      ? 'bg-[#202020]/40 border-[#303030] text-[#B8B8B8]'
                      : 'bg-[#202020] border-[#303030] hover:border-[#EB3E2E]/50 text-[#F5F5F5]'
                  }`}
                >
                  <span className="text-[10px] font-mono uppercase font-bold text-[#EB3E2E]">
                    {item.day.slice(0, 3)}
                  </span>
                  <span className="text-xs font-bold uppercase line-clamp-2 leading-tight">
                    {item.focus || (item.isRestDay ? 'Rest & Recover' : 'Training')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Exercises Snapshot */}
          <div className="pt-2 flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#B8B8B8]" style={{ fontFamily: "'Oswald', sans-serif" }}>
              PRESCRIBED EXERCISES ({activePlan.exercises?.length || 0}):
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activePlan.exercises?.map((ex, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-[#202020] border border-[#303030] flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#EB3E2E]/10 border border-[#EB3E2E]/30 flex items-center justify-center text-[#EB3E2E] font-mono text-xs font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-[#F5F5F5] truncate">{ex.name}</span>
                    <span className="text-[11px] font-mono text-[#EB3E2E]">
                      {ex.sets} sets × {ex.reps} reps
                    </span>
                    {ex.instructions && (
                      <span className="text-[10px] text-[#B8B8B8] line-clamp-1 mt-0.5">{ex.instructions}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-10 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col items-center justify-center text-center gap-3">
          <Dumbbell className="w-10 h-10 text-[#EB3E2E]" />
          <h3 className="text-lg font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
            YOUR TRAINER HASN'T ASSIGNED A WORKOUT YET
          </h3>
          <p className="text-xs text-[#B8B8B8] max-w-md">
            Your trainer will evaluate your fitness goals and configure your dedicated training program. You will be notified when ready.
          </p>
        </div>
      )}

      {/* ── LOGGED WORKOUT HISTORY ── */}
      <div className="p-6 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#303030] pb-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-[#EB3E2E] uppercase tracking-wider font-bold">
              EXECUTION LOG
            </span>
            <h3
              className="text-base sm:text-lg font-bold uppercase text-[#F5F5F5]"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              COMPLETED WORKOUT SESSIONS
            </h3>
          </div>
          <span className="text-xs font-mono text-[#B8B8B8]">{sessions.length} sessions logged</span>
        </div>

        {sessions.length > 0 ? (
          <div className="flex flex-col divide-y divide-[#303030]">
            {sessions.map((sess) => (
              <div key={sess._id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-[#F5F5F5] uppercase" style={{ fontFamily: "'Oswald', sans-serif" }}>
                      {sess.workoutTitle}
                    </span>
                    <span className="text-[#B8B8B8]">
                      Duration: {sess.durationMinutes} minutes • {sess.completedExercises?.length || 0} exercises recorded
                    </span>
                    {sess.notes && <span className="text-[11px] text-[#B8B8B8]/80 italic">"{sess.notes}"</span>}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono text-[#B8B8B8]">
                    {new Date(sess.date).toLocaleDateString()}
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    COMPLETED
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-[#B8B8B8]">
            No completed sessions recorded yet. Start your first session to track actual weights and sets.
          </div>
        )}
      </div>
    </div>
  );
}
