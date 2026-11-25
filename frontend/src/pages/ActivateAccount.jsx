import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import authService from '../services/auth.js';

export default function ActivateAccount({ token, onNavigate }) {
  const [verifying, setVerifying] = useState(true);
  const [accountInfo, setAccountInfo] = useState(null);
  const [verifyError, setVerifyError] = useState(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activatedSuccess, setActivatedSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkToken = async () => {
      try {
        setVerifying(true);
        setVerifyError(null);
        const res = await authService.verifyActivationToken(token);
        if (isMounted) {
          setAccountInfo(res.account);
        }
      } catch (err) {
        if (isMounted) {
          setVerifyError(err.message || 'This activation link is invalid or expired.');
        }
      } finally {
        if (isMounted) setVerifying(false);
      }
    };

    if (token) {
      checkToken();
    } else {
      setVerifyError('Missing activation token.');
      setVerifying(false);
    }

    return () => {
      isMounted = false;
    };
  }, [token]);

  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: 'bg-transparent' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak (use 8+ chars with letters & numbers)', color: 'bg-[#EB3E2E]' };
    if (score === 2) return { score: 2, label: 'Fair (min 8 chars with letter & number)', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
    return { score: 4, label: 'Maximum Security', color: 'bg-emerald-400' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!password || password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setSubmitError('Password must be at least 8 characters and include both a letter and a number.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      await authService.activateAccount(token, { password, confirmPassword });
      setActivatedSuccess(true);
      setTimeout(() => {
        if (onNavigate) {
          onNavigate('/login?activated=1');
        } else {
          window.location.href = '/login?activated=1';
        }
      }, 1200);
    } catch (err) {
      setSubmitError(err.message || 'Activation failed. Please request a fresh invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToLogin = (e) => {
    if (e) e.preventDefault();
    if (onNavigate) onNavigate('/login');
    else window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-[#090909] text-[#F5F5F5] flex flex-col justify-between selection:bg-[#EB3E2E] selection:text-white">
      <header className="h-16 px-6 sm:px-10 border-b border-[#252525] bg-[#111111] flex items-center justify-between">
        <a href="/" onClick={(e) => { e.preventDefault(); onNavigate ? onNavigate('/') : (window.location.href = '/'); }} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-white p-1 border border-[#303030] flex items-center justify-center">
            <img src="/logo.jpg" alt="Man & Machine" className="w-full h-full object-contain" />
          </div>
          <span className="font-display font-bold text-sm uppercase tracking-tight text-[#F5F5F5]">
            MAN &amp; MACHINE
          </span>
        </a>

        <a
          href="/login"
          onClick={goToLogin}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#B8B8B8] hover:text-[#EB3E2E] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Sign In</span>
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#181818] border border-[#303030] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {verifying ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-8 h-8 border-2 border-[#EB3E2E] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs uppercase font-mono tracking-wider text-[#B8B8B8]">
                Verifying single-use invitation link...
              </p>
            </div>
          ) : verifyError ? (
            <div className="space-y-5 text-center py-4">
              <div className="w-12 h-12 rounded-xl bg-[#EB3E2E]/15 border border-[#EB3E2E]/40 flex items-center justify-center text-[#EB3E2E] mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h1 className="mm-page-title text-2xl">INVITATION LINK INVALID</h1>
                <p className="text-sm text-[#B8B8B8] leading-relaxed">{verifyError}</p>
              </div>
              <button
                type="button"
                onClick={goToLogin}
                className="mm-btn-primary w-full rounded-xl"
              >
                <span>Go to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : activatedSuccess ? (
            <div className="space-y-4 text-center py-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h1 className="mm-page-title text-2xl">ACCOUNT ACTIVATED</h1>
              <p className="text-sm text-[#B8B8B8]">
                Your password has been saved securely. Redirecting to login...
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2 border-b border-[#252525] pb-5">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#EB3E2E]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  COACH ACCOUNT ACTIVATION
                </span>
                <h1 className="mm-page-title text-2xl sm:text-3xl">SET YOUR PASSWORD</h1>
                <p className="text-xs text-[#B8B8B8]">
                  Welcome, <strong className="text-[#F5F5F5]">{accountInfo?.name}</strong> ({accountInfo?.email})
                  {accountInfo?.branch?.city ? ` • ${accountInfo.branch.city} Branch` : ''}.
                </p>
              </div>

              {submitError && (
                <div className="p-3.5 rounded-xl bg-[#111111] border border-[#EB3E2E] text-xs text-[#F5F5F5] flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-[#EB3E2E] shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="new-password" className="block text-xs font-bold uppercase tracking-wider text-[#F5F5F5]">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#858585] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 chars (letters & numbers)"
                      className="mm-input pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#858585] hover:text-[#F5F5F5] cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {password && (
                    <div className="space-y-1 pt-1">
                      <div className="grid grid-cols-4 gap-1">
                        {[1, 2, 3, 4].map((lvl) => (
                          <div
                            key={lvl}
                            className={`h-1 rounded-full ${
                              strength.score >= lvl ? strength.color : 'bg-[#252525]'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-[#B8B8B8] block">{strength.label}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirm-password" className="block text-xs font-bold uppercase tracking-wider text-[#F5F5F5]">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#858585] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="mm-input pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#858585] hover:text-[#F5F5F5] cursor-pointer"
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mm-btn-primary w-full rounded-xl min-h-[48px] mt-2"
                >
                  <span>{isSubmitting ? 'ACTIVATING ACCOUNT...' : 'ACTIVATE ACCOUNT'}</span>
                  {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
