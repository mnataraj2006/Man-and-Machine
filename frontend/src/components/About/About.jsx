import React from 'react';

export default function About() {
  return (
    <section className="w-full py-16 sm:py-24 bg-[#09090B]" id="about">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Editorial Column */}
          <div className="lg:col-span-6 flex flex-col gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E58A32]"></span>
              <span 
                className="text-[10px] sm:text-xs uppercase tracking-widest text-[#B8B8C7] font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                WHO WE ARE / KOVILPATTI
              </span>
            </div>

            <h2 
              className="uppercase text-[#F5F5F5] font-bold tracking-tight"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 'clamp(1.8rem, 4vw, 2.75rem)',
                lineHeight: '1.1',
              }}
            >
              MORE THAN A GYM.
            </h2>

            <p 
              className="text-base sm:text-lg text-[#B8B8C7] font-light leading-snug"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              A place to train. A place to improve. A place to become stronger.
            </p>

            <p className="text-sm sm:text-base text-[#B8B8C7]/90 leading-relaxed">
              Man &amp; Machine is built around consistent training, quality equipment, and a focused environment engineered for individuals who take physical conditioning seriously. We stripped away commercial distractions in favor of heavy iron, calibrated barbell platforms, and precision bio-mechanical machinery.
            </p>

            {/* 3 Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 bg-[#10102A]/80 rounded-xl border border-[#292936]">
                <span className="material-symbols-outlined text-[#E58A32] text-[22px] mb-1">
                  psychology
                </span>
                <p 
                  className="text-xs uppercase tracking-wider text-[#F5F5F5] font-bold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  FOCUSED CULTURE
                </p>
                <p className="text-[12px] text-[#B8B8C7] mt-1 leading-snug">
                  Zero clutter, pure discipline.
                </p>
              </div>

              <div className="p-3.5 bg-[#10102A]/80 rounded-xl border border-[#292936]">
                <span className="material-symbols-outlined text-[#E58A32] text-[22px] mb-1">
                  fitness_center
                </span>
                <p 
                  className="text-xs uppercase tracking-wider text-[#F5F5F5] font-bold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  CLEAN PLATFORMS
                </p>
                <p className="text-[12px] text-[#B8B8C7] mt-1 leading-snug">
                  Dedicated Olympic lifting zones.
                </p>
              </div>

              <div className="p-3.5 bg-[#10102A]/80 rounded-xl border border-[#292936]">
                <span className="material-symbols-outlined text-[#E58A32] text-[22px] mb-1">
                  timeline
                </span>
                <p 
                  className="text-xs uppercase tracking-wider text-[#F5F5F5] font-bold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  PROGRESSION
                </p>
                <p className="text-[12px] text-[#B8B8C7] mt-1 leading-snug">
                  Data and metrics-driven overload.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <a
                className="inline-flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-[#E58A32] hover:underline group py-2"
                href="#training"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <span>DISCOVER OUR STORY &amp; ETHOS</span>
                <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </a>
            </div>
          </div>

          {/* Right Column / Image Card */}
          <div className="lg:col-span-6 w-full">
            <div className="relative rounded-2xl overflow-hidden bg-[#10102A] border border-[#292936] group">
              <div className="relative h-[280px] sm:h-[380px] lg:h-[460px] w-full overflow-hidden">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  alt="Close-up of a loaded Olympic barbell on platform inside Man and Machine Gym"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBqsSy4MbhT_2yyFpji6XWFXfNz85bGohPKA7s-_m68TItaIl5y9alhcv5cBOzizHbTSkPDmf7wYO0D16qnTeWIWY_XHs9rCC3FXVeqQggzGX8Q_0L5-QMwJmuSvdAMCKfie9klcLKe2J5U054VUwU92-87OQ9ezUi_BZZWCQ5QiHczVxEHiE0GxlKEA-_UI9ZUVFC-gDMeTB39fQ2YeW2sFsJmTwHr6o61FATVBqO8"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-transparent to-transparent"></div>
              </div>

              {/* Technical Overlay Card Bar */}
              <div className="p-4 sm:p-5 bg-[#10102A] flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 border-t border-[#292936]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 border border-[#292936]">
                    <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
                  </div>
                  <div className="min-w-0">
                    <p 
                      className="text-xs text-[#F5F5F5] tracking-wider uppercase font-bold truncate"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      STRENGTH SPECIFICATION
                    </p>
                    <p className="text-[11px] sm:text-xs text-[#B8B8C7] truncate">
                      MAN &amp; MACHINE / KOVILPATTI — PLATFORM &amp; IRON
                    </p>
                  </div>
                </div>
                <span className="text-xs text-[#E58A32] font-mono px-2.5 py-1 bg-[#181822] rounded border border-[#292936] shrink-0">
                  MM-01
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
