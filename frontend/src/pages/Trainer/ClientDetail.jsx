import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Calendar,
  Activity,
  Dumbbell,
  TrendingUp,
  FileText,
  Plus,
  ArrowLeft,
  CalendarCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  Eye,
  MessageSquare,
} from 'lucide-react';
import trainerService from '../../services/trainerService.js';

export default function ClientDetail({ clientId, onNavigate }) {
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('progress');

  // Modal states
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({
    weightKg: '',
    postureScore: 8,
    mobilityNotes: '',
    recommendations: '',
    chestCm: '',
    waistCm: '',
    armsCm: '',
    note: '',
  });

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteForm, setNoteForm] = useState({
    title: '',
    content: '',
    noteType: 'GENERAL',
    visibility: 'PRIVATE',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchDossier = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await trainerService.getClientDetails(clientId);
      setDossier(res.client);
    } catch (err) {
      console.error('Failed to load client dossier:', err);
      setError(err.message || 'Failed to load client dossier');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) fetchDossier();
  }, [clientId]);

  const handleAddAssessment = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await trainerService.addClientProgressAssessment(clientId, {
        type: 'ASSESSMENT',
        weightKg: assessmentForm.weightKg ? Number(assessmentForm.weightKg) : null,
        postureScore: Number(assessmentForm.postureScore) || 8,
        mobilityNotes: assessmentForm.mobilityNotes,
        recommendations: assessmentForm.recommendations,
        metrics: {
          chestCm: assessmentForm.chestCm ? Number(assessmentForm.chestCm) : null,
          waistCm: assessmentForm.waistCm ? Number(assessmentForm.waistCm) : null,
          armsCm: assessmentForm.armsCm ? Number(assessmentForm.armsCm) : null,
        },
        note: assessmentForm.note,
      });
      setShowAssessmentModal(false);
      setAssessmentForm({
        weightKg: '',
        postureScore: 8,
        mobilityNotes: '',
        recommendations: '',
        chestCm: '',
        waistCm: '',
        armsCm: '',
        note: '',
      });
      fetchDossier();
    } catch (err) {
      alert(err.message || 'Failed to record assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await trainerService.createClientNote(clientId, noteForm);
      setShowNoteModal(false);
      setNoteForm({
        title: '',
        content: '',
        noteType: 'GENERAL',
        visibility: 'PRIVATE',
      });
      fetchDossier();
    } catch (err) {
      alert(err.message || 'Failed to create note');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-10 bg-[#111111] rounded-xl w-48" />
        <div className="h-48 bg-[#111111] rounded-2xl w-full" />
        <div className="h-96 bg-[#111111] rounded-2xl w-full" />
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-center flex flex-col items-center gap-3">
        <AlertCircle className="w-8 h-8 text-rose-400" />
        <span className="font-bold text-sm">{error || 'Client dossier not accessible'}</span>
        <button
          onClick={() => onNavigate?.('/trainer/clients')}
          className="px-4 py-2 rounded-xl bg-[#202020] text-xs font-bold uppercase text-white hover:bg-[#252525]"
        >
          Return to Clients
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* ── BACK BUTTON & TOP TITLE ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate?.('/trainer/clients')}
          className="p-2 rounded-xl bg-[#111111] hover:bg-[#202020] border border-[#303030] text-[#B8B8B8] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex flex-col">
          <span className="text-[10px] font-mono text-[#EB3E2E] uppercase">ATHLETE TRAINING DOSSIER</span>
          <h1
            className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            {dossier.name}
          </h1>
        </div>
      </div>

      {/* ── PROFILE & MEMBERSHIP OVERVIEW CARD ── */}
      <div className="p-6 rounded-2xl bg-[#111111] border border-[#303030] grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Personal Details */}
        <div className="flex items-center gap-4 border-b md:border-b-0 md:border-r border-[#303030] pb-4 md:pb-0 md:pr-4">
          <div className="w-16 h-16 rounded-2xl bg-[#202020] border border-[#303030] flex items-center justify-center text-[#EB3E2E] text-2xl font-black shrink-0">
            {dossier.name ? dossier.name.charAt(0).toUpperCase() : 'C'}
          </div>
          <div className="flex flex-col">
            <h2 className="text-base font-bold text-white uppercase">{dossier.name}</h2>
            <span className="text-xs text-[#B8B8B8]">{dossier.email}</span>
            <span className="text-xs font-mono text-[#EB3E2E]">{dossier.phone}</span>
            <span className="text-[10px] text-[#858585] mt-1">{dossier.branch?.name || 'Kovilpatti'} Branch</span>
          </div>
        </div>

        {/* Training Goals & Level */}
        <div className="flex flex-col justify-center gap-1.5 border-b md:border-b-0 md:border-r border-[#303030] pb-4 md:pb-0 md:pr-4">
          <span className="text-[10px] font-mono uppercase text-[#B8B8B8]">PROGRAMMING SPECIFICATION</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{dossier.profile?.fitnessGoal || 'General Fitness'}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EB3E2E]/10 text-[#EB3E2E] border border-[#EB3E2E]/30">
              {dossier.profile?.experienceLevel || 'Beginner'}
            </span>
          </div>
          <span className="text-[11px] text-[#858585]">
            Enrolled: {new Date(dossier.profile?.joiningDate || Date.now()).toLocaleDateString()}
          </span>
        </div>

        {/* Read-Only Membership Status */}
        <div className="flex flex-col justify-center gap-1.5">
          <span className="text-[10px] font-mono uppercase text-[#B8B8B8]">FACILITY ACCESS (READ-ONLY)</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-emerald-400">
              {dossier.membership?.planName || 'Active Membership'}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {dossier.membership?.status || 'ACTIVE'}
            </span>
          </div>
          {dossier.membership?.endDate && (
            <span className="text-[11px] text-[#858585]">
              Valid thru: {new Date(dossier.membership.endDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* ── TABS NAVIGATION ── */}
      <div className="flex items-center gap-2 border-b border-[#303030] overflow-x-auto pb-2 scrollbar-none">
        {[
          { key: 'progress', label: 'Progress & Assessments', icon: TrendingUp },
          { key: 'notes', label: 'Trainer Notes', icon: FileText },
          { key: 'workouts', label: 'Workout History', icon: Dumbbell },
          { key: 'schedule', label: 'Upcoming Sessions', icon: Calendar },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                active
                  ? 'bg-[#EB3E2E] text-white'
                  : 'bg-[#111111] text-[#B8B8B8] hover:text-white border border-[#303030]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT: PROGRESS & ASSESSMENTS ── */}
      {activeTab === 'progress' && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h3
              className="text-sm font-bold uppercase text-white tracking-wide"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              PHYSICAL ASSESSMENTS & PERFORMANCE METRICS
            </h3>
            <button
              onClick={() => setShowAssessmentModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Log Assessment</span>
            </button>
          </div>

          {dossier.progressRecords?.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#111111] border border-[#303030] text-center text-[#858585] text-xs">
              No progress records or assessments logged yet for this athlete.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dossier.progressRecords.map((rec) => (
                <div
                  key={rec._id}
                  className="p-4 rounded-xl bg-[#111111] border border-[#303030] flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#EB3E2E] uppercase font-bold">
                      {rec.source === 'TRAINER_ASSESSMENT' ? 'TRAINER ASSESSMENT' : rec.type}
                    </span>
                    <span className="text-[10px] text-[#858585]">
                      {new Date(rec.date).toLocaleDateString()}
                    </span>
                  </div>

                  {rec.weightKg && (
                    <div className="text-base font-bold text-white">
                      Weight: {rec.weightKg} kg
                    </div>
                  )}

                  {rec.trainerAssessment?.postureScore && (
                    <div className="text-xs text-amber-400 font-semibold">
                      Posture Calibration Score: {rec.trainerAssessment.postureScore} / 10
                    </div>
                  )}

                  {rec.trainerAssessment?.recommendations && (
                    <p className="text-xs text-[#B8B8B8] bg-[#181818] p-2 rounded-lg">
                      {rec.trainerAssessment.recommendations}
                    </p>
                  )}

                  {rec.exerciseName && (
                    <span className="text-xs text-white">
                      {rec.exerciseName}: {rec.weightLiftedKg}kg x {rec.reps} reps
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB CONTENT: TRAINER NOTES ── */}
      {activeTab === 'notes' && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h3
              className="text-sm font-bold uppercase text-white tracking-wide"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              COACHING NOTES & CLINICAL OBSERVATIONS
            </h3>
            <button
              onClick={() => setShowNoteModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Coach Note</span>
            </button>
          </div>

          {dossier.trainerNotes?.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#111111] border border-[#303030] text-center text-[#858585] text-xs">
              No trainer notes recorded yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {dossier.trainerNotes.map((note) => (
                <div
                  key={note._id}
                  className="p-4 rounded-xl bg-[#111111] border border-[#303030] flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase">{note.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase flex items-center gap-1 ${
                          note.visibility === 'PRIVATE'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {note.visibility === 'PRIVATE' ? <Lock className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                        {note.visibility === 'PRIVATE' ? 'PRIVATE COACH NOTE' : 'CLIENT FACING'}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#858585]">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-[#B8B8B8] leading-relaxed">{note.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB CONTENT: WORKOUT HISTORY ── */}
      {activeTab === 'workouts' && (
        <div className="flex flex-col gap-5">
          <div className="p-4 rounded-xl bg-[#111111] border border-[#303030] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-[#EB3E2E] uppercase">ACTIVE TRAINING PLAN</span>
              <span className="text-sm font-bold text-white uppercase">
                {dossier.activePlan?.title || 'No active plan assigned'}
              </span>
            </div>
            <button
              onClick={() => onNavigate?.('/trainer/workouts/create')}
              className="px-3.5 py-1.5 rounded-lg bg-[#EB3E2E] text-white text-xs font-bold uppercase"
            >
              Assign New Plan
            </button>
          </div>

          <h3
            className="text-sm font-bold uppercase text-white tracking-wide"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            RECENT LOGGED SESSIONS
          </h3>

          {dossier.recentSessions?.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#111111] border border-[#303030] text-center text-[#858585] text-xs">
              No completed sessions recorded for this client.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {dossier.recentSessions.map((session) => (
                <div
                  key={session._id}
                  className="p-4 rounded-xl bg-[#111111] border border-[#303030] flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white uppercase">{session.workoutTitle}</span>
                    <span className="text-[11px] text-[#B8B8B8]">
                      {new Date(session.date).toLocaleDateString()} • {session.durationMinutes} mins
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {session.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB CONTENT: UPCOMING SESSIONS ── */}
      {activeTab === 'schedule' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase text-white">UPCOMING SCHEDULED APPOINTMENTS</h3>
            <button
              onClick={() => onNavigate?.('/trainer/schedule')}
              className="px-3.5 py-1.5 rounded-lg bg-[#EB3E2E] text-white text-xs font-bold uppercase"
            >
              Book Session
            </button>
          </div>

          {dossier.upcomingAppointments?.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#111111] border border-[#303030] text-center text-[#858585] text-xs">
              No upcoming appointments booked with this athlete.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {dossier.upcomingAppointments.map((app) => (
                <div
                  key={app._id}
                  className="p-4 rounded-xl bg-[#111111] border border-[#303030] flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white uppercase">{app.sessionType}</span>
                    <span className="text-[11px] text-[#EB3E2E] font-mono">
                      {new Date(app.scheduledAt).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs text-emerald-400 font-bold uppercase">{app.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: ADD ASSESSMENT ── */}
      {showAssessmentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#111111] border border-[#303030] rounded-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <h3
              className="text-base font-bold uppercase text-white"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              LOG PHYSICAL ASSESSMENT
            </h3>

            <form onSubmit={handleAddAssessment} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase text-[#B8B8B8]">BODY WEIGHT (KG)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={assessmentForm.weightKg}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, weightKg: e.target.value })}
                    placeholder="e.g. 74.5"
                    className="p-2.5 rounded-xl bg-[#181818] border border-[#303030] text-xs text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase text-[#B8B8B8]">POSTURE SCORE (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={assessmentForm.postureScore}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, postureScore: e.target.value })}
                    className="p-2.5 rounded-xl bg-[#181818] border border-[#303030] text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase text-[#B8B8B8]">MOBILITY / FORM OBSERVATIONS</label>
                <textarea
                  rows="2"
                  value={assessmentForm.mobilityNotes}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, mobilityNotes: e.target.value })}
                  placeholder="e.g. Ankle dorsiflexion restricted during squats..."
                  className="p-2.5 rounded-xl bg-[#181818] border border-[#303030] text-xs text-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase text-[#B8B8B8]">COACHING RECOMMENDATIONS</label>
                <textarea
                  rows="2"
                  value={assessmentForm.recommendations}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, recommendations: e.target.value })}
                  placeholder="e.g. Add 10 min hip mobility warm-up..."
                  className="p-2.5 rounded-xl bg-[#181818] border border-[#303030] text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#303030]">
                <button
                  type="button"
                  onClick={() => setShowAssessmentModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#202020] text-xs font-bold uppercase text-[#B8B8B8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase"
                >
                  {submitting ? 'Saving...' : 'Save Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD TRAINER NOTE ── */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#111111] border border-[#303030] rounded-2xl p-6 flex flex-col gap-4">
            <h3
              className="text-base font-bold uppercase text-white"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              CREATE COACH NOTE
            </h3>

            <form onSubmit={handleAddNote} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase text-[#B8B8B8]">NOTE TITLE</label>
                <input
                  type="text"
                  required
                  value={noteForm.title}
                  onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                  placeholder="e.g. Squat biomechanics calibration"
                  className="p-2.5 rounded-xl bg-[#181818] border border-[#303030] text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase text-[#B8B8B8]">VISIBILITY</label>
                  <select
                    value={noteForm.visibility}
                    onChange={(e) => setNoteForm({ ...noteForm, visibility: e.target.value })}
                    className="p-2.5 rounded-xl bg-[#181818] border border-[#303030] text-xs text-white"
                  >
                    <option value="PRIVATE">PRIVATE (Coach only)</option>
                    <option value="CLIENT_FACING">CLIENT FACING (Shared with Athlete)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase text-[#B8B8B8]">NOTE CATEGORY</label>
                  <select
                    value={noteForm.noteType}
                    onChange={(e) => setNoteForm({ ...noteForm, noteType: e.target.value })}
                    className="p-2.5 rounded-xl bg-[#181818] border border-[#303030] text-xs text-white"
                  >
                    <option value="GENERAL">General</option>
                    <option value="OBSERVATION">Observation</option>
                    <option value="FEEDBACK">Feedback</option>
                    <option value="CORRECTION">Form Correction</option>
                    <option value="RECOMMENDATION">Recommendation</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase text-[#B8B8B8]">NOTE CONTENT</label>
                <textarea
                  required
                  rows="4"
                  value={noteForm.content}
                  onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                  placeholder="Detailed notes on athlete execution and guidance..."
                  className="p-2.5 rounded-xl bg-[#181818] border border-[#303030] text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#303030]">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#202020] text-xs font-bold uppercase text-[#B8B8B8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase"
                >
                  {submitting ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
