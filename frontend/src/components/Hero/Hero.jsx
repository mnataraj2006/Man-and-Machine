import React from 'react';

export default function Hero({ onOpenJoinModal }) {
  const heroImageSrc = "/images/hero/Man & Machine_ Train Hard, Stay Strong.png";

  return (
    <section
      id="home"
      className="relative w-full flex flex-col md:flex-row overflow-hidden bg-[#09090B]"
      style={{ minHeight: 'calc(100vh - 80px)' }}
    >
      {/* ══════════════════════════════════════
          LEFT SIDE — CONTENT
      ══════════════════════════════════════ */}
      <div
        className="relative z-10 flex flex-col justify-center w-full md:w-1/2 lg:w-1/2 px-4 sm:px-8 md:px-8 lg:px-14 xl:px-20 py-10 sm:py-14 md:py-16 lg:py-0"
      >
        {/* ── Premium Badge ── */}
        <div
          className="inline-flex items-center gap-2 sm:gap-2.5 w-fit max-w-full mb-6 sm:mb-8 px-3 sm:px-3.5 py-1.5 rounded-full border border-[#292936] bg-white/[0.04]"
        >
          <div
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white flex items-center justify-center shrink-0 overflow-hidden p-0.5"
          >
            <img
              src="/logo.jpg"
              alt="Man & Machine Logo Emblem"
              className="w-full h-full object-contain"
            />
          </div>
          <span
            className="text-[#B8B8C7] font-bold text-[9px] sm:text-[10px] tracking-wider sm:tracking-widest uppercase truncate"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            KOVILPATTI • EST. FITNESS COMMUNITY
          </span>
        </div>

        {/* ── Main Headline with Responsive clamp() ── */}
        <h1
          className="uppercase font-bold mb-4 sm:mb-6 tracking-tight"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(2.1rem, 5.2vw, 4.8rem)',
            lineHeight: '1.02',
            letterSpacing: '-0.03em',
          }}
        >
          <span style={{ color: '#F5F5F5' }}>BUILD YOUR</span>
          <br />
          <span style={{ color: '#E58A32' }}>STRONGEST</span>
          <br />
          <span style={{ color: '#F5F5F5' }}>SELF.</span>
        </h1>

        {/* ── Supporting Copy ── */}
        <p
          className="mb-8 sm:mb-10 text-[#B8B8C7] text-sm sm:text-base leading-relaxed max-w-xl"
          style={{
            fontFamily: 'Inter, sans-serif',
          }}
        >
          A professional training environment built for people who are serious
          about getting stronger, fitter, and better. Train hard. Stay
          consistent. Forge the machine.
        </p>

        {/* ── CTA Buttons (Stack on mobile, row on tablet/desktop) ── */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
          {/* Primary */}
          <button
            onClick={onOpenJoinModal}
            className="group inline-flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 active:scale-95 bg-[#E58A32] hover:bg-[#F09A43] text-white font-bold text-xs uppercase tracking-wider px-6 sm:px-7 py-3.5 sm:py-4 rounded-lg shadow-[0_0_20px_rgba(229,138,50,0.30)] min-h-[48px] text-center"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <span>JOIN MAN &amp; MACHINE</span>
            <span className="material-symbols-outlined text-[17px] group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </button>

          {/* Secondary */}
          <a
            href="#facilities"
            className="inline-flex items-center justify-center gap-2 transition-all duration-200 bg-transparent hover:border-[#E58A32] text-[#F5F5F5] font-bold text-xs uppercase tracking-wider px-6 sm:px-7 py-3.5 sm:py-4 rounded-lg border border-[#292936] text-center min-h-[48px]"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <span>EXPLORE THE GYM</span>
          </a>
        </div>
      </div>

      {/* ══════════════════════════════════════
          RIGHT SIDE — IMAGE (desktop and tablet)
      ══════════════════════════════════════ */}
      <div className="hidden md:block relative md:w-1/2 lg:w-1/2 overflow-hidden self-stretch">
        {/* Left-edge gradient — blends image naturally into dark left bg */}
        <div
          className="absolute inset-y-0 left-0 z-10 pointer-events-none"
          style={{
            width: '160px',
            background: 'linear-gradient(to right, #09090B 0%, rgba(9, 9, 11, 0.4) 50%, transparent 100%)',
          }}
        />
        {/* Top vignette */}
        <div
          className="absolute inset-x-0 top-0 z-10 pointer-events-none"
          style={{
            height: '90px',
            background: 'linear-gradient(to bottom, #09090B 0%, transparent 100%)',
          }}
        />
        {/* Bottom vignette */}
        <div
          className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
          style={{
            height: '90px',
            background: 'linear-gradient(to top, #09090B 0%, transparent 100%)',
          }}
        />

        <img
          className="w-full h-full object-cover object-center"
          style={{ opacity: 0.95 }}
          alt="Man & Machine Fitness Centre Kovilpatti - Train Hard, Stay Strong"
          src={heroImageSrc}
          loading="eager"
        />
      </div>

      {/* ══════════════════════════════════════
          MOBILE — image stacked below content
      ══════════════════════════════════════ */}
      <div
        className="block md:hidden relative w-full overflow-hidden mt-6"
        style={{ height: 'clamp(280px, 50vh, 380px)' }}
      >
        <div
          className="absolute inset-x-0 top-0 z-10 pointer-events-none"
          style={{
            height: '60px',
            background: 'linear-gradient(to bottom, #09090B 0%, transparent 100%)',
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
          style={{
            height: '60px',
            background: 'linear-gradient(to top, #09090B 0%, transparent 100%)',
          }}
        />
        <img
          className="w-full h-full object-cover object-center"
          style={{ opacity: 0.92 }}
          alt="Man & Machine Fitness Centre Kovilpatti - Train Hard, Stay Strong"
          src={heroImageSrc}
          loading="eager"
        />
      </div>
    </section>
  );
}
