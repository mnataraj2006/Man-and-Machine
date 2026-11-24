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
    <div className="min-h-screen bg-[#09090B] text-[#F5F5F5] flex flex-col md:flex-row antialiased">
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-[#111111] border-r border-[#292929] shrink-0 sticky top-0 h-screen z-30 select-none">
        {/* Brand Header */}
        <div className="p-6 border-b border-[#292929] flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span
              className="text-xl font-black tracking-tight text-white uppercase"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              MAN & MACHINE
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#E58A32]/10 text-[#E58A32] border border-[#E58A32]/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#E58A32]" />
              TRAINER PORTAL
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-1.5 scrollbar-thin scrollbar-thumb-[#292929]">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all group ${
                  active
                    ? 'bg-[#E58A32] text-white shadow-[0_0_20px_rgba(229,138,50,0.3)]'
                    : 'text-[#A3A3A3] hover:text-white hover:bg-[#181818]'
                }`}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      active ? 'text-white' : 'text-[#A3A3A3] group-hover:text-[#E58A32]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      active ? 'bg-white text-[#E58A32]' : 'bg-[#E58A32] text-white'
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
        <div className="p-4 border-t border-[#292929] bg-[#141414] flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#202020] border border-[#292929] flex items-center justify-center text-[#E58A32] font-bold text-sm shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'T'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">{user?.name || 'Coach'}</span>
              <span className="text-[10px] text-[#A3A3A3] truncate">{user?.email}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-[#181818] hover:bg-rose-500/10 hover:text-rose-400 border border-[#292929] text-xs font-semibold uppercase tracking-wider text-[#A3A3A3] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR & DRAWER ── */}
      <header className="md:hidden sticky top-0 z-40 bg-[#111111] border-b border-[#292929] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-[#181818] border border-[#292929] text-[#F5F5F5] hover:text-[#E58A32]"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex flex-col">
            <span
              className="text-sm font-black uppercase text-white tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              MAN & MACHINE
            </span>
            <span className="text-[9px] font-mono text-[#E58A32] uppercase">TRAINER PORTAL</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleNav('/trainer/notifications')}
            className="relative p-2 rounded-lg bg-[#181818] border border-[#292929] text-[#A3A3A3]"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifs > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E58A32] text-white text-[9px] font-bold flex items-center justify-center">
                {unreadNotifs}
              </span>
            )}
          </button>
          <div className="w-8 h-8 rounded-lg bg-[#202020] border border-[#292929] flex items-center justify-center text-[#E58A32] font-bold text-xs">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'T'}
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex">
          <div className="w-4/5 max-w-xs bg-[#111111] border-r border-[#292929] flex flex-col h-full animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-[#292929] flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-[#E58A32]">NAVIGATION</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg bg-[#181818] border border-[#292929] text-[#A3A3A3]"
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
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider ${
                      active ? 'bg-[#E58A32] text-white' : 'text-[#A3A3A3] hover:bg-[#181818] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E58A32] text-white">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-[#292929]">
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold uppercase"
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
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</div>
      </main>
    </div>
  );
}
