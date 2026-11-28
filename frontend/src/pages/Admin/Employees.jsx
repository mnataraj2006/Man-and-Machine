import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Fingerprint,
  Plus,
  Search,
  Eye,
  Edit3,
  Power,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  X,
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

export default function Employees({ onNavigate }) {
  const { selectedBranch, branches } = useAdmin();

  const [overview, setOverview] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    inactiveEmployees: 0,
    withoutBiometricId: 0,
    departments: [],
  });
  const [employees, setEmployees] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Filters & pagination
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState(selectedBranch || 'ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [formModal, setFormModal] = useState({ open: false, mode: 'create', employee: null });
  const [statusModal, setStatusModal] = useState({ open: false, employee: null, action: 'deactivate' });

  useEffect(() => {
    setBranchFilter(selectedBranch || 'ALL');
    setPage(1);
  }, [selectedBranch]);

  const loadDevices = useCallback(async () => {
    try {
      const res = await biometricService.getDevices({ branchId: branchFilter === 'ALL' ? '' : branchFilter });
      setDevices(res.devices || []);
    } catch {
      // Non-fatal if devices list fails
    }
  }, [branchFilter]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ovRes, listRes] = await Promise.all([
        employeeService.getOverview({ branchId: branchFilter }),
        employeeService.listEmployees({
          branchId: branchFilter,
          department: departmentFilter,
          employmentStatus: statusFilter,
          search: search.trim(),
          page,
          limit: 12,
        }),
      ]);
      setOverview({
        totalEmployees: ovRes.totalEmployees || 0,
        activeEmployees: ovRes.activeEmployees || 0,
        inactiveEmployees: ovRes.inactiveEmployees || 0,
        withoutBiometricId: ovRes.withoutBiometricId || 0,
        departments: ovRes.departments || [],
      });
      setEmployees(listRes.employees || []);
      setTotalPages(listRes.totalPages || 1);
      setTotalCount(listRes.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load employees.');
    } finally {
      setLoading(false);
    }
  }, [branchFilter, departmentFilter, statusFilter, search, page]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleViewEmployee = (emp) => {
    const target = `/admin/employees/${emp._id}`;
    if (onNavigate) {
      onNavigate(target);
    } else {
      window.history.pushState({}, '', target);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="space-y-6 min-w-0">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#252525]">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#EB3E2E] block mb-1">
            HRMS &amp; BIOMETRIC WORKFORCE
          </span>
          <h1 className="mm-page-title text-2xl sm:text-3xl">EMPLOYEE MANAGEMENT</h1>
          <p className="text-xs sm:text-sm text-[#B8B8B8] mt-1">
            Manage staff directory, branch assignments, and eSSL X2008 biometric user IDs.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setFormModal({ open: true, mode: 'create', employee: null })}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase tracking-wider cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Employee</span>
        </button>
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-200'
              : 'bg-red-500/10 border-red-500/35 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/35 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-[#858585] text-xs uppercase font-bold tracking-wider">
            <span>Total Employees</span>
            <Users className="w-4 h-4 text-[#EB3E2E]" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-[#F5F5F5]">{overview.totalEmployees}</div>
        </div>

        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-[#858585] text-xs uppercase font-bold tracking-wider">
            <span>Active Employees</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-emerald-400">{overview.activeEmployees}</div>
        </div>

        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-[#858585] text-xs uppercase font-bold tracking-wider">
            <span>Inactive Employees</span>
            <UserX className="w-4 h-4 text-[#9A9A9A]" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-[#B8B8B8]">{overview.inactiveEmployees}</div>
        </div>

        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-[#858585] text-xs uppercase font-bold tracking-wider">
            <span>Without Biometric ID</span>
            <Fingerprint className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-amber-400">{overview.withoutBiometricId}</div>
        </div>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#858585] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, EMP ID, biometric ID..."
            className="mm-input pl-10"
          />
        </div>

        <select
          value={branchFilter}
          onChange={(e) => {
            setBranchFilter(e.target.value);
            setPage(1);
          }}
          className="mm-select"
        >
          <option value="ALL">All Branches</option>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>
              {b.city || b.name}
            </option>
          ))}
        </select>

        <select
          value={departmentFilter}
          onChange={(e) => {
            setDepartmentFilter(e.target.value);
            setPage(1);
          }}
          className="mm-select"
        >
          <option value="ALL">All Departments</option>
          {overview.departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="mm-select"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-[#181818] border border-[#303030] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-[#858585]">Loading employees...</div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-[#454545] mx-auto" />
            <div className="text-sm font-bold text-[#F5F5F5]">No employees found</div>
            <p className="text-xs text-[#858585] max-w-md mx-auto">
              Adjust your search or filters, or add your first employee to start tracking workforce biometric attendance.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[960px]">
              <thead>
                <tr className="bg-[#141414] border-b border-[#2A2A2A] text-[10px] font-bold uppercase tracking-wider text-[#858585]">
                  <th className="py-3.5 px-4">Employee ID</th>
                  <th className="py-3.5 px-3">Photo</th>
                  <th className="py-3.5 px-4">Employee Name</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Designation</th>
                  <th className="py-3.5 px-4">Branch</th>
                  <th className="py-3.5 px-4">Biometric User ID</th>
                  <th className="py-3.5 px-4">Employment Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252525] text-xs">
                {employees.map((emp) => {
                  const bioBadge = BIOMETRIC_BADGE_MAP[emp.biometricEnrollmentStatus] || BIOMETRIC_BADGE_MAP.NOT_LINKED;
                  const isActive = emp.employmentStatus === 'ACTIVE';
                  return (
                    <tr key={emp._id} className="hover:bg-[#1E1E1E] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#EB3E2E]">
                        <button
                          type="button"
                          onClick={() => handleViewEmployee(emp)}
                          className="hover:underline cursor-pointer"
                        >
                          {emp.employeeId}
                        </button>
                      </td>
                      <td className="py-3.5 px-3">
                        <TrainerAvatar
                          src={resolveMediaUrl(emp.profilePhoto)}
                          name={emp.fullName}
                          size="sm"
                          rounded="rounded-xl"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleViewEmployee(emp)}
                          className="font-bold text-[#F5F5F5] hover:text-[#EB3E2E] text-left cursor-pointer"
                        >
                          {emp.fullName}
                        </button>
                        <div className="text-[11px] text-[#858585]">{emp.phone}</div>
                      </td>
                      <td className="py-3.5 px-4 text-[#D4D4D4]">{emp.department}</td>
                      <td className="py-3.5 px-4 text-[#B8B8B8]">{emp.designation}</td>
                      <td className="py-3.5 px-4 text-[#D4D4D4]">
                        {emp.branchId?.city || emp.branchId?.name || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono font-semibold text-[#F5F5F5]">
                            {emp.biometricUserId || '—'}
                          </span>
                          <span
                            className={`inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${bioBadge.cls}`}
                          >
                            {bioBadge.label}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-[#252525] text-[#9A9A9A] border-[#353535]'
                          }`}
                        >
                          {emp.employmentStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewEmployee(emp)}
                            title="View Profile"
                            className="p-2 rounded-lg bg-[#202020] hover:bg-[#2B2B2B] border border-[#303030] text-[#D4D4D4] hover:text-white cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormModal({ open: true, mode: 'edit', employee: emp })}
                            title="Edit Employee"
                            className="p-2 rounded-lg bg-[#202020] hover:bg-[#2B2B2B] border border-[#303030] text-[#D4D4D4] hover:text-white cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {isActive ? (
                            <button
                              type="button"
                              onClick={() => setStatusModal({ open: true, employee: emp, action: 'deactivate' })}
                              title="Deactivate Employee"
                              className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 cursor-pointer"
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setStatusModal({ open: true, employee: emp, action: 'reactivate' })}
                              title="Reactivate Employee"
                              className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {!loading && totalPages > 1 && (
          <div className="px-4 py-3 bg-[#141414] border-t border-[#2A2A2A] flex items-center justify-between text-xs text-[#858585]">
            <span>
              Page <strong className="text-[#F5F5F5]">{page}</strong> of{' '}
              <strong className="text-[#F5F5F5]">{totalPages}</strong> ({totalCount} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-lg bg-[#202020] border border-[#303030] text-[#D4D4D4] disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-2 rounded-lg bg-[#202020] border border-[#303030] text-[#D4D4D4] disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      <EmployeeFormModal
        isOpen={formModal.open}
        mode={formModal.mode}
        employee={formModal.employee}
        branches={branches}
        devices={devices}
        defaultBranchId={branchFilter}
        onClose={() => setFormModal({ open: false, mode: 'create', employee: null })}
        onSuccess={(_emp, msg) => {
          setFeedback({ type: 'success', message: msg || 'Employee saved successfully.' });
          loadData();
        }}
      />

      {/* DEACTIVATE / REACTIVATE MODAL */}
      <EmployeeStatusModal
        isOpen={statusModal.open}
        employee={statusModal.employee}
        action={statusModal.action}
        onClose={() => setStatusModal({ open: false, employee: null, action: 'deactivate' })}
        onSuccess={(_emp, msg) => {
          setFeedback({ type: 'success', message: msg || 'Employee status updated.' });
          loadData();
        }}
      />
    </div>
  );
}
