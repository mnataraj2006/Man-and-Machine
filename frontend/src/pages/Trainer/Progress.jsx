import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Plus,
  Scale,
  Award,
  Calendar,
  AlertCircle,
  Activity,
} from 'lucide-react';
import trainerService from '../../services/trainerService.js';

export default function Progress({ onNavigate }) {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    weightKg: '',
    postureScore: 8,
    mobilityNotes: '',
    recommendations: '',
    note: '',
  });

  useEffect(() => {
    const fetchInit = async () => {
      try {
        setLoading(true);
        const res = await trainerService.getMyClients();
        const clientList = res.clients || [];
        setClients(clientList);
        if (clientList.length > 0) {
          setSelectedClientId(clientList[0].id);
        }
      } catch (err) {
        console.error('Failed to load clients:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInit();
  }, []);

  const fetchRecords = async (cId) => {
    if (!cId) return;
    try {
      const res = await trainerService.getClientProgress(cId);
      setRecords(res.records || []);
    } catch (err) {
      console.error('Failed to load progress records:', err);
    }
  };

  useEffect(() => {
    if (selectedClientId) {
      fetchRecords(selectedClientId);
    }
  }, [selectedClientId]);

  const handleAssessmentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClientId) return;
    try {
      setSubmitting(true);
      await trainerService.addClientProgressAssessment(selectedClientId, {
        type: 'ASSESSMENT',
        weightKg: form.weightKg ? Number(form.weightKg) : null,
        postureScore: Number(form.postureScore) || 8,
        mobilityNotes: form.mobilityNotes,
        recommendations: form.recommendations,
        note: form.note,
      });
      setShowModal(false);
      setForm({ weightKg: '', postureScore: 8, mobilityNotes: '', recommendations: '', note: '' });
      fetchRecords(selectedClientId);
    } catch (err) {
      alert(err.message || 'Failed to record assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-[#E58A32] uppercase tracking-wider font-bold">
            BIOMECHANICS & ASSESSMENTS
          </span>
          <h1
            className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            ATHLETE PROGRESS WORKSPACE.
          </h1>
          <p className="text-xs text-[#A3A3A3]">
            Track body composition shifts, posture calibrations, and strength personal records.
          </p>
        </div>

        {selectedClientId && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#E58A32] hover:bg-[#F09A43] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(229,138,50,0.25)] shrink-0"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <Plus className="w-4 h-4" />
            <span>Log Assessment</span>
          </button>
        )}
      </div>

      {/* ── CLIENT SELECTOR BAR ── */}
      <div className="p-4 rounded-2xl bg-[#141414] border border-[#292929] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-mono uppercase text-[#A3A3A3] shrink-0">SELECT ATHLETE:</span>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="flex-1 sm:w-64 p-2.5 rounded-xl bg-[#181818] border border-[#292929] text-xs text-white focus:border-[#E58A32] outline-none"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.fitnessGoal})
              </option>
            ))}
          </select>
        </div>

        {selectedClient && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[10px] font-mono text-[#737373] uppercase">GOAL:</span>
            <span className="font-bold text-[#E58A32]">{selectedClient.fitnessGoal}</span>
            <span className="text-[#292929]">•</span>
            <span className="text-[10px] font-mono text-[#737373] uppercase">LEVEL:</span>
            <span className="font-bold text-white">{selectedClient.experienceLevel}</span>
          </div>
        )}
      </div>

      {/* ── RECORDS FEED ── */}
      {records.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#141414] border border-[#292929] text-center flex flex-col items-center justify-center gap-3">
          <TrendingUp className="w-10 h-10 text-[#292929]" />
          <h3 className="text-sm font-bold uppercase text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            NO PROGRESS RECORDS FOUND
          </h3>
          <p className="text-xs text-[#A3A3A3] max-w-sm">
            Log an initial physical assessment or weight milestone for this athlete.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((rec) => (
            <div
              key={rec._id}
              className="p-5 rounded-2xl bg-[#141414] border border-[#292929] flex flex-col justify-between gap-3"
            >
              <div className="flex items-center justify-between border-b border-[#292929] pb-2.5">
                <span className="text-[10px] font-mono text-[#E58A32] font-bold uppercase">
                  {rec.source === 'TRAINER_ASSESSMENT' ? 'COACH ASSESSMENT' : rec.type}
                </span>
                <span className="text-[10px] font-mono text-[#737373]">
                  {new Date(rec.date).toLocaleDateString()}
                </span>
              </div>

              {rec.weightKg && (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {rec.weightKg}
                  </span>
                  <span className="text-xs font-mono text-[#A3A3A3]">KG</span>
                </div>
              )}

              {rec.trainerAssessment?.postureScore && (
                <div className="text-xs font-semibold text-amber-400">
                  Posture Score: {rec.trainerAssessment.postureScore}/10
                </div>
              )}

              {rec.trainerAssessment?.mobilityNotes && (
                <p className="text-xs text-[#A3A3A3] bg-[#181818] p-2 rounded-lg">
                  <strong className="text-white">Mobility: </strong>
                  {rec.trainerAssessment.mobilityNotes}
                </p>
              )}

              {rec.exerciseName && (
                <div className="text-xs font-bold text-white">
                  {rec.exerciseName}: {rec.weightLiftedKg}kg x {rec.reps} reps
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL: ADD ASSESSMENT ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#141414] border border-[#292929] rounded-2xl p-6 flex flex-col gap-4">
            <h3
              className="text-base font-bold uppercase text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              LOG COACH ASSESSMENT FOR {selectedClient?.name?.toUpperCase()}
            </h3>

            <form onSubmit={handleAssessmentSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase text-[#A3A3A3]">BODY WEIGHT (KG)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.weightKg}
                    onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                    placeholder="75.0"
                    className="p-2.5 rounded-xl bg-[#181818] border border-[#292929] text-xs text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase text-[#A3A3A3]">POSTURE SCORE (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={form.postureScore}
                    onChange={(e) => setForm({ ...form, postureScore: e.target.value })}
                    className="p-2.5 rounded-xl bg-[#181818] border border-[#292929] text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase text-[#A3A3A3]">MOBILITY OBSERVATIONS</label>
                <textarea
                  rows="2"
                  value={form.mobilityNotes}
                  onChange={(e) => setForm({ ...form, mobilityNotes: e.target.value })}
                  placeholder="Shoulder thoracic mobility, hip hinging depth..."
                  className="p-2.5 rounded-xl bg-[#181818] border border-[#292929] text-xs text-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase text-[#A3A3A3]">RECOMMENDATIONS</label>
                <textarea
                  rows="2"
                  value={form.recommendations}
                  onChange={(e) => setForm({ ...form, recommendations: e.target.value })}
                  placeholder="Prescribed activation drills and target metrics..."
                  className="p-2.5 rounded-xl bg-[#181818] border border-[#292929] text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#292929]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#1C1C1C] text-xs font-bold uppercase text-[#A3A3A3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#E58A32] hover:bg-[#F09A43] text-white text-xs font-bold uppercase"
                >
                  {submitting ? 'Saving...' : 'Save Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
