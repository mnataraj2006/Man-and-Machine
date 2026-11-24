import React from 'react';

export default function Hero({ onOpenJoinModal, onNavigate }) {
  const heroImageSrc = "/images/hero/Man & Machine_ Train Hard, Stay Strong.png";

  return (
    <section
      id="home"
      className="relative w-full flex flex-col md:flex-row overflow-hidden bg-[#09090B]"
      style={{ minHeight: 'calc(100vh - 70px)' }}
    >
      {/* ══════════════════════════════════════
          LEFT SIDE — CONTENT
      ══════════════════════════════════════ */}
      <div
        className="relative z-10 flex flex-col justify-center w-full md:w-1/2 lg:w-1/2 px-4 sm:px-8 md:px-8 lg:px-14 xl:px-20 py-8 sm:py-12 md:py-16 lg:py-0"
      >
        {/* ── 1. Brand Badge ── */}
        <div
          className="inline-flex items-center gap-2 sm:gap-2.5 w-fit max-w-full mb-4 sm:mb-6 px-3 sm:px-3.5 py-1.5 rounded-full border border-[#292929] bg-[#141414]/80 backdrop-blur-sm animate-fadeInUp"
          style={{ animationDelay: '50ms' }}
        >
          <div
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white flex items-center justify-center shrink-0 overflow-hidden p-0.5 shadow-sm"
          >
            <img
              src="/logo.jpg"
              alt="Man & Machine Logo Emblem"
              className="w-full h-full object-contain"
            />
          </div>
          <span
            className="text-[#A3A3A3] font-bold text-[9px] sm:text-[10px] tracking-wider sm:tracking-widest uppercase truncate"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            THREE CITIES • ONE FITNESS CULTURE
          </span>
        </div>

        {/* ── 2. Main Headline ── */}
        <h1
          className="uppercase font-bold mb-3 sm:mb-5 tracking-tight animate-fadeInUp"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(2.15rem, 5.2vw, 4.8rem)',
            lineHeight: '1.02',
            letterSpacing: '-0.03em',
            animationDelay: '120ms',
          }}
        >
          <span className="text-[#F5F5F5] block">BUILD YOUR</span>
          <span className="text-[#E58A32] block">STRONGEST</span>
          <span className="text-[#F5F5F5] block">SELF.</span>
        </h1>

        {/* ── 3. Short Supporting Copy ── */}
        <p
          className="mb-6 sm:mb-8 text-[#A3A3A3] text-sm sm:text-base leading-relaxed max-w-xl animate-fadeInUp"
          style={{
            fontFamily: 'Inter, sans-serif',
            animationDelay: '200ms',
          }}
        >
          A professional training environment built for people who are serious about getting stronger, fitter, and better. Train hard. Stay consistent. Forge the machine.
        </p>

        {/* ── 4 & 5. CTA Buttons ── */}
        <div 
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto animate-fadeInUp"
          style={{ animationDelay: '280ms' }}
        >
          {/* Primary */}
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
            className="group inline-flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 active:scale-95 bg-[#E58A32] hover:bg-[#F09A43] text-white font-bold text-xs uppercase tracking-wider px-6 sm:px-7 py-3.5 sm:py-4 rounded-xl shadow-[0_0_20px_rgba(229,138,50,0.30)] min-h-[48px] text-center"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <span>JOIN MAN &amp; MACHINE</span>
            <span className="material-symbols-outlined text-[17px] group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </a>

          {/* Secondary */}
          <a
            href="#branches"
            className="inline-flex items-center justify-center gap-2 transition-all duration-200 bg-[#141414] hover:border-[#E58A32] text-[#F5F5F5] font-bold text-xs uppercase tracking-wider px-6 sm:px-7 py-3.5 sm:py-4 rounded-xl border border-[#292929] text-center min-h-[48px]"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <span>EXPLORE OUR BRANCHES</span>
          </a>
        </div>
      </div>

      {/* ══════════════════════════════════════
          RIGHT SIDE — IMAGE (desktop and tablet >= 768px)
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
          className="w-full h-full object-cover object-center animate-fadeInScale"
          style={{ opacity: 0.95 }}
          alt="Man & Machine Fitness Centre - Train Hard, Stay Strong"
          src={heroImageSrc}
          loading="eager"
        />
      </div>

      {/* ══════════════════════════════════════
          MOBILE — 6. Hero gym photograph (stacked below CTAs)
      ══════════════════════════════════════ */}
      <div
        className="block md:hidden relative w-full overflow-hidden mt-6 px-4 pb-4 animate-fadeInScale"
        style={{ animationDelay: '340ms' }}
      >
        <div className="relative w-full rounded-2xl overflow-hidden border border-[#292929] shadow-2xl" style={{ height: 'clamp(280px, 45vh, 360px)' }}>
          <div
            className="absolute inset-x-0 top-0 z-10 pointer-events-none"
            style={{
              height: '50px',
              background: 'linear-gradient(to bottom, rgba(9,9,11,0.6) 0%, transparent 100%)',
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
            style={{
              height: '60px',
              background: 'linear-gradient(to top, rgba(9,9,11,0.85) 0%, transparent 100%)',
            }}
          />
          <img
            className="w-full h-full object-cover object-center"
            style={{ opacity: 0.92 }}
            alt="Man & Machine Fitness Centre - Train Hard, Stay Strong"
            src={heroImageSrc}
            loading="eager"
          />
          <div className="absolute bottom-3 left-3 z-20 px-2.5 py-1 rounded-md bg-[#09090B]/85 backdrop-blur-sm border border-[#292929]">
            <span className="text-[9.5px] uppercase font-bold text-[#F5F5F5] tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              HIGH PERFORMANCE FACILITY
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
