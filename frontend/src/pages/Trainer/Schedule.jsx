import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  CreditCard,
  UserCheck,
} from 'lucide-react';
import trainerService from '../../services/trainerService.js';

export default function Schedule({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments' | 'bookings'
  const [appointments, setAppointments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [conflictError, setConflictError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    clientId: '',
    scheduledAt: '',
    durationMinutes: 60,
    sessionType: 'Personal Training',
    notes: '',
  });

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const [sRes, cRes, bRes] = await Promise.all([
        trainerService.getSchedule(),
        trainerService.getMyClients(),
        trainerService.getBookings().catch(() => ({ bookings: [] })),
      ]);
      setAppointments(sRes.appointments || []);
      setClients(cRes.clients || []);
      setBookings(bRes.bookings || []);
    } catch (err) {
      console.error('Failed to load schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setConflictError('');
    try {
      setSubmitting(true);
      await trainerService.scheduleSession(form);
      setShowModal(false);
      setForm({
        clientId: '',
        scheduledAt: '',
        durationMinutes: 60,
        sessionType: 'Personal Training',
        notes: '',
      });
      fetchSchedule();
    } catch (err) {
      setConflictError(err.message || 'Scheduling failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (appointmentId, status) => {
    try {
      await trainerService.updateSessionStatus(appointmentId, status);
      fetchSchedule();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-[#EB3E2E] uppercase tracking-wider font-bold">
            FLOOR AGENDA & APPOINTMENTS
          </span>
          <h1
            className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            TRAINING SCHEDULE.
          </h1>
          <p className="text-xs text-[#B8B8B8]">
            Plan, organize, and monitor floor coaching sessions and client bookings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(235,62,46,0.25)] shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Book Floor Session</span>
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex items-center gap-2 border-b border-[#303030] pb-3">
        <button
          onClick={() => setActiveTab('appointments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
            activeTab === 'appointments'
              ? 'bg-[#EB3E2E] text-white shadow-[0_0_15px_rgba(235,62,46,0.25)]'
              : 'bg-[#181818] text-[#B8B8B8] hover:text-white border border-[#303030]'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>Floor Sessions</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/30">
            {appointments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
            activeTab === 'bookings'
              ? 'bg-[#EB3E2E] text-white shadow-[0_0_15px_rgba(235,62,46,0.25)]'
              : 'bg-[#181818] text-[#B8B8B8] hover:text-white border border-[#303030]'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Client Bookings</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/30">
            {bookings.length}
          </span>
        </button>
      </div>

      {/* ── TAB CONTENT: APPOINTMENTS ── */}
      {activeTab === 'appointments' && (
        <>
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-[#111111] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <div className="p-12 rounded-2xl bg-[#111111] border border-[#303030] text-center flex flex-col items-center justify-center gap-3">
              <CalendarIcon className="w-10 h-10 text-[#303030]" />
              <h3 className="text-sm font-bold uppercase text-white" style={{ fontFamily: "'Oswald', sans-serif" }}>
                NO SCHEDULED SESSIONS
              </h3>
              <p className="text-xs text-[#B8B8B8] max-w-sm">
                Book 1-on-1 floor sessions or assessment reviews with your assigned athletes.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {appointments.map((app) => (
                <div
                  key={app._id}
                  className="p-5 rounded-2xl bg-[#111111] border border-[#303030] hover:border-[#EB3E2E]/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#202020] border border-[#303030] flex items-center justify-center text-[#EB3E2E] font-black text-sm shrink-0">
                      {app.clientId?.name ? app.clientId.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold uppercase text-white">{app.clientId?.name || 'Athlete'}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#EB3E2E]/10 text-[#EB3E2E] border border-[#EB3E2E]/30">
                          {app.sessionType}
                        </span>
                      </div>
                      <span className="text-xs text-[#B8B8B8]">
                        {new Date(app.scheduledAt).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        at{' '}
                        <span className="text-white font-bold">
                          {new Date(app.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>{' '}
                        ({app.durationMinutes} mins)
                      </span>
                      {app.notes && <span className="text-[11px] text-[#858585] mt-1">{app.notes}</span>}
                    </div>
                  </div>

                  {/* Status and Action Buttons */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase border ${
                        app.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : app.status === 'CANCELLED'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {app.status}
                    </span>

                    {app.status === 'SCHEDULED' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(app._id, 'COMPLETED')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase transition-colors"
                        >
                          Mark Done
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(app._id, 'CANCELLED')}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold uppercase transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TAB CONTENT: CLIENT BOOKINGS ── */}
      {activeTab === 'bookings' && (
        <>
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-[#111111] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-12 rounded-2xl bg-[#111111] border border-[#303030] text-center flex flex-col items-center justify-center gap-3">
              <UserCheck className="w-10 h-10 text-[#303030]" />
              <h3 className="text-sm font-bold uppercase text-white" style={{ fontFamily: "'Oswald', sans-serif" }}>
                NO DIRECT CLIENT BOOKINGS
              </h3>
              <p className="text-xs text-[#B8B8B8] max-w-sm">
                When athletes book training sessions through the "My Trainer" portal, they will appear here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {bookings.map((b) => (
                <div
                  key={b._id}
                  className="p-5 rounded-2xl bg-[#111111] border border-[#303030] hover:border-[#EB3E2E]/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#202020] border border-[#303030] flex items-center justify-center text-[#EB3E2E] font-black text-sm shrink-0">
                      {b.clientId?.name ? b.clientId.name.charAt(0).toUpperCase() : 'B'}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold uppercase text-white">{b.clientId?.name || 'Athlete'}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#EB3E2E]/10 text-[#EB3E2E] border border-[#EB3E2E]/30">
                          {b.serviceType}
                        </span>
                        <span className="text-[10px] font-mono text-[#858585]">
                          Ref: {b.bookingReference}
                        </span>
                      </div>
                      <span className="text-xs text-[#B8B8B8]">
                        {b.date} at <span className="text-white font-bold">{b.startTime} - {b.endTime}</span>
                        {b.branchId?.name && ` • ${b.branchId.name}`}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-mono font-bold text-white">₹{b.amount}</span>
                        <span className="text-[10px] text-[#858585]">via {b.paymentMethod}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase border ${
                        b.paymentStatus === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {b.paymentStatus}
                    </span>

                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase border ${
                        b.bookingStatus === 'CONFIRMED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : b.bookingStatus === 'CANCELLED'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-[#202020] text-[#B8B8B8] border-[#303030]'
                      }`}
                    >
                      {b.bookingStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── MODAL: SCHEDULE SESSION ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#111111] border border-[#303030] rounded-2xl p-6 flex flex-col gap-4">
            <h3
              className="text-base font-bold uppercase text-white"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              BOOK FLOOR COACHING SESSION
            </h3>

            {conflictError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{conflictError}</span>
              </div>
            )}

            <form onSubmit={handleScheduleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase text-[#B8B8B8]">SELECT ASSIGNED ATHLETE</label>
                <select
                  required
                  value={form.clientId}
                  onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                  className="p-2.5 rounded-xl bg-[#181818] border border-[#303030] text-xs text-white"
                >
                  <option value="">-- Choose Athlete --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.fitnessGoal})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase text-[#B8B8B8]">DATE & TIME</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.scheduledAt}
                    onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                    className="p-2.5 rounded-xl bg-[#181818] border border-[#303030] text-xs text-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase text-[#B8B8B8]">DURATION (MINS)</label>
                  <select
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                    className="p-2.5 rounded-xl bg-[#181818] border border-[#303030] text-xs text-white"
                  >
                    <option value="30">30 Minutes</option>
                    <option value="45">45 Minutes</option>
                    <option value="60">60 Minutes (Standard)</option>
                    <option value="90">90 Minutes</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase text-[#B8B8B8]">SESSION TYPE</label>
                <select
                  value={form.sessionType}
                  onChange={(e) => setForm({ ...form, sessionType: e.target.value })}
                  className="p-2.5 rounded-xl bg-[#181818] border border-[#303030] text-xs text-white"
                >
                  <option value="Personal Training">Personal Training Floor Session</option>
                  <option value="Strength Training">Strength & Powerlifting Calibration</option>
                  <option value="Assessment">Physical Assessment & Posture Review</option>
                  <option value="Form Correction">Biomechanical Form Correction</option>
                  <option value="Cardio & Conditioning">Conditioning & Work Capacity</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase text-[#B8B8B8]">COACHING PREP NOTES</label>
                <textarea
                  rows="2"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Focus points or exercises planned for this floor session..."
                  className="p-2.5 rounded-xl bg-[#181818] border border-[#303030] text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#303030]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#202020] text-xs font-bold uppercase text-[#B8B8B8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase"
                >
                  {submitting ? 'Confirming...' : 'Book Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
