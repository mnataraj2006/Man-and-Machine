import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
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
  ShieldCheck,
} from 'lucide-react';
import authService from '../../services/auth.js';
import trainerService from '../../services/trainerService.js';
import DashboardMobileDrawer from '../UI/DashboardMobileDrawer.jsx';

export default function TrainerLayout({ children, currentPath, onNavigate, onLogout }) {
  const { resolvedTheme } = useTheme();
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

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

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
    <div data-theme={resolvedTheme} className="mm-dashboard-theme min-h-screen bg-[#090909] text-[#F5F5F5] flex flex-col lg:flex-row antialiased selection:bg-[#EB3E2E] selection:text-white">
      {/* ── DESKTOP SIDEBAR (>= 1024px) ── */}
      <aside className="hidden lg:flex flex-col w-64 lg:w-72 bg-[#111111] border-r border-[#303030] shrink-0 sticky top-0 h-screen z-30 select-none">
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
        <nav className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-1.5" aria-label="Trainer navigation">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNav(item.path)}
                aria-current={active ? 'page' : undefined}
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
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-[#181818] hover:bg-[#EB3E2E]/15 hover:text-[#FF493B] border border-[#303030] text-xs font-semibold uppercase tracking-wider text-[#B8B8B8] transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── MOBILE & TABLET TOP BAR (< 1024px) ── */}
      <header className="lg:hidden sticky top-0 z-30 bg-[#111111]/95 backdrop-blur-md border-b border-[#252525] px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#181818] border border-[#303030] text-[#F5F5F5] hover:border-[#F03B2E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F03B2E] cursor-pointer shrink-0 transition-colors"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="trainer-mobile-drawer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 border border-[#303030]">
            <img src="/logo.jpg" alt="Man & Machine" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-display text-sm font-bold uppercase text-[#F5F5F5] tracking-tight leading-tight truncate">
              MAN &amp; MACHINE
            </span>
            <span className="text-[9px] font-semibold tracking-widest text-[#F03B2E] uppercase truncate">
              TRAINER PORTAL
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleNav('/trainer/notifications')}
            aria-label="Notifications"
            className="relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#181818] border border-[#303030] text-[#B8B8B8] hover:text-[#F5F5F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F03B2E] cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifs > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#F03B2E] text-white text-[9px] font-bold flex items-center justify-center">
                {unreadNotifs}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleNav('/trainer/profile')}
            aria-label="Coach Profile"
            className="min-w-[44px] min-h-[44px] rounded-lg bg-[#202020] border border-[#303030] hover:border-[#F03B2E] flex items-center justify-center text-[#F03B2E] font-bold text-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F03B2E]"
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'T'}
          </button>
        </div>
      </header>

      {/* Mobile & Tablet Slide-out Drawer */}
      <DashboardMobileDrawer
        id="trainer-mobile-drawer"
        isOpen={mobileMenuOpen}
        onClose={closeMobileMenu}
        portalLabel="TRAINER PORTAL"
        navLabel="Trainer mobile navigation"
        navItems={navItems}
        isItemActive={(item) => isActive(item.path)}
        onNavigate={handleNav}
        onLogout={handleLogout}
        logoutLabel="Sign Out"
        currentPath={currentPath}
        userSummary={
          <div className="flex items-center gap-3 pb-1 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-[#202020] border border-[#303030] flex items-center justify-center text-[#F03B2E] font-bold text-sm shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'T'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-[#F5F5F5] truncate">{user?.name || 'Coach'}</span>
              <span className="text-[10px] text-[#858585] truncate">{user?.email || 'Trainer Account'}</span>
            </div>
          </div>
        }
      />

      {/* ── MAIN CONTENT WORKSPACE ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden mm-page-enter">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</div>
      </main>
    </div>
  );
}
