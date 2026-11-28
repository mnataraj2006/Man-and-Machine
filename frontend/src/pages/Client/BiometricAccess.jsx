import React, { useState, useEffect, useCallback } from 'react';
import {
  Fingerprint,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  X,
} from 'lucide-react';
import clientService from '../../services/clientService.js';

export default function ClientBiometricAccess({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const [step, setStep] = useState('status'); // 'status' | 'request'
  const [consentChecked, setConsentChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await clientService.getBiometricStatus();
      setData(res);
    } catch (err) {
      setError(err.message || 'Unable to load biometric access status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!isConsentGranted && !consentChecked) {
      setFeedback({
        type: 'error',
        message: 'Please accept the biometric attendance authorization notice before submitting.',
      });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      await clientService.submitBiometricCapture({
        agreed: consentChecked || isConsentGranted,
      });
      setFeedback({
        type: 'success',
        message:
          'Biometric enrollment request submitted! An admin will review, assign your Biometric ID, and prepare your branch terminal.',
      });
      setStep('status');
      await loadStatus();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Submission failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawConsent = async () => {
    try {
      await clientService.withdrawBiometricConsent();
      setFeedback({
        type: 'success',
        message: 'Biometric consent withdrawn. You may continue using manual reception check-in.',
      });
      await loadStatus();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  if (loading) {
    return (
      <div className="bg-[#181818] border border-[#303030] rounded-2xl p-8 text-center text-xs text-[#B8B8B8]">
        Loading biometric access profile...
      </div>
    );
  }

  const enr = data?.enrollment || {};
  const status = enr.status || 'NOT_STARTED';
  const isConsentGranted = data?.consent?.status === 'GRANTED' || enr.consentStatus === 'GRANTED';

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h2 className="mm-page-title text-2xl sm:text-3xl">MY BIOMETRIC ACCESS</h2>
        <p className="text-xs sm:text-sm text-[#B8B8B8] mt-1">
          Request face recognition check-in access and track your branch biometric terminal registration.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#F03B2E]/10 border border-[#F03B2E]/40 text-xs text-[#FF493B] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400'
              : 'bg-[#F03B2E]/10 border-[#F03B2E]/40 text-[#FF6A5E]'
          }`}
        >
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Eligibility gate */}
      {!data?.eligible ? (
        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 text-amber-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h3 className="font-display text-base font-bold uppercase">Active Membership Required</h3>
          </div>
          <p className="text-xs text-[#B8B8B8] leading-relaxed">
            Biometric face registration becomes available automatically once your first gym membership is purchased and activated.
          </p>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/client/membership')}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#F03B2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            View Membership Plans
          </button>
        </div>
      ) : (
        <>
          {/* STATUS SUMMARY CARD */}
          {step === 'status' && (
            <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#F03B2E]/15 border border-[#F03B2E]/35 flex items-center justify-center text-[#F03B2E] shrink-0">
                    <Fingerprint className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#858585] block">
                      Client ID: <strong className="text-[#F03B2E]">{data.clientId || '—'}</strong>
                    </span>
                    <h3 className="font-display text-lg font-bold uppercase text-[#F5F5F5]">
                      Status: {status.replace(/_/g, ' ')}
                    </h3>
                  </div>
                </div>

                {['NOT_STARTED', 'INVITED', 'CAPTURE_IN_PROGRESS', 'REJECTED', 'FAILED', 'REVOKED'].includes(status) ? (
                  <button
                    type="button"
                    onClick={() => {
                      setConsentChecked(isConsentGranted);
                      setStep('request');
                    }}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#F03B2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    {status === 'REJECTED' || status === 'FAILED'
                      ? 'Resubmit Enrollment Request'
                      : 'Request Biometric Enrollment'}
                  </button>
                ) : null}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#111111] border border-[#252525]">
                  <span className="text-[10px] font-mono uppercase text-[#858585] block">Face Registration</span>
                  <span className="font-bold text-[#F5F5F5] mt-0.5 block">{enr.faceEnrollmentStatus || 'NOT_ENROLLED'}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#111111] border border-[#252525]">
                  <span className="text-[10px] font-mono uppercase text-[#858585] block">Fingerprint</span>
                  <span className="font-bold text-[#F5F5F5] mt-0.5 block">{enr.fingerprintEnrollmentStatus || 'NOT_ENROLLED'}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#111111] border border-[#252525]">
                  <span className="text-[10px] font-mono uppercase text-[#858585] block">Assigned Branch</span>
                  <span className="font-bold text-[#F5F5F5] mt-0.5 block">{data.branch?.city || data.branch?.name || '—'}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#111111] border border-[#252525]">
                  <span className="text-[10px] font-mono uppercase text-[#858585] block">Assigned Device</span>
                  <span className="font-bold text-[#F5F5F5] mt-0.5 block">
                    {data.assignedDevice ? `${data.assignedDevice.model} (${data.assignedDevice.deviceName})` : 'Branch Terminal'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#111111] border border-[#252525]">
                  <span className="text-[10px] font-mono uppercase text-[#858585] block">Enrollment Date</span>
                  <span className="font-mono text-[#F5F5F5] mt-0.5 block">
                    {enr.enrolledAt ? new Date(enr.enrolledAt).toLocaleDateString('en-IN') : 'Pending'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#111111] border border-[#252525]">
                  <span className="text-[10px] font-mono uppercase text-[#858585] block">Last Check-in</span>
                  <span className="font-mono text-[#F5F5F5] mt-0.5 block">
                    {data.lastSuccessfulCheckIn
                      ? new Date(data.lastSuccessfulCheckIn).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                      : 'No check-ins yet'}
                  </span>
                </div>
              </div>

              {status === 'NOT_STARTED' || status === 'INVITED' ? (
                <div className="p-3.5 rounded-xl bg-[#111111] border border-[#252525] text-xs text-[#B8B8B8]">
                  <strong>Not Enrolled Yet:</strong> Click <em>Request Biometric Enrollment</em> to submit your request with authorization. Once approved by an admin, you will receive your Biometric ID to enroll your face physically at the branch terminal.
                </div>
              ) : status === 'CAPTURE_SUBMITTED' || status === 'PENDING_REVIEW' ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400">
                  Your enrollment request has been saved and is <strong>Awaiting Admin Approval</strong>. Once approved, you will complete physical face capture at your branch terminal.
                </div>
              ) : ['DEVICE_USER_READY', 'FACE_ENROLLMENT_PENDING', 'AWAITING_PHYSICAL_ENROLLMENT', 'APPROVED'].includes(status) ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 space-y-1.5">
                  <p className="font-bold">Your biometric enrollment request has been approved.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div>Your Biometric ID: <strong className="font-mono text-[#F5F5F5]">{enr.biometricUserId || 'Assigned at branch'}</strong></div>
                    <div>Branch: <strong className="text-[#F5F5F5]">{data.branch?.city || data.branch?.name || '—'}</strong></div>
                    <div>Device: <strong className="text-[#F5F5F5]">{data.assignedDevice?.deviceName || 'Branch Terminal'}</strong></div>
                  </div>
                  <p className="pt-1">Please visit the branch biometric machine and enroll your face under your assigned Biometric ID.</p>
                </div>
              ) : status === 'ENROLLED' ? (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400">
                  <strong>Your Biometric Registration Is Complete!</strong> Look at the {data.assignedDevice?.deviceName || 'branch terminal'} at the entrance to check in automatically.
                </div>
              ) : status === 'REJECTED' || status === 'FAILED' ? (
                <div className="p-3.5 rounded-xl bg-[#F03B2E]/10 border border-[#F03B2E]/40 text-xs text-[#FF6A5E]">
                  <strong>Needs Attention ({status}):</strong> {enr.failureReason || 'Please resubmit your enrollment request or visit branch reception.'}
                </div>
              ) : status === 'REVOKED' ? (
                <div className="p-3.5 rounded-xl bg-[#202020] border border-[#303030] text-xs text-[#B8B8B8]">
                  <strong>Biometric Consent Withdrawn (Revoked):</strong> Your biometric access is disabled. You can re-enroll anytime or continue checking in with your Client ID at reception.
                </div>
              ) : null}

              <div className="pt-3 border-t border-[#252525] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#858585]">
                <span>Alternative check-in: Provide your Client ID ({data.clientId}) or phone number at reception anytime.</span>
                {data.consent?.status === 'GRANTED' && status !== 'REVOKED' && (
                  <button
                    type="button"
                    onClick={handleWithdrawConsent}
                    className="text-[#FF493B] hover:underline font-semibold cursor-pointer text-left sm:text-right"
                  >
                    Withdraw Biometric Consent
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: ENROLLMENT REQUEST & AUTHORIZATION */}
          {step === 'request' && (
            <form onSubmit={handleSubmitRequest} className="bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold uppercase text-[#F5F5F5]">
                  Submit Biometric Enrollment Request
                </h3>
                <button
                  type="button"
                  onClick={() => setStep('status')}
                  className="text-xs text-[#858585] hover:text-[#F5F5F5] cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="p-4 rounded-xl bg-[#111111] border border-[#252525] text-xs text-[#B8B8B8] space-y-2 leading-relaxed">
                <div className="flex items-center gap-2 text-[#F5F5F5] font-semibold">
                  <ShieldCheck className="w-4 h-4 text-[#F03B2E]" />
                  <span>Biometric Attendance &amp; Facial Data Notice</span>
                </div>
                <p>
                  Submitting this request authorizes Man &amp; Machine to verify your identity, assign a branch biometric terminal ID, and process facial attendance check-ins at your branch while your membership is active.
                </p>
                <p className="text-[#858585]">
                  Physical face enrollment is completed directly on the branch eSSL X2008 terminal after admin approval. You may withdraw authorization anytime from this page.
                </p>
              </div>

              {!isConsentGranted && (
                <label className="flex items-start gap-2.5 text-xs text-[#CCCCCC] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="mt-0.5 accent-[#F03B2E]"
                  />
                  <span>
                    I authorize biometric attendance registration and branch terminal face enrollment for my account.
                  </span>
                </label>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('status')}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-[#303030] text-xs text-[#B8B8B8] hover:text-[#F5F5F5] cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting || (!isConsentGranted && !consentChecked)}
                  className="min-h-[44px] flex-1 py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'Submitting...' : 'Submit Enrollment Request'}</span>
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
