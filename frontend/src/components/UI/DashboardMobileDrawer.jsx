import React from 'react';
import { X, LogOut } from 'lucide-react';
import useMobileDrawer from '../../hooks/useMobileDrawer.js';

/**
 * Unified slide-out mobile sidebar drawer for Admin, Trainer, and Client portals.
 * Must be rendered OUTSIDE sticky/transform/backdrop-blur headers so `position: fixed`
 * reliably covers the entire viewport.
 */
export default function DashboardMobileDrawer({
  id = 'dashboard-mobile-drawer',
  isOpen,
  onClose,
  portalLabel,
  navLabel = 'Mobile navigation',
  navItems = [],
  isItemActive,
  onNavigate,
  onLogout,
  logoutLabel = 'Log Out',
  currentPath,
  topSlot = null,
  footerTopSlot = null,
  userSummary = null,
}) {
  useMobileDrawer({ isOpen, onClose, currentPath });

  return (
    <div
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label={`${portalLabel} navigation menu`}
      aria-hidden={!isOpen}
      className={`lg:hidden fixed inset-0 z-50 flex ${
        isOpen
          ? 'visible pointer-events-auto transition-[visibility] duration-0'
          : 'invisible pointer-events-none transition-[visibility] delay-300 duration-0'
      }`}
    >
      {/* Dark Backdrop Overlay */}
      <div
        data-testid="drawer-backdrop"
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Slide-out Sidebar Panel */}
      <aside
        className={`relative z-10 w-[min(300px,84vw)] max-w-full h-full bg-[#111111] border-r border-[#303030] shadow-2xl flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Brand Header & Close Button */}
        <div className="px-4 py-3.5 border-b border-[#252525] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 border border-[#303030]">
              <img src="/logo.jpg" alt="Man & Machine" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-display font-bold text-sm text-[#F5F5F5] uppercase tracking-tight truncate leading-tight">
                MAN &amp; MACHINE
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-widest text-[#F03B2E] truncate">
                {portalLabel}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#181818] hover:bg-[#202020] text-[#F5F5F5] border border-[#303030] hover:border-[#F03B2E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F03B2E] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Optional Top Profile / Member Chip */}
        {topSlot}

        {/* Scrollable Navigation Links */}
        <nav
          aria-label={navLabel}
          className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-1 custom-scrollbar"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item);

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => onNavigate(item.path)}
                aria-current={active ? 'page' : undefined}
                className={`w-full min-h-[44px] flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F03B2E] ${
                  active
                    ? 'bg-[#F03B2E] text-white font-bold shadow-sm'
                    : item.highlight
                    ? 'border border-[#F03B2E]/40 bg-[#F03B2E]/10 text-[#F03B2E] hover:bg-[#F03B2E]/20 font-bold'
                    : 'text-[#B8B8B8] hover:text-[#F5F5F5] hover:bg-[#181818]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active ? 'text-white' : item.highlight ? 'text-[#F03B2E]' : 'text-[#858585]'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== null && item.badge !== undefined && item.badge !== 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      active ? 'bg-white text-[#F03B2E]' : 'bg-[#F03B2E] text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#252525] bg-[#111111] flex flex-col gap-2.5 shrink-0">
          {userSummary}
          {footerTopSlot}
          <button
            type="button"
            onClick={onLogout}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#181818] hover:bg-[#F03B2E]/15 text-[#B8B8B8] hover:text-[#FF493B] border border-[#303030] hover:border-[#F03B2E]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F03B2E] transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>{logoutLabel}</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
