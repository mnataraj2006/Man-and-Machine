import React, { useRef } from 'react';
import { Reveal, useScrollProgress } from '../Motion/ScrollMotion.jsx';

const zones = [
  'WEIGHT TRAINING',
  'CARDIO',
  'STRENGTH',
  'FUNCTIONAL TRAINING',
];

export default function Facilities() {
  const imageContainerRef = useRef(null);
  const progress = useScrollProgress(imageContainerRef);

  // Subtle parallax translation & zoom from scroll progress
  const scale = 1.08 - progress * 0.08; // smoothly settles from 1.08 to 1.00
  const translateY = (progress - 0.5) * -28; // gentle -14px to +14px vertical drift

  return (
    <section
      id="facilities"
      className="relative w-full max-w-[1440px] mx-auto px-6 md:px-14 py-16 sm:py-20 lg:py-[100px] scroll-mt-20"
    >
      <div className="flex flex-col items-start gap-10">
        {/* Header */}
        <div className="flex flex-col items-start gap-5">
          <Reveal delay={0}>
            <p className="font-editorial-label text-[#EB3E2E]">04 / THE TRAINING GROUND</p>
          </Reveal>
          <Reveal variant="mask" delay={80}>
            <h2
              className="font-editorial-display font-semibold uppercase text-[#F5F5F5]"
              style={{ fontSize: 'clamp(2.75rem, 5vw, 4.5rem)' }}
            >
              BUILT FOR THE WORK.
            </h2>
          </Reveal>
          <Reveal delay={140} className="max-w-[620px]">
            <p className="font-editorial-body text-[#B8B8B8] text-[15px] md:text-[16px]">
              Everything you need to train with purpose — serious equipment, focused spaces and an
              environment built around progress.
            </p>
          </Reveal>
        </div>

        {/* Large Immersive Facility Visual with Parallax & Zoom */}
        <Reveal variant="image" className="w-full border border-[#303030]/60 bg-[#181818]">
          <div
            ref={imageContainerRef}
            className="relative w-full h-[320px] sm:h-[440px] lg:h-[560px] overflow-hidden"
          >
            <img
              src="/images/framer/training-floor.png"
              alt="Man & Machine Training Floor — Equipment & Free Weights"
              loading="lazy"
              className="w-full h-full object-cover object-center will-change-transform"
              style={{
                transform: `scale(${scale.toFixed(3)}) translate3d(0, ${translateY.toFixed(1)}px, 0)`,
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, rgba(11,11,11,0.12) 0%, rgba(11,11,11,0.55) 100%)',
              }}
            />
          </div>
        </Reveal>

        {/* Training Zone Feature Strip */}
        <Reveal delay={180} className="w-full">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2 border-t border-[#303030]">
            {zones.map((zone, idx) => (
              <div key={zone} className="flex items-center gap-6">
                <span className="font-editorial-label text-[#F5F5F5] hover:text-[#EB3E2E] transition-colors">
                  {zone}
                </span>
                {idx < zones.length - 1 && (
                  <span className="text-[#303030] text-xs select-none" aria-hidden="true">
                    •
                  </span>
                )}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
