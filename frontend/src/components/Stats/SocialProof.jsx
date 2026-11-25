import React from 'react';

export default function SocialProof() {
  const stats = [
    {
      value: '4.9',
      star: true,
      label: 'GOOGLE VERIFIED RATING',
      highlight: false,
    },
    {
      value: '183+',
      star: false,
      label: 'ACTIVE MEMBER REVIEWS',
      highlight: false,
    },
    {
      value: '3 CITIES',
      star: false,
      label: 'ONE FITNESS CULTURE',
      highlight: false,
    },
    {
      value: '100%',
      star: false,
      label: 'DISCIPLINE OVER SHORTCUTS',
      highlight: true,
    },
  ];

  return (
    <section className="w-full bg-[#090909] border-y border-[#303030] py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 text-left">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`flex flex-col gap-1 border-l-2 pl-3 sm:pl-4 ${
                i === 0 ? 'border-[#EB3E2E]' : 'border-[#303030]'
              }`}
            >
              <div 
                className={`flex items-center gap-1 font-bold tracking-tight ${
                  stat.highlight ? 'text-[#EB3E2E]' : 'text-[#F5F5F5]'
                }`}
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontSize: 'clamp(1.25rem, 3.2vw, 2.2rem)',
                  lineHeight: '1.2',
                }}
              >
                <span className="truncate">{stat.value}</span>
                {stat.star && <span className="text-[#EB3E2E] text-[18px] sm:text-[22px]">★</span>}
              </div>
              <span className="text-[9.5px] sm:text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] leading-snug">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
