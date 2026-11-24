import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Dumbbell,
  CalendarCheck,
  TrendingUp,
  CreditCard,
  Receipt,
  UserCheck,
  Bell,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import authService from '../../services/auth.js';
import clientService from '../../services/clientService.js';

export default function ClientLayout({ children, currentPath, onNavigate, onLogout }) {
  const [user, setUser] = useState(authService.getUser());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Time-of-day dynamic greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING';
    if (hour < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  useEffect(() => {
    let isMounted = true;
    const fetchUserData = async () => {
      try {
        const fullUser = await authService.getMe();
        if (isMounted && fullUser) {
          setUser(fullUser);
        }
        const notifData = await clientService.getNotifications();
        if (isMounted && notifData) {
          setUnreadCount(notifData.unreadCount || 0);
        }
      } catch (err) {
        console.warn('Layout sync notice:', err.message);
      }
    };
    fetchUserData();
    return () => {
      isMounted = false;
    };
  }, [currentPath]);

  const navItems = [
    { label: 'Dashboard', path: '/client/dashboard', icon: LayoutDashboard },
    { label: 'My Workouts', path: '/client/workouts', icon: Dumbbell },
    { label: 'Attendance', path: '/client/attendance', icon: CalendarCheck },
    { label: 'My Progress', path: '/client/progress', icon: TrendingUp },
    { label: 'Membership', path: '/client/membership', icon: CreditCard },
    { label: 'Payments', path: '/client/payments', icon: Receipt },
    { label: 'My Trainer', path: '/client/trainer', icon: UserCheck },
    {
      label: 'Notifications',
      path: '/client/notifications',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : null,
    },
    { label: 'My Profile', path: '/client/profile', icon: User },
    { label: 'Settings', path: '/client/settings', icon: Settings },
  ];

  const handleNav = (path) => {
    setMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    } else {
      authService.logout();
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const branchCity =
    user?.branch?.city ||
    (user?.branchId?.city ? user.branchId.city : null) ||
    'Kovilpatti';

  return (
    <div className="min-h-screen bg-[#09090B] text-[#F5F5F5] flex selection:bg-[#E58A32] selection:text-white">
      {/* ════════════════════════════════════════════════
          DESKTOP SIDEBAR (>= 1024px)
      ════════════════════════════════════════════════ */}
      <aside className="hidden lg:flex w-64 xl:w-72 bg-[#101010] border-r border-[#292929] flex-col justify-between shrink-0 sticky top-0 h-screen z-40 overflow-y-auto">
        {/* Top: Logo & Brand */}
        <div className="flex flex-col">
          <div className="p-5 xl:p-6 border-b border-[#292929] flex items-center justify-between">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                handleNav('/');
              }}
              className="flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 border border-[#292929] shadow-[0_0_15px_rgba(229,138,50,0.20)]">
                <img src="/logo.jpg" alt="Man & Machine Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span
                  className="font-bold text-sm xl:text-base text-[#F5F5F5] uppercase tracking-tight group-hover:text-[#E58A32] transition-colors leading-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  MAN &amp; MACHINE
                </span>
                <span className="text-[9px] uppercase tracking-widest text-[#E58A32] font-semibold">
                  FITNESS CENTRE
                </span>
              </div>
            </a>
          </div>

          {/* Member Chip */}
          <div className="p-4 mx-3 my-3 rounded-xl bg-[#151515] border border-[#292929] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1C1C1C] border border-[#292929] flex items-center justify-center text-[#E58A32] font-bold text-sm shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'M'}
            </div>
            <div className="flex flex-col min-w-0">
              <span
                className="text-xs font-bold uppercase text-[#F5F5F5] truncate leading-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {user?.name || 'Athlete'}
              </span>
              <span className="text-[10px] text-[#A3A3A3] truncate">{branchCity} Branch</span>
            </div>
          </div>

          {/* Nav List */}
          <nav className="px-3 flex flex-col gap-1 pb-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                currentPath === item.path ||
                (item.path === '/client/workouts' && currentPath.startsWith('/client/workouts/'));

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNav(item.path)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[#E58A32] text-white font-bold shadow-[0_0_15px_rgba(229,138,50,0.30)]'
                      : 'text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#151515]'
                  }`}
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#A3A3A3]'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E58A32] text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar: Logout & Website link */}
        <div className="p-3 border-t border-[#292929] flex flex-col gap-1">
          <button
            type="button"
            onClick={handleLogoutClick}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-[#A3A3A3] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>LOG OUT</span>
          </button>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════
          MAIN VIEWPORT (Header + Content + Mobile Bar)
      ════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* ── TOP HEADER BAR (Desktop & Mobile) ── */}
        <header className="h-16 sm:h-20 px-4 sm:px-8 bg-[#09090B]/95 backdrop-blur-md border-b border-[#292929] flex items-center justify-between sticky top-0 z-30">
          {/* Left: Mobile Brand & Desktop Greeting */}
          <div className="flex items-center gap-3">
            {/* Mobile Logo (< 1024px) */}
            <div className="lg:hidden flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 border border-[#292929]">
                <img src="/logo.jpg" alt="Man & Machine Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col min-w-0">
                <span
                  className="font-bold text-xs text-[#F5F5F5] uppercase tracking-tight truncate leading-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  MAN &amp; MACHINE
                </span>
                <span className="text-[8px] uppercase tracking-widest text-[#E58A32] font-semibold">
                  CLIENT APP
                </span>
              </div>
            </div>

            {/* Desktop Greeting (>= 1024px) */}
            <div className="hidden lg:flex flex-col">
              <span
                className="font-bold text-sm xl:text-base text-[#F5F5F5] uppercase tracking-tight leading-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {getGreeting()},{' '}
                <span className="text-[#E58A32]">{user?.name ? user.name.split(' ')[0] : 'ATHLETE'}</span>
              </span>
              <span className="text-[11px] text-[#A3A3A3]">
                Every rep counts. Keep building your strongest self.
              </span>
            </div>
          </div>

          {/* Right Header Tools */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Branch Badge */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#151515] border border-[#292929] text-[11px] font-bold uppercase tracking-wider text-[#A3A3A3]">
              <MapPin className="w-3.5 h-3.5 text-[#E58A32]" />
              <span>{branchCity} BRANCH</span>
            </div>

            {/* Notifications Bell */}
            <button
              type="button"
              onClick={() => handleNav('/client/notifications')}
              className="relative p-2.5 rounded-xl bg-[#151515] hover:bg-[#1C1C1C] border border-[#292929] text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#E58A32] animate-pulse" />
              )}
            </button>

            {/* Profile Avatar Button */}
            <button
              type="button"
              onClick={() => handleNav('/client/profile')}
              className="flex items-center gap-2 p-1.5 rounded-xl bg-[#151515] hover:bg-[#1C1C1C] border border-[#292929] text-xs font-bold text-[#F5F5F5] transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-[#E58A32]/10 border border-[#E58A32]/30 flex items-center justify-center text-[#E58A32] font-bold text-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'M'}
              </div>
              <span className="hidden md:inline pr-1 font-mono uppercase text-[11px]">PROFILE</span>
            </button>
          </div>
        </header>

        {/* ── MAIN CONTENT OUTLET ── */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-12">
          {children}
        </main>

        {/* ════════════════════════════════════════════════
            MOBILE BOTTOM NAVIGATION (< 1024px)
        ════════════════════════════════════════════════ */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#101010]/95 backdrop-blur-md border-t border-[#292929] z-40 flex items-center justify-around px-2">
          {/* 1. Home */}
          <button
            type="button"
            onClick={() => handleNav('/client/dashboard')}
            className={`flex flex-col items-center justify-center gap-1 w-14 py-1 cursor-pointer transition-colors ${
              currentPath === '/client/dashboard' ? 'text-[#E58A32]' : 'text-[#A3A3A3]'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Home</span>
          </button>

          {/* 2. Workouts */}
          <button
            type="button"
            onClick={() => handleNav('/client/workouts')}
            className={`flex flex-col items-center justify-center gap-1 w-14 py-1 cursor-pointer transition-colors ${
              currentPath.startsWith('/client/workouts') ? 'text-[#E58A32]' : 'text-[#A3A3A3]'
            }`}
          >
            <Dumbbell className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Workout</span>
          </button>

          {/* 3. Progress */}
          <button
            type="button"
            onClick={() => handleNav('/client/progress')}
            className={`flex flex-col items-center justify-center gap-1 w-14 py-1 cursor-pointer transition-colors ${
              currentPath === '/client/progress' ? 'text-[#E58A32]' : 'text-[#A3A3A3]'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Progress</span>
          </button>

          {/* 4. Membership */}
          <button
            type="button"
            onClick={() => handleNav('/client/membership')}
            className={`flex flex-col items-center justify-center gap-1 w-14 py-1 cursor-pointer transition-colors ${
              currentPath === '/client/membership' ? 'text-[#E58A32]' : 'text-[#A3A3A3]'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Member</span>
          </button>

          {/* 5. More (Slide-over drawer) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`flex flex-col items-center justify-center gap-1 w-14 py-1 cursor-pointer transition-colors ${
              mobileMenuOpen ? 'text-[#E58A32]' : 'text-[#A3A3A3]'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">More</span>
          </button>
        </nav>

        {/* ── MOBILE "MORE" SLIDE-OVER DRAWER ── */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative bg-[#101010] border-t border-[#292929] rounded-t-3xl p-6 flex flex-col gap-4 max-h-[85vh] overflow-y-auto animate-fadeInUp">
              <div className="flex items-center justify-between pb-3 border-b border-[#292929]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#E58A32]/10 border border-[#E58A32]/30 flex items-center justify-center text-[#E58A32] font-bold text-xs">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'M'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold uppercase text-[#F5F5F5]">{user?.name}</span>
                    <span className="text-[10px] text-[#A3A3A3]">{branchCity} Branch</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-xl bg-[#151515] border border-[#292929] text-[#A3A3A3]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleNav('/client/attendance')}
                  className="p-3.5 rounded-xl bg-[#151515] border border-[#292929] text-left flex items-center gap-3 text-xs font-bold uppercase text-[#F5F5F5]"
                >
                  <CalendarCheck className="w-4 h-4 text-[#E58A32]" />
                  <span>Attendance</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNav('/client/payments')}
                  className="p-3.5 rounded-xl bg-[#151515] border border-[#292929] text-left flex items-center gap-3 text-xs font-bold uppercase text-[#F5F5F5]"
                >
                  <Receipt className="w-4 h-4 text-[#E58A32]" />
                  <span>Payments</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNav('/client/trainer')}
                  className="p-3.5 rounded-xl bg-[#151515] border border-[#292929] text-left flex items-center gap-3 text-xs font-bold uppercase text-[#F5F5F5]"
                >
                  <UserCheck className="w-4 h-4 text-[#E58A32]" />
                  <span>My Trainer</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNav('/client/notifications')}
                  className="p-3.5 rounded-xl bg-[#151515] border border-[#292929] text-left flex items-center justify-between text-xs font-bold uppercase text-[#F5F5F5]"
                >
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-[#E58A32]" />
                    <span>Notifs</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#E58A32] text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleNav('/client/profile')}
                  className="p-3.5 rounded-xl bg-[#151515] border border-[#292929] text-left flex items-center gap-3 text-xs font-bold uppercase text-[#F5F5F5]"
                >
                  <User className="w-4 h-4 text-[#E58A32]" />
                  <span>Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNav('/client/settings')}
                  className="p-3.5 rounded-xl bg-[#151515] border border-[#292929] text-left flex items-center gap-3 text-xs font-bold uppercase text-[#F5F5F5]"
                >
                  <Settings className="w-4 h-4 text-[#E58A32]" />
                  <span>Settings</span>
                </button>
              </div>

              <div className="pt-2 border-t border-[#292929] flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleNav('/')}
                  className="w-full py-3 rounded-xl bg-[#151515] border border-[#292929] text-center text-xs font-bold uppercase text-[#A3A3A3] flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Visit Homepage</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-center text-xs font-bold uppercase text-red-400 flex items-center justify-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>LOG OUT</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
