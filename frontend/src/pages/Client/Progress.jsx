import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { getChartTheme } from '../../utils/chartTheme.js';
import {
  TrendingUp,
  Dumbbell,
  Plus,
  Scale,
  Award,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import clientService from '../../services/clientService.js';

export default function Progress() {
  const { resolvedTheme } = useTheme();
  const chartTheme = getChartTheme(resolvedTheme);
  const [data, setData] = useState({ weightRecords: [], strengthRecords: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form toggles & states
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showStrengthModal, setShowStrengthModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [weightNote, setWeightNote] = useState('');
  const [strengthInput, setStrengthInput] = useState({
    exerciseName: 'Barbell Bench Press',
    weightLiftedKg: '',
    reps: '1',
    note: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const res = await clientService.getProgress();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load progress records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  const handleAddWeight = async (e) => {
    e.preventDefault();
    if (!weightInput || parseFloat(weightInput) <= 0) return;
    setIsSubmitting(true);
    try {
      await clientService.addProgressRecord({
        type: 'BODY_WEIGHT',
        weightKg: parseFloat(weightInput),
        note: weightNote,
      });
      setShowWeightModal(false);
      setWeightInput('');
      setWeightNote('');
      fetchProgress();
    } catch (err) {
      alert(err.message || 'Failed to record weight');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStrength = async (e) => {
    e.preventDefault();
    if (!strengthInput.weightLiftedKg || parseFloat(strengthInput.weightLiftedKg) <= 0) return;
    setIsSubmitting(true);
    try {
      await clientService.addProgressRecord({
        type: 'STRENGTH_PR',
        exerciseName: strengthInput.exerciseName,
        weightLiftedKg: parseFloat(strengthInput.weightLiftedKg),
        reps: parseInt(strengthInput.reps, 10) || 1,
        note: strengthInput.note,
      });
      setShowStrengthModal(false);
      setStrengthInput({ exerciseName: 'Barbell Bench Press', weightLiftedKg: '', reps: '1', note: '' });
      fetchProgress();
    } catch (err) {
      alert(err.message || 'Failed to record personal record');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-10 bg-[#181818] rounded-xl w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-72 bg-[#181818] rounded-2xl" />
          <div className="h-72 bg-[#181818] rounded-2xl" />
        </div>
      </div>
    );
  }

  const { weightRecords = [], strengthRecords = [] } = data;
  const latestWeight = weightRecords.length > 0 ? weightRecords[0].weightKg : null;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-mono text-[#EB3E2E] uppercase tracking-wider font-bold">
            PERFORMANCE METRICS
          </span>
          <h1
            className="uppercase font-bold tracking-tight text-[#F5F5F5]"
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)',
            }}
          >
            MY PROGRESS &amp; RECORDS.
          </h1>
          <p className="text-xs sm:text-sm text-[#B8B8B8]">
            Log body metrics and personal strength milestones over time.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowWeightModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#181818] hover:border-[#EB3E2E] text-[#F5F5F5] border border-[#303030] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#EB3E2E]" />
            <span>LOG WEIGHT</span>
          </button>

          <button
            type="button"
            onClick={() => setShowStrengthModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(235,62,46,0.25)] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>RECORD STRENGTH PR</span>
          </button>
        </div>
      </div>

      {/* ── BODY WEIGHT PROGRESS CARD ── */}
      <div className="p-6 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-[#303030] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EB3E2E]/10 border border-[#EB3E2E]/30 flex items-center justify-center text-[#EB3E2E]">
              <Scale className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                BODY WEIGHT TRACKING
              </span>
              <span className="text-[11px] text-[#B8B8B8]">
                {latestWeight ? `Latest: ${latestWeight} kg` : 'No weight logged yet'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowWeightModal(true)}
            className="text-xs text-[#EB3E2E] font-bold uppercase hover:underline"
          >
            + Add Entry
          </button>
        </div>

        {weightRecords.length > 0 ? (
          <div className="flex flex-col gap-4">
            {/* SVG Sparkline Progression */}
            <div className="h-32 w-full bg-[#202020] rounded-xl p-4 flex items-end justify-between gap-2 overflow-x-auto">
              {weightRecords.slice(0, 10).reverse().map((r, i) => (
                <div key={r._id || i} className="flex-1 flex flex-col items-center gap-1.5 min-w-[36px]">
                  <span className="text-[10px] font-mono text-[#F5F5F5] font-bold">{r.weightKg}k</span>
                  <div
                    className="w-full rounded-t-lg transition-all"
                    style={{
                      height: `${Math.min(80, Math.max(15, (r.weightKg - 40) * 1.5))}px`,
                      background: chartTheme.barGradient,
                    }}
                  />
                  <span className="text-[8px] font-mono text-[#B8B8B8] truncate">
                    {new Date(r.date).getDate()}/{new Date(r.date).getMonth() + 1}
                  </span>
                </div>
              ))}
            </div>

            {/* List */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {weightRecords.slice(0, 6).map((r) => (
                <div key={r._id} className="p-3 rounded-xl bg-[#202020] border border-[#303030] flex items-center justify-between text-xs">
                  <span className="font-bold text-[#F5F5F5]">{r.weightKg} kg</span>
                  <span className="font-mono text-[10px] text-[#B8B8B8]">
                    {new Date(r.date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-[#B8B8B8]">
            Start recording your weight to build your transformation graph.
          </div>
        )}
      </div>

      {/* ── STRENGTH PERSONAL RECORDS ── */}
      <div className="p-6 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-[#303030] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EB3E2E]/10 border border-[#EB3E2E]/30 flex items-center justify-center text-[#EB3E2E]">
              <Award className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                PERSONAL STRENGTH RECORDS (PRS)
              </span>
              <span className="text-[11px] text-[#B8B8B8]">Verified maximum performance</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowStrengthModal(true)}
            className="text-xs text-[#EB3E2E] font-bold uppercase hover:underline"
          >
            + New PR
          </button>
        </div>

        {strengthRecords.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {strengthRecords.map((pr) => (
              <div key={pr._id} className="p-4 rounded-xl bg-[#202020] border border-[#303030] flex flex-col gap-1.5 hover:border-[#EB3E2E]/40 transition-colors">
                <span className="text-[10px] font-mono text-[#EB3E2E] font-bold uppercase">LIFT BENCHMARK</span>
                <span className="text-sm font-bold text-[#F5F5F5] uppercase" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  {pr.exerciseName}
                </span>
                <div className="flex items-baseline gap-1.5 my-1">
                  <span className="text-2xl font-bold text-[#EB3E2E] font-mono">{pr.weightLiftedKg} kg</span>
                  <span className="text-xs text-[#B8B8B8]">× {pr.reps || 1} reps</span>
                </div>
                <span className="text-[10px] text-[#B8B8B8] font-mono">
                  Recorded: {new Date(pr.date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-[#B8B8B8]">
            No personal records logged yet. Record your best Bench Press, Squat, or Deadlift.
          </div>
        )}
      </div>

      {/* ── MODAL: LOG WEIGHT ── */}
      {showWeightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col gap-4">
            <h3 className="text-base font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
              LOG BODY WEIGHT
            </h3>
            <form onSubmit={handleAddWeight} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#B8B8B8]">WEIGHT IN KG *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="e.g. 74.5"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="bg-[#202020] border border-[#303030] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#EB3E2E]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#B8B8B8]">OPTIONAL NOTE</label>
                <input
                  type="text"
                  placeholder="e.g. Morning fasting weight"
                  value={weightNote}
                  onChange={(e) => setWeightNote(e.target.value)}
                  className="bg-[#202020] border border-[#303030] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#EB3E2E]"
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWeightModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#B8B8B8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: RECORD PR ── */}
      {showStrengthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col gap-4">
            <h3 className="text-base font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
              RECORD STRENGTH PR
            </h3>
            <form onSubmit={handleAddStrength} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#B8B8B8]">EXERCISE NAME *</label>
                <select
                  value={strengthInput.exerciseName}
                  onChange={(e) => setStrengthInput((prev) => ({ ...prev, exerciseName: e.target.value }))}
                  className="bg-[#202020] border border-[#303030] rounded-xl px-3 py-2.5 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#EB3E2E]"
                >
                  <option value="Barbell Bench Press">Barbell Bench Press</option>
                  <option value="Barbell Back Squat">Barbell Back Squat</option>
                  <option value="Conventional Deadlift">Conventional Deadlift</option>
                  <option value="Overhead Barbell Press">Overhead Barbell Press</option>
                  <option value="Incline Dumbbell Press">Incline Dumbbell Press</option>
                  <option value="Weighted Pull-up">Weighted Pull-up</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#B8B8B8]">LOAD IN KG *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    placeholder="e.g. 100"
                    value={strengthInput.weightLiftedKg}
                    onChange={(e) => setStrengthInput((prev) => ({ ...prev, weightLiftedKg: e.target.value }))}
                    className="bg-[#202020] border border-[#303030] rounded-xl px-3 py-2 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#EB3E2E]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#B8B8B8]">REPETITIONS</label>
                  <input
                    type="number"
                    min="1"
                    value={strengthInput.reps}
                    onChange={(e) => setStrengthInput((prev) => ({ ...prev, reps: e.target.value }))}
                    className="bg-[#202020] border border-[#303030] rounded-xl px-3 py-2 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#EB3E2E]"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStrengthModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#B8B8B8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
