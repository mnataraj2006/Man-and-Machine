import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  Lock,
  Mail,
  User,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Dumbbell,
  Target,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import authService from '../services/auth.js';
import branchService from '../services/branchService.js';

export default function Signup({ onNavigate }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    branchId: '',
    fitnessGoal: 'Muscle Building',
    experienceLevel: 'Beginner',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });

  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const heroImageSrc = '/images/hero/Man & Machine_ Train Hard, Stay Strong.png';

  // Load active branches
  useEffect(() => {
    let isMounted = true;
    const fetchBranches = async () => {
      try {
        const list = await branchService.getBranches();
        if (isMounted && list.length > 0) {
          setBranches(list);
          // Set default selected branch (prefer Kovilpatti or first)
          const defaultBranch = list.find((b) => b.city?.toLowerCase() === 'kovilpatti') || list[0];
          setFormData((prev) => ({
            ...prev,
            branchId: defaultBranch.id || defaultBranch._id,
          }));
        }
      } catch (err) {
        console.error('Failed to load branches', err);
      } finally {
        if (isMounted) setLoadingBranches(false);
      }
    };
    fetchBranches();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (serverError) setServerError(null);
  };

  // Password Strength Calculator
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: 'bg-transparent' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak (add numbers & symbols)', color: 'bg-red-500' };
    if (score === 2) return { score: 2, label: 'Fair (min 8 chars with letters & numbers)', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: 'Good (secure)', color: 'bg-[#E58A32]' };
    return { score: 4, label: 'Strong (high security)', color: 'bg-emerald-500' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const validate = () => {
    const errs = {};

    // Name
    if (!formData.name.trim()) {
      errs.name = 'Full name is required.';
    } else if (formData.name.trim().length < 2) {
      errs.name = 'Full name must be at least 2 characters.';
    } else if (formData.name.trim().length > 80) {
      errs.name = 'Full name cannot exceed 80 characters.';
    }

    // Email
    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    // Indian Phone
    const digits = formData.phone.replace(/\D/g, '');
    const isTenDigit = digits.length === 10 && /^[6-9]\d{9}$/.test(digits);
    const isTwelveDigit = digits.length === 12 && digits.startsWith('91') && /^91[6-9]\d{9}$/.test(digits);
    if (!formData.phone.trim()) {
      errs.phone = 'Mobile number is required.';
    } else if (!isTenDigit && !isTwelveDigit) {
      errs.phone = 'Enter a valid 10-digit Indian mobile number (e.g. 98765 43210).';
    }

    // Branch
    if (!formData.branchId) {
      errs.branchId = 'Please select your home training branch.';
    }

    // Password
    if (!formData.password) {
      errs.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      errs.password = 'Password must be at least 8 characters long.';
    } else if (!(/[a-zA-Z]/.test(formData.password) && /[0-9]/.test(formData.password))) {
      errs.password = 'Password must include at least one letter and one number.';
    }

    // Confirm Password
    if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    // Terms
    if (!formData.agreeTerms) {
      errs.agreeTerms = 'You must agree to the Terms of Service and Privacy Policy to continue.';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Smooth scroll to top of form card on mobile if errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        branchId: formData.branchId,
        fitnessGoal: formData.fitnessGoal,
        experienceLevel: formData.experienceLevel,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      };

      const result = await authService.register(payload);

      setSuccessMessage('Account created successfully! Preparing your member dashboard...');

      setTimeout(() => {
        const dest = authService.getDashboardRoute(result.user?.role || 'CLIENT');
        if (onNavigate) {
          onNavigate(dest);
        } else {
          window.history.pushState({}, '', dest);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }, 750);
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please check the information provided.');
    } finally {
      setIsSubmitting(false);
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

  const handleGoToLogin = (e) => {
    if (e) e.preventDefault();
    if (onNavigate) {
      onNavigate('/login');
    } else {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-[#F5F5F5] flex flex-col justify-between selection:bg-[#E58A32] selection:text-white">
      {/* ── MOBILE COMPACT HEADER (< 1024px) ── */}
      <header className="lg:hidden h-14 sm:h-16 px-4 sm:px-6 bg-[#09090B]/95 backdrop-blur-md border-b border-[#292929] flex items-center justify-between sticky top-0 z-30">
        <a href="/" onClick={handleBackToWebsite} className="flex items-center gap-2.5 group min-w-0">
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
            LEFT: BRAND & VISUAL SIDE (~42% on desktop)
        ════════════════════════════════════════════════ */}
        <section className="relative w-full lg:w-[42%] bg-[#0D0D12] border-b lg:border-b-0 lg:border-r border-[#292929] p-6 sm:p-10 lg:p-12 xl:p-16 flex flex-col justify-between overflow-hidden">
          {/* Gym atmospheric background overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <img
              src={heroImageSrc}
              alt="Man & Machine High Performance Training"
              className="w-full h-full object-cover object-center opacity-20 filter grayscale contrast-125 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/85 to-[#09090B]/90" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#09090B]/60 to-[#09090B]" />
          </div>

          {/* Desktop Top Brand Emblem */}
          <div className="relative z-10 hidden lg:flex items-center gap-3">
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

          {/* Statement & Highlights */}
          <div className="relative z-10 my-auto py-6 sm:py-8 lg:py-10 flex flex-col gap-5 max-w-lg">
            <div
              className="inline-flex items-center px-3 py-1 rounded-full bg-[#141414] border border-[#292929] text-[9.5px] sm:text-[10.5px] uppercase font-bold tracking-widest text-[#E58A32] w-fit"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              THREE CITIES • ONE FITNESS CULTURE
            </div>

            <h1
              className="uppercase font-bold tracking-tight text-[#F5F5F5]"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 'clamp(1.75rem, 3.5vw, 3rem)',
                lineHeight: '1.05',
              }}
            >
              JOIN THE <span className="text-[#E58A32]">MOVEMENT.</span>
            </h1>

            <p className="text-xs sm:text-sm lg:text-base text-[#A3A3A3] leading-relaxed">
              Your journey towards strength starts here. Create your account and become part of the Man &amp; Machine fitness community.
            </p>

            {/* Three Highlights */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center gap-3 bg-[#141414]/90 border border-[#292929] rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-[#E58A32]/10 border border-[#E58A32]/30 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4 text-[#E58A32]" />
                </div>
                <div className="flex flex-col">
                  <span
                    className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    TRAIN WITH PURPOSE.
                  </span>
                  <span className="text-[11px] text-[#A3A3A3]">
                    Structured discipline and verified coaching standards.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-[#141414]/90 border border-[#292929] rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-[#E58A32]/10 border border-[#E58A32]/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-[#E58A32]" />
                </div>
                <div className="flex flex-col">
                  <span
                    className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    TRACK YOUR PROGRESS.
                  </span>
                  <span className="text-[11px] text-[#A3A3A3]">
                    Access your member profile and cross-branch training.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-[#141414]/90 border border-[#292929] rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-[#E58A32]/10 border border-[#E58A32]/30 flex items-center justify-center shrink-0">
                  <Dumbbell className="w-4 h-4 text-[#E58A32]" />
                </div>
                <div className="flex flex-col">
                  <span
                    className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    BUILD YOUR STRONGEST SELF.
                  </span>
                  <span className="text-[11px] text-[#A3A3A3]">
                    High-performance equipment built for real results.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Telemetry Footer */}
          <div className="relative z-10 hidden lg:flex items-center justify-between text-[11px] font-mono text-[#A3A3A3]/80 border-t border-[#292929]/70 pt-4">
            <span>CLIENT ENROLLMENT PORTAL</span>
            <span className="text-[#E58A32]">DISCIPLINE OVER SHORTCUTS</span>
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            RIGHT: SIGNUP FORM CARD (~58% on desktop)
        ════════════════════════════════════════════════ */}
        <section className="w-full lg:w-[58%] bg-[#09090B] p-4 sm:p-8 lg:p-10 xl:p-14 flex flex-col justify-center items-center">
          <div className="w-full max-w-xl flex flex-col gap-6">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between w-full">
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
                CLIENT SIGNUP // V2.0
              </span>
            </div>

            {/* Form Card Container */}
            <div className="w-full bg-[#1C1C1C] border border-[#292929] rounded-2xl p-5 sm:p-8 shadow-[0_8px_40px_rgba(0,0,0,0.6)] flex flex-col gap-6">
              {/* Header */}
              <div className="flex flex-col gap-1.5">
                <h2
                  className="uppercase font-bold tracking-tight text-[#F5F5F5]"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 'clamp(1.5rem, 2.8vw, 2.25rem)',
                    lineHeight: '1.1',
                  }}
                >
                  CREATE YOUR ACCOUNT.
                </h2>
                <p className="text-xs sm:text-sm text-[#A3A3A3]">
                  Become a registered athlete at Man &amp; Machine Fitness.
                </p>
              </div>

              {/* Server Error Alert */}
              {serverError && (
                <div
                  role="alert"
                  className="p-4 rounded-xl bg-[#141414] border border-[#E58A32] text-xs text-[#F5F5F5] flex items-start gap-3 animate-fadeInUp"
                >
                  <AlertCircle className="w-5 h-5 text-[#E58A32] shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1">
                    <span
                      className="font-bold text-[#E58A32] uppercase tracking-wider text-[11px]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      REGISTRATION NOTICE
                    </span>
                    <p className="text-[#A3A3A3] leading-relaxed">{serverError}</p>
                  </div>
                </div>
              )}

              {/* Success Alert */}
              {successMessage && (
                <div
                  role="alert"
                  className="p-4 rounded-xl bg-[#141414] border border-emerald-500/80 text-xs text-[#F5F5F5] flex items-start gap-3 animate-fadeInUp"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1">
                    <span
                      className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      SUCCESSFUL REGISTRATION
                    </span>
                    <p className="text-[#A3A3A3] leading-relaxed">{successMessage}</p>
                  </div>
                </div>
              )}

              {/* The Signup Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5 w-full" noValidate>
                {/* 1. Full Name */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="signup-name"
                    className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center justify-between"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    <span>
                      FULL NAME <span className="text-[#E58A32]">*</span>
                    </span>
                    {errors.name && (
                      <span className="text-[11px] text-[#E58A32] font-normal normal-case">{errors.name}</span>
                    )}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="signup-name"
                      type="text"
                      name="name"
                      autoComplete="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. John Doe"
                      className={`w-full bg-[#141414] border rounded-xl pl-10 pr-4 py-3 text-sm text-[#F5F5F5] placeholder-[#A3A3A3]/50 transition-all focus:outline-none ${
                        errors.name
                          ? 'border-[#E58A32] focus:border-[#E58A32] focus:ring-1 focus:ring-[#E58A32]'
                          : 'border-[#292929] focus:border-[#E58A32] focus:shadow-[0_0_15px_rgba(229,138,50,0.20)]'
                      }`}
                    />
                  </div>
                </div>

                {/* 2 & 3. Email and Mobile Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="signup-email"
                      className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center justify-between"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      <span>
                        EMAIL ADDRESS <span className="text-[#E58A32]">*</span>
                      </span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="signup-email"
                        type="email"
                        name="email"
                        autoComplete="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="athlete@example.com"
                        className={`w-full bg-[#141414] border rounded-xl pl-10 pr-4 py-3 text-sm text-[#F5F5F5] placeholder-[#A3A3A3]/50 transition-all focus:outline-none ${
                          errors.email
                            ? 'border-[#E58A32] focus:border-[#E58A32]'
                            : 'border-[#292929] focus:border-[#E58A32]'
                        }`}
                      />
                    </div>
                    {errors.email && <span className="text-[11px] text-[#E58A32]">{errors.email}</span>}
                  </div>

                  {/* Mobile Number */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="signup-phone"
                      className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center justify-between"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      <span>
                        MOBILE NUMBER <span className="text-[#E58A32]">*</span>
                      </span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        id="signup-phone"
                        type="tel"
                        name="phone"
                        autoComplete="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="98765 43210"
                        className={`w-full bg-[#141414] border rounded-xl pl-10 pr-4 py-3 text-sm text-[#F5F5F5] placeholder-[#A3A3A3]/50 transition-all focus:outline-none ${
                          errors.phone
                            ? 'border-[#E58A32] focus:border-[#E58A32]'
                            : 'border-[#292929] focus:border-[#E58A32]'
                        }`}
                      />
                    </div>
                    {errors.phone && <span className="text-[11px] text-[#E58A32]">{errors.phone}</span>}
                  </div>
                </div>

                {/* 4. Branch Selection Cards */}
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label
                      className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      SELECT YOUR HOME BRANCH <span className="text-[#E58A32]">*</span>
                    </label>
                    <span className="text-[10px] text-[#A3A3A3]">Cross-facility privileges included</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {loadingBranches ? (
                      <div className="col-span-3 py-4 text-center text-xs text-[#A3A3A3] flex items-center justify-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-[#E58A32] rounded-full animate-spin" />
                        <span>Loading branches...</span>
                      </div>
                    ) : (
                      branches.map((b) => {
                        const bId = b.id || b._id;
                        const isSelected = formData.branchId === bId;
                        return (
                          <button
                            key={bId}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, branchId: bId }));
                              if (errors.branchId) setErrors((prev) => ({ ...prev, branchId: null }));
                            }}
                            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                              isSelected
                                ? 'bg-[#E58A32]/10 border-[#E58A32] shadow-[0_0_15px_rgba(229,138,50,0.20)]'
                                : 'bg-[#141414] border-[#292929] hover:border-[#A3A3A3]/40'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-1">
                              <span
                                className={`text-xs font-bold uppercase tracking-wider ${
                                  isSelected ? 'text-[#E58A32]' : 'text-[#F5F5F5]'
                                }`}
                                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                              >
                                {b.city}
                              </span>
                              <div
                                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                  isSelected ? 'border-[#E58A32] bg-[#E58A32]' : 'border-[#444]'
                                }`}
                              >
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </div>
                            <span className="text-[10px] text-[#A3A3A3] line-clamp-1">{b.name}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                  {errors.branchId && <span className="text-[11px] text-[#E58A32]">{errors.branchId}</span>}
                </div>

                {/* 5. Fitness Information (Optional Goal & Experience) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
                  {/* Fitness Goal */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="signup-goal"
                      className="text-xs font-bold uppercase tracking-wider text-[#A3A3A3]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      PRIMARY FITNESS GOAL <span className="text-[10px] lowercase font-normal">(optional)</span>
                    </label>
                    <select
                      id="signup-goal"
                      name="fitnessGoal"
                      value={formData.fitnessGoal}
                      onChange={handleChange}
                      className="w-full bg-[#141414] border border-[#292929] rounded-xl px-3.5 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#E58A32] transition-colors cursor-pointer"
                    >
                      <option value="Muscle Building">Muscle Building / Hypertrophy</option>
                      <option value="Weight Loss">Fat Loss &amp; Lean Toning</option>
                      <option value="Strength Training">Pure Strength &amp; Power</option>
                      <option value="General Fitness">General Health &amp; Mobility</option>
                      <option value="Stamina &amp; Conditioning">Stamina &amp; Conditioning</option>
                    </select>
                  </div>

                  {/* Experience Level */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="signup-experience"
                      className="text-xs font-bold uppercase tracking-wider text-[#A3A3A3]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      TRAINING EXPERIENCE <span className="text-[10px] lowercase font-normal">(optional)</span>
                    </label>
                    <select
                      id="signup-experience"
                      name="experienceLevel"
                      value={formData.experienceLevel}
                      onChange={handleChange}
                      className="w-full bg-[#141414] border border-[#292929] rounded-xl px-3.5 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#E58A32] transition-colors cursor-pointer"
                    >
                      <option value="Beginner">Beginner (0 — 6 months)</option>
                      <option value="Intermediate">Intermediate (6 months — 2 years)</option>
                      <option value="Advanced">Advanced (2+ years dedicated)</option>
                    </select>
                  </div>
                </div>

                {/* 6 & 7. Password & Confirm Password Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
                  {/* Password */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="signup-password"
                      className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      PASSWORD <span className="text-[#E58A32]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        autoComplete="new-password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Min 8 characters"
                        className={`w-full bg-[#141414] border rounded-xl pl-10 pr-10 py-3 text-sm text-[#F5F5F5] placeholder-[#A3A3A3]/50 transition-all focus:outline-none ${
                          errors.password
                            ? 'border-[#E58A32] focus:border-[#E58A32]'
                            : 'border-[#292929] focus:border-[#E58A32]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password Strength Meter */}
                    {formData.password && (
                      <div className="flex flex-col gap-1 mt-1">
                        <div className="h-1 w-full bg-[#292929] rounded-full overflow-hidden flex gap-1">
                          <div
                            className={`h-full transition-all duration-300 ${
                              passwordStrength.score >= 1 ? passwordStrength.color : 'bg-transparent'
                            }`}
                            style={{ width: '25%' }}
                          />
                          <div
                            className={`h-full transition-all duration-300 ${
                              passwordStrength.score >= 2 ? passwordStrength.color : 'bg-transparent'
                            }`}
                            style={{ width: '25%' }}
                          />
                          <div
                            className={`h-full transition-all duration-300 ${
                              passwordStrength.score >= 3 ? passwordStrength.color : 'bg-transparent'
                            }`}
                            style={{ width: '25%' }}
                          />
                          <div
                            className={`h-full transition-all duration-300 ${
                              passwordStrength.score >= 4 ? passwordStrength.color : 'bg-transparent'
                            }`}
                            style={{ width: '25%' }}
                          />
                        </div>
                        <span className="text-[10px] text-[#A3A3A3]">{passwordStrength.label}</span>
                      </div>
                    )}
                    {errors.password && <span className="text-[11px] text-[#E58A32]">{errors.password}</span>}
                  </div>

                  {/* Confirm Password */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="signup-confirmPassword"
                      className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      CONFIRM PASSWORD <span className="text-[#E58A32]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="signup-confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        autoComplete="new-password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Repeat password"
                        className={`w-full bg-[#141414] border rounded-xl pl-10 pr-10 py-3 text-sm text-[#F5F5F5] placeholder-[#A3A3A3]/50 transition-all focus:outline-none ${
                          errors.confirmPassword
                            ? 'border-[#E58A32] focus:border-[#E58A32]'
                            : 'border-[#292929] focus:border-[#E58A32]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {formData.confirmPassword && (
                      <span
                        className={`text-[10px] flex items-center gap-1 mt-1 ${
                          formData.password === formData.confirmPassword ? 'text-emerald-400' : 'text-[#E58A32]'
                        }`}
                      >
                        {formData.password === formData.confirmPassword ? '✓ Passwords match' : '✕ Passwords do not match'}
                      </span>
                    )}
                    {errors.confirmPassword && (
                      <span className="text-[11px] text-[#E58A32]">{errors.confirmPassword}</span>
                    )}
                  </div>
                </div>

                {/* 8. Terms and Conditions Checkbox */}
                <div className="flex flex-col gap-1 pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-[#A3A3A3]">
                    <input
                      type="checkbox"
                      name="agreeTerms"
                      checked={formData.agreeTerms}
                      onChange={handleChange}
                      className="mt-0.5 rounded border-[#292929] bg-[#141414] text-[#E58A32] focus:ring-[#E58A32] focus:ring-offset-0 transition-colors cursor-pointer w-4 h-4"
                    />
                    <span>
                      I agree to the{' '}
                      <span className="text-[#F5F5F5] hover:text-[#E58A32] underline underline-offset-2">
                        Terms of Service
                      </span>{' '}
                      and{' '}
                      <span className="text-[#F5F5F5] hover:text-[#E58A32] underline underline-offset-2">
                        Privacy Policy
                      </span>
                      .
                    </span>
                  </label>
                  {errors.agreeTerms && <span className="text-[11px] text-[#E58A32]">{errors.agreeTerms}</span>}
                </div>

                {/* 9. Primary Submit CTA Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-[#E58A32] hover:bg-[#F09A43] text-white font-bold text-xs uppercase tracking-wider py-4 px-6 rounded-xl shadow-[0_0_20px_rgba(229,138,50,0.30)] hover:shadow-[0_0_28px_rgba(229,138,50,0.45)] transition-all duration-200 active:scale-[0.99] cursor-pointer min-h-[48px] disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>CREATING MY ACCOUNT...</span>
                    </span>
                  ) : (
                    <>
                      <span>CREATE MY ACCOUNT</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* 10. Existing Account Link */}
              <div className="pt-4 border-t border-[#292929] flex flex-col sm:flex-row items-center justify-center gap-2 text-center text-xs text-[#A3A3A3]">
                <span>Already a member?</span>
                <button
                  type="button"
                  onClick={handleGoToLogin}
                  className="text-[#E58A32] hover:text-[#F09A43] font-bold uppercase tracking-wider transition-colors cursor-pointer underline underline-offset-2"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Log in
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── MINIMAL FOOTER ── */}
      <footer className="w-full bg-[#09090B] border-t border-[#292929] py-4 px-6 text-center text-xs text-[#A3A3A3]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 MAN &amp; MACHINE FITNESS. All rights reserved.</span>
          <span className="uppercase tracking-wider text-[11px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Kovilpatti • Karur • Sivakasi
          </span>
        </div>
      </footer>
    </div>
  );
}
