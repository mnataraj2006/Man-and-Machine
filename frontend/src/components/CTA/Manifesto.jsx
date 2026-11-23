import React, { useEffect, useRef, useState } from 'react';

export default function Manifesto() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.25 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section 
      ref={sectionRef}
      className="w-full min-h-[65vh] lg:min-h-0 py-16 sm:py-24 bg-[#060614] border-y border-[#292929] relative overflow-hidden flex items-center justify-center"
    >
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center gap-4 sm:gap-6">
        {/* Telemetry pill */}
        <div 
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141414] border border-[#292929] font-mono text-[9.5px] sm:text-xs text-[#E58A32] uppercase tracking-widest max-w-full truncate transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <span>[ THREE CITIES // ONE STANDARD // EST. COMMUNITY ]</span>
        </div>

        {/* Main Statement */}
        <h2 
          className={`uppercase tracking-tight text-[#F5F5F5] font-bold max-w-4xl transition-all duration-700 delay-100 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(2rem, 6vw, 4rem)',
            lineHeight: '1.04',
          }}
        >
          DISCIPLINE CHANGES{' '}
          <span className="text-[#E58A32] underline decoration-[#E58A32]/40 underline-offset-8">
            EVERYTHING.
          </span>
        </h2>

        {/* Supporting Motto */}
        <p 
          className={`text-xs sm:text-base uppercase tracking-widest text-[#A3A3A3] mt-1 transition-all duration-700 delay-200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          SHOW UP. TRAIN HARD. STAY CONSISTENT.
        </p>

        {/* Expanding Orange Bar */}
        <div 
          className={`h-1 bg-[#E58A32] rounded-full transition-all duration-700 delay-300 ${
            isVisible ? 'w-20 sm:w-28 opacity-100' : 'w-4 opacity-0'
          }`}
        />
      </div>
    </section>
  );
}
