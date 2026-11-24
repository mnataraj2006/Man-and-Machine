import React, { useState, useEffect } from 'react';

export default function Hero({ onOpenJoinModal, onNavigate }) {
  const [hasScrolled, setHasScrolled] = useState(false);
  const heroImageSrc = "/images/hero/Man & Machine_ Train Hard, Stay Strong.png";

  // Gracefully fade out scroll indicator when user begins scrolling
  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 45);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleJoinClick = (e) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate('/signup');
    } else if (onOpenJoinModal) {
      onOpenJoinModal();
    } else {
      window.history.pushState({}, '', '/signup');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleExploreClick = (e) => {
    e.preventDefault();
    const target = document.getElementById('facilities') || document.getElementById('branches');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="home"
      className="relative w-full min-h-screen flex flex-col justify-between overflow-hidden bg-[#09090B]"
      style={{ minHeight: '100svh' }}
    >
      {/* ══════════════════════════════════════════════════════════════
          BACKGROUND LAYER: SLOW CAMERA ZOOM & ATMOSPHERIC GLOW
      ══════════════════════════════════════════════════════════════ */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
        {/* Full Viewport Gym Photograph with 7.5s Slow Camera Zoom Animation */}
        <img
          src={heroImageSrc}
          alt="Man & Machine Fitness Centre"
          className="animate-hero-zoom absolute inset-0 w-full h-full object-cover object-center"
          loading="eager"
        />

        {/* Base Atmospheric Dark Tint Layer */}
        <div className="absolute inset-0 bg-[#09090B]/60 backdrop-brightness-[0.7]" />

        {/* Ambient Warm Accent Glow Blob (#E58A32) for Depth */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] sm:w-[800px] md:w-[1000px] h-[350px] sm:h-[480px] md:h-[580px] bg-[#E58A32]/12 rounded-full blur-[140px] pointer-events-none" 
        />

        {/* Top Gradient Overlay — ensures top navbar legibility while transparent */}
        <div
          className="absolute inset-x-0 top-0 h-32 sm:h-44 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, #09090B 0%, rgba(9, 9, 11, 0.75) 45%, transparent 100%)',
          }}
        />

        {/* Bottom Gradient Overlay — seamless transition into subsequent sections */}
        <div
          className="absolute inset-x-0 bottom-0 h-44 sm:h-64 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, #09090B 0%, rgba(9, 9, 11, 0.9) 45%, transparent 100%)',
          }}
        />

        {/* Dark Radial Vignette — focuses center, dims edges */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 35%, rgba(9, 9, 11, 0.6) 75%, #09090B 100%)',
          }}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════
          HERO CONTENT CONTAINER (CENTER-ALIGNED DISPLAY TYPOGRAPHY)
      ══════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 flex flex-col items-center justify-center pt-28 sm:pt-32 md:pt-36 pb-24 sm:pb-28 text-center">
        
        {/* ── 1. Eyebrow Text (delay ~0.25s) ── */}
        <div className="animate-hero-eyebrow inline-flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full border border-[#292929] bg-[#141414]/65 backdrop-blur-md shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E58A32] animate-pulse" />
          <span
            className="text-[#E58A32] font-mono font-bold text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.3em]"
            style={{ fontFamily: "'Space Grotesk', monospace" }}
          >
            TRAIN HARD. STAY CONSISTENT.
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#E58A32] animate-pulse" />
        </div>

        {/* ── 2. Main Heading: Word-by-Word Reveal ── */}
        <h1
          className="font-black uppercase tracking-tight text-[#F5F5F5] select-none text-center"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(2.75rem, 7.8vw, 6.75rem)',
            lineHeight: '0.96',
            letterSpacing: '-0.035em',
          }}
        >
          {/* First Row: BUILD YOUR */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-5 md:gap-x-7">
            <span className="overflow-hidden inline-block py-1 sm:py-1.5">
              <span className="animate-hero-word-1 text-[#F5F5F5]">BUILD</span>
            </span>
            <span className="overflow-hidden inline-block py-1 sm:py-1.5">
              <span className="animate-hero-word-2 text-[#F5F5F5]">YOUR</span>
            </span>
          </div>

          {/* Second Row: STRONGEST SELF. */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-5 md:gap-x-7 mt-1 sm:mt-2">
            <span className="overflow-hidden inline-block py-1 sm:py-1.5">
              <span className="animate-hero-word-3 text-[#F5F5F5]">STRONGEST</span>
            </span>
            <span className="overflow-hidden inline-block py-1 sm:py-1.5">
              <span className="animate-hero-word-4 relative text-[#E58A32]">
                SELF.
                {/* ── 3. Orange Light Sweep Across "SELF." (delay ~1.50s, duration ~1.1s) ── */}
                <span
                  className="absolute inset-0 overflow-hidden pointer-events-none select-none rounded"
                  aria-hidden="true"
                >
                  <span
                    className="animate-hero-sweep absolute top-0 left-0 w-3/5 h-full bg-gradient-to-r from-transparent via-white/80 to-transparent skew-x-[-20deg] mix-blend-screen filter blur-[0.5px]"
                  />
                </span>
              </span>
            </span>
          </div>
        </h1>

        {/* ── 4. Supporting Paragraph (delay ~1.70s) ── */}
        <p
          className="animate-hero-desc text-[#A3A3A3] text-sm sm:text-base md:text-lg text-center max-w-2xl mx-auto mt-6 sm:mt-8 mb-8 sm:mb-10 leading-relaxed font-normal"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          A professional training environment built for people who are serious about getting stronger, fitter, and better.
        </p>

        {/* ── 5. Call to Action Buttons (delay ~2.15s) ── */}
        <div className="animate-hero-cta flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 w-full sm:w-auto">
          {/* Primary CTA: JOIN MAN & MACHINE */}
          <a
            href="/signup"
            onClick={handleJoinClick}
            className="group inline-flex items-center justify-center gap-2.5 bg-[#E58A32] hover:bg-[#F09A43] text-white font-bold text-xs sm:text-sm uppercase tracking-wider px-7 sm:px-8 py-3.5 sm:py-4 rounded-xl shadow-[0_0_25px_rgba(229,138,50,0.35)] hover:shadow-[0_0_35px_rgba(229,138,50,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer min-h-[48px] w-full sm:w-auto text-center"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <span>JOIN MAN &amp; MACHINE</span>
            <span className="material-symbols-outlined text-[18px] sm:text-[20px] group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </a>

          {/* Secondary CTA: EXPLORE THE GYM */}
          <a
            href="#facilities"
            onClick={handleExploreClick}
            className="inline-flex items-center justify-center gap-2 bg-transparent hover:bg-white/[0.04] text-[#F5F5F5] hover:text-white border border-[#292929] hover:border-[#E58A32] font-bold text-xs sm:text-sm uppercase tracking-wider px-7 sm:px-8 py-3.5 sm:py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer min-h-[48px] w-full sm:w-auto text-center backdrop-blur-sm"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <span>EXPLORE THE GYM</span>
          </a>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          6. MINIMAL SCROLL INDICATOR (delay ~2.40s)
      ══════════════════════════════════════════════════════════════ */}
      <div
        className={`animate-hero-scroll-wrap absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2.5 transition-opacity duration-300 pointer-events-auto cursor-pointer ${
          hasScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        onClick={handleExploreClick}
        role="button"
        aria-label="Scroll to explore"
      >
        <span
          className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.25em] text-[#A3A3A3] hover:text-[#E58A32] transition-colors"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          SCROLL TO EXPLORE
        </span>
        <div className="w-[1.5px] h-8 sm:h-10 bg-white/15 rounded-full overflow-hidden relative">
          <div className="animate-hero-scroll-line absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[#E58A32] to-[#F09A43] rounded-full" />
        </div>
      </div>
    </section>
  );
}
