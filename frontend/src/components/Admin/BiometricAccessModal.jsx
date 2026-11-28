import React from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Fingerprint,
  Loader2,
} from 'lucide-react';
import { mapBiometricUiState, computeBiometricSetupSteps } from '../../utils/biometricStatus.js';

const STEP_STYLE = {
  completed: {
    dot: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    label: 'Completed',
    Icon: CheckCircle2,
  },
  in_progress: {
    dot: 'bg-sky-500/20 border-sky-500/50 text-sky-400',
    badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    label: 'In Progress',
    Icon: Loader2,
  },
  failed: {
    dot: 'bg-rose-500/20 border-rose-500/50 text-rose-400',
    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    label: 'Failed',
    Icon: AlertTriangle,
  },
  pending: {
    dot: 'bg-[#202020] border-[#303030] text-[#858585]',
    badge: 'bg-[#202020] text-[#858585] border-[#303030]',
    label: 'Pending',
    Icon: Clock,
  },
};

export default function BiometricAccessModal({
  isOpen,
  onClose,
  client,
  biometricSummary,
  enrollmentDetails,
  devices = [],
  selectedDeviceId,
  onSelectDevice,
  busy = false,
  error = null,
  onStartSetup,
  onRetrySetup,
  onConfirmFace,
  onRefresh,
}) {
  if (!isOpen) return null;

  const bio = biometricSummary || {};
  const uiState = mapBiometricUiState(bio);
  const steps = computeBiometricSetupSteps(bio, enrollmentDetails);
  const isWalkIn = (bio.registrationSource || client?.registrationSource) === 'ADMIN_REGISTERED';

  const enr = enrollmentDetails?.enrollment || {};
  const syncJob = enr.deviceUserSyncJobId || null;
  const assignedPin = enr.biometricUserId || bio.biometricUserId || null;
  const deviceName = enr.assignedDeviceId?.deviceName || bio.deviceName || null;
  const serialNumber = enr.assignedDeviceId?.serialNumber || bio.serialNumber || null;
  const verifiedSyncAt = syncJob?.verifiedAt || bio.lastSyncAt || null;
  const ackAt = syncJob?.acknowledgedAt || bio.lastAcknowledgedAt || null;
  const errorMessage = error || syncJob?.failureReason || enr.deviceUserSyncError || bio.failureReason || '';

  const showDevicePicker = uiState.key === 'NOT_SET_UP' && devices.length > 0;
  const showFaceInstructions =
    uiState.key === 'DEVICE_USER_READY' || uiState.key === 'FACE_ENROLLMENT_PENDING';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className="bg-[#181818] border-t sm:border border-[#303030] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-xl max-h-[92dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#252525] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#F03B2E]/15 border border-[#F03B2E]/35 flex items-center justify-center text-[#F03B2E] shrink-0">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase text-[#858585] block">
                Biometric Access Workflow
              </span>
              <h3 className="mm-page-title text-base sm:text-lg truncate">
                {client?.name || 'Member'}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${uiState.badgeClass}`}>
              {uiState.label}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-[#202020] text-[#F5F5F5] cursor-pointer disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Client Information */}
          <section className="bg-[#111111] border border-[#252525] rounded-xl p-4 space-y-2.5">
            <span className="text-[10px] font-mono uppercase text-[#858585] font-bold block">
              Client Information
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#858585] block">Client Name</span>
                <p className="text-[#F5F5F5] font-semibold mt-0.5 truncate">{client?.name || '—'}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#858585] block">Client ID</span>
                <p className="font-mono text-[#F03B2E] font-bold mt-0.5">{client?.clientId || '—'}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#858585] block">Branch</span>
                <p className="text-[#F5F5F5] mt-0.5">{bio.branchName || client?.branch?.city || client?.branch?.name || '—'}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#858585] block">Assigned Device</span>
                <p className="text-[#F5F5F5] mt-0.5">
                  {deviceName ? `${deviceName}${serialNumber ? ` (${serialNumber})` : ''}` : 'Branch Terminal'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#858585] block">Biometric PIN</span>
                <p className="font-mono font-bold text-[#F5F5F5] mt-0.5">{assignedPin || 'Auto-assigned on setup'}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#858585] block">Verified Sync</span>
                <p className="font-mono text-[#F5F5F5] mt-0.5">
                  {verifiedSyncAt ? new Date(verifiedSyncAt).toLocaleString() : 'Not verified yet'}
                </p>
              </div>
            </div>
            {ackAt && !verifiedSyncAt && (
              <p className="text-[11px] text-[#858585] pt-1 border-t border-[#1e1e1e]">
                Device command acknowledged at {new Date(ackAt).toLocaleString()} (awaiting independent device confirmation).
              </p>
            )}
          </section>

          {/* Device selector only when setting up for the first time with multiple devices */}
          {showDevicePicker && devices.length > 1 && (
            <section className="space-y-1.5">
              <label className="block text-[10px] font-mono uppercase text-[#B8B8B8]">
                Branch Biometric Device
              </label>
              <select
                disabled={busy}
                value={selectedDeviceId}
                onChange={(e) => onSelectDevice && onSelectDevice(e.target.value)}
                className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 text-[#F5F5F5]"
              >
                {devices.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.deviceName} ({d.model} • {d.serialNumber})
                  </option>
                ))}
              </select>
            </section>
          )}

          {/* 6-Step Setup Progress */}
          <section className="bg-[#111111] border border-[#252525] rounded-xl p-4 space-y-3">
            <span className="text-[10px] font-mono uppercase text-[#858585] font-bold block">
              Setup Progress
            </span>
            <div className="space-y-2.5">
              {steps.map((s) => {
                const style = STEP_STYLE[s.status] || STEP_STYLE.pending;
                const StepIcon = style.Icon;
                return (
                  <div key={s.number} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${style.dot}`}>
                        <StepIcon className={`w-3.5 h-3.5 ${s.status === 'in_progress' ? 'animate-spin' : ''}`} />
                      </div>
                      <span className="text-[#F5F5F5] truncate">
                        <strong className="font-mono text-[#858585] mr-1.5">Step {s.number}</strong>
                        {s.title}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border shrink-0 ${style.badge}`}>
                      {style.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Physical Face Enrollment Instructions */}
          {showFaceInstructions && (
            <section className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-4 space-y-2.5">
              <h4 className="font-display text-sm font-bold uppercase text-sky-600">
                {isWalkIn
                  ? 'Device User Ready — Face Enrollment Required'
                  : 'Device User Ready — Client Must Enroll Face at Branch Device'}
              </h4>
              <p className="text-[11px] text-[#F5F5F5] leading-relaxed">
                {isWalkIn
                  ? (
                    <>
                      The user account has been created on the biometric device. Face registration must still be completed physically on the device. Because the eSSL X2008 does not push a standalone face-template confirmation event, an administrator must physically inspect the device and click <strong>Confirm Physical Face Enrollment</strong> below.
                    </>
                  )
                  : 'Device user details and Biometric PIN are synced to the branch X2008. This Web-registered client must physically enroll their face at the branch device when visiting the gym. Attendance will automatically resolve to this client via their Biometric PIN mapping.'}
              </p>
              <ol className="space-y-1.5 list-decimal list-inside text-[11px] text-[#F5F5F5] leading-relaxed">
                <li>Visit the biometric machine ({deviceName || 'branch terminal'}).</li>
                <li>Enter the assigned biometric PIN: <strong className="font-mono text-[#F5F5F5]">{assignedPin || '—'}</strong>.</li>
                <li>Select the existing user and choose <strong>Edit</strong>.</li>
                <li>Confirm the displayed user details.</li>
                <li>Complete physical face enrollment.</li>
                {isWalkIn && (
                  <li>Physically verify on the device that face registration succeeded, then click <strong>Confirm Physical Face Enrollment</strong>.</li>
                )}
              </ol>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#252525] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div>
            {bio.enrollmentId && onRefresh && (
              <button
                type="button"
                disabled={busy}
                onClick={onRefresh}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#202020] hover:bg-[#303030] border border-[#303030] text-[#F5F5F5] font-bold uppercase text-[11px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
                Refresh Status
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#202020] text-[#B8B8B8] font-bold uppercase text-[11px] cursor-pointer disabled:opacity-50"
            >
              Close
            </button>
            {uiState.actionType === 'SETUP' && (
              <button
                type="button"
                disabled={busy || !selectedDeviceId}
                onClick={onStartSetup}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-[#F03B2E] hover:bg-[#FF493B] text-white font-bold uppercase text-[11px] cursor-pointer disabled:opacity-50"
              >
                {busy ? 'Setting Up...' : 'Set Up Biometric Access'}
              </button>
            )}
            {uiState.actionType === 'RETRY' && (
              <button
                type="button"
                disabled={busy}
                onClick={onRetrySetup}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold uppercase text-[11px] cursor-pointer disabled:opacity-50"
              >
                {busy ? 'Sending...' : uiState.actionLabel || 'Retry Setup'}
              </button>
            )}
            {isWalkIn &&
              ['DEVICE_USER_READY', 'FACE_ENROLLMENT_PENDING', 'AWAITING_PHYSICAL_ENROLLMENT'].includes(uiState.key) &&
              bio.enrollmentId &&
              onConfirmFace && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={onConfirmFace}
                  className="min-h-[40px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-[11px] cursor-pointer disabled:opacity-50"
                >
                  {busy ? 'Confirming...' : 'Confirm Physical Face Enrollment'}
                </button>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
