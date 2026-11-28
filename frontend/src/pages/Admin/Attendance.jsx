import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarCheck,
  Plus,
  Download,
  Clock,
  ShieldCheck,
  Edit3,
  Trash2,
  Calendar,
  AlertTriangle,
  ArrowRight,
  History,
  X,
} from 'lucide-react';
import adminService from '../../services/adminService.js';
import employeeService from '../../services/employeeService.js';
import { useAdmin } from '../../components/Admin/AdminLayout.jsx';

const formatTimeIST = (val) => {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
};

const toLocalDateTimeInput = (val) => {
  if (!val) return '';
  const d = new Date(val);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function Attendance() {
  const { branches, selectedBranch } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [branchFilter, setBranchFilter] = useState(selectedBranch);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [dailySummaries, setDailySummaries] = useState([]);
  const [monthTotal, setMonthTotal] = useState(0);

  // Record Manual Punch Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [subjectKind, setSubjectKind] = useState('EMPLOYEE'); // 'EMPLOYEE' | 'CLIENT'
  const [allEmployees, setAllEmployees] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [recordForm, setRecordForm] = useState({
    employeeId: '',
    userId: '',
    branchId: '',
    date: new Date().toISOString().slice(0, 10),
    checkInTime: toLocalDateTimeInput(new Date()),
    eventType: 'CHECK_IN',
    method: 'STAFF_CHECKIN',
  });

  // Investigate / Correct Record Modal
  const [correctModal, setCorrectModal] = useState({ open: false, record: null });
  const [correctForm, setCorrectForm] = useState({
    eventType: 'CHECK_IN',
    checkInTime: '',
    reason: '',
  });
  const [correctBusy, setCorrectBusy] = useState(false);

  useEffect(() => {
    setBranchFilter(selectedBranch);
  }, [selectedBranch]);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, clientsRes, empRes] = await Promise.all([
        adminService.getAttendance({ branchId: branchFilter, date }),
        adminService.getClients({ limit: 100 }).catch(() => ({ clients: [] })),
        employeeService.listEmployees({ limit: 100, employmentStatus: 'ACTIVE' }).catch(() => ({ employees: [] })),
      ]);
      setAttendanceRecords(res.records || []);
      setDailySummaries(res.dailySummaries || []);
      setMonthTotal(res.monthTotal || 0);
      if (clientsRes.clients) setAllClients(clientsRes.clients);
      if (empRes.employees) setAllEmployees(empRes.employees);
    } catch (err) {
      setError(err.message || 'Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  }, [branchFilter, date]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  useEffect(() => {
    const onLiveAttendance = () => {
      fetchAttendance();
    };
    window.addEventListener('mm:attendance-updated', onLiveAttendance);
    return () => window.removeEventListener('mm:attendance-updated', onLiveAttendance);
  }, [fetchAttendance]);

  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        ...(subjectKind === 'EMPLOYEE'
          ? { employeeId: recordForm.employeeId }
          : { userId: recordForm.userId }),
        branchId: recordForm.branchId,
        date: recordForm.date,
        checkInTime: recordForm.checkInTime,
        eventType: recordForm.eventType,
        method: recordForm.method,
      };
      const res = await adminService.recordAttendance(payload);
      setSuccess(res.message || 'Attendance punch recorded!');
      setIsRecordModalOpen(false);
      fetchAttendance();
    } catch (err) {
      setError(err.message || 'Failed to record attendance');
    }
  };

  const openCorrectModal = (rec) => {
    setCorrectForm({
      eventType: rec.eventType || 'CHECK_IN',
      checkInTime: toLocalDateTimeInput(rec.checkInTime),
      reason: '',
    });
    setCorrectModal({ open: true, record: rec });
  };

  const handleCorrectSubmit = async (e) => {
    e.preventDefault();
    if (!correctModal.record) return;
    setCorrectBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await adminService.correctAttendance(correctModal.record._id, {
        eventType: correctForm.eventType,
        checkInTime: correctForm.checkInTime,
        reason: correctForm.reason || 'Admin manual investigation & correction',
      });
      setSuccess('Attendance record updated with audit trail.');
      setCorrectModal({ open: false, record: null });
      fetchAttendance();
    } catch (err) {
      setError(err.message || 'Failed to update attendance record');
    } finally {
      setCorrectBusy(false);
    }
  };

  const handleExportCSV = () => {
    const exportData = attendanceRecords.map((a) => ({
      Name: a.userId?.name || 'Member',
      Branch: a.branchId?.city || '',
      Date: new Date(a.date).toLocaleDateString('en-IN'),
      Time: formatTimeIST(a.checkInTime),
      EventType: a.eventType || 'CHECK_IN',
      Method: a.verificationMethod || a.method,
      BiometricID: a.biometricUserId || '',
      Status: a.attendanceStatus || 'SUCCESS',
    }));
    adminService.exportToCSV(exportData, `attendance_${date}.csv`);
  };

  const handleDeleteRecord = async (id, name) => {
    if (!window.confirm(`Delete attendance punch for ${name}?`)) return;
    try {
      await adminService.correctAttendance(id, { action: 'DELETE' });
      fetchAttendance();
    } catch (err) {
      setError(err.message || 'Failed to remove record');
    }
  };

  const anomalyCount = dailySummaries.filter((s) => s.hasAnomalies).length;

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2
            className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#F5F5F5]"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            ATTENDANCE &amp; FACILITY ACCESS
          </h2>
          <p className="text-xs text-[#B8B8B8]">
            Multi-punch daily workforce &amp; athlete access log, work session pairing, and ADMS event deduplication.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#202020] hover:bg-[#252525] text-[#F5F5F5] border border-[#303030] hover:border-[#EB3E2E] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#EB3E2E]" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRecordForm({
                employeeId: allEmployees[0]?._id || '',
                userId: allClients[0]?.id || '',
                branchId: branches[0]?._id || '',
                date: new Date().toISOString().slice(0, 10),
                checkInTime: toLocalDateTimeInput(new Date()),
                eventType: 'CHECK_IN',
                method: 'STAFF_CHECKIN',
              });
              setIsRecordModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#EB3E2E] hover:bg-[#FF493B] text-white transition-all cursor-pointer shadow-lg shadow-[#EB3E2E]/10"
          >
            <Plus className="w-4 h-4" />
            <span>Record Punch</span>
          </button>
        </div>
      </div>

      {/* Global Notice */}
      {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{error}</div>}
      {success && <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs">{success}</div>}

      {/* ── METRICS SUMMARY STRIP ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-[#B8B8B8]">DAY TOTAL PUNCHES</span>
            <p className="text-2xl font-bold text-[#F5F5F5] mt-1">{attendanceRecords.length}</p>
            <span className="text-[10px] text-[#858585]">{dailySummaries.length} unique member/staff</span>
          </div>
          <CalendarCheck className="w-8 h-8 text-[#EB3E2E]" />
        </div>

        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-[#B8B8B8]">MONTH TOTAL PUNCHES</span>
            <p className="text-2xl font-bold text-green-400 mt-1">{monthTotal}</p>
          </div>
          <Calendar className="w-8 h-8 text-green-400" />
        </div>

        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-[#B8B8B8]">PUNCH POLICY &amp; ANOMALIES</span>
            <p className="text-xs font-semibold text-[#F5F5F5] mt-1">Multiple IN / OUT Allowed</p>
            <span className={`text-[10px] ${anomalyCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {anomalyCount > 0
                ? `${anomalyCount} unmatched / unusual sequence(s)`
                : 'Event-Level Deduplication Active'}
            </span>
          </div>
          {anomalyCount > 0 ? (
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          ) : (
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          )}
        </div>
      </div>

      {/* ── FILTER BY DATE & BRANCH ── */}
      <div className="bg-[#111111] border border-[#303030] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#B8B8B8] uppercase">Select Date:</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-1.5 bg-[#111111] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] focus:outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#B8B8B8] uppercase">Branch:</span>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#111111] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.city} Branch
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDate(new Date().toISOString().slice(0, 10))}
          className="text-xs font-bold text-[#EB3E2E] hover:underline cursor-pointer"
        >
          Reset to Today
        </button>
      </div>

      {/* ── CHRONOLOGICAL ATTENDANCE LOG TABLE ── */}
      <div className="bg-[#181818] border border-[#303030] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[780px]">
            <thead>
              <tr className="border-b border-[#303030] bg-[#111111] text-[11px] font-mono uppercase tracking-wider text-[#B8B8B8]">
                <th className="py-3 px-4 font-semibold">Employee / Member</th>
                <th className="py-3 px-4 font-semibold">Branch</th>
                <th className="py-3 px-4 font-semibold">Event</th>
                <th className="py-3 px-4 font-semibold">Punch Time (IST)</th>
                <th className="py-3 px-4 font-semibold">Method / Device</th>
                <th className="py-3 px-4 font-semibold">Audit</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202020] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#B8B8B8]">
                    Loading attendance records...
                  </td>
                </tr>
              ) : attendanceRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#B8B8B8]">
                    No punches recorded for {date} at selected hub.
                  </td>
                </tr>
              ) : (
                attendanceRecords.map((a) => (
                  <tr key={a._id} className="hover:bg-[#202020] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#F5F5F5]">
                      {a.userId?.name || 'Unmapped Biometric User'}
                      <span className="block text-[10px] text-[#B8B8B8] font-mono font-normal">
                        {a.biometricUserId ? `Bio ID: ${a.biometricUserId}` : a.userId?.phone || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#EB3E2E]">
                      {a.branchId?.city || 'HQ'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          a.eventType === 'CHECK_OUT'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : a.eventType === 'UNKNOWN'
                            ? 'bg-[#252525] text-[#B8B8B8] border-[#353535]'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {a.eventType || 'CHECK_IN'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-green-400 font-bold">
                      {formatTimeIST(a.checkInTime)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-[#252525] text-[#B8B8B8] font-mono text-[10px]">
                        {a.verificationMethod || a.method}
                      </span>
                      {a.deviceId?.deviceName && (
                        <span className="block text-[10px] text-[#858585] mt-0.5">{a.deviceId.deviceName}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-[#858585]">
                      {a.correctionHistory?.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-300">
                          <History className="w-3 h-3" />
                          {a.correctionHistory.length} edit(s)
                        </span>
                      ) : (
                        'Original'
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => openCorrectModal(a)}
                        className="p-1.5 rounded text-[#B8B8B8] hover:text-white hover:bg-[#2A2A2A] cursor-pointer"
                        title="Investigate / Correct Punch"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(a._id, a.userId?.name || 'User')}
                        className="p-1.5 rounded text-[#B8B8B8] hover:text-red-400 hover:bg-[#2A2A2A] cursor-pointer"
                        title="Delete Attendance Entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── RECORD ATTENDANCE MODAL ── */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#303030] rounded-2xl w-full max-w-md p-6 relative">
            <h3
              className="text-lg font-bold uppercase tracking-tight text-[#F5F5F5] mb-4"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              Record Attendance Punch
            </h3>

            <form onSubmit={handleRecordSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSubjectKind('EMPLOYEE')}
                  className={`py-2 rounded-xl text-xs font-bold uppercase border cursor-pointer ${
                    subjectKind === 'EMPLOYEE'
                      ? 'bg-[#EB3E2E] text-white border-[#EB3E2E]'
                      : 'bg-[#111111] text-[#B8B8B8] border-[#303030]'
                  }`}
                >
                  Employee
                </button>
                <button
                  type="button"
                  onClick={() => setSubjectKind('CLIENT')}
                  className={`py-2 rounded-xl text-xs font-bold uppercase border cursor-pointer ${
                    subjectKind === 'CLIENT'
                      ? 'bg-[#EB3E2E] text-white border-[#EB3E2E]'
                      : 'bg-[#111111] text-[#B8B8B8] border-[#303030]'
                  }`}
                >
                  Client
                </button>
              </div>

              {subjectKind === 'EMPLOYEE' ? (
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Select Employee</label>
                  <select
                    required
                    value={recordForm.employeeId}
                    onChange={(e) => setRecordForm({ ...recordForm, employeeId: e.target.value })}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none"
                  >
                    <option value="">-- Choose Employee --</option>
                    {allEmployees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.fullName} ({emp.employeeId})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Select Client</label>
                  <select
                    required
                    value={recordForm.userId}
                    onChange={(e) => setRecordForm({ ...recordForm, userId: e.target.value })}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none"
                  >
                    <option value="">-- Choose Client --</option>
                    {allClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone || c.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Event Type</label>
                  <select
                    value={recordForm.eventType}
                    onChange={(e) => setRecordForm({ ...recordForm, eventType: e.target.value })}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                  >
                    <option value="CHECK_IN">Check-in</option>
                    <option value="CHECK_OUT">Check-out</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Hub Branch</label>
                  <select
                    value={recordForm.branchId}
                    onChange={(e) => setRecordForm({ ...recordForm, branchId: e.target.value })}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                  >
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Punch Date &amp; Time</label>
                <input
                  type="datetime-local"
                  required
                  value={recordForm.checkInTime}
                  onChange={(e) => setRecordForm({ ...recordForm, checkInTime: e.target.value })}
                  className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                />
              </div>

              <p className="text-[10px] text-[#858585] italic pt-1">
                Multiple legitimate check-in and check-out punches per day are supported for shifts and breaks.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#202020] text-[#B8B8B8] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#EB3E2E] text-white cursor-pointer"
                >
                  Log Punch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── INVESTIGATE & CORRECT PUNCH MODAL (WITH AUDIT TRAIL) ── */}
      {correctModal.open && correctModal.record && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#303030] rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold uppercase text-[#F5F5F5]">
                Investigate &amp; Correct Punch
              </h3>
              <button
                type="button"
                onClick={() => setCorrectModal({ open: false, record: null })}
                className="text-[#858585] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCorrectSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Event Direction</label>
                <select
                  value={correctForm.eventType}
                  onChange={(e) => setCorrectForm({ ...correctForm, eventType: e.target.value })}
                  className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                >
                  <option value="CHECK_IN">CHECK_IN</option>
                  <option value="CHECK_OUT">CHECK_OUT</option>
                  <option value="UNKNOWN">UNKNOWN</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Punch Timestamp</label>
                <input
                  type="datetime-local"
                  required
                  value={correctForm.checkInTime}
                  onChange={(e) => setCorrectForm({ ...correctForm, checkInTime: e.target.value })}
                  className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Audit Reason *</label>
                <input
                  type="text"
                  required
                  value={correctForm.reason}
                  onChange={(e) => setCorrectForm({ ...correctForm, reason: e.target.value })}
                  placeholder="e.g. Fixed terminal direction code"
                  className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                />
              </div>

              {correctModal.record.correctionHistory?.length > 0 && (
                <div className="p-3 rounded-xl bg-[#111111] border border-[#252525] space-y-1.5 max-h-32 overflow-y-auto">
                  <div className="text-[10px] font-bold uppercase text-[#858585]">Previous Corrections</div>
                  {correctModal.record.correctionHistory.map((h, i) => (
                    <div key={i} className="text-[11px] text-[#B8B8B8]">
                      {h.previousEventType} → {h.newEventType} ({h.reason})
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCorrectModal({ open: false, record: null })}
                  className="px-4 py-2 rounded-xl bg-[#202020] text-[#B8B8B8] text-xs font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={correctBusy}
                  className="px-4 py-2 rounded-xl bg-[#EB3E2E] text-white text-xs font-bold uppercase cursor-pointer disabled:opacity-50"
                >
                  {correctBusy ? 'Saving...' : 'Save Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
