import React, { useState, useEffect } from 'react';

export default function Header({ onOpenJoinModal, onNavigate }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const navLinks = [
    { name: 'HOME', href: '#home' },
    { name: 'FACILITIES', href: '#facilities' },
    { name: 'MEMBERSHIP', href: '#membership-plans' },
    { name: 'REVIEWS', href: '#reviews' },
    { name: 'OUR BRANCHES', href: '#branches' },
    { name: 'CONTACT', href: '#contact' },
  ];

  // Smart floating scroll behavior
  useEffect(() => {
    let lastY = window.scrollY;

    const handleScroll = () => {
      const currentY = window.scrollY;
      setIsScrolled(currentY > 20);

      // Never hide if mobile menu is open
      if (mobileMenuOpen) {
        setIsVisible(true);
        return;
      }

      if (currentY > 80) {
        if (currentY > lastY + 6) {
          // Scrolling down
          setIsVisible(false);
        } else if (currentY < lastY - 6) {
          // Scrolling up
          setIsVisible(true);
        }
      } else {
        setIsVisible(true);
      }
      lastY = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mobileMenuOpen]);

  // Prevent background scrolling ONLY while mobile menu is actively open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      } ${
        isScrolled || mobileMenuOpen
          ? 'bg-[#09090B]/95 backdrop-blur-md border-b border-[#292929] shadow-2xl' 
          : 'bg-transparent border-b border-transparent shadow-none'
      }`}
    >
      <div className="h-14 sm:h-16 lg:h-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo & Title */}
        <a 
          className="flex items-center gap-2 sm:gap-3 group text-left min-w-0 shrink"
          href="#home"
          onClick={handleLinkClick}
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-lg sm:rounded-xl bg-white p-1 flex items-center justify-center shrink-0 border border-[#292929] group-hover:border-[#E58A32] group-hover:shadow-[0_0_15px_rgba(229,138,50,0.3)] transition-all">
            <img src="/logo.jpg" alt="Man & Machine Fitness Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col min-w-0">
            <span 
              className="font-bold text-[13px] sm:text-[15px] lg:text-[18px] text-[#F5F5F5] uppercase tracking-tight truncate group-hover:text-[#E58A32] transition-colors leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              MAN &amp; MACHINE
            </span>
            <span className="text-[8px] sm:text-[9.5px] uppercase tracking-widest text-[#A3A3A3] truncate">
              FITNESS CENTRE
            </span>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden xl:flex items-center gap-6 lg:gap-8">
          {navLinks.map((link, idx) => (
            <a
              key={link.name}
              href={link.href}
              className={`text-xs uppercase tracking-wider font-semibold transition-colors py-2 ${
                idx === 0
                  ? 'text-[#E58A32]'
                  : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
              }`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {link.name}
            </a>
          ))}
        </nav>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <a
            href="/login"
            onClick={(e) => {
              e.preventDefault();
              if (onNavigate) {
                onNavigate('/login');
              } else {
                window.history.pushState({}, '', '/login');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }}
            className="hidden sm:inline-flex items-center justify-center bg-[#E58A32] hover:bg-[#F09A43] text-white font-bold text-xs uppercase tracking-wider px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg shadow-[0_0_15px_rgba(229,138,50,0.30)] transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap min-h-[36px]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            JOIN NOW
          </a>
          
          {/* Desktop-only user icon */}
          <a 
            href="/login"
            onClick={(e) => {
              e.preventDefault();
              if (onNavigate) {
                onNavigate('/login');
              } else {
                window.history.pushState({}, '', '/login');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }}
            title="Member Portal"
            aria-label="Member Portal"
            className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#141414] border border-[#292929] items-center justify-center shrink-0 cursor-pointer hover:border-[#E58A32] hover:text-[#E58A32] text-[#F5F5F5] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] sm:text-[20px]">person</span>
          </a>

          {/* Mobile Menu Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg bg-[#141414] border border-[#292929] text-[#F5F5F5] hover:text-[#E58A32] hover:border-[#E58A32] transition-colors focus:outline-none cursor-pointer"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <span className="material-symbols-outlined text-[22px] sm:text-[24px]">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Slide-in Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 top-14 sm:top-16 z-40 bg-black/80 backdrop-blur-md xl:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div 
            className="w-full max-w-sm ml-auto h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] bg-[#09090B] border-l border-[#292929] p-6 flex flex-col justify-between overflow-y-auto shadow-2xl animate-fadeInUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Navigation Items */}
            <div className="flex flex-col gap-1.5 pt-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#A3A3A3]/70 mb-2 px-3">
                NAVIGATION
              </span>
              {navLinks.map((link, idx) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={handleLinkClick}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm sm:text-base font-bold uppercase tracking-wider transition-colors min-h-[48px] active:bg-[#141414] ${
                    idx === 0 
                      ? 'text-[#E58A32] bg-[#E58A32]/10' 
                      : 'text-[#F5F5F5] hover:text-[#E58A32] hover:bg-[#141414]'
                  }`}
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <span>{link.name}</span>
                  <span className="material-symbols-outlined text-[18px] opacity-60">arrow_forward</span>
                </a>
              ))}
            </div>

            {/* Drawer Bottom Actions */}
            <div className="pt-6 border-t border-[#292929] flex flex-col gap-3">
              <a
                href="/login"
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  if (onNavigate) {
                    onNavigate('/login');
                  } else {
                    window.history.pushState({}, '', '/login');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
                className="w-full bg-[#E58A32] text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl text-center shadow-[0_0_20px_rgba(229,138,50,0.30)] hover:bg-[#F09A43] active:scale-95 transition-all min-h-[48px] flex items-center justify-center gap-2 cursor-pointer"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <span>JOIN MAN &amp; MACHINE</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </a>

              <a
                href="tel:+917598885566"
                className="w-full bg-[#141414] text-[#F5F5F5] border border-[#292929] hover:border-[#E58A32] text-xs font-semibold uppercase tracking-wider py-3 rounded-xl text-center transition-colors min-h-[44px] flex items-center justify-center gap-2"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <span className="material-symbols-outlined text-[#E58A32] text-[18px]">call</span>
                <span>+91 75988 85566</span>
              </a>

              <div className="text-center text-[10px] text-[#A3A3A3] uppercase tracking-wider pt-1">
                Kovilpatti • Karur • Sivakasi
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
