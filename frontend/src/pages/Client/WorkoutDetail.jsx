import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Dumbbell,
  AlertCircle,
  Save,
  Sparkles,
} from 'lucide-react';
import authService from '../../services/auth.js';
import clientService from '../../services/clientService.js';

export default function WorkoutDetail({ workoutId, onNavigate }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notAssigned, setNotAssigned] = useState(false);

  // Execution state: allows user to record actual completed sets and weights
  const [sessionData, setSessionData] = useState({
    durationMinutes: 50,
    notes: '',
    exerciseLogs: {},
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const user = authService.getUser();
    if (user && user.trainerAssigned === false) {
      setNotAssigned(true);
      setLoading(false);
      return;
    }

    const fetchPlan = async () => {
      try {
        setLoading(true);
        const res = await clientService.getWorkoutById(workoutId);
        if (isMounted) {
          setPlan(res.plan);
          // Initialize exercise logs
          const initLogs = {};
          res.plan.exercises?.forEach((ex, idx) => {
            initLogs[idx] = {
              name: ex.name,
              completed: true,
              weight: '',
              actualReps: ex.reps || '10',
            };
          });
          setSessionData((prev) => ({ ...prev, exerciseLogs: initLogs }));
        }
      } catch (err) {
        if (isMounted) {
          const msg = err.message || '';
          if (msg.includes('trainer') || msg.includes('403') || msg.includes('Forbidden') || msg.includes('assigned')) {
            setNotAssigned(true);
          } else {
            setError(msg || 'Unable to load workout split.');
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchPlan();
    return () => {
      isMounted = false;
    };
  }, [workoutId]);

  const handleNav = (path) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleSetToggle = (exIdx) => {
    setSessionData((prev) => ({
      ...prev,
      exerciseLogs: {
        ...prev.exerciseLogs,
        [exIdx]: {
          ...prev.exerciseLogs[exIdx],
          completed: !prev.exerciseLogs[exIdx]?.completed,
        },
      },
    }));
  };

  const handleWeightChange = (exIdx, val) => {
    setSessionData((prev) => ({
      ...prev,
      exerciseLogs: {
        ...prev.exerciseLogs,
        [exIdx]: {
          ...prev.exerciseLogs[exIdx],
          weight: val,
        },
      },
    }));
  };

  const handleSubmitSession = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessNotice(null);

    try {
      const completedExercises = Object.entries(sessionData.exerciseLogs)
        .filter(([_, log]) => log.completed)
        .map(([_, log]) => ({
          exerciseName: log.name,
          completedSets: [
            {
              setNumber: 1,
              reps: parseInt(log.actualReps, 10) || 10,
              weightKg: parseFloat(log.weight) || 0,
              completed: true,
            },
          ],
        }));

      await clientService.logWorkoutSession(workoutId, {
        workoutTitle: plan.title,
        durationMinutes: parseInt(sessionData.durationMinutes, 10) || 45,
        notes: sessionData.notes,
        completedExercises,
      });

      setSuccessNotice('Workout logged successfully! Your training record has been saved.');
      setTimeout(() => {
        handleNav('/client/workouts');
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to record workout session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-10 bg-[#181818] rounded-xl w-48" />
        <div className="h-40 bg-[#181818] rounded-2xl" />
        <div className="h-96 bg-[#181818] rounded-2xl" />
      </div>
    );
  }

  if (notAssigned) {
    return (
      <div className="p-8 sm:p-12 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col items-center justify-center text-center gap-5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="w-16 h-16 rounded-2xl bg-[#202020] border border-[#303030] flex items-center justify-center text-[#EB3E2E]">
          <Dumbbell className="w-8 h-8 text-[#EB3E2E]" />
        </div>
        <div className="flex flex-col gap-2 max-w-lg">
          <span className="px-3 py-1 rounded-full bg-[#EB3E2E]/10 border border-[#EB3E2E]/30 text-[#EB3E2E] text-[10px] font-bold uppercase tracking-wider w-fit mx-auto">
            RESTRICTED ACCESS
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
        <button
          type="button"
          onClick={() => handleNav('/client/dashboard')}
          className="mt-2 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
        >
          <span>RETURN TO DASHBOARD</span>
        </button>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="p-8 rounded-2xl bg-[#181818] border border-red-500/30 flex flex-col items-center justify-center text-center gap-3">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <h3 className="text-base font-bold uppercase text-[#F5F5F5]">Unable to Load Workout</h3>
        <p className="text-xs text-[#B8B8B8]">{error || 'Workout plan not found.'}</p>
        <button
          type="button"
          onClick={() => handleNav('/client/workouts')}
          className="mt-2 px-4 py-2 rounded-xl bg-[#202020] text-xs font-bold text-[#F5F5F5]"
        >
          Return to Workouts
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* ── TOP NAV LINK ── */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => handleNav('/client/workouts')}
          className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#B8B8B8] hover:text-[#EB3E2E] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>BACK TO WORKOUT ROSTER</span>
        </button>

        <span className="text-[10.5px] font-mono text-[#B8B8B8] uppercase">
          PROGRAM: {plan.goal}
        </span>
      </div>

      {/* ── WORKOUT BANNER ── */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#EB3E2E]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-[#EB3E2E]/10 border border-[#EB3E2E]/30 text-[#EB3E2E] text-[10px] font-bold uppercase tracking-wider">
            PRESCRIBED WORKOUT
          </span>
          <span className="text-xs text-[#B8B8B8]">• {plan.exercises?.length || 0} Total Exercises</span>
        </div>

        <h1
          className="text-2xl sm:text-3xl font-bold uppercase text-[#F5F5F5]"
          style={{ fontFamily: "'Oswald', sans-serif" }}
        >
          {plan.title}
        </h1>

        <p className="text-xs sm:text-sm text-[#B8B8B8] max-w-2xl leading-relaxed">
          {plan.description || 'Follow precise form, execute designated rest periods, and record actual load lifted.'}
        </p>
      </div>

      {/* Success Banner */}
      {successNotice && (
        <div className="p-4 rounded-xl bg-[#181818] border border-emerald-500/80 text-xs text-[#F5F5F5] flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-bold text-emerald-400">{successNotice}</span>
        </div>
      )}

      {/* ── EXECUTION & LOGGING FORM ── */}
      <form onSubmit={handleSubmitSession} className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <span
            className="text-xs font-bold uppercase tracking-wider text-[#B8B8B8]"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            EXERCISE CHECKLIST &amp; LOAD RECORDING:
          </span>

          <div className="flex flex-col gap-3">
            {plan.exercises?.map((ex, idx) => {
              const log = sessionData.exerciseLogs[idx] || {};
              return (
                <div
                  key={idx}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    log.completed
                      ? 'bg-[#202020] border-[#303030]'
                      : 'bg-[#181818]/60 border-[#303030]/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <button
                      type="button"
                      onClick={() => handleSetToggle(idx)}
                      className={`w-6 h-6 rounded-lg border mt-0.5 flex items-center justify-center cursor-pointer transition-colors ${
                        log.completed
                          ? 'border-[#EB3E2E] bg-[#EB3E2E] text-white'
                          : 'border-[#444] bg-[#111111]'
                      }`}
                    >
                      {log.completed && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </button>

                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-[#F5F5F5] uppercase" style={{ fontFamily: "'Oswald', sans-serif" }}>
                        {ex.name}
                      </span>
                      <div className="flex items-center gap-3 text-xs text-[#B8B8B8] mt-0.5">
                        <span className="font-mono text-[#EB3E2E] font-semibold">{ex.sets} sets × {ex.reps} reps</span>
                        {ex.restSeconds && <span>• Rest: {ex.restSeconds}s</span>}
                      </div>
                      {ex.instructions && (
                        <p className="text-[11px] text-[#B8B8B8]/80 mt-1">{ex.instructions}</p>
                      )}
                    </div>
                  </div>

                  {/* Weight lifted input */}
                  <div className="flex items-center gap-3 shrink-0 pl-9 sm:pl-0">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-mono text-[#B8B8B8] uppercase">WEIGHT LIFTED:</label>
                      <input
                        type="number"
                        placeholder="kg"
                        value={log.weight || ''}
                        onChange={(e) => handleWeightChange(idx, e.target.value)}
                        className="w-20 bg-[#111111] border border-[#303030] rounded-xl px-2.5 py-1.5 text-xs text-center text-[#F5F5F5] focus:outline-none focus:border-[#EB3E2E]"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Duration & Notes */}
        <div className="p-6 rounded-2xl bg-[#181818] border border-[#303030] grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-[#B8B8B8]">
              SESSION DURATION (MINS)
            </label>
            <input
              type="number"
              value={sessionData.durationMinutes}
              onChange={(e) => setSessionData((prev) => ({ ...prev, durationMinutes: e.target.value }))}
              className="bg-[#202020] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#EB3E2E]"
            />
          </div>

          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-[#B8B8B8]">
              OPTIONAL SESSION NOTES
            </label>
            <input
              type="text"
              placeholder="e.g. Felt strong on bench press, increased load by 2.5kg"
              value={sessionData.notes}
              onChange={(e) => setSessionData((prev) => ({ ...prev, notes: e.target.value }))}
              className="bg-[#202020] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#EB3E2E]"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(235,62,46,0.30)] cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>SAVING WORKOUT SESSION...</span>
              </span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>COMPLETE &amp; LOG SESSION</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
