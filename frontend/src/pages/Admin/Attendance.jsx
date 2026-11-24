import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Plus,
  Search,
  Filter,
  Download,
  Clock,
  Building,
  User,
  ShieldCheck,
  Edit,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import adminService from '../../services/adminService.js';
import { useAdmin } from '../../components/Admin/AdminLayout.jsx';

export default function Attendance() {
  const { branches, selectedBranch } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [branchFilter, setBranchFilter] = useState(selectedBranch);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [monthTotal, setMonthTotal] = useState(0);

  // Record Attendance Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [allClients, setAllClients] = useState([]);
  const [recordForm, setRecordForm] = useState({
    userId: '',
    branchId: '',
    date: new Date().toISOString().slice(0, 10),
    checkInTime: new Date().toISOString().slice(0, 16),
    method: 'STAFF_CHECKIN',
  });

  useEffect(() => {
    setBranchFilter(selectedBranch);
  }, [selectedBranch]);

  const fetchAttendance = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getAttendance({
        branchId: branchFilter,
        date,
      });
      setAttendanceRecords(res.records || []);
      setMonthTotal(res.monthTotal || 0);

      const clientsRes = await adminService.getClients({ limit: 100 });
      if (clientsRes.clients) setAllClients(clientsRes.clients);
    } catch (err) {
      setError(err.message || 'Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [branchFilter, date]);

  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await adminService.recordAttendance(recordForm);
      setSuccess('Check-in successfully recorded!');
      setIsRecordModalOpen(false);
      fetchAttendance();
    } catch (err) {
      setError(err.message || 'Failed to record check-in');
    }
  };

  const handleExportCSV = () => {
    const exportData = attendanceRecords.map((a) => ({
      ClientName: a.userId?.name || 'Athlete',
      Phone: a.userId?.phone || '',
      Branch: a.branchId?.city || '',
      Date: new Date(a.date).toLocaleDateString(),
      CheckInTime: new Date(a.checkInTime).toLocaleTimeString(),
      Method: a.method,
    }));
    adminService.exportToCSV(exportData, `attendance_${date}.csv`);
  };

  const handleDeleteRecord = async (id, athleteName) => {
    if (!window.confirm(`Delete attendance check-in for ${athleteName}?`)) return;
    try {
      await adminService.correctAttendance(id, { action: 'DELETE' });
      fetchAttendance();
    } catch (err) {
      alert(err.message || 'Failed to remove record');
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
            ATTENDANCE &amp; FACILITY ACCESS
          </h2>
          <p className="text-xs text-[#A3A3A3]">
            Multi-branch daily athlete access control, check-in timestamps, and streak tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#1F1F1F] hover:bg-[#252525] text-[#F5F5F5] border border-[#292929] hover:border-[#E58A32] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#E58A32]" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRecordForm({
                userId: allClients[0]?.id || '',
                branchId: branches[0]?._id || '',
                date: new Date().toISOString().slice(0, 10),
                checkInTime: new Date().toISOString().slice(0, 16),
                method: 'STAFF_CHECKIN',
              });
              setIsRecordModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] hover:bg-[#F09A43] text-black transition-all cursor-pointer shadow-lg shadow-[#E58A32]/10"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <Plus className="w-4 h-4" />
            <span>Record Check-In</span>
          </button>
        </div>
      </div>

      {/* Global Notice */}
      {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{error}</div>}
      {success && <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs">{success}</div>}

      {/* ── METRICS SUMMARY STRIP ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#181818] border border-[#292929] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-[#A3A3A3]">DAY CHECK-INS</span>
            <p
              className="text-2xl font-bold text-[#F5F5F5] mt-1"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {attendanceRecords.length}
            </p>
          </div>
          <CalendarCheck className="w-8 h-8 text-[#E58A32]" />
        </div>

        <div className="bg-[#181818] border border-[#292929] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-[#A3A3A3]">MONTH TOTAL VISITS</span>
            <p
              className="text-2xl font-bold text-green-400 mt-1"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {monthTotal}
            </p>
          </div>
          <Calendar className="w-8 h-8 text-green-400" />
        </div>

        <div className="bg-[#181818] border border-[#292929] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-[#A3A3A3]">DUPLICATE PREVENT RULE</span>
            <p className="text-xs font-semibold text-[#F5F5F5] mt-1">1 Check-in / Day</p>
            <span className="text-[10px] text-green-400">Strictly Enforced</span>
          </div>
          <ShieldCheck className="w-8 h-8 text-green-400" />
        </div>
      </div>

      {/* ── FILTER BY DATE & BRANCH ── */}
      <div className="bg-[#141414] border border-[#292929] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#A3A3A3] uppercase">Select Date:</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-1.5 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#A3A3A3] uppercase">Branch:</span>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:outline-none cursor-pointer"
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
          className="text-xs font-bold text-[#E58A32] hover:underline cursor-pointer"
        >
          Reset to Today
        </button>
      </div>

      {/* ── ATTENDANCE LOG TABLE ── */}
      <div className="bg-[#181818] border border-[#292929] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#292929] bg-[#141414] text-[11px] font-mono uppercase tracking-wider text-[#A3A3A3]">
                <th className="py-3 px-4 font-semibold">Athlete</th>
                <th className="py-3 px-4 font-semibold">Branch</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Check-In Timestamp</th>
                <th className="py-3 px-4 font-semibold">Verification Method</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#A3A3A3]">
                    Loading attendance records...
                  </td>
                </tr>
              ) : attendanceRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#A3A3A3]">
                    No gym check-ins recorded for {date} at selected hub.
                  </td>
                </tr>
              ) : (
                attendanceRecords.map((a) => (
                  <tr key={a._id} className="hover:bg-[#1E1E1E] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#F5F5F5]">
                      {a.userId?.name || 'Athlete'}
                      <span className="block text-[10px] text-[#A3A3A3] font-mono font-normal">
                        {a.userId?.phone}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#E58A32]">
                      {a.branchId?.city || 'HQ'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#F5F5F5]">
                      {new Date(a.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-green-400 font-bold">
                      {new Date(a.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-[#252525] text-[#A3A3A3] font-mono text-[10px]">
                        {a.method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(a._id, a.userId?.name)}
                        className="p-1 rounded text-[#A3A3A3] hover:text-red-400 cursor-pointer"
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
          <div className="bg-[#181818] border border-[#292929] rounded-2xl w-full max-w-md p-6 relative">
            <h3
              className="text-lg font-bold uppercase tracking-tight text-[#F5F5F5] mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Record Athlete Check-In
            </h3>

            <form onSubmit={handleRecordSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Select Athlete</label>
                <select
                  required
                  value={recordForm.userId}
                  onChange={(e) => setRecordForm({ ...recordForm, userId: e.target.value })}
                  className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none"
                >
                  <option value="">-- Choose Athlete --</option>
                  {allClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone || c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Check-in Date</label>
                  <input
                    type="date"
                    required
                    value={recordForm.date}
                    onChange={(e) => setRecordForm({ ...recordForm, date: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Hub Branch</label>
                  <select
                    value={recordForm.branchId}
                    onChange={(e) => setRecordForm({ ...recordForm, branchId: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
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
                <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Verification Method</label>
                <select
                  value={recordForm.method}
                  onChange={(e) => setRecordForm({ ...recordForm, method: e.target.value })}
                  className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                >
                  <option value="STAFF_CHECKIN">Staff Desk Check-In</option>
                  <option value="BIOMETRIC">Biometric Access Gate</option>
                  <option value="QR_SCAN">Digital QR Badge Scan</option>
                </select>
              </div>

              <p className="text-[10px] text-[#A3A3A3] italic pt-1">
                Notice: Duplicate entries for the same client on the same calendar day are prevented by backend business
                rules.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#222222] text-[#A3A3A3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] text-black"
                >
                  Log Check-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
