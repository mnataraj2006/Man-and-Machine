import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  Dumbbell,
  CreditCard,
  ClipboardList,
  CalendarCheck,
  Receipt,
  Megaphone,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Building,
  ShieldAlert,
} from 'lucide-react';
import authService from '../../services/auth.js';
import adminService from '../../services/adminService.js';

// Admin Context to broadcast selectedBranch across all child pages
export const AdminContext = createContext({
  selectedBranch: 'ALL',
  setSelectedBranch: () => {},
  branches: [],
  refreshBranches: () => {},
});

export const useAdmin = () => useContext(AdminContext);

export default function AdminLayout({ children, currentPath, onNavigate, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [branches, setBranches] = useState([]);
  const [user, setUser] = useState(authService.getUser());

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Branches', path: '/admin/branches', icon: Building2 },
    { label: 'Clients', path: '/admin/clients', icon: Users },
    { label: 'Trainers', path: '/admin/trainers', icon: Dumbbell },
    { label: 'Membership Plans', path: '/admin/membership-plans', icon: ClipboardList },
    { label: 'Memberships', path: '/admin/memberships', icon: CreditCard },
    { label: 'Attendance', path: '/admin/attendance', icon: CalendarCheck },
    { label: 'Payments', path: '/admin/payments', icon: Receipt },
    { label: 'Announcements', path: '/admin/notifications', icon: Megaphone },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const fetchBranches = async () => {
    try {
      const res = await adminService.getBranches();
      if (res.branches) {
        setBranches(res.branches);
      }
    } catch (err) {
      console.error('Failed to load branches in AdminLayout:', err);
    }
  };

  useEffect(() => {
    fetchBranches();
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
    authService.logout();
    if (onLogout) {
      onLogout();
    } else {
      handleNav('/login');
    }
  };

  const getPageTitle = () => {
    const item = navItems.find((n) => currentPath === n.path || (n.path !== '/admin/dashboard' && currentPath.startsWith(n.path)));
    return item ? item.label : 'Admin Console';
  };

  const activeBranchName =
    selectedBranch === 'ALL'
      ? 'All Branches'
      : branches.find((b) => b._id === selectedBranch)?.city || 'Selected Branch';

  return (
    <AdminContext.Provider
      value={{
        selectedBranch,
        setSelectedBranch,
        branches,
        refreshBranches: fetchBranches,
      }}
    >
      <div className="min-h-screen bg-[#090909] text-[#F5F5F5] flex selection:bg-[#EB3E2E] selection:text-white font-sans antialiased">
        {/* ── DESKTOP SIDEBAR ── */}
        <aside className="hidden lg:flex flex-col w-64 bg-[#111111] border-r border-[#303030] shrink-0 sticky top-0 h-screen z-30">
          {/* Logo & Header */}
          <div className="p-5 border-b border-[#252525] flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white p-1.5 flex items-center justify-center shrink-0 border border-[#303030]">
              <img src="/logo.jpg" alt="Man & Machine" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-display font-bold text-base text-[#F5F5F5] uppercase tracking-tight truncate">
                MAN &amp; MACHINE
              </span>
              <span className="text-[10px] font-semibold text-[#EB3E2E] uppercase tracking-widest">
                ADMIN PORTAL
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                currentPath === item.path ||
                (item.path !== '/admin/dashboard' && currentPath.startsWith(item.path));

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNav(item.path)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-[#EB3E2E] text-white font-bold shadow-sm'
                      : 'text-[#B8B8B8] hover:text-[#F5F5F5] hover:bg-[#181818]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#858585]'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Profile & Logout Bottom Bar */}
          <div className="p-4 border-t border-[#252525] bg-[#111111] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-[#EB3E2E]/15 border border-[#EB3E2E]/40 flex items-center justify-center text-[#EB3E2E] font-bold text-xs shrink-0">
                  {user?.name ? user.name[0].toUpperCase() : 'A'}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-xs font-bold text-[#F5F5F5] truncate">{user?.name || 'Administrator'}</span>
                  <span className="text-[10px] text-[#858585] truncate">{user?.email || 'admin@manandmachine.com'}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#181818] hover:bg-[#EB3E2E]/15 text-[#B8B8B8] hover:text-[#FF493B] border border-[#303030] hover:border-[#EB3E2E]/40 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        {/* ── MAIN CONTENT AREA ── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          {/* Top Bar */}
          <header className="h-16 px-4 sm:px-8 bg-[#090909]/95 backdrop-blur-md border-b border-[#252525] flex items-center justify-between sticky top-0 z-20">
            {/* Left: Mobile hamburger & Page Title / Breadcrumbs */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg bg-[#181818] text-[#F5F5F5] border border-[#303030] hover:border-[#EB3E2E] cursor-pointer"
                aria-label="Open Navigation"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs uppercase font-mono text-[#858585]">Admin /</span>
                <h1 className="mm-page-title text-lg sm:text-xl">
                  {getPageTitle()}
                </h1>
              </div>
            </div>

            {/* Right: Branch Selector & Admin Badge */}
            <div className="flex items-center gap-3">
              {/* Branch Filter Selector */}
              <div className="relative flex items-center">
                <Building className="w-3.5 h-3.5 text-[#EB3E2E] absolute left-3 pointer-events-none" />
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="pl-8 pr-8 py-1.5 bg-[#181818] text-[#F5F5F5] text-xs font-semibold rounded-lg border border-[#303030] hover:border-[#EB3E2E] focus:border-[#EB3E2E] focus:outline-none appearance-none cursor-pointer transition-colors"
                >
                  <option value="ALL">All Branches (HQ &amp; Outlets)</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.city} Branch ({b.name})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-[#858585] absolute right-2.5 pointer-events-none" />
              </div>

              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#EB3E2E]/10 border border-[#EB3E2E]/35 text-[#EB3E2E] text-[10px] font-bold uppercase tracking-wider">
                <ShieldAlert className="w-3.5 h-3.5 text-[#EB3E2E]" />
                <span>Admin Scope: {activeBranchName}</span>
              </div>
            </div>
          </header>

          {/* Main Outlet */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto mm-page-enter">
            {children}
          </main>
        </div>

        {/* ── MOBILE SLIDE-OUT DRAWER ── */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer Content */}
            <div className="relative w-72 max-w-[80vw] bg-[#111111] border-r border-[#303030] flex flex-col h-full z-10 shadow-2xl">
              {/* Drawer Header */}
              <div className="p-4 border-b border-[#252525] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shrink-0">
                    <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
                  </div>
                  <span className="font-display font-bold text-base text-[#F5F5F5] uppercase tracking-tight">
                    MAN &amp; MACHINE
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg bg-[#181818] text-[#B8B8B8] hover:text-white border border-[#303030]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Navigation List */}
              <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    currentPath === item.path ||
                    (item.path !== '/admin/dashboard' && currentPath.startsWith(item.path));

                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => handleNav(item.path)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#EB3E2E] text-white font-bold shadow-md'
                          : 'text-[#B8B8B8] hover:text-[#F5F5F5] hover:bg-[#181818]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#858585]'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Mobile Drawer Footer */}
              <div className="p-4 border-t border-[#252525] bg-[#111111]">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#181818] hover:bg-[#EB3E2E]/15 text-[#B8B8B8] hover:text-[#FF493B] border border-[#303030]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminContext.Provider>
  );
}
