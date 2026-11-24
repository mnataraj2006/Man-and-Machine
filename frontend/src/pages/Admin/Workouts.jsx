import React, { useState, useEffect } from 'react';
import {
  Activity,
  Plus,
  Search,
  Filter,
  Dumbbell,
  BookOpen,
  Calendar,
  CheckCircle2,
  User,
  Shield,
  Layers,
} from 'lucide-react';
import adminService from '../../services/adminService.js';
import { useAdmin } from '../../components/Admin/AdminLayout.jsx';

export default function Workouts() {
  const { branches } = useAdmin();
  const [activeTab, setActiveTab] = useState('LIBRARY'); // 'LIBRARY' | 'TEMPLATES'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Exercise Library
  const [exercises, setExercises] = useState([]);
  const [searchEx, setSearchEx] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Templates & Assigned plans
  const [templates, setTemplates] = useState([]);
  const [assignedPlans, setAssignedPlans] = useState([]);

  // Modals
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Forms
  const [allClients, setAllClients] = useState([]);
  const [exerciseForm, setExerciseForm] = useState({
    name: '',
    category: 'STRENGTH',
    muscleGroup: 'Chest',
    equipment: 'Barbell',
    instructions: '',
    difficulty: 'INTERMEDIATE',
    defaultSets: 4,
    defaultReps: '8-10',
  });

  const [templateForm, setTemplateForm] = useState({
    title: '',
    description: '',
    goal: 'Muscle Building',
    mode: 'TRAINER_MANAGED',
    exercises: [],
  });

  const [assignForm, setAssignForm] = useState({
    clientId: '',
    templateId: '',
    customTitle: 'Prescribed Strength Split',
    mode: 'TRAINER_MANAGED',
  });

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const res = await adminService.getExercises({
        search: searchEx,
        muscleGroup: muscleFilter,
        category: categoryFilter,
      });
      setExercises(res.exercises || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch exercises');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await adminService.getWorkoutTemplates();
      setTemplates(res.templates || []);
      setAssignedPlans(res.assignedPlans || []);

      const clientsRes = await adminService.getClients({ limit: 100 });
      if (clientsRes.clients) setAllClients(clientsRes.clients);
    } catch (err) {
      setError(err.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'LIBRARY') {
      fetchExercises();
    } else {
      fetchTemplates();
    }
  }, [activeTab, muscleFilter, categoryFilter]);

  const handleCreateExercise = async (e) => {
    e.preventDefault();
    try {
      await adminService.createExercise(exerciseForm);
      setIsAddExerciseOpen(false);
      fetchExercises();
      alert('Exercise successfully registered into library!');
    } catch (err) {
      alert(err.message || 'Failed to add exercise');
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    try {
      await adminService.createWorkoutTemplate(templateForm);
      setIsCreateTemplateOpen(false);
      fetchTemplates();
      alert('Workout template created!');
    } catch (err) {
      alert(err.message || 'Failed to create template');
    }
  };

  const handleAssignWorkout = async (e) => {
    e.preventDefault();
    try {
      await adminService.assignWorkout(assignForm);
      setIsAssignModalOpen(false);
      fetchTemplates();
      alert('Workout successfully assigned to athlete!');
    } catch (err) {
      alert(err.message || 'Failed to assign workout');
    }
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2
            className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#F5F5F5]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            WORKOUT PROGRAMMING &amp; EXERCISE MATRIX
          </h2>
          <p className="text-xs text-[#A3A3A3]">
            Curate exercises, build progressive overload splits, and manage Trainer vs Self-Managed routines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'LIBRARY' ? (
            <button
              type="button"
              onClick={() => setIsAddExerciseOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] hover:bg-[#F09A43] text-black transition-all cursor-pointer shadow-lg shadow-[#E58A32]/10"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <Plus className="w-4 h-4" />
              <span>Add Exercise</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#1F1F1F] hover:bg-[#252525] text-[#F5F5F5] border border-[#292929] cursor-pointer"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <span>Assign Plan</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCreateTemplateOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] hover:bg-[#F09A43] text-black cursor-pointer shadow-lg shadow-[#E58A32]/10"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <Plus className="w-4 h-4" />
                <span>Create Template</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-[#292929] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('LIBRARY')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
            activeTab === 'LIBRARY'
              ? 'bg-[#E58A32] text-black font-bold'
              : 'bg-[#181818] text-[#A3A3A3] hover:text-[#F5F5F5] border border-[#292929]'
          }`}
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Exercise Library ({exercises.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('TEMPLATES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
            activeTab === 'TEMPLATES'
              ? 'bg-[#E58A32] text-black font-bold'
              : 'bg-[#181818] text-[#A3A3A3] hover:text-[#F5F5F5] border border-[#292929]'
          }`}
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Templates &amp; Assigned Splits
        </button>
      </div>

      {/* ── TAB 1: EXERCISE LIBRARY ── */}
      {activeTab === 'LIBRARY' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="bg-[#141414] border border-[#292929] rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-[#A3A3A3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchEx}
                onChange={(e) => setSearchEx(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchExercises()}
                placeholder="Search exercise by movement name..."
                className="w-full pl-9 pr-4 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={muscleFilter}
                onChange={(e) => setMuscleFilter(e.target.value)}
                className="px-3 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Muscle Groups</option>
                <option value="Chest">Chest</option>
                <option value="Back">Back</option>
                <option value="Shoulders">Shoulders</option>
                <option value="Biceps">Biceps</option>
                <option value="Triceps">Triceps</option>
                <option value="Legs (Quads/Hamstrings)">Legs</option>
                <option value="Core/Abs">Core / Abs</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="STRENGTH">STRENGTH</option>
                <option value="HYPERTROPHY">HYPERTROPHY</option>
                <option value="CARDIO">CARDIO</option>
                <option value="CORE">CORE</option>
              </select>
            </div>
          </div>

          {/* Exercise Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-3 py-12 text-center text-xs text-[#A3A3A3]">Loading exercises...</div>
            ) : exercises.length === 0 ? (
              <div className="col-span-3 py-12 text-center text-xs text-[#A3A3A3]">No exercises found.</div>
            ) : (
              exercises.map((ex) => (
                <div
                  key={ex._id}
                  className="bg-[#181818] border border-[#292929] hover:border-[#E58A32]/40 rounded-2xl p-4 flex flex-col justify-between transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#252525] text-[#E58A32] font-bold">
                        {ex.muscleGroup}
                      </span>
                      <span className="text-[10px] font-mono text-[#A3A3A3]">{ex.category}</span>
                    </div>

                    <h4
                      className="text-sm font-bold uppercase text-[#F5F5F5] mb-1"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {ex.name}
                    </h4>

                    {ex.instructions && (
                      <p className="text-[11px] text-[#A3A3A3] line-clamp-2 mb-3">{ex.instructions}</p>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#292929] flex items-center justify-between text-[11px] text-[#A3A3A3]">
                    <span className="font-mono">
                      Target: {ex.defaultSets} sets &times; {ex.defaultReps} reps
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#121212] font-mono text-[10px] text-green-400">
                      {ex.difficulty}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: TEMPLATES & ASSIGNED SPLITS ── */}
      {activeTab === 'TEMPLATES' && (
        <div className="space-y-6">
          {/* Master Workout Templates */}
          <div>
            <span className="text-xs font-mono uppercase text-[#E58A32] font-bold block mb-3">
              MASTER WORKOUT TEMPLATES ({templates.length})
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.length > 0 ? (
                templates.map((tpl) => (
                  <div key={tpl._id} className="bg-[#181818] border border-[#292929] rounded-2xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#252525] text-green-400 font-bold">
                          {tpl.goal}
                        </span>
                        <span className="text-[10px] font-mono text-[#A3A3A3]">{tpl.mode}</span>
                      </div>
                      <h4 className="text-sm font-bold uppercase text-[#F5F5F5] mb-1">{tpl.title}</h4>
                      <p className="text-xs text-[#A3A3A3] line-clamp-2">{tpl.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#292929] flex items-center justify-between text-xs">
                      <span className="text-[11px] text-[#A3A3A3] font-mono">
                        {tpl.exercises?.length || 0} movements configured
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAssignForm({
                            clientId: allClients[0]?.id || '',
                            templateId: tpl._id,
                            customTitle: tpl.title,
                            mode: 'TRAINER_MANAGED',
                          });
                          setIsAssignModalOpen(true);
                        }}
                        className="text-[11px] font-bold text-[#E58A32] hover:underline"
                      >
                        Assign &rarr;
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 py-6 text-center text-xs text-[#A3A3A3]">
                  No workout templates defined. Click "Create Template" to build standard splits.
                </div>
              )}
            </div>
          </div>

          {/* Assigned Client Workouts List */}
          <div>
            <span className="text-xs font-mono uppercase text-[#A3A3A3] font-bold block mb-3">
              RECENT ATHLETE ASSIGNED WORKOUT PLANS ({assignedPlans.length})
            </span>
            <div className="bg-[#181818] border border-[#292929] rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#292929] bg-[#141414] text-[10px] font-mono uppercase text-[#A3A3A3]">
                    <th className="p-3">Athlete</th>
                    <th className="p-3">Workout Plan</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3">Prescribing Coach</th>
                    <th className="p-3">Assigned Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222222]">
                  {assignedPlans.length > 0 ? (
                    assignedPlans.map((ap) => (
                      <tr key={ap._id} className="hover:bg-[#1E1E1E]">
                        <td className="p-3 font-bold text-[#F5F5F5]">{ap.assignedTo?.name || 'Athlete'}</td>
                        <td className="p-3 text-[#E58A32] font-semibold">{ap.title}</td>
                        <td className="p-3 font-mono text-[10px]">{ap.mode}</td>
                        <td className="p-3 text-[#A3A3A3]">{ap.trainerId?.name || 'Admin'}</td>
                        <td className="p-3 font-mono text-[#A3A3A3]">{new Date(ap.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-[#A3A3A3]">
                        No active assigned client workout plans found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD EXERCISE MODAL ── */}
      {isAddExerciseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#292929] rounded-2xl w-full max-w-md p-6 relative">
            <h3
              className="text-lg font-bold uppercase tracking-tight text-[#F5F5F5] mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Add Exercise to Matrix
            </h3>

            <form onSubmit={handleCreateExercise} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Exercise Name</label>
                <input
                  type="text"
                  required
                  value={exerciseForm.name}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, name: e.target.value })}
                  className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5]"
                  placeholder="e.g. Barbell RDL"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Muscle Group</label>
                  <select
                    value={exerciseForm.muscleGroup}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, muscleGroup: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                  >
                    <option value="Chest">Chest</option>
                    <option value="Back">Back</option>
                    <option value="Shoulders">Shoulders</option>
                    <option value="Biceps">Biceps</option>
                    <option value="Triceps">Triceps</option>
                    <option value="Legs (Quads/Hamstrings)">Legs</option>
                    <option value="Calves">Calves</option>
                    <option value="Core/Abs">Core / Abs</option>
                    <option value="Full Body">Full Body</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Category</label>
                  <select
                    value={exerciseForm.category}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, category: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                  >
                    <option value="STRENGTH">STRENGTH</option>
                    <option value="HYPERTROPHY">HYPERTROPHY</option>
                    <option value="CARDIO">CARDIO</option>
                    <option value="CORE">CORE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Sets</label>
                  <input
                    type="number"
                    value={exerciseForm.defaultSets}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, defaultSets: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Reps Target</label>
                  <input
                    type="text"
                    value={exerciseForm.defaultReps}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, defaultReps: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Technique Instructions</label>
                <textarea
                  rows={2}
                  value={exerciseForm.instructions}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, instructions: e.target.value })}
                  className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5]"
                  placeholder="Scapula retraction, eccentric speed, knee alignment..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddExerciseOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#222222] text-[#A3A3A3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] text-black"
                >
                  Save Exercise
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ASSIGN WORKOUT MODAL ── */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#292929] rounded-2xl w-full max-w-md p-6 relative">
            <h3
              className="text-lg font-bold uppercase tracking-tight text-[#F5F5F5] mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Assign Workout Split to Athlete
            </h3>

            <form onSubmit={handleAssignWorkout} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Target Athlete</label>
                <select
                  required
                  value={assignForm.clientId}
                  onChange={(e) => setAssignForm({ ...assignForm, clientId: e.target.value })}
                  className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                >
                  <option value="">-- Select Client --</option>
                  {allClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone || c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">
                  Source Template (Optional)
                </label>
                <select
                  value={assignForm.templateId}
                  onChange={(e) => setAssignForm({ ...assignForm, templateId: e.target.value })}
                  className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                >
                  <option value="">-- Custom Blueprint --</option>
                  {templates.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.title} ({t.goal})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Workout Title</label>
                <input
                  type="text"
                  required
                  value={assignForm.customTitle}
                  onChange={(e) => setAssignForm({ ...assignForm, customTitle: e.target.value })}
                  className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Workout Mode</label>
                <select
                  value={assignForm.mode}
                  onChange={(e) => setAssignForm({ ...assignForm, mode: e.target.value })}
                  className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                >
                  <option value="TRAINER_MANAGED">
                    TRAINER-MANAGED (Client cannot alter prescribed parameters)
                  </option>
                  <option value="SELF_MANAGED">SELF-MANAGED (Client can customize weights/sets)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#222222] text-[#A3A3A3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] text-black"
                >
                  Assign Routine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
