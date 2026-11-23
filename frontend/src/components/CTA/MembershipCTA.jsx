import React from 'react';

export default function MembershipCTA({ onOpenJoinModal }) {
  return (
    <section className="w-full py-16 sm:py-20 bg-[#E58A32] text-white" id="membership">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 sm:gap-10">
          <div className="flex flex-col gap-3 max-w-2xl">
            <span 
              className="text-xs uppercase tracking-widest text-white/80 font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              READY TO START?
            </span>
            <h2 
              className="uppercase tracking-tight text-white font-bold leading-tight"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 'clamp(1.8rem, 4.5vw, 3.2rem)',
                lineHeight: '1.05',
              }}
            >
              YOUR NEXT REP STARTS HERE.
            </h2>
            <p className="text-sm sm:text-base text-white/90 leading-relaxed max-w-xl">
              Visit Man &amp; Machine Fitness Centre in Kovilpatti and take the first step toward your strongest self. Flexible monthly, quarterly, and annual memberships available.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full lg:w-auto">
            <button
              onClick={onOpenJoinModal}
              className="inline-flex items-center justify-center gap-2 bg-[#09090B] hover:bg-[#181822] text-[#F5F5F5] font-bold text-xs uppercase tracking-wider px-7 py-4 rounded-xl shadow-2xl transition-all duration-200 active:scale-95 text-center cursor-pointer min-h-[48px] w-full sm:w-auto"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <span>JOIN NOW</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
            <a
              className="inline-flex items-center justify-center gap-2 bg-transparent hover:bg-black/15 text-white font-bold text-xs uppercase tracking-wider px-7 py-4 rounded-xl border-2 border-white transition-all duration-200 text-center min-h-[48px] w-full sm:w-auto"
              href="tel:+917598885566"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <span>GET MEMBERSHIP DETAILS</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
