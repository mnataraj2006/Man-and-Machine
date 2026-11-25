import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  LogOut,
  Dumbbell,
  Users,
  MapPin,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import authService from '../services/auth.js';

export default function TrainerDashboard({ onNavigate, onLogout }) {
  const [currentUser, setCurrentUser] = useState(authService.getUser());

  useEffect(() => {
    const fetchUser = async () => {
      const user = await authService.getMe();
      if (user) setCurrentUser(user);
    };
    fetchUser();
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

  return (
    <div className="min-h-screen bg-[#090909] text-[#F5F5F5] flex flex-col justify-between selection:bg-[#EB3E2E] selection:text-white">
      {/* ── HEADER ── */}
      <header className="h-16 sm:h-20 px-4 sm:px-8 bg-[#090909]/95 backdrop-blur-md border-b border-[#303030] flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 border border-[#303030]">
            <img src="/logo.jpg" alt="Man & Machine Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span
              className="font-bold text-sm sm:text-base text-[#F5F5F5] uppercase tracking-tight"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              MAN &amp; MACHINE
            </span>
            <span className="text-[9px] uppercase tracking-widest text-[#EB3E2E] font-semibold">
              TRAINER PORTAL
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white bg-[#111111] hover:bg-[#EB3E2E] border border-[#303030] hover:border-[#EB3E2E] transition-all py-2 px-4 rounded-xl cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>LOG OUT</span>
        </button>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EB3E2E]/10 border border-[#EB3E2E]/30 text-[#EB3E2E] text-xs font-bold uppercase tracking-wider w-fit">
              <Dumbbell className="w-4 h-4 text-[#EB3E2E]" />
              <span>COACHING &amp; ATHLETE GUIDANCE</span>
            </div>
            <h1
              className="uppercase font-bold tracking-tight text-[#F5F5F5]"
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
              }}
            >
              TRAINER PORTAL.
            </h1>
            <p className="text-sm text-[#B8B8B8]">
              Welcome, <strong className="text-[#F5F5F5]">{currentUser?.name || 'Coach'}</strong>. Manage your client training programs and schedule consultations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#202020] border border-[#303030] rounded-2xl p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#B8B8B8] uppercase">ASSIGNED FACILITY</span>
                <MapPin className="w-4 h-4 text-[#EB3E2E]" />
              </div>
              <span className="text-xl font-bold text-[#F5F5F5]">
                {currentUser?.branch?.city || 'Kovilpatti'}
              </span>
              <span className="text-xs text-[#B8B8B8]">Primary Coaching Branch</span>
            </div>

            <div className="bg-[#202020] border border-[#303030] rounded-2xl p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#B8B8B8] uppercase">ROLE STATUS</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-xl font-bold text-emerald-400">ACTIVE COACH</span>
              <span className="text-xs text-[#B8B8B8]">Role: TRAINER</span>
            </div>

            <div className="bg-[#202020] border border-[#303030] rounded-2xl p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#B8B8B8] uppercase">CLIENT SESSIONS</span>
                <Users className="w-4 h-4 text-[#EB3E2E]" />
              </div>
              <span className="text-xl font-bold text-[#F5F5F5]">ALL-BRANCH</span>
              <span className="text-xs text-[#B8B8B8]">Active Member Roster</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#090909] border-t border-[#303030] py-4 px-6 text-center text-xs text-[#B8B8B8]">
        <span>© 2026 MAN &amp; MACHINE FITNESS. Trainer Environment.</span>
      </footer>
    </div>
  );
}
