import React from 'react';

export default function Training() {
  const programs = [
    {
      num: '01',
      title: 'STRENGTH',
      description: 'Build raw absolute power through structured barbell compounds and progressive overload mechanics.',
      spec: 'SQUAT / BENCH / DEADLIFT',
      status: 'ACTIVE',
    },
    {
      num: '02',
      title: 'HYPERTROPHY',
      description: 'Train with mechanical tension and deliberate volume targeting complete muscular adaptation.',
      spec: 'ISOLATION / VOLUME / DENSITY',
      status: 'ACTIVE',
    },
    {
      num: '03',
      title: 'CONDITIONING',
      description: 'Elevate anaerobic threshold, cardiovascular endurance, and athletic work capacity across all planes.',
      spec: 'HIIT / FUNCTIONAL / STAMINA',
      status: 'ACTIVE',
    },
    {
      num: '04',
      title: '1-ON-1 GUIDANCE',
      description: 'Receive direct tactical coaching, form correction, and tailored program accountability.',
      spec: 'TECHNIQUE / DIET / PROTOCOL',
      status: 'ACTIVE',
    },
  ];

  return (
    <section className="w-full py-16 sm:py-24 bg-[#060614]" id="training">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8 sm:gap-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#292936] pb-6 sm:pb-8">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E58A32]"></span>
              <span 
                className="text-[10px] sm:text-xs uppercase tracking-widest text-[#E58A32] font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                CORE DISCIPLINES
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
              TRAIN WITH PURPOSE.
            </h2>
            <p className="text-sm sm:text-base text-[#B8B8C7]">
              Whether your goal is strength, conditioning, muscle development, or simply building athletic resilience, training begins with consistent progressive execution.
            </p>
          </div>
          <span 
            className="text-xs uppercase tracking-widest text-[#B8B8C7] hidden md:block shrink-0"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            SYS.V3 // RIGOROUS PROTOCOLS
          </span>
        </div>

        {/* 4 Program Cards — 1 col mobile, 2 col tablet, 4 col desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {programs.map((program) => (
            <div
              key={program.num}
              className="relative bg-[#10102A] rounded-xl border border-[#292936] p-5 sm:p-6 flex flex-col justify-between min-h-[280px] sm:min-h-[320px] hover:border-[#E58A32] hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xl sm:text-2xl text-[#E58A32] font-mono font-bold">
                  {program.num}
                </span>
                <span className="material-symbols-outlined text-[#292936] group-hover:text-[#E58A32] group-hover:rotate-45 transition-all text-[22px]">
                  north_east
                </span>
              </div>

              <div className="flex flex-col gap-2.5 my-auto">
                <div className="h-0.5 w-8 bg-[#E58A32] group-hover:w-16 transition-all duration-300"></div>
                <h3 
                  className="text-lg sm:text-xl uppercase text-[#F5F5F5] font-bold tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {program.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#B8B8C7] leading-relaxed">
                  {program.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[#292936] flex items-center justify-between text-[#B8B8C7] text-[10.5px] sm:text-[11px] font-mono mt-4">
                <span className="truncate pr-2">{program.spec}</span>
                <span className="text-[#E58A32] shrink-0 font-semibold">{program.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
