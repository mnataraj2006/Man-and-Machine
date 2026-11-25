import React, { useState } from 'react';
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import authService from '../services/auth.js';

export default function ForgotPassword({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await authService.forgotPassword(email.trim());
      setSubmittedMessage(
        res.message ||
          'If an active account exists for this email address, a password reset link has been sent.'
      );
    } catch (err) {
      setError(err.message || 'Unable to process request right now.');
    } finally {
      setSubmitting(false);
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
          <span>Back to Sign In</span>
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#181818] border border-[#303030] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {submittedMessage ? (
            <div className="space-y-5 text-center py-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h1 className="mm-page-title text-2xl">CHECK YOUR EMAIL</h1>
                <p className="text-sm text-[#B8B8B8] leading-relaxed">{submittedMessage}</p>
                <p className="text-xs text-[#858585] pt-1">
                  Reset links expire in 30 minutes. If email is not configured on this server, ask an HQ Administrator for a manual reset link.
                </p>
              </div>
              <button
                type="button"
                onClick={goToLogin}
                className="mm-btn-primary w-full rounded-xl"
              >
                <span>Return to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-2 border-b border-[#252525] pb-4">
                <span className="font-label text-[#EB3E2E]">ACCOUNT RECOVERY</span>
                <h1 className="mm-page-title text-2xl sm:text-3xl">FORGOT PASSWORD</h1>
                <p className="text-xs text-[#B8B8B8]">
                  Enter your registered email address to receive a single-use password reset link.
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-[#111111] border border-[#EB3E2E] text-xs text-[#F5F5F5] flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-[#EB3E2E] shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="recovery-email" className="block text-xs font-bold uppercase tracking-wider text-[#F5F5F5]">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#858585] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="recovery-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className="mm-input pl-10"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mm-btn-primary w-full rounded-xl min-h-[48px]"
                >
                  <span>{submitting ? 'SENDING...' : 'SEND RESET LINK'}</span>
                  {!submitting && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
