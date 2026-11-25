import React, { useState, useEffect } from 'react';
import authService from '../../services/auth.js';

export default function Header({ onNavigate }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
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

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
    const id = href.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`animate-hero-nav fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isScrolled || mobileMenuOpen
          ? 'bg-[#090909]/92 backdrop-blur-md border-b border-[#303030]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div
        className={`max-w-[1440px] mx-auto px-6 md:px-14 flex items-center justify-between transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isScrolled ? 'h-16 md:h-[70px]' : 'h-[72px] md:h-20'
        }`}
      >
        {/* Brand Logo & Wordmark */}
        <a
          href="#home"
          onClick={(e) => handleSectionClick(e, '#home')}
          className="group flex items-center gap-3 shrink-0"
        >
          <div className="w-9 h-9 md:w-10 md:h-10 bg-white p-1 border border-[#303030] group-hover:border-[#EB3E2E] transition-colors duration-300 flex items-center justify-center shrink-0">
            <img
              src="/logo.jpg"
              alt="Man & Machine Fitness Centre Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <span
            className="font-editorial-label text-[#F5F5F5] group-hover:text-[#EB3E2E] transition-colors duration-300 tracking-[0.14em] whitespace-nowrap"
            style={{ fontSize: '12px', fontWeight: 700 }}
          >
            MAN &amp; MACHINE
          </span>
        </a>

        {/* Desktop Links */}
        <nav className="hidden lg:flex items-center gap-[22px]" aria-label="Main navigation">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => handleSectionClick(e, link.href)}
              className="font-editorial-label text-[#F5F5F5]/90 hover:text-[#EB3E2E] transition-colors duration-300 py-2 whitespace-nowrap"
            >
              {link.name}
            </a>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-5 shrink-0">
          <a
            href={isAuthed ? '/account' : '/login'}
            onClick={handleLoginClick}
            className="font-editorial-label text-[#B8B8B8] hover:text-[#F5F5F5] transition-colors duration-300 whitespace-nowrap"
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

        {/* Mobile MENU Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="lg:hidden font-editorial-label text-[#F5F5F5] hover:text-[#EB3E2E] transition-colors py-2 px-1 cursor-pointer min-h-[44px] flex items-center"
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {mobileMenuOpen ? 'CLOSE' : 'MENU'}
        </button>
      </div>

      {/* Full-Screen Animated Mobile Menu */}
      <div
        className={`lg:hidden fixed inset-0 top-[72px] z-40 bg-[#090909] border-t border-[#303030] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          mobileMenuOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="h-full max-w-[1440px] mx-auto px-6 py-8 flex flex-col justify-between overflow-y-auto">
          <nav className="flex flex-col gap-4" aria-label="Mobile navigation">
            {navLinks.map((link, idx) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleSectionClick(e, link.href)}
                className="font-editorial-display text-3xl sm:text-4xl font-semibold uppercase text-[#F5F5F5] hover:text-[#EB3E2E] transition-all duration-300 py-1 border-b border-[#303030]/50 flex items-center justify-between"
                style={{
                  transitionDelay: mobileMenuOpen ? `${idx * 45}ms` : '0ms',
                  opacity: mobileMenuOpen ? 1 : 0,
                  transform: mobileMenuOpen ? 'translateY(0)' : 'translateY(12px)',
                }}
              >
                <span>{link.name}</span>
                <span className="font-editorial-label text-[#B8B8B8]">0{idx + 1}</span>
              </a>
            ))}
          </nav>

          <div className="pt-8 flex flex-col gap-3">
            <a
              href={isAuthed ? '/account' : '/signup'}
              onClick={handleJoinClick}
              className="btn-editorial-primary w-full text-center"
            >
              {isAuthed ? 'GO TO DASHBOARD' : 'JOIN MAN & MACHINE'}
            </a>
            <a
              href={isAuthed ? '/account' : '/login'}
              onClick={handleLoginClick}
              className="btn-editorial-secondary w-full text-center"
            >
              {isAuthed ? 'MY ACCOUNT' : 'MEMBER LOGIN'}
            </a>
            <p className="font-editorial-label text-[#B8B8B8] text-center pt-2">
              KOVILPATTI • KARUR • SIVAKASI
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
