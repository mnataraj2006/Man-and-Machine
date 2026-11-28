import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import employeeService from '../../services/employeeService.js';

export default function EmployeeStatusModal({
  isOpen,
  employee = null,
  action = 'deactivate', // 'deactivate' | 'reactivate'
  onClose,
  onSuccess,
}) {
  const [reason, setReason] = useState('');
  const [exitDate, setExitDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setReason('');
    setExitDate(new Date().toISOString().slice(0, 10));
    setError('');
  }, [isOpen, employee, action]);

  if (!isOpen || !employee) return null;

  const isDeactivate = action === 'deactivate';

  const handleConfirm = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = isDeactivate
        ? await employeeService.deactivateEmployee(employee._id, { reason, exitDate })
        : await employeeService.reactivateEmployee(employee._id, { reason });
      onSuccess?.(res.employee, res.message);
      onClose?.();
    } catch (err) {
      setError(err.message || `Failed to ${action} employee.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#141414] border border-[#303030] rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-[#181818] border-b border-[#303030] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isDeactivate ? (
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            )}
            <h3 className="font-display text-base font-bold uppercase text-[#F5F5F5]">
              {isDeactivate ? 'Deactivate Employee' : 'Reactivate Employee'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#858585] hover:text-white hover:bg-[#252525] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-[#181818] border border-[#2A2A2A] text-xs space-y-1">
            <div className="font-bold text-[#F5F5F5]">
              {employee.fullName} <span className="font-mono text-[#EB3E2E]">({employee.employeeId})</span>
            </div>
            <div className="text-[#858585]">
              {employee.designation} • {employee.department}
            </div>
          </div>

          {isDeactivate ? (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Safe deactivation marks the employee <strong>Inactive</strong>, preserves all historical attendance records, and retains their biometric ID reference for audit history while disabling active terminal mapping.
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200">
              Reactivating will restore <strong>Active</strong> workforce status and attempt to re-enable their biometric device mapping if no ID conflict exists.
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/35 text-xs text-red-300">
              {error}
            </div>
          )}

          {isDeactivate && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
                Exit Date
              </label>
              <input
                type="date"
                value={exitDate}
                onChange={(e) => setExitDate(e.target.value)}
                className="mm-input"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] mb-1">
              Reason (Optional)
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isDeactivate ? 'e.g. Resigned, Contract ended' : 'e.g. Rejoined operations'}
              className="mm-input"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-[#202020] hover:bg-[#2A2A2A] border border-[#303030] text-xs font-bold uppercase text-[#B8B8B8] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase text-white cursor-pointer disabled:opacity-50 ${
                isDeactivate ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {busy ? 'Processing...' : isDeactivate ? 'Confirm Deactivate' : 'Confirm Reactivate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
