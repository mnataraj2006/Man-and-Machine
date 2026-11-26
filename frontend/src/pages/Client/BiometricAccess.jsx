import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Fingerprint,
  Camera,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Clock,
  Building2,
  Cpu,
  RotateCcw,
  X,
} from 'lucide-react';
import clientService from '../../services/clientService.js';

const analyzeFrame = (videoEl) => {
  const canvas = document.createElement('canvas');
  const w = 160;
  const h = 120;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h).data;

  // Brightness & grayscale buffer
  let sumLum = 0;
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    const lum = 0.299 * img[idx] + 0.587 * img[idx + 1] + 0.114 * img[idx + 2];
    gray[i] = lum;
    sumLum += lum;
  }
  const brightnessScore = Math.round((sumLum / (w * h) / 255) * 100);

  // Sharpness via simple Laplacian variance on center region
  let lapSum = 0;
  let lapCount = 0;
  for (let y = 15; y < h - 15; y++) {
    for (let x = 25; x < w - 25; x++) {
      const c = gray[y * w + x];
      const lap = Math.abs(
        4 * c - gray[(y - 1) * w + x] - gray[(y + 1) * w + x] - gray[y * w + (x - 1)] - gray[y * w + (x + 1)]
      );
      lapSum += lap;
      lapCount++;
    }
  }
  const sharpnessScore = Math.round((lapSum / Math.max(1, lapCount)) * 2);

  return {
    brightnessScore,
    sharpnessScore,
    gray,
    previewUrl: canvas.toDataURL('image/jpeg', 0.8),
  };
};

const computeMotionDelta = (g1, g2) => {
  let diff = 0;
  for (let i = 0; i < g1.length; i++) {
    diff += Math.abs(g1[i] - g2[i]);
  }
  return diff / g1.length;
};

