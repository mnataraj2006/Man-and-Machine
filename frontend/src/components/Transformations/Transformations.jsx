import React, { useState } from 'react';

export default function Transformations() {
  const [activeSpotlight, setActiveSpotlight] = useState(0);

  const stories = [
    {
      record: 'RECORD // 01',
      protocol: '16 WEEKS PROTOCOL',
      goal: 'GOAL: RECOMPOSITION',
      quote: '"Consistency in training and routine gave me the strongest physical condition of my life. The equipment selection here made progressive overload effortless."',
      name: 'ARAVIND K.',
      detail: 'Kovilpatti • Member since 2023',
    },
    {
      record: 'RECORD // 02',
      protocol: '24 WEEKS PROTOCOL',
      goal: 'GOAL: WEIGHT LOSS & STAMINA',
      quote: '"The atmosphere here cuts out distractions. You come in, put the work in, and see measurable progression. Lost 14kg while increasing my compound lifts."',
      name: 'VIGNESH M.',
      detail: 'Kovilpatti • Member since 2024',
    },
    {
      record: 'RECORD // 03',
      protocol: '12 WEEKS PROTOCOL',
      goal: 'GOAL: POWERLIFTING TOTAL',
      quote: '"Quality barbells, dedicated racks, and an environment that demands your best effort every single day. Kovilpatti finally has an authentic strength sanctuary."',
      name: 'KARTHIK R.',
      detail: 'Kovilpatti • Member since 2023',
    },
  ];

  const currentStory = stories[activeSpotlight];

  const handlePrev = () => {
    setActiveSpotlight((prev) => (prev - 1 + stories.length) % stories.length);
  };

  const handleNext = () => {
    setActiveSpotlight((prev) => (prev + 1) % stories.length);
  };

  return (
    <section className="w-full py-14 sm:py-20 lg:py-24 bg-[#09090B]" id="transformations">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-6 sm:gap-10 lg:gap-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4 border-b border-[#292929] pb-5 sm:pb-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E58A32]"></span>
              <span 
                className="text-[10px] sm:text-xs uppercase tracking-widest text-[#E58A32] font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                PROVEN OUTCOMES
              </span>
            </div>
            <h2 
              className="uppercase text-[#F5F5F5] font-bold tracking-tight"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                lineHeight: '1.08',
              }}
            >
              YOUR JOURNEY. YOUR TRANSFORMATION.
            </h2>
            <p className="text-xs sm:text-sm lg:text-base text-[#A3A3A3] max-w-xl">
              Real progress starts with showing up consistently. These are real results from our dedicated strength community.
            </p>
          </div>
        </div>

        {/* ── MOBILE: Member Spotlight Carousel (< 1024px) ── */}
        <div className="block lg:hidden">
          <div className="bg-[#141414] rounded-2xl border border-[#292929] p-5 sm:p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#292929] pb-3 mb-3">
              <span 
                className="text-xs font-mono font-bold text-[#E58A32]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {currentStory.record}
              </span>
              <span 
                className="text-[10px] uppercase font-bold tracking-wider text-[#A3A3A3]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {currentStory.protocol}
              </span>
            </div>

            <div className="mb-3">
              <span 
                className="text-[10px] uppercase tracking-wider text-[#E58A32] bg-[#E58A32]/10 border border-[#E58A32]/30 px-2.5 py-1 rounded font-bold inline-block"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {currentStory.goal}
              </span>
            </div>

            <blockquote className="text-sm text-[#F5F5F5] italic leading-relaxed mb-5">
              {currentStory.quote}
            </blockquote>

            <div className="pt-3 border-t border-[#292929] flex items-center justify-between">
              <div>
                <p 
                  className="text-xs sm:text-sm font-bold uppercase text-[#F5F5F5] tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {currentStory.name}
                </p>
                <p className="text-[11px] text-[#A3A3A3]">
                  {currentStory.detail}
                </p>
              </div>

              {/* Prev / Next Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handlePrev}
                  aria-label="Previous story"
                  className="w-9 h-9 rounded-lg bg-[#09090B] border border-[#292929] text-[#F5F5F5] hover:text-[#E58A32] hover:border-[#E58A32] flex items-center justify-center cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <button
                  onClick={handleNext}
                  aria-label="Next story"
                  className="w-9 h-9 rounded-lg bg-[#09090B] border border-[#292929] text-[#F5F5F5] hover:text-[#E58A32] hover:border-[#E58A32] flex items-center justify-center cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>

            {/* Pagination indicator dots */}
            <div className="flex justify-center gap-1.5 pt-4">
              {stories.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSpotlight(idx)}
                  aria-label={`Story ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    activeSpotlight === idx ? 'bg-[#E58A32] w-6' : 'bg-[#292929] w-2'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── DESKTOP: 3-Column Story Cards (>= 1024px) UNCHANGED ── */}
        <div className="hidden lg:grid grid-cols-3 gap-6">
          {stories.map((item) => (
            <div
              key={item.record}
              className="bg-[#141414] rounded-2xl border border-[#292929] p-6 flex flex-col justify-between hover:border-[#E58A32]/60 transition-all shadow-lg"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-[#292929] pb-3">
                  <span className="text-xs font-mono font-bold text-[#E58A32]">
                    {item.record}
                  </span>
                  <span className="text-xs uppercase font-bold tracking-wider text-[#A3A3A3]">
                    {item.protocol}
                  </span>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider text-[#E58A32] bg-[#E58A32]/10 border border-[#E58A32]/30 px-2.5 py-1 rounded font-bold">
                    {item.goal}
                  </span>
                </div>
                <blockquote className="text-sm text-[#A3A3A3] italic leading-relaxed">
                  {item.quote}
                </blockquote>
              </div>

              <div className="pt-4 border-t border-[#292929] mt-4 flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase text-[#F5F5F5] font-bold">
                    {item.name}
                  </p>
                  <p className="text-xs text-[#A3A3A3]">
                    {item.detail}
                  </p>
                </div>
                <span className="material-symbols-outlined text-[#E58A32] text-[20px]">
                  verified
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
