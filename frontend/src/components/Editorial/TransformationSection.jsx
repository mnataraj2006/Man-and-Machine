import React, { useRef } from 'react';
import { Reveal, useScrollProgress } from '../Motion/ScrollMotion.jsx';

const storyPanels = [
  {
    id: 'show-up',
    label: '01 / SHOW UP FOR YOURSELF',
    image: '/images/framer/experience-conditioning.png',
    alt: 'Showing up consistently for strength and conditioning',
  },
  {
    id: 'keep-building',
    label: '02 / KEEP BUILDING',
    image: '/images/framer/experience-strength.png',
    alt: 'Progressive strength work inside Man & Machine',
  },
];

export default function TransformationSection() {
  const gridRef = useRef(null);
  const progress = useScrollProgress(gridRef);

  const parallaxOffset = (progress - 0.5) * -22;

  return (
    <section
      id="progress"
      className="relative w-full max-w-[1440px] mx-auto px-6 md:px-14 py-16 sm:py-20 lg:py-[100px] scroll-mt-20"
    >
      <div className="flex flex-col items-start gap-10">
        {/* Header */}
        <div className="flex flex-col items-start gap-5">
          <Reveal delay={0}>
            <p className="font-editorial-label text-[#EB3E2E]">08 / ONE REP AT A TIME</p>
          </Reveal>
          <Reveal variant="mask" delay={80}>
            <h2
              className="font-editorial-display font-semibold uppercase text-[#F5F5F5]"
              style={{ fontSize: 'clamp(2.75rem, 5vw, 4.5rem)' }}
            >
              YOUR NEXT LEVEL STARTS HERE.
            </h2>
          </Reveal>
        </div>

        {/* Visual Storytelling 2-Column Panels */}
        <div ref={gridRef} className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
          {storyPanels.map((panel, idx) => (
            <Reveal
              key={panel.id}
              variant="image"
              delay={idx * 120}
              className="group relative w-full h-[340px] sm:h-[400px] lg:h-[430px] border border-[#303030]/60 bg-[#181818]"
            >
              <div className="relative w-full h-full flex flex-col justify-end p-6 overflow-hidden">
                <img
                  src={panel.image}
                  alt={panel.alt}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover object-center will-change-transform transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                  style={{
                    transform: `scale(1.06) translate3d(0, ${(idx === 0 ? parallaxOffset : -parallaxOffset).toFixed(1)}px, 0)`,
                  }}
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(11,11,11,0.12) 0%, rgba(11,11,11,0.48) 55%, rgba(11,11,11,0.9) 100%)',
                  }}
                />
                <div className="relative z-10">
                  <span className="inline-block bg-[#0b0b0bcc] px-3 py-1.5 font-editorial-display font-semibold text-2xl sm:text-[32px] leading-[1.08] tracking-[-0.025em] text-[#F5F5F5] uppercase">
                    {panel.label}
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Honest Philosophy Statement */}
        <Reveal delay={180} className="max-w-[620px]">
          <p className="font-editorial-body text-[#B8B8B8] text-[15px] md:text-[16px]">
            Not a before and after. A commitment to strength, confidence and the discipline to keep
            going.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
