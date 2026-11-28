import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Edit3,
  Power,
  RotateCcw,
  Fingerprint,
  CalendarCheck,
  Building2,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useAdmin } from '../../components/Admin/AdminLayout.jsx';
import TrainerAvatar, { resolveMediaUrl } from '../../components/UI/TrainerAvatar.jsx';
import EmployeeFormModal from '../../components/Admin/EmployeeFormModal.jsx';
import EmployeeStatusModal from '../../components/Admin/EmployeeStatusModal.jsx';
import employeeService from '../../services/employeeService.js';
import biometricService from '../../services/biometricService.js';

const BIOMETRIC_BADGE_MAP = {
  NOT_LINKED: { label: 'Not Linked', cls: 'bg-[#202020] text-[#9A9A9A] border-[#303030]' },
  LINKED: { label: 'Linked', cls: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
  PENDING_VERIFICATION: { label: 'Pending Verification', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  VERIFIED: { label: 'Verified', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  ERROR: { label: 'Error', cls: 'bg-red-500/10 text-red-400 border-red-500/30' },
};

const formatDate = (val) => {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

const formatDateTime = (val) => {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

export default function EmployeeProfile({ employeeId, onNavigate }) {
  const { branches } = useAdmin();

  const [employee, setEmployee] = useState(null);
  const [summary, setSummary] = useState({ totalPunches: 0, thisMonthPunches: 0, lastCheckIn: null });
  const [attendance, setAttendance] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);

  const [editOpen, setEditOpen] = useState(false);
  const [statusModal, setStatusModal] = useState({ open: false, action: 'deactivate' });

  const loadProfile = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError('');
    try {
      const res = await employeeService.getEmployee(employeeId);
      setEmployee(res.employee);
      setSummary(res.attendanceSummary || { totalPunches: 0, thisMonthPunches: 0, lastCheckIn: null });
      setAttendance(res.recentAttendance || []);

      const branchId = res.employee?.branchId?._id || res.employee?.branchId || '';
      const devRes = await biometricService.getDevices({ branchId }).catch(() => ({ devices: [] }));
      setDevices(devRes.devices || []);
    } catch (err) {
      setError(err.message || 'Failed to load employee profile.');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const goBack = () => {
    if (onNavigate) {
      onNavigate('/admin/employees');
    } else {
      window.history.pushState({}, '', '/admin/employees');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  if (loading) {
    return (
      <div className="bg-[#181818] border border-[#303030] rounded-2xl p-10 text-center text-xs text-[#858585]">
        Loading employee profile...
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase text-[#B8B8B8] hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Employees
        </button>
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/35 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error || 'Employee not found.'}</span>
        </div>
      </div>
    );
  }

  const isActive = employee.employmentStatus === 'ACTIVE';
  const bioBadge = BIOMETRIC_BADGE_MAP[employee.biometricEnrollmentStatus] || BIOMETRIC_BADGE_MAP.NOT_LINKED;

  return (
    <div className="space-y-6 min-w-0">
      {/* TOP BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#B8B8B8] hover:text-white w-fit cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Employees</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#202020] hover:bg-[#2A2A2A] border border-[#303030] text-xs font-bold uppercase tracking-wider text-white cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#EB3E2E]" />
            <span>Edit Employee</span>
          </button>

          {isActive ? (
            <button
              type="button"
              onClick={() => setStatusModal({ open: true, action: 'deactivate' })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/35 text-xs font-bold uppercase tracking-wider text-amber-300 cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Deactivate</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStatusModal({ open: true, action: 'reactivate' })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/35 text-xs font-bold uppercase tracking-wider text-emerald-300 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reactivate</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/35 text-xs text-emerald-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PROFILE HEADER CARD */}
      <div className="bg-[#181818] border border-[#303030] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <TrainerAvatar
            src={resolveMediaUrl(employee.profilePhoto)}
            name={employee.fullName}
            size="xl"
            rounded="rounded-2xl"
          />
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#EB3E2E]/15 border border-[#EB3E2E]/40 text-[#EB3E2E] font-mono text-xs font-bold">
                {employee.employeeId}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-[#252525] text-[#9A9A9A] border-[#353535]'
                }`}
              >
                {employee.employmentStatus}
              </span>
            </div>
            <h1 className="mm-page-title text-2xl sm:text-3xl">{employee.fullName}</h1>
            <p className="text-xs sm:text-sm text-[#B8B8B8]">
              {employee.designation} • {employee.department} • {employee.branchId?.city || employee.branchId?.name || '—'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-xl bg-[#111111] border border-[#252525]">
            <div className="text-[10px] uppercase text-[#858585] font-bold">Total Punches</div>
            <div className="text-lg font-bold text-[#F5F5F5] mt-0.5">{summary.totalPunches}</div>
          </div>
          <div className="p-3 rounded-xl bg-[#111111] border border-[#252525]">
            <div className="text-[10px] uppercase text-[#858585] font-bold">This Month</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">{summary.thisMonthPunches}</div>
          </div>
          <div className="p-3 rounded-xl bg-[#111111] border border-[#252525]">
            <div className="text-[10px] uppercase text-[#858585] font-bold">Biometric PIN</div>
            <div className="text-lg font-mono font-bold text-[#EB3E2E] mt-0.5">
              {employee.biometricUserId || '—'}
            </div>
          </div>
        </div>
      </div>

      {/* DETAILS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Info */}
        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-4">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#F5F5F5] border-b border-[#252525] pb-2.5">
            Personal Details
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2.5 text-[#D4D4D4]">
              <Phone className="w-4 h-4 text-[#EB3E2E] shrink-0" />
              <span>{employee.phone || '—'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-[#D4D4D4]">
              <Mail className="w-4 h-4 text-[#EB3E2E] shrink-0" />
              <span className="truncate">{employee.email || '—'}</span>
            </div>
            <div className="flex items-start gap-2.5 text-[#D4D4D4]">
              <MapPin className="w-4 h-4 text-[#EB3E2E] shrink-0 mt-0.5" />
              <span>{employee.address || '—'}</span>
            </div>
            <div className="pt-2 border-t border-[#252525] grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] uppercase text-[#858585] block">Gender</span>
                <span className="text-[#F5F5F5] font-semibold">{employee.gender || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#858585] block">Date of Birth</span>
                <span className="text-[#F5F5F5] font-semibold">{formatDate(employee.dateOfBirth)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Employment Info */}
        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-4">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#F5F5F5] border-b border-[#252525] pb-2.5 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#EB3E2E]" />
            <span>Employment Information</span>
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase text-[#858585] block">Branch</span>
              <span className="text-[#F5F5F5] font-semibold flex items-center gap-1 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-[#EB3E2E]" />
                {employee.branchId?.city || employee.branchId?.name || '—'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-[#858585] block">Department</span>
              <span className="text-[#F5F5F5] font-semibold mt-0.5 block">{employee.department}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-[#858585] block">Designation</span>
              <span className="text-[#F5F5F5] font-semibold mt-0.5 block">{employee.designation}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-[#858585] block">Type</span>
              <span className="text-[#F5F5F5] font-semibold mt-0.5 block">
                {(employee.employmentType || 'FULL_TIME').replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-[#858585] block">Joining Date</span>
              <span className="text-[#F5F5F5] font-semibold mt-0.5 block">{formatDate(employee.joiningDate)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-[#858585] block">Exit Date</span>
              <span className="text-[#F5F5F5] font-semibold mt-0.5 block">{formatDate(employee.exitDate)}</span>
            </div>
          </div>
        </div>

        {/* Biometric Info */}
        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-4">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#F5F5F5] border-b border-[#252525] pb-2.5 flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-[#EB3E2E]" />
            <span>Biometric Terminal Mapping</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#858585]">Enrollment Status</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${bioBadge.cls}`}>
                {bioBadge.label}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#858585]">Biometric User ID</span>
              <span className="font-mono font-bold text-[#F5F5F5]">{employee.biometricUserId || 'Not Linked'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#858585]">Assigned Device</span>
              <span className="font-semibold text-[#F5F5F5] text-right">
                {employee.assignedDeviceId
                  ? `${employee.assignedDeviceId.deviceName} (${employee.assignedDeviceId.model || 'X2008'})`
                  : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#858585]">Last Check-In</span>
              <span className="font-mono text-[#D4D4D4]">{formatDateTime(summary.lastCheckIn)}</span>
            </div>
            {employee.biometricError && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-[11px] text-red-300">
                {employee.biometricError}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RECENT ATTENDANCE HISTORY */}
      <div className="bg-[#181818] border border-[#303030] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 bg-[#141414] border-b border-[#2A2A2A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-[#EB3E2E]" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#F5F5F5]">
              Attendance &amp; Check-In History
            </h3>
          </div>
          <span className="text-[11px] text-[#858585]">Showing latest {attendance.length} records</span>
        </div>

        {attendance.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#858585]">
            No biometric or manual attendance punches recorded for this employee yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#141414] border-b border-[#252525] text-[10px] font-bold uppercase tracking-wider text-[#858585]">
                  <th className="py-3 px-4">Timestamp (IST)</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Biometric ID</th>
                  <th className="py-3 px-4">Device</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252525] text-xs">
                {attendance.map((rec) => (
                  <tr key={rec._id} className="hover:bg-[#1E1E1E]">
                    <td className="py-3 px-4 font-mono text-[#F5F5F5] flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#EB3E2E]" />
                      {formatDateTime(rec.checkInTime)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#D4D4D4]">{rec.eventType || 'CHECK_IN'}</td>
                    <td className="py-3 px-4 text-[#B8B8B8]">{rec.verificationMethod || rec.method}</td>
                    <td className="py-3 px-4 font-mono text-[#D4D4D4]">{rec.biometricUserId || '—'}</td>
                    <td className="py-3 px-4 text-[#B8B8B8]">
                      {rec.deviceId ? `${rec.deviceId.deviceName} (${rec.deviceId.model || 'X2008'})` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          rec.attendanceStatus === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {rec.attendanceStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AUDIT / STATUS HISTORY */}
      <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F5F5F5]">
          <ShieldCheck className="w-4 h-4 text-[#EB3E2E]" />
          <span>Account &amp; Audit History</span>
        </div>
        {employee.deactivatedAt && (
          <div className="p-3 rounded-xl bg-[#111111] border border-[#252525] text-xs text-[#B8B8B8]">
            Last deactivated on <strong>{formatDateTime(employee.deactivatedAt)}</strong>
            {employee.deactivatedBy?.name ? ` by ${employee.deactivatedBy.name}` : ''}
            {employee.deactivationReason ? ` — Reason: ${employee.deactivationReason}` : ''}
          </div>
        )}
        {employee.reactivatedAt && (
          <div className="p-3 rounded-xl bg-[#111111] border border-[#252525] text-xs text-[#B8B8B8]">
            Last reactivated on <strong>{formatDateTime(employee.reactivatedAt)}</strong>
            {employee.reactivatedBy?.name ? ` by ${employee.reactivatedBy.name}` : ''}
          </div>
        )}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {(employee.statusHistory || [])
            .slice()
            .reverse()
            .map((h, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px] py-1.5 border-b border-[#222222] last:border-0">
                <div className="text-[#D4D4D4]">
                  <span className="font-bold text-[#F5F5F5]">{h.action}</span>
                  {h.reason ? ` — ${h.reason}` : ''}
                  {h.actorUserId?.name ? ` (by ${h.actorUserId.name})` : ''}
                </div>
                <span className="font-mono text-[#858585] shrink-0 ml-3">{formatDateTime(h.timestamp)}</span>
              </div>
            ))}
        </div>
      </div>

      <EmployeeFormModal
        isOpen={editOpen}
        mode="edit"
        employee={employee}
        branches={branches}
        devices={devices}
        onClose={() => setEditOpen(false)}
        onSuccess={(_emp, msg) => {
          setFeedback(msg || 'Employee updated successfully.');
          loadProfile();
        }}
      />

      <EmployeeStatusModal
        isOpen={statusModal.open}
        employee={employee}
        action={statusModal.action}
        onClose={() => setStatusModal({ open: false, action: 'deactivate' })}
        onSuccess={(_emp, msg) => {
          setFeedback(msg || 'Employee status updated.');
          loadProfile();
        }}
      />
    </div>
  );
}
