import React, { useState, useEffect } from 'react';

export default function Header({ onOpenJoinModal }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'HOME', href: '#home' },
    { name: 'ABOUT', href: '#about' },
    { name: 'TRAINING', href: '#training' },
    { name: 'FACILITIES', href: '#facilities' },
    { name: 'REVIEWS', href: '#reviews' },
    { name: 'OUR BRANCHES', href: '#branches' },
    { name: 'CONTACT', href: '#contact' },
  ];

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
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#09090B]/95 backdrop-blur-md border-b border-[#292936] transition-all">
      <div className="h-16 sm:h-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo & Title */}
        <a 
          className="flex items-center gap-2.5 sm:gap-3 group text-left min-w-0 shrink"
          href="#home"
          onClick={handleLinkClick}
        >
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 border border-[#292936] group-hover:border-[#E58A32] group-hover:shadow-[0_0_15px_rgba(229,138,50,0.3)] transition-all">
            <img src="/logo.jpg" alt="Man & Machine Fitness Centre Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col min-w-0">
            <span 
              className="font-bold text-[13px] sm:text-[16px] md:text-[18px] text-[#F5F5F5] uppercase tracking-tight truncate group-hover:text-[#E58A32] transition-colors"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              MAN &amp; MACHINE
            </span>
            <span className="text-[8.5px] sm:text-[10px] uppercase tracking-widest text-[#B8B8C7] flex items-center gap-1 sm:gap-1.5 truncate">
              FITNESS CENTRE
              <span className="w-1.5 h-1.5 rounded-full bg-[#E58A32] inline-block shrink-0 shadow-[0_0_8px_rgba(229,138,50,0.6)]"></span>
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
                  : 'text-[#B8B8C7] hover:text-[#F5F5F5]'
              }`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {link.name}
            </a>
          ))}
        </nav>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onOpenJoinModal}
            className="hidden xs:inline-flex sm:inline-flex items-center justify-center bg-[#E58A32] text-white font-bold text-[11px] sm:text-xs uppercase tracking-wider px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-lg shadow-[0_0_15px_rgba(229,138,50,0.30)] hover:bg-[#F09A43] transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap min-h-[36px]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            JOIN NOW
          </button>
          
          <button 
            onClick={onOpenJoinModal}
            title="Member Portal"
            aria-label="Member Portal"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#181822] border border-[#292936] flex items-center justify-center shrink-0 cursor-pointer hover:border-[#E58A32] hover:text-[#E58A32] text-[#F5F5F5] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] sm:text-[20px]">person</span>
          </button>

          {/* Mobile Menu Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden w-10 h-10 flex items-center justify-center rounded-lg bg-[#181822] border border-[#292936] text-[#F5F5F5] hover:text-[#E58A32] hover:border-[#E58A32] transition-colors focus:outline-none cursor-pointer"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <span className="material-symbols-outlined text-[24px]">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay — Only in DOM when open */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 top-16 sm:top-20 z-40 bg-black/75 backdrop-blur-md xl:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div 
            className="w-full max-w-sm sm:max-w-md ml-auto h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] bg-[#09090B] border-l border-[#292936] p-6 flex flex-col justify-between overflow-y-auto shadow-2xl animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Navigation Items */}
            <div className="flex flex-col gap-1 pt-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#B8B8C7]/60 mb-2 px-3">
                NAVIGATION
              </span>
              {navLinks.map((link, idx) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={handleLinkClick}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-lg text-sm sm:text-base font-bold uppercase tracking-wider transition-colors min-h-[48px] active:bg-[#181822] ${
                    idx === 0 
                      ? 'text-[#E58A32] bg-[#E58A32]/10' 
                      : 'text-[#F5F5F5] hover:text-[#E58A32] hover:bg-[#181822]'
                  }`}
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <span>{link.name}</span>
                  <span className="material-symbols-outlined text-[18px] opacity-60">arrow_forward</span>
                </a>
              ))}
            </div>

            {/* Drawer Bottom Actions */}
            <div className="pt-6 border-t border-[#292936] flex flex-col gap-3">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenJoinModal();
                }}
                className="w-full bg-[#E58A32] text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-lg text-center shadow-[0_0_20px_rgba(229,138,50,0.30)] hover:bg-[#F09A43] active:scale-95 transition-all min-h-[48px] flex items-center justify-center gap-2 cursor-pointer"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <span>JOIN MAN &amp; MACHINE</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>

              <a
                href="tel:+917598885566"
                className="w-full bg-[#181822] text-[#F5F5F5] border border-[#292936] hover:border-[#E58A32] text-xs font-semibold uppercase tracking-wider py-3 rounded-lg text-center transition-colors min-h-[44px] flex items-center justify-center gap-2"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <span className="material-symbols-outlined text-[#E58A32] text-[18px]">call</span>
                <span>+91 75988 85566</span>
              </a>

              <div className="text-center text-[10px] text-[#B8B8C7] uppercase tracking-wider pt-1">
                Kovilpatti • Karur • Sivakasi • One Fitness Culture
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
