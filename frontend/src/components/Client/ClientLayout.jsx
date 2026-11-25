import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
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
  MapPin,
  ExternalLink,
} from 'lucide-react';
import authService from '../../services/auth.js';
import clientService from '../../services/clientService.js';
import DashboardMobileDrawer from '../UI/DashboardMobileDrawer.jsx';

export default function ClientLayout({ children, currentPath, onNavigate, onLogout }) {
  const { resolvedTheme } = useTheme();
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

  const isTrainerAssigned = Boolean(
    user?.trainerAssigned === true ||
    user?.clientProfile?.trainerAssigned === true
  );

  const hasActiveMembership = Boolean(user?.hasActiveMembership);

  const navItems = [
    { label: 'Dashboard', path: '/client/dashboard', icon: LayoutDashboard },
    { label: 'Attendance', path: '/client/attendance', icon: CalendarCheck },
    {
      label: hasActiveMembership ? 'Membership' : 'Get Membership',
      path: '/client/membership',
      icon: CreditCard,
      highlight: !hasActiveMembership,
      badge: !hasActiveMembership ? 'BUY' : null,
    },
    { label: 'Payments', path: '/client/payments', icon: Receipt },
    { label: 'My Trainer', path: '/client/my-trainer', icon: UserCheck },
    ...(isTrainerAssigned ? [{ label: 'My Workouts', path: '/client/workouts', icon: Dumbbell }] : []),
    { label: 'Progress', path: '/client/progress', icon: TrendingUp },
    {
      label: 'Notifications',
      path: '/client/notifications',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : null,
    },
    { label: 'Profile', path: '/client/profile', icon: User },
    { label: 'Settings', path: '/client/settings', icon: Settings },
  ];

  const isItemActive = (item) =>
    currentPath === item.path ||
    (item.path === '/client/workouts' && currentPath.startsWith('/client/workouts/')) ||
    (item.path === '/client/my-trainer' && (currentPath === '/client/trainer' || currentPath.startsWith('/client/my-trainer')));

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

  const handleLogoutClick = () => {
    setMobileMenuOpen(false);
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
    <div data-theme={resolvedTheme} className="mm-dashboard-theme min-h-screen bg-[#090909] text-[#F5F5F5] flex selection:bg-[#EB3E2E] selection:text-white">
      {/* ════════════════════════════════════════════════
          DESKTOP SIDEBAR (>= 1024px)
      ════════════════════════════════════════════════ */}
      <aside className="hidden lg:flex w-64 xl:w-72 bg-[#111111] border-r border-[#303030] flex-col justify-between shrink-0 sticky top-0 h-screen z-40 overflow-y-auto">
        {/* Top: Logo & Brand */}
        <div className="flex flex-col">
          <div className="p-5 xl:p-6 border-b border-[#252525] flex items-center justify-between">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                handleNav('/');
              }}
              className="flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-lg bg-white p-1.5 flex items-center justify-center shrink-0 border border-[#303030]">
                <img src="/logo.jpg" alt="Man & Machine Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-base xl:text-lg text-[#F5F5F5] uppercase tracking-tight group-hover:text-[#EB3E2E] transition-colors leading-tight">
                  MAN &amp; MACHINE
                </span>
                <span className="text-[9px] uppercase tracking-widest text-[#EB3E2E] font-semibold">
                  ATHLETE PORTAL
                </span>
              </div>
            </a>
          </div>

          {/* Member Chip */}
          <div className="p-4 mx-3 my-3 rounded-xl bg-[#181818] border border-[#303030] flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#202020] border border-[#303030] flex items-center justify-center text-[#EB3E2E] font-bold text-sm shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'M'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-display text-sm font-bold uppercase text-[#F5F5F5] truncate leading-tight">
                {user?.name || 'Athlete'}
              </span>
              <span className="text-[10px] text-[#858585] truncate">{branchCity} Branch</span>
            </div>
          </div>

          {/* Nav List */}
          <nav className="px-3 flex flex-col gap-1 pb-4" aria-label="Client navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item);

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNav(item.path)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[#EB3E2E] text-white font-bold shadow-sm'
                      : item.highlight
                      ? 'border border-[#EB3E2E]/40 bg-[#EB3E2E]/10 text-[#EB3E2E] hover:bg-[#EB3E2E]/20 font-bold'
                      : 'text-[#B8B8B8] hover:text-[#F5F5F5] hover:bg-[#181818]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#858585]'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-white text-[#EB3E2E]' : 'bg-[#EB3E2E] text-white'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar: Logout */}
        <div className="p-3 border-t border-[#252525] flex flex-col gap-1">
          <button
            type="button"
            onClick={handleLogoutClick}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-[#B8B8B8] hover:text-[#FF493B] hover:bg-[#EB3E2E]/10 transition-colors cursor-pointer"
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
        <header className="h-16 sm:h-20 px-3 sm:px-8 bg-[#090909]/95 backdrop-blur-md border-b border-[#252525] flex items-center justify-between gap-2 sticky top-0 z-30">
          {/* Left: Mobile Hamburger + Brand & Desktop Greeting */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#181818] text-[#F5F5F5] border border-[#303030] hover:border-[#F03B2E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F03B2E] cursor-pointer shrink-0 transition-colors"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="client-mobile-drawer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Mobile Logo (< 1024px) */}
            <div className="lg:hidden flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 border border-[#303030]">
                <img src="/logo.jpg" alt="Man & Machine Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-display font-bold text-sm text-[#F5F5F5] uppercase tracking-tight truncate leading-tight">
                  MAN &amp; MACHINE
                </span>
                <span className="text-[8px] uppercase tracking-widest text-[#F03B2E] font-semibold truncate">
                  ATHLETE PORTAL
                </span>
              </div>
            </div>

            {/* Desktop Greeting (>= 1024px) */}
            <div className="hidden lg:flex flex-col">
              <span className="font-display font-bold text-base xl:text-lg text-[#F5F5F5] uppercase tracking-tight leading-tight">
                {getGreeting()},{' '}
                <span className="text-[#EB3E2E]">{user?.name ? user.name.split(' ')[0] : 'ATHLETE'}</span>
              </span>
              <span className="text-[11px] text-[#858585]">
                Every rep counts. Keep building your strongest self.
              </span>
            </div>
          </div>

          {/* Right Header Tools */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Branch Badge */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181818] border border-[#303030] text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8]">
              <MapPin className="w-3.5 h-3.5 text-[#EB3E2E]" />
              <span>{branchCity} BRANCH</span>
            </div>

            {/* Notifications Bell */}
            <button
              type="button"
              onClick={() => handleNav('/client/notifications')}
              className="relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#181818] hover:bg-[#202020] border border-[#303030] text-[#B8B8B8] hover:text-[#F5F5F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F03B2E] transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#EB3E2E] animate-pulse" />
              )}
            </button>

            {/* Profile Avatar Button */}
            <button
              type="button"
              onClick={() => handleNav('/client/profile')}
              aria-label="Profile"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center gap-2 px-1.5 sm:px-2.5 rounded-lg bg-[#181818] hover:bg-[#202020] border border-[#303030] text-xs font-bold text-[#F5F5F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F03B2E] transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded bg-[#EB3E2E]/15 border border-[#EB3E2E]/35 flex items-center justify-center text-[#EB3E2E] font-bold text-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'M'}
              </div>
              <span className="hidden md:inline pr-0.5 font-mono uppercase text-[11px]">PROFILE</span>
            </button>
          </div>
        </header>

        {/* ── MAIN CONTENT OUTLET ── */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-12 overflow-x-hidden mm-page-enter">
          {children}
        </main>

        {/* ════════════════════════════════════════════════
            MOBILE BOTTOM NAVIGATION (< 1024px)
        ════════════════════════════════════════════════ */}
        <nav
          aria-label="Mobile quick navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 min-h-16 bg-[#111111]/95 backdrop-blur-md border-t border-[#252525] z-30 flex items-center justify-between px-1 pb-[env(safe-area-inset-bottom)]"
        >
          {/* 1. Home */}
          <button
            type="button"
            onClick={() => handleNav('/client/dashboard')}
            className={`flex-1 min-w-0 min-h-[48px] flex flex-col items-center justify-center gap-1 py-1.5 cursor-pointer transition-colors ${
              currentPath === '/client/dashboard' ? 'text-[#F03B2E]' : 'text-[#858585] hover:text-[#F5F5F5]'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            <span className="text-[9px] font-bold uppercase tracking-wider truncate max-w-full px-0.5">Home</span>
          </button>

          {/* 2. My Trainer */}
          <button
            type="button"
            onClick={() => handleNav('/client/my-trainer')}
            className={`flex-1 min-w-0 min-h-[48px] flex flex-col items-center justify-center gap-1 py-1.5 cursor-pointer transition-colors ${
              currentPath === '/client/my-trainer' || currentPath === '/client/trainer' ? 'text-[#F03B2E]' : 'text-[#858585] hover:text-[#F5F5F5]'
            }`}
          >
            <UserCheck className="w-5 h-5 shrink-0" />
            <span className="text-[9px] font-bold uppercase tracking-wider truncate max-w-full px-0.5">Trainer</span>
          </button>

          {/* 3. Workouts (if trainer assigned) OR Visits (if self-trained) */}
          {isTrainerAssigned ? (
            <button
              type="button"
              onClick={() => handleNav('/client/workouts')}
              className={`flex-1 min-w-0 min-h-[48px] flex flex-col items-center justify-center gap-1 py-1.5 cursor-pointer transition-colors ${
                currentPath.startsWith('/client/workouts') ? 'text-[#F03B2E]' : 'text-[#858585] hover:text-[#F5F5F5]'
              }`}
            >
              <Dumbbell className="w-5 h-5 shrink-0" />
              <span className="text-[9px] font-bold uppercase tracking-wider truncate max-w-full px-0.5">Workout</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleNav('/client/attendance')}
              className={`flex-1 min-w-0 min-h-[48px] flex flex-col items-center justify-center gap-1 py-1.5 cursor-pointer transition-colors ${
                currentPath === '/client/attendance' ? 'text-[#F03B2E]' : 'text-[#858585] hover:text-[#F5F5F5]'
              }`}
            >
              <CalendarCheck className="w-5 h-5 shrink-0" />
              <span className="text-[9px] font-bold uppercase tracking-wider truncate max-w-full px-0.5">Visits</span>
            </button>
          )}

          {/* 4. Progress */}
          <button
            type="button"
            onClick={() => handleNav('/client/progress')}
            className={`flex-1 min-w-0 min-h-[48px] flex flex-col items-center justify-center gap-1 py-1.5 cursor-pointer transition-colors ${
              currentPath === '/client/progress' ? 'text-[#F03B2E]' : 'text-[#858585] hover:text-[#F5F5F5]'
            }`}
          >
            <TrendingUp className="w-5 h-5 shrink-0" />
            <span className="text-[9px] font-bold uppercase tracking-wider truncate max-w-full px-0.5">Progress</span>
          </button>

          {/* 5. Membership */}
          <button
            type="button"
            onClick={() => handleNav('/client/membership')}
            className={`flex-1 min-w-0 min-h-[48px] flex flex-col items-center justify-center gap-1 py-1.5 cursor-pointer transition-colors ${
              currentPath === '/client/membership' ? 'text-[#F03B2E]' : 'text-[#858585] hover:text-[#F5F5F5]'
            }`}
          >
            <CreditCard className="w-5 h-5 shrink-0" />
            <span className="text-[9px] font-bold uppercase tracking-wider truncate max-w-full px-0.5">Member</span>
          </button>

          {/* 6. More (Opens Full Mobile Sidebar Drawer) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="client-mobile-drawer"
            aria-label="Open full navigation menu"
            className={`flex-1 min-w-0 min-h-[48px] flex flex-col items-center justify-center gap-1 py-1.5 cursor-pointer transition-colors ${
              mobileMenuOpen ? 'text-[#F03B2E]' : 'text-[#858585] hover:text-[#F5F5F5]'
            }`}
          >
            <Menu className="w-5 h-5 shrink-0" />
            <span className="text-[9px] font-bold uppercase tracking-wider truncate max-w-full px-0.5">More</span>
          </button>
        </nav>
      </div>

      {/* ── UNIFIED CLIENT MOBILE SIDEBAR DRAWER ── */}
      <DashboardMobileDrawer
        id="client-mobile-drawer"
        isOpen={mobileMenuOpen}
        onClose={closeMobileMenu}
        portalLabel="ATHLETE PORTAL"
        navLabel="Client mobile navigation"
        navItems={navItems}
        isItemActive={isItemActive}
        onNavigate={handleNav}
        onLogout={handleLogoutClick}
        logoutLabel="LOG OUT"
        currentPath={currentPath}
        topSlot={
          <div className="p-3.5 mx-3 mt-3 rounded-xl bg-[#181818] border border-[#303030] flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-[#202020] border border-[#303030] flex items-center justify-center text-[#F03B2E] font-bold text-sm shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'M'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-display text-sm font-bold uppercase text-[#F5F5F5] truncate leading-tight">
                {user?.name || 'Athlete'}
              </span>
              <span className="text-[10px] text-[#858585] truncate">{branchCity} Branch</span>
            </div>
          </div>
        }
        footerTopSlot={
          <button
            type="button"
            onClick={() => handleNav('/')}
            className="w-full min-h-[44px] py-2.5 px-3 rounded-lg bg-[#181818] hover:bg-[#202020] border border-[#303030] text-center text-xs font-bold uppercase tracking-wider text-[#B8B8B8] hover:text-[#F5F5F5] flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            <span>Visit Homepage</span>
          </button>
        }
      />
    </div>
  );
}
