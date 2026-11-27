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
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';
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
  const landmarkerRef = useRef(null);
  const [cameraError, setCameraError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [challengeType, setChallengeType] = useState('BLINK'); // 'BLINK' | 'TURN_HEAD'
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
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
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

  const initFaceLandmarker = async () => {
    if (landmarkerRef.current) {
      setModelReady(true);
      return landmarkerRef.current;
    }
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    );
    const landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU',
      },
      outputFaceBlendshapes: true,
      runningMode: 'VIDEO',
      numFaces: 2,
    });
    landmarkerRef.current = landmarker;
    setModelReady(true);
    return landmarker;
  };

  const startCamera = async () => {
    setCameraError(null);
    setCapturedPreview(null);
    setCaptureMetrics(null);
    setChallengeType(Math.random() > 0.5 ? 'BLINK' : 'TURN_HEAD');
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
      initFaceLandmarker().catch((err) => {
        console.warn('MediaPipe FaceLandmarker init error:', err);
        setCameraError('Face detection model could not initialize on this browser. Please visit branch reception for manual enrollment.');
      });
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
      const currentStatus = data?.enrollment?.status || 'NOT_STARTED';
      const needsCamera = ['NOT_STARTED', 'INVITED', 'CAPTURE_IN_PROGRESS', 'REJECTED', 'FAILED', 'REVOKED'].includes(currentStatus);
      if (needsCamera) {
        setStep('camera');
        setTimeout(() => startCamera(), 150);
      } else {
        setFeedback({ type: 'success', message: 'Biometric consent granted. Your branch terminal access is now active.' });
        setStep('status');
        await loadStatus();
      }
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
      const landmarker = await initFaceLandmarker();
      const samples = [];

      for (let i = 0; i < 6; i++) {
        const frameQuality = analyzeFrame(videoRef.current);
        const lmRes = landmarker.detectForVideo(videoRef.current, performance.now());

        if (!lmRes.faceLandmarks || lmRes.faceLandmarks.length === 0) {
          setCameraError('No face detected. Keep your face inside the alignment oval and ensure good lighting.');
          setCapturing(false);
          return;
        }
        if (lmRes.faceLandmarks.length > 1) {
          setCameraError('Multiple faces detected. Ensure only you are visible in the camera frame.');
          setCapturing(false);
          return;
        }

        const landmarks = lmRes.faceLandmarks[0];
        const nose = landmarks[1];
        const leftCheek = landmarks[234];
        const rightCheek = landmarks[454];
        const faceWidth = Math.abs((rightCheek?.x || 0) - (leftCheek?.x || 0));

        if (faceWidth < 0.16) {
          setCameraError('Move slightly closer to the camera so your face fills the alignment oval.');
          setCapturing(false);
          return;
        }
        if (nose && (nose.x < 0.25 || nose.x > 0.75 || nose.y < 0.22 || nose.y > 0.78)) {
          setCameraError('Center your face inside the alignment oval.');
          setCapturing(false);
          return;
        }

        const blend = lmRes.faceBlendshapes?.[0]?.categories || [];
        const blinkLeft = blend.find((c) => c.categoryName === 'eyeBlinkLeft')?.score || 0;
        const blinkRight = blend.find((c) => c.categoryName === 'eyeBlinkRight')?.score || 0;

        samples.push({
          ...frameQuality,
          noseX: nose?.x || 0.5,
          blinkScore: Math.max(blinkLeft, blinkRight),
        });

        if (i < 5) await new Promise((r) => setTimeout(r, 280));
      }

      const avgBrightness = Math.round(samples.reduce((s, x) => s + x.brightnessScore, 0) / samples.length);
      const avgSharpness = Math.round(samples.reduce((s, x) => s + x.sharpnessScore, 0) / samples.length);

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

      const maxBlink = Math.max(...samples.map((s) => s.blinkScore));
      const noseXs = samples.map((s) => s.noseX);
      const headTurnDelta = Math.max(...noseXs) - Math.min(...noseXs);

      const challengePassed =
        challengeType === 'BLINK' ? maxBlink >= 0.32 : headTurnDelta >= 0.04;

      if (!challengePassed) {
        setCameraError(
          challengeType === 'BLINK'
            ? 'Blink challenge not detected. Please blink naturally while capturing.'
            : 'Head-turn challenge not detected. Gently turn your head slightly left/right while capturing.'
        );
        setCapturing(false);
        return;
      }

      setCapturedPreview(samples[samples.length - 1].previewUrl);
      setCaptureMetrics({
        brightnessScore: avgBrightness,
        sharpnessScore: avgSharpness,
        livenessPassed: true,
        frameCount: samples.length,
      });
      stopCamera();
    } catch (err) {
      setCameraError(err.message || 'Face analysis failed. Please retake or enroll at reception.');
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
  const isConsentGranted = data?.consent?.status === 'GRANTED' || enr.consentStatus === 'GRANTED';
  const requiresCameraAfterConsent = ['NOT_STARTED', 'INVITED', 'CAPTURE_IN_PROGRESS', 'REJECTED', 'FAILED', 'REVOKED'].includes(status);

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

                {['NOT_STARTED', 'INVITED', 'REJECTED', 'FAILED', 'REVOKED'].includes(status) ? (
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
                ) : !isConsentGranted ? (
                  <button
                    type="button"
                    onClick={() => {
                      setConsentChecked(false);
                      setStep('consent');
                    }}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#F03B2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Grant Biometric Consent
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
                  <strong>Not Enrolled Yet:</strong> Click <em>Start Face Registration</em> to review biometric consent and complete a quick browser liveness pre-check before your physical X2008 terminal scan.
                </div>
              ) : status === 'CAPTURE_IN_PROGRESS' ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                  Consent granted. Please complete your browser liveness pre-check to submit your enrollment request.
                </div>
              ) : status === 'CAPTURE_SUBMITTED' || status === 'PENDING_REVIEW' ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                  Your enrollment request has been saved and is <strong>Awaiting Admin Approval</strong>. Note: Browser camera liveness does not register your face on the X2008; physical capture at reception completes registration.
                </div>
              ) : status === 'AWAITING_PHYSICAL_ENROLLMENT' || status === 'APPROVED' ? (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200">
                  Approved! Visit your assigned branch ({data.branch?.city}) reception desk to complete your face capture on the physical eSSL X2008 terminal (Assigned Biometric ID: <strong className="font-mono">{enr.biometricUserId || 'Assigned at desk'}</strong>).
                </div>
              ) : status === 'ENROLLED' && !isConsentGranted ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                  <strong>Biometric Consent Required:</strong> Your branch terminal profile is linked, but biometric check-ins are paused until you click <strong>Grant Biometric Consent</strong> above.
                </div>
              ) : status === 'ENROLLED' ? (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200">
                  <strong>Your Biometric Registration Is Complete!</strong> Look at the {data.assignedDevice?.deviceName || 'branch terminal'} at the entrance to check in automatically.
                </div>
              ) : status === 'REJECTED' || status === 'FAILED' ? (
                <div className="p-3.5 rounded-xl bg-[#F03B2E]/10 border border-[#F03B2E]/40 text-xs text-[#FF6A5E]">
                  <strong>Needs Attention ({status}):</strong> {enr.failureReason || 'Please retry pre-enrollment or visit branch reception for physical enrollment.'}
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
                  {consentBusy ? 'Saving Consent...' : requiresCameraAfterConsent ? 'Agree & Open Camera' : 'Grant Biometric Consent'}
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

              <div className="p-3 rounded-xl bg-[#111111] border border-[#252525] text-xs text-[#F5F5F5]">
                <span className="text-[10px] font-mono uppercase text-[#F03B2E] font-bold block">
                  Challenge Prompt (Basic Landmark Verification)
                </span>
                <p className="mt-0.5 font-semibold">
                  {challengeType === 'BLINK'
                    ? 'Look at the camera and BLINK naturally during capture.'
                    : 'Look at the camera and gently TURN YOUR HEAD slightly left or right during capture.'}
                </p>
                {!modelReady && cameraReady && (
                  <p className="text-[11px] text-amber-400 mt-1">Initializing MediaPipe face landmark model...</p>
                )}
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-[#B8B8B8]">
                <li>• Find a well-lit location</li>
                <li>• Keep only your face inside the alignment oval</li>
                <li>• Remove sunglasses/masks where practical</li>
                <li>• Admin review &amp; branch terminal scan complete registration</li>
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
