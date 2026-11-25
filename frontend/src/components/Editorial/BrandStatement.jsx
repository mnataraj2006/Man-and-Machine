import React from 'react';
import { Reveal } from '../Motion/ScrollMotion.jsx';

export default function BrandStatement() {
  return (
    <section
      id="about"
      className="relative w-full max-w-[1440px] mx-auto px-6 md:px-14 py-16 sm:py-20 lg:py-[100px] scroll-mt-20 overflow-hidden"
    >
      <div className="flex flex-col items-start gap-8 md:gap-10">
        {/* Section Label */}
        <Reveal delay={0}>
          <p className="font-editorial-label text-[#EB3E2E]">01 / THE STANDARD</p>
        </Reveal>

        {/* Display Heading */}
        <h2
          className="font-editorial-display font-semibold uppercase text-[#F5F5F5] flex flex-col items-start"
          style={{ fontSize: 'clamp(2.75rem, 5vw, 4.5rem)' }}
        >
          <Reveal variant="mask" delay={60}>
            <span>MORE THAN A GYM.</span>
          </Reveal>
          <Reveal variant="mask" delay={140}>
            <span className="text-[#F5F5F5]">A STANDARD.</span>
          </Reveal>
        </h2>

        {/* Supporting Copy */}
        <Reveal delay={200} className="max-w-[580px]">
          <p className="font-editorial-body text-[#B8B8B8] text-[15px] md:text-[16px]">
            Man &amp; Machine is built for people who refuse to settle. Train harder, move better,
            build discipline and become stronger — together.
          </p>
        </Reveal>

        {/* Oversized Subtle Editorial Watermark */}
        <Reveal delay={260} className="w-full pt-2 select-none" aria-hidden="true">
          <div
            className="font-editorial-display font-bold uppercase text-[#20201f] leading-none tracking-[-0.025em]"
            style={{ fontSize: 'clamp(3.5rem, 11vw, 8.75rem)' }}
          >
            DISCIPLINE
          </div>
        </Reveal>
      </div>
    </section>
  );
}
