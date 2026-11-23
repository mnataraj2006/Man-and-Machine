import React, { useState, useEffect, useRef } from 'react';
import { Snowflake, Waves, Sparkles, Bike } from 'lucide-react';

export default function Facilities() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeMobileCard, setActiveMobileCard] = useState(0);
  const sectionRef = useRef(null);

  const amenities = [
    {
      number: '01',
      title: 'FULLY AIR-CONDITIONED',
      description: 'Enjoy a comfortable training environment with air-conditioned indoor spaces.',
      pillar: 'COMFORT',
      icon: Snowflake,
    },
    {
      number: '02',
      title: 'STEAM BATH',
      description: "Relax and unwind with access to the gym's steam bath facility.",
      pillar: 'RECOVERY',
      icon: Waves,
    },
    {
      number: '03',
      title: 'CLEAN ATMOSPHERE',
      description: 'Train in a clean and well-maintained environment that keeps your focus on fitness.',
      pillar: 'CLEANLINESS',
      icon: Sparkles,
    },
    {
      number: '04',
      title: 'BIKE PARKING',
      description: 'Convenient parking space for your two-wheeler when you visit the gym.',
      pillar: 'CONVENIENCE',
      icon: Bike,
    },
  ];

  // Cinematic staggered entrance animation trigger (once per page visit)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section 
      ref={sectionRef}
      className="w-full py-16 sm:py-20 lg:py-24 bg-[#09090B] relative overflow-hidden" 
      id="facilities"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8 sm:gap-12 lg:gap-14">

        {/* ── Section Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#292929] pb-6 sm:pb-8">
          <div className="flex flex-col gap-2 max-w-2xl">
            <span 
              className="text-[10px] sm:text-xs uppercase tracking-widest text-[#E58A32] font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              GYM AMENITIES
            </span>
            <h2 
              className="uppercase text-[#F5F5F5] font-bold tracking-tight"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 'clamp(1.85rem, 4.2vw, 2.85rem)',
                lineHeight: '1.08',
              }}
            >
              MORE THAN JUST A WORKOUT.
            </h2>
            <p className="text-xs sm:text-sm lg:text-base text-[#A3A3A3] leading-relaxed">
              Experience a comfortable and welcoming training environment designed to make every visit better.
            </p>
          </div>

          {/* Editorial Tagline Pill */}
          <div className="inline-flex items-center px-3.5 py-2 rounded-xl bg-[#141414] border border-[#292929] w-fit shrink-0">
            <span 
              className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#A3A3A3]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              4 DEDICATED FACILITY AMENITIES
            </span>
          </div>
        </div>

        {/* ── DESKTOP & TABLET: HORIZONTAL CARDS (hidden on mobile, visible md:grid) ── */}
        <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6">
          {amenities.map((item, idx) => {
            const IconComponent = item.icon;
            const staggerDelay = idx * 140;

            return (
              <div
                key={item.number}
                className={`group relative bg-[#141414] hover:bg-[#191919] rounded-2xl border border-[#292929] hover:border-[#E58A32]/70 p-6 sm:p-7 flex flex-col justify-between transition-all duration-500 ease-out shadow-lg hover:-translate-y-1.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.5)] ${
                  isVisible 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-8 pointer-events-none'
                }`}
                style={{
                  transitionDelay: `${staggerDelay}ms`,
                }}
              >
                {/* Top Row: Index number & Icon */}
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <span 
                      className="font-mono text-xs tracking-widest text-[#E58A32] font-bold"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {item.number} // {item.pillar}
                    </span>
                    <div className="w-11 h-11 rounded-xl bg-[#09090B] border border-[#292929] group-hover:border-[#E58A32]/50 flex items-center justify-center text-[#A3A3A3] group-hover:text-[#E58A32] transition-colors duration-300">
                      <IconComponent className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="flex flex-col gap-2.5">
                    <h3 
                      className="text-base sm:text-lg font-bold uppercase text-[#F5F5F5] tracking-tight group-hover:text-white transition-colors"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#A3A3A3] leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Bottom Row: Sleek Expanding Orange Accent Line */}
                <div className="pt-8">
                  <div className="h-0.5 bg-[#292929] w-full overflow-hidden rounded-full">
                    <div className="h-full bg-[#E58A32] w-8 group-hover:w-full transition-all duration-500 ease-out" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── MOBILE: HORIZONTAL SWIPEABLE CAROUSEL (< 768px) ── */}
        <div className="block md:hidden flex flex-col gap-4">
          {/* Swipe Track */}
          <div 
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar px-1 pb-2"
            onScroll={(e) => {
              const scrollLeft = e.currentTarget.scrollLeft;
              const width = e.currentTarget.offsetWidth;
              const newIdx = Math.round(scrollLeft / width);
              if (newIdx !== activeMobileCard && newIdx >= 0 && newIdx < amenities.length) {
                setActiveMobileCard(newIdx);
              }
            }}
          >
            {amenities.map((item, idx) => {
              const IconComponent = item.icon;
              const staggerDelay = idx * 100;

              return (
                <div
                  key={item.number}
                  id={`mobile-amenity-${item.number}`}
                  className={`snap-center shrink-0 w-[82vw] max-w-[320px] bg-[#141414] active:bg-[#191919] rounded-2xl border border-[#292929] p-5 flex flex-col justify-between shadow-xl transition-all duration-500 ${
                    isVisible 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-6'
                  }`}
                  style={{
                    transitionDelay: `${staggerDelay}ms`,
                  }}
                >
                  <div className="flex flex-col gap-4">
                    {/* Top Row: Index and Icon */}
                    <div className="flex items-center justify-between">
                      <span 
                        className="font-mono text-xs tracking-widest text-[#E58A32] font-bold"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {item.number} // {item.pillar}
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-[#09090B] border border-[#292929] flex items-center justify-center text-[#E58A32]">
                        <IconComponent className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div className="flex flex-col gap-2">
                      <h3 
                        className="text-base font-bold uppercase text-[#F5F5F5] tracking-tight"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#A3A3A3] leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Accent Line */}
                  <div className="pt-6">
                    <div className="h-0.5 bg-[#E58A32] w-12 rounded-full" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Carousel Pagination Indicators */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {amenities.map((item, idx) => (
              <button
                key={item.number}
                onClick={() => {
                  setActiveMobileCard(idx);
                  const el = document.getElementById(`mobile-amenity-${item.number}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }}
                aria-label={`View amenity ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeMobileCard === idx ? 'w-6 bg-[#E58A32]' : 'w-1.5 bg-[#292929]'
                }`}
              />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
