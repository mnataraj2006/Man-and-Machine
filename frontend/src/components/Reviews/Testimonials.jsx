import React, { useState } from 'react';

export default function Testimonials() {
  const [activeMobileIndex, setActiveMobileIndex] = useState(0);

  const reviews = [
    {
      author: 'SURESH KANNAN',
      role: 'Local Guide',
      text: '"Best training facility in Kovilpatti without question. The equipment is serious, the space is meticulously maintained, and the training culture inspires you."',
      highlight: 'Best training facility in Kovilpatti without question.',
    },
    {
      author: 'MANIKANDAN P.',
      role: 'Verified Member',
      text: '"Unlike other commercial gyms, Man & Machine has ample squat cages, high-spec bars, and serious lifters who respect the iron. Highly recommended."',
      highlight: 'Ample squat cages, high-spec bars, serious lifters.',
    },
    {
      author: 'PRIYA DHARSHINI',
      role: 'Verified Member',
      text: '"Great coaching guidance and clean timings from 5:30 AM. Perfect for early morning strength training before work. Exceptional community."',
      highlight: 'Great coaching guidance & clean timings from 5:30 AM.',
    },
  ];

  return (
    <section className="w-full py-14 sm:py-20 lg:py-24 bg-[#060614] relative overflow-hidden" id="reviews">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-6 sm:gap-10 lg:gap-12">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#292936] pb-5 sm:pb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E58A32]"></span>
              <span 
                className="text-[10px] sm:text-xs uppercase tracking-widest text-[#E58A32] font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                VERIFIED REVIEWS
              </span>
            </div>
            <h2 
              className="uppercase text-[#F5F5F5] font-bold tracking-tight mt-1"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                lineHeight: '1.1',
              }}
            >
              THE COMMUNITY SPEAKS.
            </h2>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#10102A] rounded-xl border border-[#292936] w-fit">
            <span className="text-[#E58A32] font-bold text-xs sm:text-sm">★ 4.9 ON GOOGLE</span>
            <span className="text-[#B8B8C7] text-xs sm:text-sm">• 183+ REVIEWS</span>
          </div>
        </div>

        {/* ── MOBILE EXPERIENCE (lg:hidden) ── */}
        <div className="block lg:hidden flex flex-col gap-4">
          {/* Featured Review Spotlight Card */}
          <div className="bg-gradient-to-br from-[#10102A] to-[#141414] rounded-2xl border border-[#E58A32]/40 p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#E58A32]/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex items-center justify-between mb-3">
              <span 
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E58A32]/15 border border-[#E58A32]/30 text-[10px] font-bold uppercase tracking-wider text-[#E58A32]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <span>FEATURED REVIEW</span>
              </span>
              <div className="text-[#E58A32] text-xs tracking-widest">★★★★★</div>
            </div>

            <p className="text-sm sm:text-base text-[#F5F5F5] font-medium leading-relaxed mb-4">
              {reviews[activeMobileIndex].text}
            </p>

            <div className="pt-3 border-t border-[#292936] flex items-center justify-between">
              <div>
                <span 
                  className="text-xs text-[#F5F5F5] uppercase font-bold block"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {reviews[activeMobileIndex].author}
                </span>
                <span className="text-[11px] text-[#E58A32] font-medium">
                  {reviews[activeMobileIndex].role}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#B8B8C7] bg-[#09090B] px-2 py-0.5 rounded border border-[#292936]">
                0{activeMobileIndex + 1} / 0{reviews.length}
              </span>
            </div>
          </div>

          {/* Horizontal Swipeable Track for all reviews */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-1">
              <span 
                className="text-[10.5px] uppercase tracking-wider text-[#B8B8C7] font-semibold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                SWIPE OR TAP TO SWITCH
              </span>
              {/* Pagination Dots */}
              <div className="flex items-center gap-1.5">
                {reviews.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveMobileIndex(idx)}
                    aria-label={`View review ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      activeMobileIndex === idx ? 'w-5 bg-[#E58A32]' : 'w-1.5 bg-[#292936]'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-1">
              {reviews.map((r, i) => {
                const isActive = activeMobileIndex === i;
                return (
                  <div
                    key={i}
                    onClick={() => setActiveMobileIndex(i)}
                    className={`snap-center shrink-0 w-[82vw] max-w-[320px] rounded-xl p-4 border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#181828] border-[#E58A32] shadow-[0_0_12px_rgba(229,138,50,0.2)]'
                        : 'bg-[#10102A]/80 border-[#292936] hover:border-[#B8B8C7]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span 
                        className={`text-[11px] font-bold uppercase tracking-wider ${
                          isActive ? 'text-[#E58A32]' : 'text-[#F5F5F5]'
                        }`}
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {r.author}
                      </span>
                      <span className="text-[#E58A32] text-xs">★★★★★</span>
                    </div>
                    <p className="text-xs text-[#B8B8C7] line-clamp-2 leading-relaxed">
                      {r.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── DESKTOP GRID (hidden lg:grid) — 100% PRESERVED ── */}
        <div className="hidden lg:grid grid-cols-3 gap-6">
          {reviews.map((r, i) => (
            <div
              key={i}
              className="bg-[#10102A] rounded-2xl border border-[#292936] p-6 flex flex-col justify-between hover:border-[#E58A32]/60 transition-colors"
            >
              <div>
                <div className="text-[#E58A32] text-sm tracking-widest mb-3">★★★★★</div>
                <p className="text-base text-[#B8B8C7] leading-relaxed">
                  {r.text}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#292936] flex items-center justify-between">
                <span 
                  className="text-sm text-[#F5F5F5] uppercase font-bold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {r.author}
                </span>
                <span className="text-xs text-[#B8B8C7]">
                  {r.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}