export default function BiometricAccess({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Consent & Capture Flow
  const [step, setStep] = useState('status'); // 'status' | 'consent' | 'camera'
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentBusy, setConsentBusy] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraError, setCameraError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [captureMetrics, setCaptureMetrics] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await clientService.getBiometricStatus();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load biometric access status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [loadStatus]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    setCapturedPreview(null);
    setCaptureMetrics(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Your browser does not support camera access. Please use a modern mobile browser or enroll at reception.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow front-camera access in browser settings or visit reception.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No front camera detected on this device. Please enroll directly at your branch reception.');
      } else {
        setCameraError(err.message || 'Unable to access front camera.');
      }
    }
  };

  const handleAcceptConsent = async () => {
    if (!consentChecked) return;
    setConsentBusy(true);
    try {
      await clientService.recordBiometricConsent(true);
      setStep('camera');
      setTimeout(() => startCamera(), 150);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setConsentBusy(false);
    }
  };

  const handleCaptureFrames = async () => {
    if (!videoRef.current || !cameraReady) return;
    setCapturing(true);
    setCameraError(null);
    try {
      const f1 = analyzeFrame(videoRef.current);
      await new Promise((r) => setTimeout(r, 350));
      const f2 = analyzeFrame(videoRef.current);
      await new Promise((r) => setTimeout(r, 350));
      const f3 = analyzeFrame(videoRef.current);

      const avgBrightness = Math.round((f1.brightnessScore + f2.brightnessScore + f3.brightnessScore) / 3);
      const avgSharpness = Math.round((f1.sharpnessScore + f2.sharpnessScore + f3.sharpnessScore) / 3);
      const motion12 = computeMotionDelta(f1.gray, f2.gray);
      const motion23 = computeMotionDelta(f2.gray, f3.gray);
      const livenessPassed = motion12 > 0.35 || motion23 > 0.35;

      if (avgBrightness < 35) {
        setCameraError('Lighting is too dim. Please move to a well-lit area and retake.');
        setCapturing(false);
        return;
      }
      if (avgSharpness < 10) {
        setCameraError('Capture is too blurry. Hold your phone steady and retake.');
        setCapturing(false);
        return;
      }
      if (!livenessPassed) {
        setCameraError('Liveness check failed (static frame detected). Slightly blink or move your head while capturing.');
        setCapturing(false);
        return;
      }

      setCapturedPreview(f3.previewUrl);
      setCaptureMetrics({
        brightnessScore: avgBrightness,
        sharpnessScore: avgSharpness,
        livenessPassed: true,
        frameCount: 3,
      });
      stopCamera();
    } catch (err) {
      setCameraError('Failed to analyze camera frames. Please retake.');
    } finally {
      setCapturing(false);
    }
  };

  const handleSubmitCapture = async () => {
    if (!captureMetrics) return;
    setSubmitting(true);
    try {
      await clientService.submitBiometricCapture(captureMetrics);
      setFeedback({
        type: 'success',
        message: 'Pre-enrollment face capture submitted! Admin will review and complete physical X2008 terminal linking.',
      });
      setStep('status');
      await loadStatus();
    } catch (err) {
      setCameraError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawConsent = async () => {
    try {
      await clientService.withdrawBiometricConsent();
      setFeedback({ type: 'success', message: 'Biometric consent withdrawn. You may continue using manual reception check-in.' });
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

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h2 className="mm-page-title text-2xl sm:text-3xl">MY BIOMETRIC ACCESS</h2>
        <p className="text-xs sm:text-sm text-[#B8B8B8] mt-1">
          Manage your face registration, consent, and branch terminal check-in access.
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
              ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-200'
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

                {['NOT_STARTED', 'INVITED', 'REJECTED', 'FAILED', 'REVOKED'].includes(status) && (
                  <button
                    type="button"
                    onClick={() => {
                      setConsentChecked(false);
                      setStep('consent');
                    }}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#F03B2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    {status === 'REJECTED' || status === 'FAILED' ? 'Retry Face Registration' : 'Start Face Registration'}
                  </button>
                )}
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

              {status === 'CAPTURE_SUBMITTED' || status === 'PENDING_REVIEW' ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                  Your mobile pre-enrollment capture has been submitted and is <strong>Awaiting Admin Review</strong>.
                </div>
              ) : status === 'AWAITING_PHYSICAL_ENROLLMENT' || status === 'APPROVED' ? (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200">
                  Approved! Visit your assigned branch ({data.branch?.city}) reception desk to complete your scan on the physical eSSL X2008 terminal (Biometric ID: <strong className="font-mono">{enr.biometricUserId || 'Assigned at desk'}</strong>).
                </div>
              ) : status === 'ENROLLED' ? (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200">
                  <strong>Your Biometric Registration Is Complete!</strong> Simply look at the {data.assignedDevice?.deviceName || 'branch terminal'} at the entrance to check in automatically.
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

          {/* STEP 1: EXPLICIT CONSENT */}
          {step === 'consent' && (
            <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 text-[#F03B2E]">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-display text-lg font-bold uppercase text-[#F5F5F5]">Biometric Data Consent</h3>
              </div>

              <div className="space-y-2.5 text-xs text-[#B8B8B8] leading-relaxed bg-[#111111] border border-[#252525] rounded-xl p-4">
                <p><strong className="text-[#F5F5F5]">Why we capture your face:</strong> To verify your identity for pre-enrollment and enable fast, contactless check-in at your branch entrance.</p>
                <p><strong className="text-[#F5F5F5]">How enrollment works:</strong> Your smartphone camera performs a live quality &amp; liveness pre-check. After Admin approval, your biometric profile is linked to the branch eSSL X2008 terminal.</p>
                <p><strong className="text-[#F5F5F5]">What is stored:</strong> Only consent records, capture quality metrics, and your mapped terminal user ID are stored on Man &amp; Machine servers. No raw mobile photos are stored unnecessarily.</p>
                <p><strong className="text-[#F5F5F5]">Retention &amp; Withdrawal:</strong> Records are retained while your membership is active. You may withdraw consent and request deletion at any time from this page or reception.</p>
                <p><strong className="text-[#F5F5F5]">Alternative Check-in:</strong> Biometric enrollment is optional; you can always check in at reception using your Client ID ({data.clientId}).</p>
              </div>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-[#111111] border border-[#303030] text-xs text-[#F5F5F5] cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-0.5"
                />
                <span>I have read and explicitly consent to biometric pre-enrollment and branch terminal verification.</span>
              </label>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStep('status')}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#202020] text-[#B8B8B8] text-xs font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!consentChecked || consentBusy}
                  onClick={handleAcceptConsent}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#F03B2E] hover:bg-[#FF493B] disabled:opacity-40 text-white text-xs font-bold uppercase cursor-pointer"
                >
                  {consentBusy ? 'Saving Consent...' : 'Agree & Open Camera'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: MOBILE FRONT-CAMERA CAPTURE */}
          {step === 'camera' && (
            <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold uppercase text-[#F5F5F5]">Live Face Capture</h3>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setStep('status');
                  }}
                  className="text-xs text-[#B8B8B8] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-[#B8B8B8]">
                <li>• Find a well-lit location</li>
                <li>• Keep your face inside the alignment oval</li>
                <li>• Remove sunglasses/masks where practical</li>
                <li>• Blink or slightly nod during capture (liveness check)</li>
              </ul>

              {cameraError && (
                <div className="p-3 rounded-xl bg-[#F03B2E]/10 border border-[#F03B2E] text-xs text-[#FF6A5E]">
                  {cameraError}
                </div>
              )}

              <div className="relative mx-auto max-w-sm aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-[#303030] flex items-center justify-center">
                {capturedPreview ? (
                  <img src={capturedPreview} alt="Captured preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <video ref={videoRef} playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-44 h-56 rounded-full border-2 border-dashed border-[#F03B2E]/80" />
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                {!capturedPreview ? (
                  <button
                    type="button"
                    disabled={!cameraReady || capturing}
                    onClick={handleCaptureFrames}
                    className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#F03B2E] hover:bg-[#FF493B] disabled:opacity-40 text-white text-xs font-bold uppercase inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{capturing ? 'Checking Liveness...' : 'Capture Live Face'}</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#202020] border border-[#303030] text-[#F5F5F5] text-xs font-bold uppercase inline-flex items-center gap-2 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Retake</span>
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleSubmitCapture}
                      className="min-h-[44px] px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase inline-flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{submitting ? 'Submitting...' : 'Submit Pre-Enrollment'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
