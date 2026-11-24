import React, { useState } from 'react';
import { Eye, EyeOff, ArrowLeft, ArrowRight, Lock, Mail, AlertCircle, Info } from 'lucide-react';
import authService from '../services/auth.js';

export default function Login({ onNavigate, onOpenRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverNotice, setServerNotice] = useState(null);
  const [forgotNotice, setForgotNotice] = useState(false);

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
    setForgotNotice(false);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await authService.login({ email: email.trim(), password });
      if (onNavigate) {
        onNavigate('/account');
      } else {
        window.history.pushState({}, '', '/account');
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
    setForgotNotice(true);
    setServerNotice(null);
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
    <div className="min-h-screen bg-[#09090B] text-[#F5F5F5] flex flex-col justify-between selection:bg-[#E58A32] selection:text-white">
      {/* ── MOBILE COMPACT AUTH HEADER (< 1024px) ── */}
      <header className="lg:hidden h-14 sm:h-16 px-4 sm:px-6 bg-[#09090B]/95 backdrop-blur-md border-b border-[#292929] flex items-center justify-between sticky top-0 z-30">
        <a 
          href="/" 
          onClick={handleBackToWebsite}
          className="flex items-center gap-2 group min-w-0"
        >
          <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 border border-[#292929]">
            <img src="/logo.jpg" alt="Man & Machine Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col min-w-0">
            <span 
              className="font-bold text-[13px] text-[#F5F5F5] uppercase tracking-tight truncate leading-tight group-hover:text-[#E58A32] transition-colors"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              MAN &amp; MACHINE
            </span>
            <span className="text-[8px] uppercase tracking-widest text-[#A3A3A3] truncate">
              FITNESS CENTRE
            </span>
          </div>
        </a>

        <a
          href="/"
          onClick={handleBackToWebsite}
          className="inline-flex items-center gap-1.5 text-xs text-[#A3A3A3] hover:text-[#E58A32] font-semibold transition-colors py-1.5 px-2.5 rounded-lg border border-[#292929] hover:border-[#E58A32]/60"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
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
        <section className="relative w-full lg:w-[45%] bg-[#0D0D12] border-b lg:border-b-0 lg:border-r border-[#292929] p-6 sm:p-10 lg:p-14 xl:p-16 flex flex-col justify-between overflow-hidden">
          {/* Subtle gym visual atmospheric overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <img
              src={heroImageSrc}
              alt="Man & Machine High Performance Training"
              className="w-full h-full object-cover object-center opacity-20 filter grayscale contrast-125 scale-105"
            />
            {/* Vignette gradients to preserve pure brand darkness */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/85 to-[#09090B]/90" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#09090B]/60 to-[#09090B]" />
          </div>

          {/* Desktop Top Brand Emblem */}
          <div className="relative z-10 hidden lg:flex items-center gap-3 animate-fadeInUp">
            <div className="w-11 h-11 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 border border-[#292929] shadow-[0_0_15px_rgba(229,138,50,0.20)]">
              <img src="/logo.jpg" alt="Man & Machine Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span 
                className="font-bold text-lg text-[#F5F5F5] uppercase tracking-tight leading-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                MAN &amp; MACHINE
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[#E58A32] font-semibold">
                FITNESS CENTRE
              </span>
            </div>
          </div>

          {/* Statement & Supporting Copy */}
          <div className="relative z-10 my-auto py-6 sm:py-10 flex flex-col gap-4 sm:gap-6 max-w-lg">
            <div 
              className="inline-flex items-center px-3 py-1 rounded-full bg-[#141414] border border-[#292929] text-[9.5px] sm:text-[10.5px] uppercase font-bold tracking-widest text-[#E58A32] w-fit animate-fadeInUp"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              THREE CITIES • ONE FITNESS CULTURE
            </div>

            <h1 
              className="uppercase font-bold tracking-tight text-[#F5F5F5] animate-fadeInUp"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 'clamp(1.75rem, 3.8vw, 3.25rem)',
                lineHeight: '1.05',
                animationDelay: '100ms',
              }}
            >
              YOUR STRONGEST SELF <span className="text-[#E58A32]">STARTS HERE.</span>
            </h1>

            <p 
              className="text-xs sm:text-sm lg:text-base text-[#A3A3A3] leading-relaxed animate-fadeInUp"
              style={{ animationDelay: '180ms' }}
            >
              Join the Man &amp; Machine community and take the next step in your training journey. Built for disciplined individuals who demand real results.
            </p>

            {/* Subtle pillar chips */}
            <div className="hidden sm:flex flex-wrap items-center gap-2 pt-2 animate-fadeInUp" style={{ animationDelay: '240ms' }}>
              <span className="px-3 py-1 rounded-lg bg-[#141414] border border-[#292929] text-[10px] uppercase font-bold tracking-wider text-[#A3A3A3]">
                KOVILPATTI
              </span>
              <span className="px-3 py-1 rounded-lg bg-[#141414] border border-[#292929] text-[10px] uppercase font-bold tracking-wider text-[#A3A3A3]">
                KARUR
              </span>
              <span className="px-3 py-1 rounded-lg bg-[#141414] border border-[#292929] text-[10px] uppercase font-bold tracking-wider text-[#A3A3A3]">
                SIVAKASI
              </span>
            </div>
          </div>

          {/* Bottom Telemetry Footer */}
          <div className="relative z-10 hidden lg:flex items-center justify-between text-[11px] font-mono text-[#A3A3A3]/80 border-t border-[#292929]/70 pt-4">
            <span>MEMBERSHIP PORTAL // V2.0</span>
            <span className="text-[#E58A32]">DISCIPLINE OVER SHORTCUTS</span>
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            RIGHT: LOGIN FORM SIDE (~55% on desktop)
        ════════════════════════════════════════════════ */}
        <section className="w-full lg:w-[55%] bg-[#09090B] p-6 sm:p-10 lg:p-14 xl:p-16 flex flex-col justify-center items-center">
          <div className="w-full max-w-md flex flex-col gap-6 sm:gap-8">

            {/* Desktop Back to website navigation */}
            <div className="hidden lg:flex items-center justify-between w-full">
              <a
                href="/"
                onClick={handleBackToWebsite}
                className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A3A3A3] hover:text-[#E58A32] transition-colors py-1.5"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>BACK TO WEBSITE</span>
              </a>

              <span className="text-[10.5px] uppercase font-mono text-[#A3A3A3]/60 tracking-wider">
                SECURE ACCESS
              </span>
            </div>

            {/* Form Header */}
            <div className="flex flex-col gap-2">
              <h2 
                className="uppercase font-bold tracking-tight text-[#F5F5F5]"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)',
                  lineHeight: '1.1',
                }}
              >
                WELCOME BACK.
              </h2>
              <p className="text-xs sm:text-sm text-[#A3A3A3]">
                Sign in to your Man &amp; Machine account.
              </p>
            </div>

            {/* Server notice / Authentication error alert */}
            {serverNotice && (
              <div 
                role="alert"
                className="p-4 rounded-xl bg-[#141414] border border-[#E58A32] text-xs text-[#F5F5F5] flex items-start gap-3 animate-fadeInUp"
              >
                <AlertCircle className="w-5 h-5 text-[#E58A32] shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-[#E58A32] uppercase tracking-wider text-[11px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    AUTHENTICATION NOTICE
                  </span>
                  <p className="text-[#A3A3A3] leading-relaxed">
                    {serverNotice.message}
                  </p>
                </div>
              </div>
            )}

            {/* Forgot Password Notice */}
            {forgotNotice && (
              <div 
                role="alert"
                className="p-4 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] flex items-start gap-3 animate-fadeInUp"
              >
                <AlertCircle className="w-5 h-5 text-[#E58A32] shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-[#F5F5F5] uppercase tracking-wider text-[11px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    PASSWORD RECOVERY
                  </span>
                  <p className="text-[#A3A3A3] leading-relaxed">
                    Online password reset will be activated alongside the upcoming member portal. For immediate verification, contact Kovilpatti HQ at <a href="tel:+917598885566" className="text-[#E58A32] font-mono font-bold hover:underline">+91 75988 85566</a>.
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
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <span>EMAIL ADDRESS</span>
                  {errors.email && (
                    <span className="text-[11px] text-[#E58A32] font-normal normal-case">{errors.email}</span>
                  )}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
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
                    className={`w-full bg-[#141414] border rounded-xl pl-10 pr-4 py-3.5 text-sm text-[#F5F5F5] placeholder-[#A3A3A3]/50 transition-all focus:outline-none ${
                      errors.email
                        ? 'border-[#E58A32] focus:border-[#E58A32] focus:ring-1 focus:ring-[#E58A32]'
                        : 'border-[#292929] focus:border-[#E58A32] focus:shadow-[0_0_15px_rgba(229,138,50,0.20)]'
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
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    PASSWORD
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-[#A3A3A3] hover:text-[#E58A32] font-semibold transition-colors cursor-pointer"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
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
                    className={`w-full bg-[#141414] border rounded-xl pl-10 pr-12 py-3.5 text-sm text-[#F5F5F5] placeholder-[#A3A3A3]/50 transition-all focus:outline-none ${
                      errors.password
                        ? 'border-[#E58A32] focus:border-[#E58A32] focus:ring-1 focus:ring-[#E58A32]'
                        : 'border-[#292929] focus:border-[#E58A32] focus:shadow-[0_0_15px_rgba(229,138,50,0.20)]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <span className="text-[11px] text-[#E58A32] mt-0.5">{errors.password}</span>
                )}
              </div>

              {/* Submit CTA Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-[#E58A32] hover:bg-[#F09A43] text-white font-bold text-xs uppercase tracking-wider py-4 px-6 rounded-xl shadow-[0_0_20px_rgba(229,138,50,0.30)] hover:shadow-[0_0_28px_rgba(229,138,50,0.45)] transition-all duration-200 active:scale-[0.99] cursor-pointer min-h-[48px] disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
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
            <div className="pt-6 border-t border-[#292929] flex flex-col gap-3 text-center">
              <span 
                className="text-xs uppercase font-bold tracking-wider text-[#A3A3A3]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                NEW TO MAN &amp; MACHINE?
              </span>

              <button
                type="button"
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('/register');
                  } else {
                    window.history.pushState({}, '', '/register');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#141414] hover:bg-[#191919] hover:border-[#E58A32] text-[#F5F5F5] hover:text-[#E58A32] border border-[#292929] font-bold text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all duration-200 min-h-[48px] cursor-pointer"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
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
                className="inline-flex items-center gap-1.5 text-xs text-[#A3A3A3] hover:text-[#E58A32] font-semibold transition-colors"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>BACK TO WEBSITE</span>
              </a>
            </div>

          </div>
        </section>
      </main>

      {/* ── MINIMAL FOOTER ── */}
      <footer className="w-full bg-[#09090B] border-t border-[#292929] py-4 px-6 text-center text-xs text-[#A3A3A3]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 MAN &amp; MACHINE FITNESS. All rights reserved.</span>
          <span 
            className="uppercase tracking-wider text-[11px]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Kovilpatti • Karur • Sivakasi
          </span>
        </div>
      </footer>
    </div>
  );
}
