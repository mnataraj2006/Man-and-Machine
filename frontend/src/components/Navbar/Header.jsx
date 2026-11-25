import React, { useState, useEffect, useCallback } from 'react';
import authService from '../../services/auth.js';
import useMobileDrawer from '../../hooks/useMobileDrawer.js';

export default function Header({ onNavigate, currentPath = '/' }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('#home');
  const isAuthed = authService.isAuthenticated();
  const userRole = authService.getRole();

  const navLinks = [
    { name: 'HOME', href: '#home' },
    { name: 'ABOUT', href: '#about' },
    { name: 'MEMBERSHIPS', href: '#memberships' },
    { name: 'TRAINERS', href: '#trainers' },
    { name: 'FACILITIES', href: '#facilities' },
    { name: 'CONTACT', href: '#contact' },
  ];

  const closeMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  useMobileDrawer({
    isOpen: mobileMenuOpen,
    onClose: closeMenu,
    currentPath,
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track active homepage section for red active indicator
  useEffect(() => {
    const sectionIds = navLinks.map((link) => link.href.replace('#', ''));
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (elements.length === 0 || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0 && visible[0].target?.id) {
          setActiveSection(`#${visible[0].target.id}`);
        }
      },
      {
        rootMargin: '-25% 0px -55% 0px',
        threshold: [0.1, 0.25, 0.5],
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateToRoute = (path) => {
    setMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleJoinClick = (e) => {
    e.preventDefault();
    if (isAuthed) {
      navigateToRoute(authService.getDashboardRoute(userRole));
    } else {
      navigateToRoute('/signup');
    }
  };

  const handleLoginClick = (e) => {
    e.preventDefault();
    if (isAuthed) {
      navigateToRoute(authService.getDashboardRoute(userRole));
    } else {
      navigateToRoute('/login');
    }
  };

  const handleSectionClick = (e, href) => {
    setMobileMenuOpen(false);
    setActiveSection(href);
    const id = href.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      e.preventDefault();
      // Delay slightly only if scroll lock was active so browser unlocks scroll cleanly before smooth scrolling
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth' });
      });
    }
  };

  return (
    <>
      <header
        className={`animate-hero-nav fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isScrolled || mobileMenuOpen
            ? 'bg-[#090909]/95 backdrop-blur-md border-b border-[#303030]'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div
          className={`max-w-[1440px] mx-auto px-4 sm:px-6 md:px-14 flex items-center justify-between transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isScrolled ? 'h-16 md:h-[70px]' : 'h-[72px] md:h-20'
          }`}
        >
          {/* Brand Logo & Wordmark */}
          <a
            href="#home"
            onClick={(e) => handleSectionClick(e, '#home')}
            className="group flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F03B2E]"
          >
            <div className="w-9 h-9 md:w-10 md:h-10 bg-white p-1 border border-[#303030] group-hover:border-[#F03B2E] transition-colors duration-300 flex items-center justify-center shrink-0">
              <img
                src="/logo.jpg"
                alt="Man & Machine Fitness Centre Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span
              className="font-editorial-label text-[#F5F5F5] group-hover:text-[#F03B2E] transition-colors duration-300 tracking-[0.12em] sm:tracking-[0.14em] whitespace-nowrap"
              style={{ fontSize: '12px', fontWeight: 700 }}
            >
              MAN &amp; MACHINE
            </span>
          </a>

          {/* Desktop Links */}
          <nav className="hidden lg:flex items-center gap-[22px]" aria-label="Main navigation">
            {navLinks.map((link) => {
              const isActive = activeSection === link.href;
              return (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => handleSectionClick(e, link.href)}
                  aria-current={isActive ? 'location' : undefined}
                  className={`relative font-editorial-label transition-colors duration-300 py-2 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F03B2E] ${
                    isActive
                      ? 'text-[#F03B2E]'
                      : 'text-[#F5F5F5]/90 hover:text-[#F03B2E]'
                  }`}
                >
                  {link.name}
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 right-0 bottom-0 h-[2px] bg-[#F03B2E] transition-transform duration-300 origin-left ${
                      isActive ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </a>
              );
            })}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-5 shrink-0">
            <a
              href={isAuthed ? '/account' : '/login'}
              onClick={handleLoginClick}
              className="font-editorial-label text-[#B8B8B8] hover:text-[#F5F5F5] transition-colors duration-300 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F03B2E]"
            >
              {isAuthed ? 'DASHBOARD' : 'LOGIN'}
            </a>
            <a
              href={isAuthed ? '/account' : '/signup'}
              onClick={handleJoinClick}
              className="btn-editorial-primary !py-[14px] !px-[22px]"
            >
              <span>{isAuthed ? 'MY ACCOUNT' : 'JOIN NOW'}</span>
            </a>
          </div>

          {/* Mobile Hamburger / Close Button (Min 44x44px touch target) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="lg:hidden relative w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center border border-[#303030] bg-[#181818]/90 hover:border-[#F03B2E] text-[#F5F5F5] cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F03B2E] shrink-0"
            aria-expanded={mobileMenuOpen}
            aria-controls="public-mobile-drawer"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            <span className="relative w-5 h-4 flex flex-col justify-between items-center" aria-hidden="true">
              <span
                className={`block w-5 h-[2px] bg-current rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] origin-center ${
                  mobileMenuOpen ? 'translate-y-[7px] rotate-45 bg-[#F03B2E]' : ''
                }`}
              />
              <span
                className={`block w-5 h-[2px] bg-current rounded-full transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  mobileMenuOpen ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'
                }`}
              />
              <span
                className={`block w-5 h-[2px] bg-current rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] origin-center ${
                  mobileMenuOpen ? '-translate-y-[7px] -rotate-45 bg-[#F03B2E]' : ''
                }`}
              />
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer & Backdrop rendered outside <header> so transform/backdrop-blur never traps fixed positioning */}
      <div
        id="public-mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
        aria-hidden={!mobileMenuOpen}
        className={`lg:hidden fixed inset-0 z-40 flex justify-end ${
          mobileMenuOpen
            ? 'visible pointer-events-auto transition-[visibility] duration-0'
            : 'invisible pointer-events-none transition-[visibility] delay-300 duration-0'
        }`}
      >
        {/* Dark Backdrop Overlay */}
        <div
          data-testid="public-drawer-backdrop"
          aria-hidden="true"
          onClick={closeMenu}
          className={`fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            mobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Slide-In Drawer Panel */}
        <div
          className={`relative z-10 w-[min(400px,86vw)] max-w-full h-full bg-[#090909] border-l border-[#303030] shadow-2xl flex flex-col justify-between overflow-y-auto overscroll-contain px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isScrolled ? 'pt-[88px] md:pt-[94px]' : 'pt-[96px] md:pt-[104px]'
          } ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <nav className="flex flex-col gap-1.5" aria-label="Mobile navigation">
            {navLinks.map((link, idx) => {
              const isActive = activeSection === link.href;
              return (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => handleSectionClick(e, link.href)}
                  aria-current={isActive ? 'location' : undefined}
                  className={`group font-editorial-display text-2xl sm:text-3xl font-semibold uppercase transition-all duration-300 py-3 px-3 border-b border-[#303030]/60 flex items-center justify-between min-h-[52px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F03B2E] ${
                    isActive
                      ? 'text-[#F03B2E] border-l-2 border-l-[#F03B2E] bg-[#181818]/80'
                      : 'text-[#F5F5F5] hover:text-[#F03B2E] hover:bg-[#181818]/40'
                  }`}
                  style={{
                    transitionDelay: mobileMenuOpen ? `${70 + idx * 35}ms` : '0ms',
                    opacity: mobileMenuOpen ? 1 : 0,
                    transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(16px)',
                  }}
                >
                  <span>{link.name}</span>
                  <span
                    className={`font-editorial-label ${
                      isActive ? 'text-[#F03B2E]' : 'text-[#858585] group-hover:text-[#F03B2E]'
                    }`}
                  >
                    0{idx + 1}
                  </span>
                </a>
              );
            })}
          </nav>

          <div
            className="pt-8 flex flex-col gap-3 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              transitionDelay: mobileMenuOpen ? '280ms' : '0ms',
              opacity: mobileMenuOpen ? 1 : 0,
              transform: mobileMenuOpen ? 'translateY(0)' : 'translateY(12px)',
            }}
          >
            <a
              href={isAuthed ? '/account' : '/signup'}
              onClick={handleJoinClick}
              className="btn-editorial-primary w-full text-center min-h-[48px]"
            >
              {isAuthed ? 'GO TO DASHBOARD' : 'JOIN NOW'}
            </a>
            <a
              href={isAuthed ? '/account' : '/login'}
              onClick={handleLoginClick}
              className="btn-editorial-secondary w-full text-center min-h-[48px]"
            >
              {isAuthed ? 'MY ACCOUNT' : 'LOGIN'}
            </a>
            <p className="font-editorial-label text-[#B8B8B8] text-center pt-2">
              KOVILPATTI • KARUR • SIVAKASI
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
