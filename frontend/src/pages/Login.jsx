import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ArrowLeft, ArrowRight, Lock, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import authService from '../services/auth.js';

export default function Login({ onNavigate, onOpenRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverNotice, setServerNotice] = useState(null);
  const [statusBanner, setStatusBanner] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('activated') === '1') {
      setStatusBanner('Your trainer account is now active. Sign in using your new password.');
    } else if (params.get('reset') === '1') {
      setStatusBanner('Password updated successfully. Sign in with your new password.');
    }
  }, []);

  const heroImageSrc = '/images/hero/Man & Machine_ Train Hard, Stay Strong.png';

  const validate = () => {
    const errs = {};
    if (!email.trim()) {
      errs.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errs.password = 'Please enter your password.';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerNotice(null);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const result = await authService.login({ email: email.trim(), password });
      let targetRoute = authService.getDashboardRoute(result.user?.role);
      const pendingPlanId = sessionStorage.getItem('mm_selected_plan_id');
      if (result.user?.role === 'CLIENT' && pendingPlanId) {
        targetRoute = `/client/membership?planId=${pendingPlanId}`;
      }
      if (onNavigate) {
        onNavigate(targetRoute);
      } else {
        window.history.pushState({}, '', targetRoute);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    } catch (err) {
      setServerNotice({
        type: 'error',
        message: err.message || 'Invalid email or password.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate('/forgot-password');
    } else {
      window.history.pushState({}, '', '/forgot-password');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleBackToWebsite = (e) => {
    if (e) e.preventDefault();
    if (onNavigate) {
      onNavigate('/');
    } else {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="min-h-screen bg-[#090909] text-[#F5F5F5] flex flex-col justify-between selection:bg-[#EB3E2E] selection:text-white">
      {/* ── MOBILE COMPACT AUTH HEADER (< 1024px) ── */}
      <header className="lg:hidden h-14 sm:h-16 px-4 sm:px-6 bg-[#090909]/95 backdrop-blur-md border-b border-[#303030] flex items-center justify-between sticky top-0 z-30">
        <a 
          href="/" 
          onClick={handleBackToWebsite}
          className="flex items-center gap-2 group min-w-0"
        >
          <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 border border-[#303030]">
            <img src="/logo.jpg" alt="Man & Machine Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col min-w-0">
            <span 
              className="font-bold text-[13px] text-[#F5F5F5] uppercase tracking-tight truncate leading-tight group-hover:text-[#EB3E2E] transition-colors"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              MAN &amp; MACHINE
            </span>
            <span className="text-[8px] uppercase tracking-widest text-[#B8B8B8] truncate">
              FITNESS CENTRE
            </span>
          </div>
        </a>

        <a
          href="/"
          onClick={handleBackToWebsite}
          className="inline-flex items-center gap-1.5 text-xs text-[#B8B8B8] hover:text-[#EB3E2E] font-semibold transition-colors py-1.5 px-2.5 rounded-lg border border-[#303030] hover:border-[#EB3E2E]/60"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BACK</span>
        </a>
      </header>

      {/* ── MAIN CONTENT (Split-screen on desktop, single-col on mobile) ── */}
      <main className="flex-1 w-full flex flex-col lg:flex-row">
        
        {/* ════════════════════════════════════════════════
            LEFT: BRAND & VISUAL SIDE (~45% on desktop)
        ════════════════════════════════════════════════ */}
        <section className="relative w-full lg:w-[45%] bg-[#090909] border-b lg:border-b-0 lg:border-r border-[#303030] p-6 sm:p-10 lg:p-14 xl:p-16 flex flex-col justify-between overflow-hidden">
          {/* Subtle gym visual atmospheric overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <img
              src={heroImageSrc}
              alt="Man & Machine High Performance Training"
              className="w-full h-full object-cover object-center opacity-20 filter grayscale contrast-125 scale-105"
            />
            {/* Vignette gradients to preserve pure brand darkness */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#090909] via-[#090909]/85 to-[#090909]/90" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#090909]/60 to-[#090909]" />
          </div>

          {/* Desktop Top Brand Emblem */}
          <div className="relative z-10 hidden lg:flex items-center gap-3 animate-fadeInUp">
            <div className="w-11 h-11 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 border border-[#303030] shadow-[0_0_15px_rgba(235,62,46,0.20)]">
              <img src="/logo.jpg" alt="Man & Machine Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span 
                className="font-bold text-lg text-[#F5F5F5] uppercase tracking-tight leading-tight"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                MAN &amp; MACHINE
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[#EB3E2E] font-semibold">
                FITNESS CENTRE
              </span>
            </div>
          </div>

          {/* Statement & Supporting Copy */}
          <div className="relative z-10 my-auto py-6 sm:py-10 flex flex-col gap-4 sm:gap-6 max-w-lg">
            <div 
              className="inline-flex items-center px-3 py-1 rounded-full bg-[#111111] border border-[#303030] text-[9.5px] sm:text-[10.5px] uppercase font-bold tracking-widest text-[#EB3E2E] w-fit animate-fadeInUp"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              THREE CITIES • ONE FITNESS CULTURE
            </div>

            <h1 
              className="uppercase font-bold tracking-tight text-[#F5F5F5] animate-fadeInUp"
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontSize: 'clamp(1.75rem, 3.8vw, 3.25rem)',
                lineHeight: '1.05',
                animationDelay: '100ms',
              }}
            >
              YOUR STRONGEST SELF <span className="text-[#EB3E2E]">STARTS HERE.</span>
            </h1>

            <p 
              className="text-xs sm:text-sm lg:text-base text-[#B8B8B8] leading-relaxed animate-fadeInUp"
              style={{ animationDelay: '180ms' }}
            >
              Join the Man &amp; Machine community and take the next step in your training journey. Built for disciplined individuals who demand real results.
            </p>

            {/* Subtle pillar chips */}
            <div className="hidden sm:flex flex-wrap items-center gap-2 pt-2 animate-fadeInUp" style={{ animationDelay: '240ms' }}>
              <span className="px-3 py-1 rounded-lg bg-[#111111] border border-[#303030] text-[10px] uppercase font-bold tracking-wider text-[#B8B8B8]">
                KOVILPATTI
              </span>
              <span className="px-3 py-1 rounded-lg bg-[#111111] border border-[#303030] text-[10px] uppercase font-bold tracking-wider text-[#B8B8B8]">
                KARUR
              </span>
              <span className="px-3 py-1 rounded-lg bg-[#111111] border border-[#303030] text-[10px] uppercase font-bold tracking-wider text-[#B8B8B8]">
                SIVAKASI
              </span>
            </div>
          </div>

          {/* Bottom Telemetry Footer */}
          <div className="relative z-10 hidden lg:flex items-center justify-between text-[11px] font-mono text-[#B8B8B8]/80 border-t border-[#303030]/70 pt-4">
            <span>MEMBERSHIP PORTAL // V2.0</span>
            <span className="text-[#EB3E2E]">DISCIPLINE OVER SHORTCUTS</span>
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            RIGHT: LOGIN FORM SIDE (~55% on desktop)
        ════════════════════════════════════════════════ */}
        <section className="w-full lg:w-[55%] bg-[#090909] p-6 sm:p-10 lg:p-14 xl:p-16 flex flex-col justify-center items-center">
          <div className="w-full max-w-md flex flex-col gap-6 sm:gap-8">

            {/* Desktop Back to website navigation */}
            <div className="hidden lg:flex items-center justify-between w-full">
              <a
                href="/"
                onClick={handleBackToWebsite}
                className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#B8B8B8] hover:text-[#EB3E2E] transition-colors py-1.5"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>BACK TO WEBSITE</span>
              </a>

              <span className="text-[10.5px] uppercase font-mono text-[#B8B8B8]/60 tracking-wider">
                SECURE ACCESS
              </span>
            </div>

            {/* Form Header */}
            <div className="flex flex-col gap-2">
              <h2 
                className="uppercase font-bold tracking-tight text-[#F5F5F5]"
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)',
                  lineHeight: '1.1',
                }}
              >
                WELCOME BACK.
              </h2>
              <p className="text-xs sm:text-sm text-[#B8B8B8]">
                Sign in to your Man &amp; Machine account.
              </p>
            </div>

            {/* Activation / Password Reset Success Banner */}
            {statusBanner && (
              <div
                role="status"
                className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-xs text-emerald-200 flex items-start gap-3 animate-fadeInUp"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{statusBanner}</p>
              </div>
            )}

            {/* Server notice / Authentication error alert */}
            {serverNotice && (
              <div 
                role="alert"
                className="p-4 rounded-xl bg-[#111111] border border-[#EB3E2E] text-xs text-[#F5F5F5] flex items-start gap-3 animate-fadeInUp"
              >
                <AlertCircle className="w-5 h-5 text-[#EB3E2E] shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-[#EB3E2E] uppercase tracking-wider text-[11px]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                    AUTHENTICATION NOTICE
                  </span>
                  <p className="text-[#B8B8B8] leading-relaxed">
                    {serverNotice.message}
                  </p>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full" noValidate>
              
              {/* Field 1: Email */}
              <div className="flex flex-col gap-1.5">
                <label 
                  htmlFor="email"
                  className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center justify-between"
                >
                  <span>EMAIL ADDRESS</span>
                  {errors.email && (
                    <span className="text-[11px] text-[#EB3E2E] font-normal normal-case">{errors.email}</span>
                  )}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#B8B8B8]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                    }}
                    placeholder="Enter your email address"
                    className={`w-full bg-[#111111] border rounded-xl pl-10 pr-4 py-3.5 text-sm text-[#F5F5F5] placeholder-[#B8B8B8]/50 transition-all focus:outline-none ${
                      errors.email
                        ? 'border-[#EB3E2E] focus:border-[#EB3E2E] focus:ring-1 focus:ring-[#EB3E2E]'
                        : 'border-[#303030] focus:border-[#EB3E2E] focus:shadow-[0_0_15px_rgba(235,62,46,0.20)]'
                    }`}
                  />
                </div>
              </div>

              {/* Field 2: Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label 
                    htmlFor="password"
                    className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]"
                  >
                    PASSWORD
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-[#B8B8B8] hover:text-[#EB3E2E] font-semibold transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#B8B8B8]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                    }}
                    placeholder="Enter your password"
                    className={`w-full bg-[#111111] border rounded-xl pl-10 pr-12 py-3.5 text-sm text-[#F5F5F5] placeholder-[#B8B8B8]/50 transition-all focus:outline-none ${
                      errors.password
                        ? 'border-[#EB3E2E] focus:border-[#EB3E2E] focus:ring-1 focus:ring-[#EB3E2E]'
                        : 'border-[#303030] focus:border-[#EB3E2E] focus:shadow-[0_0_15px_rgba(235,62,46,0.20)]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#B8B8B8] hover:text-[#F5F5F5] transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <span className="text-[11px] text-[#EB3E2E] mt-0.5">{errors.password}</span>
                )}
              </div>

              {/* Submit CTA Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-[#EB3E2E] hover:bg-[#FF493B] text-white font-bold text-xs uppercase tracking-wider py-4 px-6 rounded-xl shadow-[0_0_20px_rgba(235,62,46,0.30)] hover:shadow-[0_0_28px_rgba(235,62,46,0.45)] transition-all duration-200 active:scale-[0.99] cursor-pointer min-h-[48px] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>SIGNING IN...</span>
                  </span>
                ) : (
                  <>
                    <span>SIGN IN</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* ── NEW TO MAN & MACHINE SECTION ── */}
            <div className="pt-6 border-t border-[#303030] flex flex-col gap-3 text-center">
              <span 
                className="text-xs uppercase font-bold tracking-wider text-[#B8B8B8]"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                NEW TO MAN &amp; MACHINE?
              </span>

              <button
                type="button"
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('/signup');
                  } else {
                    window.history.pushState({}, '', '/signup');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#111111] hover:bg-[#202020] hover:border-[#EB3E2E] text-[#F5F5F5] hover:text-[#EB3E2E] border border-[#303030] font-bold text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all duration-200 min-h-[48px] cursor-pointer"
              >
                <span>CREATE YOUR ACCOUNT</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile bottom back link */}
            <div className="flex lg:hidden justify-center pt-2">
              <a
                href="/"
                onClick={handleBackToWebsite}
                className="inline-flex items-center gap-1.5 text-xs text-[#B8B8B8] hover:text-[#EB3E2E] font-semibold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>BACK TO WEBSITE</span>
              </a>
            </div>

          </div>
        </section>
      </main>

      {/* ── MINIMAL FOOTER ── */}
      <footer className="w-full bg-[#090909] border-t border-[#303030] py-4 px-6 text-center text-xs text-[#B8B8B8]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 MAN &amp; MACHINE FITNESS. All rights reserved.</span>
          <span 
            className="uppercase tracking-wider text-[11px]"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            Kovilpatti • Karur • Sivakasi
          </span>
        </div>
      </footer>
    </div>
  );
}
