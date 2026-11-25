import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Calendar,
  Activity,
  TrendingUp,
  CalendarCheck,
  Bell,
  UserCheck,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  MapPin,
} from 'lucide-react';
import authService from '../../services/auth.js';
import trainerService from '../../services/trainerService.js';

export default function TrainerLayout({ children, currentPath, onNavigate, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(authService.getUser());
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const navItems = [
    { label: 'Dashboard', path: '/trainer/dashboard', icon: LayoutDashboard },
    { label: 'My Clients', path: '/trainer/clients', icon: Users },
    { label: 'Workouts', path: '/trainer/workouts', icon: Dumbbell },
    { label: 'Schedule', path: '/trainer/schedule', icon: Calendar },
    { label: 'Sessions', path: '/trainer/sessions', icon: Activity },
    { label: 'Progress', path: '/trainer/progress', icon: TrendingUp },
    { label: 'Attendance', path: '/trainer/attendance', icon: CalendarCheck },
    { label: 'Notifications', path: '/trainer/notifications', icon: Bell, badge: unreadNotifs },
    { label: 'Profile', path: '/trainer/profile', icon: UserCheck },
    { label: 'Settings', path: '/trainer/settings', icon: Settings },
  ];

  useEffect(() => {
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const res = await trainerService.getNotifications();
        if (isMounted && res.notifications) {
          const unread = res.notifications.filter((n) => !n.isRead).length;
          setUnreadNotifs(unread);
        }
      } catch (err) {
        // Silent fail on badge load
      }
    };
    fetchUnread();
    return () => {
      isMounted = false;
    };
  }, [currentPath]);

  const handleNav = (path) => {
    setMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      authService.logout();
      window.location.href = '/login';
    }
  };

  const isActive = (itemPath) => {
    if (itemPath === '/trainer/dashboard') {
      return currentPath === '/trainer/dashboard' || currentPath === '/trainer';
    }
    return currentPath?.startsWith(itemPath);
  };

  return (
    <div className="min-h-screen bg-[#090909] text-[#F5F5F5] flex flex-col md:flex-row antialiased selection:bg-[#EB3E2E] selection:text-white">
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-[#111111] border-r border-[#303030] shrink-0 sticky top-0 h-screen z-30 select-none">
        {/* Brand Header */}
        <div className="p-5 border-b border-[#252525] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white p-1.5 flex items-center justify-center shrink-0 border border-[#303030]">
            <img src="/logo.jpg" alt="Man & Machine" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-display text-base font-bold tracking-tight text-[#F5F5F5] uppercase truncate">
              MAN &amp; MACHINE
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#EB3E2E] flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#EB3E2E]" />
              TRAINER PORTAL
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-1.5">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 group cursor-pointer ${
                  active
                    ? 'bg-[#EB3E2E] text-white font-bold shadow-sm'
                    : 'text-[#B8B8B8] hover:text-[#F5F5F5] hover:bg-[#181818]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-105 ${
                      active ? 'text-white' : 'text-[#858585] group-hover:text-[#EB3E2E]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      active ? 'bg-white text-[#EB3E2E]' : 'bg-[#EB3E2E] text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Trainer Profile Card & Logout */}
        <div className="p-4 border-t border-[#252525] bg-[#111111] flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#202020] border border-[#303030] flex items-center justify-center text-[#EB3E2E] font-bold text-sm shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'T'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-[#F5F5F5] truncate">{user?.name || 'Coach'}</span>
              <span className="text-[10px] text-[#858585] truncate">{user?.email}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-[#181818] hover:bg-[#EB3E2E]/15 hover:text-[#FF493B] border border-[#303030] text-xs font-semibold uppercase tracking-wider text-[#B8B8B8] transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR & DRAWER ── */}
      <header className="md:hidden sticky top-0 z-40 bg-[#111111] border-b border-[#252525] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-[#181818] border border-[#303030] text-[#F5F5F5] hover:border-[#EB3E2E]"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="w-7 h-7 rounded bg-white p-0.5 flex items-center justify-center shrink-0">
            <img src="/logo.jpg" alt="Man & Machine" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-sm font-bold uppercase text-[#F5F5F5] tracking-tight leading-tight">
              MAN &amp; MACHINE
            </span>
            <span className="text-[9px] font-semibold tracking-widest text-[#EB3E2E] uppercase">TRAINER PORTAL</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleNav('/trainer/notifications')}
            className="relative p-2 rounded-lg bg-[#181818] border border-[#303030] text-[#B8B8B8]"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifs > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#EB3E2E] text-white text-[9px] font-bold flex items-center justify-center">
                {unreadNotifs}
              </span>
            )}
          </button>
          <div className="w-8 h-8 rounded-lg bg-[#202020] border border-[#303030] flex items-center justify-center text-[#EB3E2E] font-bold text-xs">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'T'}
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex">
          <div className="w-4/5 max-w-xs bg-[#111111] border-r border-[#303030] flex flex-col h-full">
            <div className="p-4 border-b border-[#252525] flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest uppercase text-[#EB3E2E]">NAVIGATION</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg bg-[#181818] border border-[#303030] text-[#B8B8B8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-1.5">
              {navItems.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNav(item.path)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider ${
                      active ? 'bg-[#EB3E2E] text-white font-bold' : 'text-[#B8B8B8] hover:bg-[#181818] hover:text-[#F5F5F5]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EB3E2E] text-white">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-[#252525]">
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#EB3E2E]/15 border border-[#EB3E2E]/35 text-[#FF493B] text-xs font-bold uppercase"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* ── MAIN CONTENT WORKSPACE ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto mm-page-enter">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</div>
      </main>
    </div>
  );
}
