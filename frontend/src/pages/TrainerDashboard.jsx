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
    <div className="min-h-screen bg-[#09090B] text-[#F5F5F5] flex flex-col justify-between selection:bg-[#E58A32] selection:text-white">
      {/* ── HEADER ── */}
      <header className="h-16 sm:h-20 px-4 sm:px-8 bg-[#09090B]/95 backdrop-blur-md border-b border-[#292929] flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 border border-[#292929]">
            <img src="/logo.jpg" alt="Man & Machine Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span
              className="font-bold text-sm sm:text-base text-[#F5F5F5] uppercase tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              MAN &amp; MACHINE
            </span>
            <span className="text-[9px] uppercase tracking-widest text-[#E58A32] font-semibold">
              TRAINER PORTAL
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white bg-[#141414] hover:bg-[#E58A32] border border-[#292929] hover:border-[#E58A32] transition-all py-2 px-4 rounded-xl cursor-pointer"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>LOG OUT</span>
        </button>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E58A32]/10 border border-[#E58A32]/30 text-[#E58A32] text-xs font-bold uppercase tracking-wider w-fit">
              <Dumbbell className="w-4 h-4 text-[#E58A32]" />
              <span>COACHING &amp; ATHLETE GUIDANCE</span>
            </div>
            <h1
              className="uppercase font-bold tracking-tight text-[#F5F5F5]"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
              }}
            >
              TRAINER PORTAL.
            </h1>
            <p className="text-sm text-[#A3A3A3]">
              Welcome, <strong className="text-[#F5F5F5]">{currentUser?.name || 'Coach'}</strong>. Manage your client training programs and schedule consultations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#1C1C1C] border border-[#292929] rounded-2xl p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#A3A3A3] uppercase">ASSIGNED FACILITY</span>
                <MapPin className="w-4 h-4 text-[#E58A32]" />
              </div>
              <span className="text-xl font-bold text-[#F5F5F5]">
                {currentUser?.branch?.city || 'Kovilpatti'}
              </span>
              <span className="text-xs text-[#A3A3A3]">Primary Coaching Branch</span>
            </div>

            <div className="bg-[#1C1C1C] border border-[#292929] rounded-2xl p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#A3A3A3] uppercase">ROLE STATUS</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-xl font-bold text-emerald-400">ACTIVE COACH</span>
              <span className="text-xs text-[#A3A3A3]">Role: TRAINER</span>
            </div>

            <div className="bg-[#1C1C1C] border border-[#292929] rounded-2xl p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#A3A3A3] uppercase">CLIENT SESSIONS</span>
                <Users className="w-4 h-4 text-[#E58A32]" />
              </div>
              <span className="text-xl font-bold text-[#F5F5F5]">ALL-BRANCH</span>
              <span className="text-xs text-[#A3A3A3]">Active Member Roster</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#09090B] border-t border-[#292929] py-4 px-6 text-center text-xs text-[#A3A3A3]">
        <span>© 2026 MAN &amp; MACHINE FITNESS. Trainer Environment.</span>
      </footer>
    </div>
  );
}
