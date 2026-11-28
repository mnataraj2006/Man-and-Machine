import React, { useState, useEffect } from 'react';
import { X, User, Briefcase, Fingerprint, AlertCircle, Save } from 'lucide-react';
import TrainerPhotoField from './TrainerPhotoField.jsx';
import employeeService from '../../services/employeeService.js';

const BIOMETRIC_STATUS_OPTIONS = [
  { value: 'NOT_LINKED', label: 'Not Linked' },
  { value: 'LINKED', label: 'Linked' },
  { value: 'PENDING_VERIFICATION', label: 'Pending Verification' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'ERROR', label: 'Error' },
];

const EMPLOYMENT_TYPES = [
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERN', label: 'Intern' },
  { value: 'OTHER', label: 'Other' },
];

const toDateInput = (val) => {
  if (!val) return '';
  try {
    return new Date(val).toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

export default function EmployeeFormModal({
  isOpen,
  mode = 'create', // 'create' | 'edit'
  employee = null,
  branches = [],
  devices = [],
  defaultBranchId = '',
  onClose,
  onSuccess,
}) {
  const [form, setForm] = useState({
    fullName: '',
    employeeId: '',
    gender: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    address: '',
    department: '',
    designation: '',
    branchId: '',
    joiningDate: new Date().toISOString().slice(0, 10),
    employmentType: 'FULL_TIME',
    employmentStatus: 'ACTIVE',
    exitDate: '',
    biometricUserId: '',
    assignedDeviceId: '',
    biometricEnrollmentStatus: 'NOT_LINKED',
    biometricError: '',
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setFormError('');
    setPhotoFile(null);
    setRemovePhoto(false);

    if (mode === 'edit' && employee) {
      setForm({
        fullName: employee.fullName || '',
        employeeId: employee.employeeId || '',
        gender: employee.gender || '',
        dateOfBirth: toDateInput(employee.dateOfBirth),
        phone: employee.phone || '',
        email: employee.email || '',
        address: employee.address || '',
        department: employee.department || '',
        designation: employee.designation || '',
        branchId: employee.branchId?._id || employee.branchId || '',
        joiningDate: toDateInput(employee.joiningDate) || new Date().toISOString().slice(0, 10),
        employmentType: employee.employmentType || 'FULL_TIME',
        employmentStatus: employee.employmentStatus || 'ACTIVE',
        exitDate: toDateInput(employee.exitDate),
        biometricUserId: employee.biometricUserId || '',
        assignedDeviceId: employee.assignedDeviceId?._id || employee.assignedDeviceId || '',
        biometricEnrollmentStatus: employee.biometricEnrollmentStatus || 'NOT_LINKED',
        biometricError: employee.biometricError || '',
      });
    } else {
      const initialBranch =
        (defaultBranchId && defaultBranchId !== 'ALL' ? defaultBranchId : '') ||
        branches[0]?._id ||
        '';
      setForm({
        fullName: '',
        employeeId: '',
        gender: '',
        dateOfBirth: '',
        phone: '',
        email: '',
        address: '',
        department: '',
        designation: '',
        branchId: initialBranch,
        joiningDate: new Date().toISOString().slice(0, 10),
        employmentType: 'FULL_TIME',
        employmentStatus: 'ACTIVE',
        exitDate: '',
        biometricUserId: '',
        assignedDeviceId: '',
        biometricEnrollmentStatus: 'NOT_LINKED',
        biometricError: '',
      });

      employeeService
        .getNextEmployeeId()
        .then((res) => {
          if (res?.nextEmployeeId) {
            setForm((prev) => ({ ...prev, employeeId: prev.employeeId || res.nextEmployeeId }));
          }
        })
        .catch(() => {});
    }
  }, [isOpen, mode, employee, defaultBranchId, branches]);

  if (!isOpen) return null;

  const branchDevices = devices.filter(
    (d) => !form.branchId || String(d.branchId?._id || d.branchId) === String(form.branchId)
  );

  const handleFieldChange = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'branchId') {
        const stillMatches = devices.some(
          (d) => String(d._id) === String(prev.assignedDeviceId) && String(d.branchId?._id || d.branchId) === String(value)
        );
        if (!stillMatches) next.assignedDeviceId = '';
      }
      if (key === 'biometricUserId') {
        if (value.trim() && prev.biometricEnrollmentStatus === 'NOT_LINKED') {
          next.biometricEnrollmentStatus = 'LINKED';
        } else if (!value.trim()) {
          next.biometricEnrollmentStatus = 'NOT_LINKED';
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.fullName.trim()) return setFormError('Full Name is required.');
    if (!form.phone.trim()) return setFormError('Phone Number is required.');
    if (!form.department.trim()) return setFormError('Department is required.');
    if (!form.designation.trim()) return setFormError('Designation is required.');
    if (!form.branchId) return setFormError('Branch is required.');
    if (!form.joiningDate) return setFormError('Joining Date is required.');
    if (form.biometricUserId.trim() && !form.assignedDeviceId) {
      return setFormError('Please select an Assigned Biometric Device when entering a Biometric User ID.');
    }
    if (form.biometricUserId.trim() && !/^[A-Za-z0-9_-]{1,32}$/.test(form.biometricUserId.trim())) {
      return setFormError('Biometric User ID must be 1–32 alphanumeric characters (_, - allowed).');
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          fd.append(k, String(v));
        }
      });
      if (photoFile) {
        fd.append('photo', photoFile);
      } else if (removePhoto) {
        fd.append('removePhoto', 'true');
      }

      const res =
        mode === 'edit' && employee
          ? await employeeService.updateEmployee(employee._id, fd)
          : await employeeService.createEmployee(fd);

      onSuccess?.(res.employee, res.message);
      onClose?.();
    } catch (err) {
      setFormError(err.message || 'Failed to save employee.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#141414] border border-[#303030] rounded-2xl shadow-2xl overflow-hidden my-8">
        <div className="px-6 py-4 bg-[#181818] border-b border-[#303030] flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold uppercase text-[#F5F5F5]">
              {mode === 'edit' ? `Edit Employee — ${employee?.employeeId || ''}` : 'Add New Employee'}
            </h3>
            <p className="text-xs text-[#858585]">
              Personal, employment, and eSSL X2008 biometric terminal mapping
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#858585] hover:text-white hover:bg-[#252525] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {formError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/35 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* 1. PERSONAL INFORMATION */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#EB3E2E]">
              <User className="w-4 h-4" />
              <span>Personal Information</span>
            </div>

            <TrainerPhotoField
              trainerName={form.fullName || 'Employee'}
              existingUrl={mode === 'edit' ? employee?.profilePhoto || '' : ''}
              pendingFile={photoFile}
              removeExisting={removePhoto}
              onSelectFile={(file) => {
                setPhotoFile(file);
                setRemovePhoto(false);
              }}
              onRemove={() => {
                setPhotoFile(null);
                setRemovePhoto(true);
              }}
              disabled={submitting}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => handleFieldChange('fullName', e.target.value)}
                  placeholder="e.g. Nataraj Kumar"
                  className="mm-input"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                  Employee ID (Company ID) *
                </label>
                <input
                  type="text"
                  required
                  value={form.employeeId}
                  onChange={(e) => handleFieldChange('employeeId', e.target.value.toUpperCase())}
                  placeholder="e.g. EMP001"
                  className="mm-input font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={form.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  className="mm-input"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  placeholder="employee@manandmachine.in"
                  className="mm-input"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                  Gender
                </label>
                <select
                  value={form.gender}
                  onChange={(e) => handleFieldChange('gender', e.target.value)}
                  className="mm-select"
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                  className="mm-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                Address
              </label>
              <textarea
                rows={2}
                value={form.address}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                placeholder="Residential address"
                className="mm-input"
              />
            </div>
          </div>

          {/* 2. EMPLOYMENT INFORMATION */}
          <div className="space-y-4 pt-4 border-t border-[#252525]">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#EB3E2E]">
              <Briefcase className="w-4 h-4" />
              <span>Employment Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                  Branch *
                </label>
                <select
                  required
                  value={form.branchId}
                  onChange={(e) => handleFieldChange('branchId', e.target.value)}
                  className="mm-select"
                >
                  <option value="">Select Branch</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.city || b.name} ({b.code || 'Branch'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                  Department *
                </label>
                <input
                  type="text"
                  required
                  value={form.department}
                  onChange={(e) => handleFieldChange('department', e.target.value)}
                  placeholder="e.g. Operations, Coaching, Front Desk"
                  className="mm-input"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                  Designation *
                </label>
                <input
                  type="text"
                  required
                  value={form.designation}
                  onChange={(e) => handleFieldChange('designation', e.target.value)}
                  placeholder="e.g. Branch Manager, Receptionist"
                  className="mm-input"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                  Joining Date *
                </label>
                <input
                  type="date"
                  required
                  value={form.joiningDate}
                  onChange={(e) => handleFieldChange('joiningDate', e.target.value)}
                  className="mm-input"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                  Employment Type
                </label>
                <select
                  value={form.employmentType}
                  onChange={(e) => handleFieldChange('employmentType', e.target.value)}
                  className="mm-select"
                >
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                  Employment Status
                </label>
                <select
                  value={form.employmentStatus}
                  disabled={mode === 'edit'}
                  onChange={(e) => handleFieldChange('employmentStatus', e.target.value)}
                  className="mm-select disabled:opacity-60"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
                {mode === 'edit' && (
                  <p className="text-[10px] text-[#858585] mt-1">
                    Use Deactivate / Reactivate actions to change status safely with audit tracking.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                  Exit Date (Optional)
                </label>
                <input
                  type="date"
                  value={form.exitDate}
                  onChange={(e) => handleFieldChange('exitDate', e.target.value)}
                  className="mm-input"
                />
              </div>
            </div>
          </div>

          {/* 3. BIOMETRIC INFORMATION */}
          <div className="space-y-4 pt-4 border-t border-[#252525]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#EB3E2E]">
                <Fingerprint className="w-4 h-4" />
                <span>Biometric Information (eSSL X2008)</span>
              </div>
              <span className="text-[10px] text-[#858585]">
                Separate from Company Employee ID; leading zeros preserved
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                  Assigned Biometric Device
                </label>
                <select
                  value={form.assignedDeviceId}
                  onChange={(e) => handleFieldChange('assignedDeviceId', e.target.value)}
                  className="mm-select"
                >
                  <option value="">Not Assigned</option>
                  {branchDevices.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.deviceName} ({d.model || 'X2008'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                  Biometric User ID (Machine PIN)
                </label>
                <input
                  type="text"
                  value={form.biometricUserId}
                  onChange={(e) => handleFieldChange('biometricUserId', e.target.value)}
                  placeholder="e.g. 101 or 00101"
                  className="mm-input font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                  Enrollment Status
                </label>
                <select
                  value={form.biometricEnrollmentStatus}
                  onChange={(e) => handleFieldChange('biometricEnrollmentStatus', e.target.value)}
                  className="mm-select"
                >
                  {BIOMETRIC_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#252525] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl bg-[#202020] hover:bg-[#2A2A2A] border border-[#303030] text-xs font-bold uppercase tracking-wider text-[#B8B8B8] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
