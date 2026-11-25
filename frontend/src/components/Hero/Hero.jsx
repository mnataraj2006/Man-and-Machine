import React, { useState, useEffect } from 'react';
import authService from '../../services/auth.js';

export default function Hero({ onOpenJoinModal, onNavigate }) {
  const [hasScrolled, setHasScrolled] = useState(false);
  const heroImageSrc = '/images/hero/Man & Machine_ Train Hard, Stay Strong.png';

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleJoinClick = (e) => {
    e.preventDefault();
    if (authService.isAuthenticated()) {
      const route = authService.getDashboardRoute(authService.getRole());
      if (onNavigate) onNavigate(route);
      return;
    }
    if (onNavigate) {
      onNavigate('/signup');
    } else if (onOpenJoinModal) {
      onOpenJoinModal();
    } else {
      window.history.pushState({}, '', '/signup');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="home"
      className="relative w-full min-h-screen flex flex-col justify-end overflow-hidden bg-[#090909]"
      style={{ minHeight: '100svh' }}
    >
      {/* ── Background Cinematic Image + Dark Editorial Vignette ── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <img
          src={heroImageSrc}
          alt="Man & Machine Fitness Community — Kovilpatti"
          className="animate-hero-bg w-full h-full object-cover object-center"
          loading="eager"
        />

        {/* Editorial Contrast Overlays */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(11,11,11,0.92) 0%, rgba(11,11,11,0.72) 48%, rgba(11,11,11,0.38) 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(11,11,11,0.68) 0%, rgba(11,11,11,0.18) 38%, rgba(11,11,11,0.88) 88%, #090909 100%)',
          }}
        />
      </div>

      {/* ── Main Content Container (Framer .framer-cauppk proportions) ── */}
      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 md:px-14 pt-28 md:pt-[120px] pb-9 flex flex-col gap-7">
        {/* Eyebrow + Brand Crest */}
        <div className="animate-hero-eyebrow flex items-center gap-3">
          <div className="w-7 h-7 bg-white p-0.5 border border-[#303030] flex items-center justify-center shrink-0">
            <img
              src="/logo.jpg"
              alt="Man & Machine Emblem"
              className="w-full h-full object-contain"
            />
          </div>
          <p className="font-editorial-label text-[#EB3E2E]">
            FITNESS COMMUNITY
          </p>
        </div>

        {/* Display Headline (Oswald 116px desktop / 88px tablet / 56px mobile) */}
        <h1
          className="font-editorial-display font-bold uppercase text-[#F5F5F5] flex flex-col items-start"
          style={{ fontSize: 'clamp(3.35rem, 8.2vw, 7.25rem)', lineHeight: '1.04' }}
        >
          <span className="overflow-hidden block">
            <span className="animate-hero-line-1 text-[#F5F5F5]">BUILD THE BODY.</span>
          </span>
          <span className="overflow-hidden block">
            <span className="animate-hero-line-2 relative text-[#EB3E2E]">
              FORGE THE MIND.
              <span
                className="absolute inset-0 overflow-hidden pointer-events-none select-none"
                aria-hidden="true"
              >
                <span className="animate-hero-sweep absolute top-0 left-0 w-3/5 h-full bg-gradient-to-r from-transparent via-white/75 to-transparent skew-x-[-20deg] mix-blend-screen filter blur-[0.5px]" />
              </span>
            </span>
          </span>
        </h1>

        {/* Supporting Paragraph */}
        <p className="animate-hero-subtitle font-editorial-body text-[#F5F5F5]/90 text-[15px] md:text-[16px] max-w-[360px]">
          Train with purpose. Build strength. Become your strongest version.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-1">
          <a
            href="/signup"
            onClick={handleJoinClick}
            className="animate-hero-cta-1 btn-editorial-primary min-h-[52px]"
          >
            <span>JOIN MAN &amp; MACHINE</span>
          </a>

          <a
            href="#facilities"
            onClick={(e) => scrollToSection(e, 'facilities')}
            className="animate-hero-cta-2 btn-editorial-secondary min-h-[52px]"
          >
            <span>EXPLORE THE GYM</span>
          </a>
        </div>

        {/* Bottom Footnote Strip */}
        <div className="animate-hero-footnote pt-8 md:pt-14 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#303030]/50">
          <a
            href="#about"
            onClick={(e) => scrollToSection(e, 'about')}
            className={`font-editorial-label text-[#F5F5F5]/85 hover:text-[#EB3E2E] transition-opacity duration-300 inline-flex items-center gap-1.5 w-fit ${
              hasScrolled ? 'opacity-40' : 'opacity-100'
            }`}
          >
            <span>SCROLL TO EXPLORE</span>
            <span className="animate-scroll-nudge">↓</span>
          </a>

          <p className="font-editorial-label text-[#B8B8B8]">
            STRENGTH IS EARNED. NEVER GIVEN.
          </p>
        </div>
      </div>
    </section>
  );
}
