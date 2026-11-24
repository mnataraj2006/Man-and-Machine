import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  LogOut,
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Dumbbell,
  Target,
  Sparkles,
  Calendar,
} from 'lucide-react';
import authService from '../services/auth.js';

export default function ClientDashboard({ onNavigate, onLogout }) {
  const [currentUser, setCurrentUser] = useState(authService.getUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchUser = async () => {
      const user = await authService.getMe();
      if (isMounted) {
        if (user) {
          setCurrentUser(user);
        }
        setLoading(false);
      }
    };
    fetchUser();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = () => {
    authService.logout();
    if (onLogout) {
      onLogout();
    } else if (onNavigate) {
      onNavigate('/login');
    } else {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleBackToHome = (e) => {
    if (e) e.preventDefault();
    if (onNavigate) {
      onNavigate('/');
    } else {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const branchName =
    currentUser?.branch?.name ||
    (currentUser?.branchId?.name ? currentUser.branchId.name : null) ||
    'Kovilpatti HQ';
  const branchCity =
    currentUser?.branch?.city ||
    (currentUser?.branchId?.city ? currentUser.branchId.city : null) ||
    'Kovilpatti';
  const fitnessGoal = currentUser?.clientProfile?.fitnessGoal || 'Muscle Building';
  const experienceLevel = currentUser?.clientProfile?.experienceLevel || 'Beginner';

  return (
    <div className="min-h-screen bg-[#09090B] text-[#F5F5F5] flex flex-col justify-between selection:bg-[#E58A32] selection:text-white">
      {/* ── HEADER ── */}
      <header className="h-16 sm:h-20 px-4 sm:px-8 bg-[#09090B]/95 backdrop-blur-md border-b border-[#292929] flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <a href="/" onClick={handleBackToHome} className="flex items-center gap-3 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 border border-[#292929] shadow-[0_0_15px_rgba(229,138,50,0.20)]">
              <img src="/logo.jpg" alt="Man & Machine Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span
                className="font-bold text-sm sm:text-base text-[#F5F5F5] uppercase tracking-tight group-hover:text-[#E58A32] transition-colors leading-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                MAN &amp; MACHINE
              </span>
              <span className="text-[9px] uppercase tracking-widest text-[#E58A32] font-semibold">
                CLIENT PORTAL
              </span>
            </div>
          </a>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackToHome}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#A3A3A3] hover:text-[#F5F5F5] font-semibold transition-colors py-2 px-3 rounded-lg border border-[#292929] hover:border-[#A3A3A3]/40"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>WEBSITE</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white bg-[#141414] hover:bg-[#E58A32] border border-[#292929] hover:border-[#E58A32] transition-all py-2 px-4 rounded-xl cursor-pointer shadow-[0_0_12px_rgba(229,138,50,0.15)]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>LOG OUT</span>
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center">
        <div className="flex flex-col gap-8">
          {/* Welcome Header */}
          <div className="flex flex-col gap-3">
            <div
              className="inline-flex items-center px-3 py-1 rounded-full bg-[#141414] border border-[#292929] text-[10px] sm:text-[11px] uppercase font-bold tracking-widest text-[#E58A32] w-fit"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              CLIENT DASHBOARD • THREE CITIES ONE BRAND
            </div>

            <h1
              className="uppercase font-bold tracking-tight text-[#F5F5F5]"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 'clamp(2rem, 4vw, 3.25rem)',
                lineHeight: '1.1',
              }}
            >
              WELCOME BACK, <span className="text-[#E58A32]">{currentUser?.name || 'ATHLETE'}.</span>
            </h1>

            <p className="text-sm sm:text-base text-[#A3A3A3]">
              Your athlete membership profile is active. Training facilities across Kovilpatti, Karur, and Sivakasi are available to you.
            </p>
          </div>

          {/* Member Card Profile Container */}
          <div className="bg-[#1C1C1C] border border-[#292929] rounded-2xl p-6 sm:p-8 flex flex-col gap-6 relative overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#E58A32]/5 rounded-full blur-3xl pointer-events-none" />

            {/* Profile Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#292929]">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#141414] border border-[#292929] flex items-center justify-center text-[#E58A32] text-xl font-bold">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'M'}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-lg sm:text-xl font-bold uppercase text-[#F5F5F5]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {currentUser?.name || 'Athlete'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#E58A32]/10 border border-[#E58A32]/30 text-[#E58A32]">
                      ROLE: {currentUser?.role || 'CLIENT'}
                    </span>
                  </div>
                  <span className="text-xs text-[#A3A3A3]">{currentUser?.email}</span>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider w-fit">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>MEMBERSHIP {currentUser?.status || 'ACTIVE'}</span>
              </div>
            </div>

            {/* Member Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#141414] border border-[#292929] rounded-xl p-4 flex flex-col gap-1.5">
                <span className="text-[10px] font-mono text-[#A3A3A3] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#E58A32]" />
                  HOME BRANCH
                </span>
                <span
                  className="text-sm font-bold uppercase text-[#F5F5F5]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {branchCity}
                </span>
                <span className="text-[10px] text-[#A3A3A3] line-clamp-1">{branchName}</span>
              </div>

              <div className="bg-[#141414] border border-[#292929] rounded-xl p-4 flex flex-col gap-1.5">
                <span className="text-[10px] font-mono text-[#A3A3A3] uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#E58A32]" />
                  REGISTERED PHONE
                </span>
                <span
                  className="text-sm font-bold text-[#F5F5F5]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {currentUser?.phone || 'Not provided'}
                </span>
                <span className="text-[10px] text-emerald-400">Verified Mobile</span>
              </div>

              <div className="bg-[#141414] border border-[#292929] rounded-xl p-4 flex flex-col gap-1.5">
                <span className="text-[10px] font-mono text-[#A3A3A3] uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-[#E58A32]" />
                  FITNESS GOAL
                </span>
                <span
                  className="text-sm font-bold uppercase text-[#F5F5F5]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {fitnessGoal}
                </span>
                <span className="text-[10px] text-[#A3A3A3]">Focus: Hypertrophy &amp; Strength</span>
              </div>

              <div className="bg-[#141414] border border-[#292929] rounded-xl p-4 flex flex-col gap-1.5">
                <span className="text-[10px] font-mono text-[#A3A3A3] uppercase tracking-wider flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5 text-[#E58A32]" />
                  EXPERIENCE
                </span>
                <span
                  className="text-sm font-bold uppercase text-[#E58A32]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {experienceLevel} LEVEL
                </span>
                <span className="text-[10px] text-[#A3A3A3]">Personalized Programming</span>
              </div>
            </div>

            {/* Quick Privileges Banner */}
            <div className="bg-[#09090B] border border-[#292929] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#A3A3A3]">
              <div className="flex flex-col gap-0.5">
                <strong
                  className="text-[#F5F5F5] uppercase tracking-wider"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  ALL-BRANCH ACCESS PRIVILEGES
                </strong>
                <span>Present your membership email at Kovilpatti HQ, Karur, or Sivakasi.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-[#141414] border border-[#292929] text-[10px] font-bold text-[#E58A32]">
                  KOVILPATTI
                </span>
                <span className="px-2.5 py-1 rounded bg-[#141414] border border-[#292929] text-[10px] font-bold text-[#E58A32]">
                  KARUR
                </span>
                <span className="px-2.5 py-1 rounded bg-[#141414] border border-[#292929] text-[10px] font-bold text-[#E58A32]">
                  SIVAKASI
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleBackToHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#E58A32] hover:bg-[#F09A43] text-white font-bold text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(229,138,50,0.25)] cursor-pointer"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <span>RETURN TO HOMEPAGE</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#141414] hover:bg-[#191919] text-[#A3A3A3] hover:text-[#F5F5F5] border border-[#292929] font-bold text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all cursor-pointer"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <LogOut className="w-4 h-4" />
                <span>LOG OUT</span>
              </button>
            </div>
          </div>

          {/* Telemetry Footer */}
          <div className="flex items-center justify-between text-xs font-mono text-[#A3A3A3]/60 pt-2 border-t border-[#292929]">
            <span>MEMBER ID: {currentUser?.id ? currentUser.id.slice(-8).toUpperCase() : 'ATHLETE-VALID'}</span>
            <span className="text-[#E58A32]">DISCIPLINE OVER SHORTCUTS</span>
          </div>
        </div>
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
