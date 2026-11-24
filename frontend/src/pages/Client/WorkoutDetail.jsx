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
import clientService from '../../services/clientService.js';

export default function WorkoutDetail({ workoutId, onNavigate }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        if (isMounted) setError(err.message || 'Unable to load workout split.');
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
        <div className="h-10 bg-[#151515] rounded-xl w-48" />
        <div className="h-40 bg-[#151515] rounded-2xl" />
        <div className="h-96 bg-[#151515] rounded-2xl" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="p-8 rounded-2xl bg-[#151515] border border-red-500/30 flex flex-col items-center justify-center text-center gap-3">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <h3 className="text-base font-bold uppercase text-[#F5F5F5]">Unable to Load Workout</h3>
        <p className="text-xs text-[#A3A3A3]">{error || 'Workout plan not found.'}</p>
        <button
          type="button"
          onClick={() => handleNav('/client/workouts')}
          className="mt-2 px-4 py-2 rounded-xl bg-[#1C1C1C] text-xs font-bold text-[#F5F5F5]"
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
          className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A3A3A3] hover:text-[#E58A32] transition-colors"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>BACK TO WORKOUT ROSTER</span>
        </button>

        <span className="text-[10.5px] font-mono text-[#A3A3A3] uppercase">
          PROGRAM: {plan.goal}
        </span>
      </div>

      {/* ── WORKOUT BANNER ── */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#151515] border border-[#292929] flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#E58A32]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-[#E58A32]/10 border border-[#E58A32]/30 text-[#E58A32] text-[10px] font-bold uppercase tracking-wider">
            PRESCRIBED WORKOUT
          </span>
          <span className="text-xs text-[#A3A3A3]">• {plan.exercises?.length || 0} Total Exercises</span>
        </div>

        <h1
          className="text-2xl sm:text-3xl font-bold uppercase text-[#F5F5F5]"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {plan.title}
        </h1>

        <p className="text-xs sm:text-sm text-[#A3A3A3] max-w-2xl leading-relaxed">
          {plan.description || 'Follow precise form, execute designated rest periods, and record actual load lifted.'}
        </p>
      </div>

      {/* Success Banner */}
      {successNotice && (
        <div className="p-4 rounded-xl bg-[#151515] border border-emerald-500/80 text-xs text-[#F5F5F5] flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-bold text-emerald-400">{successNotice}</span>
        </div>
      )}

      {/* ── EXECUTION & LOGGING FORM ── */}
      <form onSubmit={handleSubmitSession} className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <span
            className="text-xs font-bold uppercase tracking-wider text-[#A3A3A3]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
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
                      ? 'bg-[#1C1C1C] border-[#292929]'
                      : 'bg-[#151515]/60 border-[#292929]/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <button
                      type="button"
                      onClick={() => handleSetToggle(idx)}
                      className={`w-6 h-6 rounded-lg border mt-0.5 flex items-center justify-center cursor-pointer transition-colors ${
                        log.completed
                          ? 'border-[#E58A32] bg-[#E58A32] text-white'
                          : 'border-[#444] bg-[#141414]'
                      }`}
                    >
                      {log.completed && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </button>

                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-[#F5F5F5] uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {ex.name}
                      </span>
                      <div className="flex items-center gap-3 text-xs text-[#A3A3A3] mt-0.5">
                        <span className="font-mono text-[#E58A32] font-semibold">{ex.sets} sets × {ex.reps} reps</span>
                        {ex.restSeconds && <span>• Rest: {ex.restSeconds}s</span>}
                      </div>
                      {ex.instructions && (
                        <p className="text-[11px] text-[#A3A3A3]/80 mt-1">{ex.instructions}</p>
                      )}
                    </div>
                  </div>

                  {/* Weight lifted input */}
                  <div className="flex items-center gap-3 shrink-0 pl-9 sm:pl-0">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-mono text-[#A3A3A3] uppercase">WEIGHT LIFTED:</label>
                      <input
                        type="number"
                        placeholder="kg"
                        value={log.weight || ''}
                        onChange={(e) => handleWeightChange(idx, e.target.value)}
                        className="w-20 bg-[#141414] border border-[#292929] rounded-xl px-2.5 py-1.5 text-xs text-center text-[#F5F5F5] focus:outline-none focus:border-[#E58A32]"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Duration & Notes */}
        <div className="p-6 rounded-2xl bg-[#151515] border border-[#292929] grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-[#A3A3A3]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              SESSION DURATION (MINS)
            </label>
            <input
              type="number"
              value={sessionData.durationMinutes}
              onChange={(e) => setSessionData((prev) => ({ ...prev, durationMinutes: e.target.value }))}
              className="bg-[#1C1C1C] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#E58A32]"
            />
          </div>

          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-[#A3A3A3]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              OPTIONAL SESSION NOTES
            </label>
            <input
              type="text"
              placeholder="e.g. Felt strong on bench press, increased load by 2.5kg"
              value={sessionData.notes}
              onChange={(e) => setSessionData((prev) => ({ ...prev, notes: e.target.value }))}
              className="bg-[#1C1C1C] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#E58A32]"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#E58A32] hover:bg-[#F09A43] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(229,138,50,0.30)] cursor-pointer disabled:opacity-60"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
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
