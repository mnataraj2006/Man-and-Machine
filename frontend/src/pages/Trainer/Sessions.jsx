import React, { useState, useEffect } from 'react';
import {
  Activity,
  Plus,
  CheckCircle2,
  Calendar,
  Clock,
  Dumbbell,
  Trash2,
  Save,
  AlertCircle,
} from 'lucide-react';
import trainerService from '../../services/trainerService.js';

export default function Sessions({ onNavigate }) {
  const [sessions, setSessions] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    clientId: '',
    durationMinutes: 60,
    sessionType: 'Personal Training',
    trainingIntensity: 'Moderate',
    trainerObservations: '',
    nextSessionRecommendations: '',
    exercisesPerformed: [
      { name: 'Barbell Bench Press', setsCompleted: 4, repsCompleted: '8-10', weightKg: 80, notes: '' },
    ],
  });

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const [sRes, cRes] = await Promise.all([
        trainerService.getSessions(),
        trainerService.getMyClients(),
      ]);
      setSessions(sRes.sessions || []);
      setClients(cRes.clients || []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const addExercise = () => {
    setForm({
      ...form,
      exercisesPerformed: [
        ...form.exercisesPerformed,
        { name: '', setsCompleted: 3, repsCompleted: '10', weightKg: 0, notes: '' },
      ],
    });
  };

  const removeExercise = (index) => {
    setForm({
      ...form,
      exercisesPerformed: form.exercisesPerformed.filter((_, i) => i !== index),
    });
  };

  const updateExercise = (index, field, value) => {
    const updated = [...form.exercisesPerformed];
    updated[index][field] = value;
    setForm({ ...form, exercisesPerformed: updated });
  };

  const handleCompleteSession = async (e) => {
    e.preventDefault();
    if (!form.clientId) {
      alert('Please select an athlete.');
      return;
    }

    try {
      setSubmitting(true);
      await trainerService.completeSession(form);
      setShowLogModal(false);
      setForm({
        clientId: '',
        durationMinutes: 60,
        sessionType: 'Personal Training',
        trainingIntensity: 'Moderate',
        trainerObservations: '',
        nextSessionRecommendations: '',
        exercisesPerformed: [],
      });
      fetchSessions();
    } catch (err) {
      alert(err.message || 'Failed to complete session');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-[#E58A32] uppercase tracking-wider font-bold">
            LIVE TRAINING FLOOR LOGS
          </span>
          <h1
            className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            TRAINING SESSIONS & LIVE LOGGER.
          </h1>
          <p className="text-xs text-[#A3A3A3]">
            Record completed floor coaching sessions. Logs automatically synchronize with client workout histories.
          </p>
        </div>

        <button
          onClick={() => setShowLogModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#E58A32] hover:bg-[#F09A43] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(229,138,50,0.25)] shrink-0"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          <Plus className="w-4 h-4" />
          <span>Log Live Floor Session</span>
        </button>
      </div>

      {/* ── SESSIONS LIST ── */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-[#141414] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#141414] border border-[#292929] text-center flex flex-col items-center justify-center gap-3">
          <Activity className="w-10 h-10 text-[#292929]" />
          <h3 className="text-sm font-bold uppercase text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            NO COMPLETED SESSIONS RECORDED
          </h3>
          <p className="text-xs text-[#A3A3A3] max-w-sm">
            Use the Live Floor Session logger to record sets, reps, and weights for your athletes.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((session) => (
            <div
              key={session._id}
              className="p-5 rounded-2xl bg-[#141414] border border-[#292929] flex flex-col gap-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#292929] pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1C1C1C] border border-[#292929] flex items-center justify-center text-[#E58A32] font-black text-sm">
                    {session.clientId?.name ? session.clientId.name.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold uppercase text-white">{session.clientId?.name}</span>
                    <span className="text-xs text-[#A3A3A3]">
                      {session.sessionType} • {session.durationMinutes} mins
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {session.status}
                  </span>
                  <span className="text-[11px] text-[#737373] font-mono">
                    {new Date(session.scheduledAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {session.completedData?.trainerObservations && (
                <p className="text-xs text-[#A3A3A3] bg-[#181818] p-3 rounded-xl border border-[#292929]">
                  <strong className="text-white">Coach Observations: </strong>
                  {session.completedData.trainerObservations}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL: LOG LIVE SESSION ── */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#141414] border border-[#292929] rounded-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <h3
              className="text-base font-bold uppercase text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              LOG LIVE FLOOR SESSION & SYNC TO CLIENT
            </h3>

            <form onSubmit={handleCompleteSession} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase text-[#A3A3A3]">SELECT ATHLETE</label>
                  <select
                    required
                    value={form.clientId}
                    onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                    className="p-2.5 rounded-xl bg-[#181818] border border-[#292929] text-xs text-white"
                  >
                    <option value="">-- Choose Athlete --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.fitnessGoal})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase text-[#A3A3A3]">SESSION TYPE</label>
                  <select
                    value={form.sessionType}
                    onChange={(e) => setForm({ ...form, sessionType: e.target.value })}
                    className="p-2.5 rounded-xl bg-[#181818] border border-[#292929] text-xs text-white"
                  >
                    <option value="Personal Training">Personal Training Floor Session</option>
                    <option value="Strength Training">Strength & Hypertrophy Session</option>
                    <option value="Assessment">Assessment & Testing</option>
                    <option value="Cardio & Conditioning">Conditioning & Work Capacity</option>
                  </select>
                </div>
              </div>

              {/* Exercises Table */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-[#E58A32]">EXERCISES COMPLETED</span>
                  <button
                    type="button"
                    onClick={addExercise}
                    className="text-xs text-[#E58A32] hover:text-[#F09A43] font-bold uppercase flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Exercise</span>
                  </button>
                </div>

                {form.exercisesPerformed.map((ex, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#181818] border border-[#292929] grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                    <input
                      type="text"
                      required
                      value={ex.name}
                      onChange={(e) => updateExercise(idx, 'name', e.target.value)}
                      placeholder="Exercise Name"
                      className="p-2 rounded-lg bg-[#202020] border border-[#292929] text-xs text-white"
                    />
                    <input
                      type="number"
                      min="1"
                      value={ex.setsCompleted}
                      onChange={(e) => updateExercise(idx, 'setsCompleted', Number(e.target.value))}
                      placeholder="Sets"
                      className="p-2 rounded-lg bg-[#202020] border border-[#292929] text-xs text-white"
                    />
                    <input
                      type="number"
                      step="0.5"
                      value={ex.weightKg}
                      onChange={(e) => updateExercise(idx, 'weightKg', Number(e.target.value))}
                      placeholder="Weight (kg)"
                      className="p-2 rounded-lg bg-[#202020] border border-[#292929] text-xs text-white"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={ex.repsCompleted}
                        onChange={(e) => updateExercise(idx, 'repsCompleted', e.target.value)}
                        placeholder="Reps"
                        className="flex-1 p-2 rounded-lg bg-[#202020] border border-[#292929] text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeExercise(idx)}
                        className="p-2 rounded-lg text-[#737373] hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase text-[#A3A3A3]">COACH OBSERVATIONS & PERFORMANCE NOTES</label>
                <textarea
                  rows="3"
                  value={form.trainerObservations}
                  onChange={(e) => setForm({ ...form, trainerObservations: e.target.value })}
                  placeholder="Record biomechanical cues, form execution, or RPE intensity..."
                  className="p-2.5 rounded-xl bg-[#181818] border border-[#292929] text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#292929]">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#1C1C1C] text-xs font-bold uppercase text-[#A3A3A3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#E58A32] hover:bg-[#F09A43] text-white text-xs font-bold uppercase"
                >
                  {submitting ? 'Syncing...' : 'Save & Sync to Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
