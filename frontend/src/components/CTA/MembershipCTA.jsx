import React from 'react';

export default function MembershipCTA({ onOpenJoinModal }) {
  return (
    <section className="w-full py-14 sm:py-20 bg-[#E58A32] text-white relative overflow-hidden" id="membership">
      {/* Background ambient lighting */}
      <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-black/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 sm:gap-10">
          <div className="flex flex-col gap-2.5 sm:gap-3 max-w-2xl">
            <span 
              className="text-[10px] sm:text-xs uppercase tracking-widest text-white/90 font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              START YOUR TRANSFORMATION
            </span>

            <h2 
              className="uppercase tracking-tight text-white font-bold leading-tight"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 'clamp(1.75rem, 4.5vw, 3.2rem)',
                lineHeight: '1.05',
              }}
            >
              READY TO BUILD YOUR STRONGEST SELF?
            </h2>

            <p className="text-xs sm:text-base text-white/90 leading-relaxed max-w-xl">
              Join Man &amp; Machine across Kovilpatti, Karur, or Sivakasi. Take the first step toward disciplined physical progress with flexible monthly, quarterly, and annual memberships.
            </p>
          </div>

          {/* Action Buttons: Stacked on Mobile, Row on Desktop */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0 pt-2 sm:pt-0">
            <button
              onClick={onOpenJoinModal}
              className="inline-flex items-center justify-center gap-2 bg-[#09090B] hover:bg-[#181822] text-[#F5F5F5] font-bold text-xs uppercase tracking-wider px-7 py-4 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.35)] transition-all duration-200 active:scale-95 text-center cursor-pointer min-h-[48px] w-full sm:w-auto"
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