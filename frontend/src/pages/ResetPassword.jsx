import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import authService from '../services/auth.js';

export default function ResetPassword({ token, onNavigate }) {
  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState(null);
  const [accountInfo, setAccountInfo] = useState(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const validate = async () => {
      try {
        setVerifying(true);
        const res = await authService.verifyResetToken(token);
        if (isMounted) setAccountInfo(res.account);
      } catch (err) {
        if (isMounted) setVerifyError(err.message || 'Invalid or expired reset link.');
      } finally {
        if (isMounted) setVerifying(false);
      }
    };

    if (token) validate();
    else {
      setVerifyError('Missing password reset token.');
      setVerifying(false);
    }
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!password || password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setSubmitError('Password must be at least 8 characters and include a letter and number.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      await authService.resetPassword(token, { password, confirmPassword });
      setResetDone(true);
      setTimeout(() => {
        if (onNavigate) onNavigate('/login?reset=1');
        else window.location.href = '/login?reset=1';
      }, 1200);
    } catch (err) {
      setSubmitError(err.message || 'Password reset failed. Request a new link.');
    } finally {
      setIsSubmitting(false);
    }
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
          onClick={(e) => {
            e.preventDefault();
            onNavigate ? onNavigate('/login') : (window.location.href = '/login');
          }}
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
                Validating password reset link...
              </p>
            </div>
          ) : verifyError ? (
            <div className="space-y-5 text-center py-4">
              <div className="w-12 h-12 rounded-xl bg-[#EB3E2E]/15 border border-[#EB3E2E]/40 flex items-center justify-center text-[#EB3E2E] mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h1 className="mm-page-title text-2xl">RESET LINK INVALID</h1>
                <p className="text-sm text-[#B8B8B8]">{verifyError}</p>
              </div>
              <button
                type="button"
                onClick={() => (onNavigate ? onNavigate('/forgot-password') : (window.location.href = '/forgot-password'))}
                className="mm-btn-primary w-full rounded-xl"
              >
                <span>Request New Link</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : resetDone ? (
            <div className="space-y-4 text-center py-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h1 className="mm-page-title text-2xl">PASSWORD UPDATED</h1>
              <p className="text-sm text-[#B8B8B8]">
                Previous sessions invalidated. Redirecting to sign in...
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2 border-b border-[#252525] pb-4">
                <span className="font-label text-[#EB3E2E]">SECURE PASSWORD RESET</span>
                <h1 className="mm-page-title text-2xl sm:text-3xl">CREATE NEW PASSWORD</h1>
                <p className="text-xs text-[#B8B8B8]">
                  Updating password for <strong className="text-[#F5F5F5]">{accountInfo?.email}</strong>.
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
                  <label htmlFor="reset-password" className="block text-xs font-bold uppercase tracking-wider text-[#F5F5F5]">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#858585] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="reset-password"
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
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="reset-confirm" className="block text-xs font-bold uppercase tracking-wider text-[#F5F5F5]">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#858585] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="reset-confirm"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="mm-input pl-10"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mm-btn-primary w-full rounded-xl min-h-[48px]"
                >
                  <span>{isSubmitting ? 'UPDATING...' : 'RESET PASSWORD'}</span>
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
