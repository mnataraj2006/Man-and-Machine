import React from 'react';

export default function Manifesto() {
  return (
    <section className="w-full py-16 sm:py-24 bg-[#060614] border-y border-[#292936] relative overflow-hidden flex items-center justify-center">
      {/* Dot grid pattern using logo orange */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#E58A32_1px,transparent_1px)] [background-size:24px_24px]"></div>
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center gap-4 sm:gap-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181822] border border-[#292936] font-mono text-[10px] sm:text-xs text-[#E58A32] uppercase tracking-widest max-w-full truncate">
          <span>[ 09.1726° N, 77.8687° E — KOVILPATTI ]</span>
        </div>
        <h2 
          className="uppercase tracking-tight text-[#F5F5F5] font-bold max-w-4xl"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(1.75rem, 5.5vw, 3.8rem)',
            lineHeight: '1.05',
          }}
        >
          DISCIPLINE CHANGES{' '}
          <span className="text-[#E58A32] underline decoration-[#E58A32]/40 underline-offset-8">
            EVERYTHING.
          </span>
        </h2>
        <p 
          className="text-xs sm:text-base uppercase tracking-widest text-[#B8B8C7] mt-1"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          SHOW UP. TRAIN HARD. STAY CONSISTENT.
        </p>
        <div className="w-16 sm:w-24 h-1 bg-[#E58A32] mt-2"></div>
      </div>
    </section>
  );
}
