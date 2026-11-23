import React from 'react';

export default function FinalCTA({ onOpenJoinModal }) {
  return (
    <section className="w-full py-16 sm:py-20 bg-[#060614] border-t border-[#292936]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 sm:gap-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-0.5 bg-[#E58A32]"></span>
              <span 
                className="text-[10px] sm:text-xs uppercase tracking-widest text-[#E58A32] font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                MAN &amp; MACHINE / KOVILPATTI
              </span>
            </div>
            <h2 
              className="uppercase text-[#F5F5F5] font-bold tracking-tight"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                lineHeight: '1.1',
              }}
            >
              SHOW UP. GET STRONGER.
            </h2>
            <p className="text-sm sm:text-base text-[#B8B8C7]">
              Your strongest version is built one session at a time.
            </p>
          </div>
          <div className="w-full md:w-auto">
            <button
              onClick={onOpenJoinModal}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-[#E58A32] hover:bg-[#F09A43] text-white font-bold text-xs uppercase tracking-wider px-8 py-4 rounded-xl shadow-[0_0_24px_rgba(229,138,50,0.35)] active:scale-95 transition-all group cursor-pointer min-h-[48px]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <span>START YOUR JOURNEY</span>
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1.5 transition-transform">
                arrow_forward
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
