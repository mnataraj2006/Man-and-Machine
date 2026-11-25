import React, { useState, useEffect } from 'react';
import { ArrowLeft, LogOut, User, Mail, Phone, MapPin, ShieldCheck, CheckCircle2 } from 'lucide-react';
import authService from '../services/auth.js';

export default function Account({ onNavigate, onLogout }) {
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

  return (
    <div className="min-h-screen bg-[#090909] text-[#F5F5F5] flex flex-col justify-between selection:bg-[#EB3E2E] selection:text-white">
      {/* ── HEADER ── */}
      <header className="h-16 sm:h-20 px-4 sm:px-8 bg-[#090909]/95 backdrop-blur-md border-b border-[#303030] flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <a href="/" onClick={handleBackToHome} className="flex items-center gap-3 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 border border-[#303030] shadow-[0_0_15px_rgba(235,62,46,0.20)]">
              <img src="/logo.jpg" alt="Man & Machine Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span 
                className="font-bold text-sm sm:text-base text-[#F5F5F5] uppercase tracking-tight group-hover:text-[#EB3E2E] transition-colors leading-tight"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                MAN &amp; MACHINE
              </span>
              <span className="text-[9px] uppercase tracking-widest text-[#EB3E2E] font-semibold">
                FITNESS CENTRE
              </span>
            </div>
          </a>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackToHome}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#B8B8B8] hover:text-[#F5F5F5] font-semibold transition-colors py-2 px-3 rounded-lg border border-[#303030] hover:border-[#B8B8B8]/40"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>HOME</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white bg-[#111111] hover:bg-[#EB3E2E] hover:text-white border border-[#303030] hover:border-[#EB3E2E] transition-all py-2 px-4 rounded-xl cursor-pointer shadow-[0_0_12px_rgba(235,62,46,0.15)]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>LOG OUT</span>
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-14 flex flex-col justify-center">
        <div className="flex flex-col gap-8">
          
          {/* Badge & Welcome Header */}
          <div className="flex flex-col gap-3">
            <div 
              className="inline-flex items-center px-3 py-1 rounded-full bg-[#111111] border border-[#303030] text-[10px] sm:text-[11px] uppercase font-bold tracking-widest text-[#EB3E2E] w-fit"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              THREE CITIES • ONE FITNESS CULTURE
            </div>

            <h1 
              className="uppercase font-bold tracking-tight text-[#F5F5F5]"
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontSize: 'clamp(2rem, 4vw, 3.25rem)',
                lineHeight: '1.1',
              }}
            >
              WELCOME TO <span className="text-[#EB3E2E]">MAN &amp; MACHINE.</span>
            </h1>

            <p className="text-sm sm:text-base text-[#B8B8B8]">
              Welcome back, <strong className="text-[#F5F5F5] font-semibold">{currentUser?.name || 'Athlete'}</strong>. Your membership access is active.
            </p>
          </div>

          {/* Member Card Profile */}
          <div className="bg-[#111111] border border-[#303030] rounded-2xl p-6 sm:p-8 flex flex-col gap-6 relative overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#EB3E2E]/5 rounded-full blur-3xl pointer-events-none" />

            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#303030]">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#202020] border border-[#303030] flex items-center justify-center text-[#EB3E2E] text-xl font-bold">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'M'}
                </div>
                <div className="flex flex-col">
                  <span 
                    className="text-lg sm:text-xl font-bold uppercase text-[#F5F5F5]"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    {currentUser?.name || 'Man & Machine Member'}
                  </span>
                  <span className="text-xs text-[#B8B8B8]">
                    {currentUser?.email || 'member@manandmachine.com'}
                  </span>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#EB3E2E]/10 border border-[#EB3E2E]/30 text-[#EB3E2E] text-xs font-bold uppercase tracking-wider w-fit">
                <ShieldCheck className="w-4 h-4 text-[#EB3E2E]" />
                <span>ACTIVE ATHLETE</span>
              </div>
            </div>

            {/* Member Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#090909] border border-[#303030] rounded-xl p-4 flex flex-col gap-1.5">
                <span className="text-[10px] font-mono text-[#B8B8B8] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#EB3E2E]" />
                  HOME FACILITY
                </span>
                <span 
                  className="text-sm font-bold uppercase text-[#F5F5F5]"
                  style={{ fontFamily: "'Oswald', sans-serif" }}
                >
                  {currentUser?.city || 'Kovilpatti'} Branch
                </span>
              </div>

              <div className="bg-[#090909] border border-[#303030] rounded-xl p-4 flex flex-col gap-1.5">
                <span className="text-[10px] font-mono text-[#B8B8B8] uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#EB3E2E]" />
                  CONTACT
                </span>
                <span 
                  className="text-sm font-bold text-[#F5F5F5]"
                  style={{ fontFamily: "'Oswald', sans-serif" }}
                >
                  {currentUser?.phone || 'Not provided'}
                </span>
              </div>

              <div className="bg-[#090909] border border-[#303030] rounded-xl p-4 flex flex-col gap-1.5">
                <span className="text-[10px] font-mono text-[#B8B8B8] uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#EB3E2E]" />
                  FACILITY ACCESS
                </span>
                <span 
                  className="text-sm font-bold uppercase text-[#EB3E2E]"
                  style={{ fontFamily: "'Oswald', sans-serif" }}
                >
                  UNLIMITED ALL-BRANCH
                </span>
              </div>
            </div>

            {/* Branch Network Summary */}
            <div className="bg-[#090909] border border-[#303030] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#B8B8B8]">
              <div className="flex flex-col gap-0.5">
                <strong className="text-[#F5F5F5] uppercase tracking-wider" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  CROSS-FACILITY PRIVILEGES INCLUDED
                </strong>
                <span>Present your membership email at Kovilpatti HQ, Karur, or Sivakasi.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-[#111111] border border-[#303030] text-[10px] font-bold text-[#EB3E2E]">KOVILPATTI</span>
                <span className="px-2.5 py-1 rounded bg-[#111111] border border-[#303030] text-[10px] font-bold text-[#EB3E2E]">KARUR</span>
                <span className="px-2.5 py-1 rounded bg-[#111111] border border-[#303030] text-[10px] font-bold text-[#EB3E2E]">SIVAKASI</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleBackToHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#EB3E2E] hover:bg-[#FF493B] text-white font-bold text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(235,62,46,0.25)] cursor-pointer"
              >
                <span>RETURN TO HOMEPAGE</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#202020] hover:bg-[#202020] text-[#B8B8B8] hover:text-[#F5F5F5] border border-[#303030] font-bold text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>LOG OUT</span>
              </button>
            </div>

          </div>

          {/* Telemetry footer */}
          <div className="flex items-center justify-between text-xs font-mono text-[#B8B8B8]/60 pt-2 border-t border-[#303030]">
            <span>MEMBER ID: {currentUser?.id ? currentUser.id.slice(-8).toUpperCase() : 'AUTH-VALID'}</span>
            <span className="text-[#EB3E2E]">DISCIPLINE OVER SHORTCUTS</span>
          </div>

        </div>
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
