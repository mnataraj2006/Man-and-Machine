import React, { useState, useEffect } from 'react';
import {
  Dumbbell,
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Calendar,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import trainerService from '../../services/trainerService.js';

export default function WorkoutCreate({ workoutId, onNavigate }) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [exerciseLib, setExerciseLib] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goal: 'Muscle Building',
    trainingLevel: 'Intermediate',
    weeklyFrequency: 4,
    trainerInstructions: '',
    assignedTo: '',
    status: 'PUBLISHED',
    exercises: [
      {
        name: 'Barbell Back Squat',
        targetMuscle: 'Quadriceps / Glutes',
        sets: 4,
        reps: '8-10',
        prescribedWeight: '75% 1RM',
        restSeconds: 90,
        instructions: 'Break at hips, maintain neutral spine, full depth.',
        dayOfWeek: 'Monday',
      },
    ],
  });

  useEffect(() => {
    const initData = async () => {
      try {
        const [cRes, eRes] = await Promise.all([
          trainerService.getMyClients(),
          trainerService.getExercises(),
        ]);
        setClients(cRes.clients || []);
        setExerciseLib(eRes.exercises || []);

        // If editing existing workout
        if (workoutId && workoutId !== 'create') {
          const wRes = await trainerService.getWorkoutPlanById(workoutId);
          if (wRes.plan) {
            setFormData({
              title: wRes.plan.title,
              description: wRes.plan.description || '',
              goal: wRes.plan.goal || 'Muscle Building',
              trainingLevel: wRes.plan.trainingLevel || 'Intermediate',
              weeklyFrequency: wRes.plan.weeklyFrequency || 4,
              trainerInstructions: wRes.plan.trainerInstructions || '',
              assignedTo: wRes.plan.assignedTo?._id || '',
              status: wRes.plan.status || 'PUBLISHED',
              exercises: wRes.plan.exercises || [],
            });
          }
        }
      } catch (err) {
        console.error('Failed to init builder data:', err);
      }
    };
    initData();
  }, [workoutId]);

  const addExercise = () => {
    setFormData({
      ...formData,
      exercises: [
        ...formData.exercises,
        {
          name: '',
          targetMuscle: 'General',
          sets: 3,
          reps: '10-12',
          prescribedWeight: '',
          restSeconds: 60,
          instructions: '',
          dayOfWeek: 'Monday',
        },
      ],
    });
  };

  const removeExercise = (index) => {
    setFormData({
      ...formData,
      exercises: formData.exercises.filter((_, i) => i !== index),
    });
  };

  const updateExercise = (index, field, value) => {
    const updated = [...formData.exercises];
    updated[index][field] = value;
    setFormData({ ...formData, exercises: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) {
      alert('Please provide a workout title.');
      return;
    }

    try {
      setLoading(true);
      if (workoutId && workoutId !== 'create') {
        await trainerService.updateWorkoutPlan(workoutId, formData);
      } else {
        await trainerService.createWorkoutPlan(formData);
      }
      onNavigate?.('/trainer/workouts');
    } catch (err) {
      alert(err.message || 'Failed to save workout plan');
    } finally {
      setLoading(false);
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="flex flex-col gap-6 sm:gap-8 max-w-5xl mx-auto pb-16">
      {/* ── TOP HEADER ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate?.('/trainer/workouts')}
            className="p-2 rounded-xl bg-[#141414] hover:bg-[#1C1C1C] border border-[#292929] text-[#A3A3A3] hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-[#E58A32] uppercase">
              {workoutId && workoutId !== 'create' ? 'PROGRAM CALIBRATION' : 'WORKOUT BUILDER'}
            </span>
            <h1
              className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {workoutId && workoutId !== 'create' ? 'EDIT TRAINING PROGRAM' : 'DESIGN WORKOUT PROGRAM'}
            </h1>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E58A32] hover:bg-[#F09A43] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(229,138,50,0.25)]"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          <Save className="w-4 h-4" />
          <span>{loading ? 'Saving...' : 'Save & Publish'}</span>
        </button>
      </div>

      {/* ── FORM ── */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Core Parameters */}
        <div className="p-6 rounded-2xl bg-[#141414] border border-[#292929] flex flex-col gap-4">
          <h2
            className="text-sm font-bold uppercase text-white"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            PROGRAM METADATA & ASSIGNMENT
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-[10px] font-mono uppercase text-[#A3A3A3]">PROGRAM TITLE</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. 4-Day Hypertrophy & Density Split"
                className="p-3 rounded-xl bg-[#181818] border border-[#292929] text-xs text-white placeholder-[#737373] focus:border-[#E58A32] outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono uppercase text-[#A3A3A3]">ASSIGN TO ATHLETE</label>
              <select
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="p-3 rounded-xl bg-[#181818] border border-[#292929] text-xs text-white focus:border-[#E58A32] outline-none"
              >
                <option value="">-- Unassigned / General Template --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.fitnessGoal})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono uppercase text-[#A3A3A3]">STATUS</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="p-3 rounded-xl bg-[#181818] border border-[#292929] text-xs text-white focus:border-[#E58A32] outline-none"
              >
                <option value="PUBLISHED">PUBLISHED (Instantly active for athlete)</option>
                <option value="DRAFT">DRAFT (Saved in your workspace)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono uppercase text-[#A3A3A3]">PRIMARY TRAINING GOAL</label>
              <select
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                className="p-3 rounded-xl bg-[#181818] border border-[#292929] text-xs text-white"
              >
                <option value="Muscle Building">Muscle Building / Hypertrophy</option>
                <option value="Strength Training">Strength Training / Powerlifting</option>
                <option value="Weight Loss">Weight Loss / Conditioning</option>
                <option value="General Fitness">General Fitness</option>
                <option value="Stamina & Conditioning">Stamina & Conditioning</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono uppercase text-[#A3A3A3]">EXPERIENCE LEVEL</label>
              <select
                value={formData.trainingLevel}
                onChange={(e) => setFormData({ ...formData, trainingLevel: e.target.value })}
                className="p-3 rounded-xl bg-[#181818] border border-[#292929] text-xs text-white"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="All Levels">All Levels</option>
              </select>
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-[10px] font-mono uppercase text-[#A3A3A3]">TRAINER DIRECTIVES & INSTRUCTIONS</label>
              <textarea
                rows="2"
                value={formData.trainerInstructions}
                onChange={(e) => setFormData({ ...formData, trainerInstructions: e.target.value })}
                placeholder="Warm-up guidelines, progressive overload rules, tempo recommendations..."
                className="p-3 rounded-xl bg-[#181818] border border-[#292929] text-xs text-white placeholder-[#737373] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Exercises Sequence Builder */}
        <div className="p-6 rounded-2xl bg-[#141414] border border-[#292929] flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-[#E58A32]" />
              <h2
                className="text-sm font-bold uppercase text-white"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                EXERCISE SPECIFICATIONS ({formData.exercises.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={addExercise}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#E58A32] hover:bg-[#F09A43] text-white text-xs font-bold uppercase transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Exercise</span>
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {formData.exercises.map((ex, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-[#181818] border border-[#292929] flex flex-col gap-3 relative group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="w-6 h-6 rounded-lg bg-[#202020] text-[#E58A32] text-xs font-mono font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      required
                      value={ex.name}
                      onChange={(e) => updateExercise(index, 'name', e.target.value)}
                      placeholder="Exercise Name (e.g. Incline Dumbbell Press)"
                      className="flex-1 p-2 rounded-lg bg-[#202020] border border-[#292929] text-xs text-white font-bold outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={ex.dayOfWeek}
                      onChange={(e) => updateExercise(index, 'dayOfWeek', e.target.value)}
                      className="p-1.5 rounded-lg bg-[#202020] border border-[#292929] text-[11px] text-[#E58A32] font-semibold"
                    >
                      {days.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => removeExercise(index)}
                      className="p-1.5 rounded-lg text-[#737373] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-mono uppercase text-[#737373]">SETS</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={ex.sets}
                      onChange={(e) => updateExercise(index, 'sets', Number(e.target.value))}
                      className="p-2 rounded-lg bg-[#202020] border border-[#292929] text-xs text-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-mono uppercase text-[#737373]">REPS TARGET</label>
                    <input
                      type="text"
                      value={ex.reps}
                      onChange={(e) => updateExercise(index, 'reps', e.target.value)}
                      placeholder="8-10 or AMRAP"
                      className="p-2 rounded-lg bg-[#202020] border border-[#292929] text-xs text-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-mono uppercase text-[#737373]">PRESCRIBED WEIGHT</label>
                    <input
                      type="text"
                      value={ex.prescribedWeight}
                      onChange={(e) => updateExercise(index, 'prescribedWeight', e.target.value)}
                      placeholder="e.g. 70kg / RPE 8"
                      className="p-2 rounded-lg bg-[#202020] border border-[#292929] text-xs text-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-mono uppercase text-[#737373]">REST (SEC)</label>
                    <input
                      type="number"
                      step="15"
                      value={ex.restSeconds}
                      onChange={(e) => updateExercise(index, 'restSeconds', Number(e.target.value))}
                      className="p-2 rounded-lg bg-[#202020] border border-[#292929] text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-mono uppercase text-[#737373]">COACHING FORM INSTRUCTIONS</label>
                  <input
                    type="text"
                    value={ex.instructions}
                    onChange={(e) => updateExercise(index, 'instructions', e.target.value)}
                    placeholder="e.g. Retract scapula, slow eccentric, pause at chest."
                    className="p-2 rounded-lg bg-[#202020] border border-[#292929] text-xs text-[#A3A3A3]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
