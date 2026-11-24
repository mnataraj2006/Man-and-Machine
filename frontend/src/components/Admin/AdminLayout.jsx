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
      <div className="min-h-screen bg-[#09090B] text-[#F5F5F5] flex selection:bg-[#E58A32] selection:text-white font-sans antialiased">
        {/* ── DESKTOP SIDEBAR ── */}
        <aside className="hidden lg:flex flex-col w-64 bg-[#111111] border-r border-[#292929] shrink-0 sticky top-0 h-screen z-30">
          {/* Logo & Header */}
          <div className="p-5 border-b border-[#292929] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 border border-[#292929]">
              <img src="/logo.jpg" alt="Man & Machine" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span
                className="font-bold text-sm text-[#F5F5F5] uppercase tracking-tight truncate"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                MAN &amp; MACHINE
              </span>
              <span className="text-[10px] font-semibold text-[#E58A32] uppercase tracking-widest">
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
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#E58A32] text-black font-bold shadow-lg shadow-[#E58A32]/20'
                      : 'text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#181818]'
                  }`}
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-black' : 'text-[#A3A3A3]'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Profile & Logout Bottom Bar */}
          <div className="p-4 border-t border-[#292929] bg-[#0E0E0E] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-[#E58A32]/20 border border-[#E58A32]/40 flex items-center justify-center text-[#E58A32] font-bold text-xs shrink-0">
                  {user?.name ? user.name[0].toUpperCase() : 'A'}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-xs font-bold text-[#F5F5F5] truncate">{user?.name || 'Administrator'}</span>
                  <span className="text-[10px] text-[#A3A3A3] truncate">{user?.email || 'admin@manandmachine.com'}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#181818] hover:bg-red-500/10 text-[#A3A3A3] hover:text-red-400 border border-[#292929] hover:border-red-500/30 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        {/* ── MAIN CONTENT AREA ── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          {/* Top Bar */}
          <header className="h-16 px-4 sm:px-8 bg-[#09090B]/95 backdrop-blur-md border-b border-[#292929] flex items-center justify-between sticky top-0 z-20">
            {/* Left: Mobile hamburger & Page Title / Breadcrumbs */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg bg-[#181818] text-[#F5F5F5] border border-[#292929] hover:border-[#E58A32] cursor-pointer"
                aria-label="Open Navigation"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs uppercase font-mono text-[#A3A3A3]">Admin /</span>
                <h1
                  className="text-base sm:text-lg font-bold uppercase tracking-tight text-[#F5F5F5]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {getPageTitle()}
                </h1>
              </div>
            </div>

            {/* Right: Branch Selector & Admin Badge */}
            <div className="flex items-center gap-3">
              {/* Branch Filter Selector */}
              <div className="relative flex items-center">
                <Building className="w-3.5 h-3.5 text-[#E58A32] absolute left-3 pointer-events-none" />
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="pl-8 pr-8 py-1.5 bg-[#181818] text-[#F5F5F5] text-xs font-semibold rounded-xl border border-[#292929] hover:border-[#E58A32] focus:border-[#E58A32] focus:outline-none appearance-none cursor-pointer transition-colors"
                >
                  <option value="ALL">All Branches (HQ &amp; Outlets)</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.city} Branch ({b.name})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-[#A3A3A3] absolute right-2.5 pointer-events-none" />
              </div>

              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#E58A32]/10 border border-[#E58A32]/30 text-[#E58A32] text-[10px] font-bold uppercase tracking-wider">
                <ShieldAlert className="w-3.5 h-3.5 text-[#E58A32]" />
                <span>Admin Scope: {activeBranchName}</span>
              </div>
            </div>
          </header>

          {/* Main Outlet */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
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
            <div className="relative w-72 max-w-[80vw] bg-[#111111] border-r border-[#292929] flex flex-col h-full z-10 shadow-2xl">
              {/* Drawer Header */}
              <div className="p-4 border-b border-[#292929] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shrink-0">
                    <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
                  </div>
                  <span
                    className="font-bold text-sm text-[#F5F5F5] uppercase tracking-tight"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    MAN &amp; MACHINE
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg bg-[#181818] text-[#A3A3A3] hover:text-white border border-[#292929]"
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
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#E58A32] text-black font-bold shadow-md'
                          : 'text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#181818]'
                      }`}
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-black' : 'text-[#A3A3A3]'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Mobile Drawer Footer */}
              <div className="p-4 border-t border-[#292929] bg-[#0E0E0E]">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#181818] hover:bg-red-500/10 text-[#A3A3A3] hover:text-red-400 border border-[#292929]"
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
