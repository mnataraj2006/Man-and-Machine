import React from 'react';
import { Reveal } from '../Motion/ScrollMotion.jsx';

const standards = [
  {
    number: '01',
    title: 'TRAIN HARD',
    description: 'A structured training environment designed to push your limits.',
  },
  {
    number: '02',
    title: 'STAY CONSISTENT',
    description: 'Progress comes from showing up. Again. And again.',
  },
  {
    number: '03',
    title: 'REAL COMMUNITY',
    description: 'Train alongside people working toward becoming better.',
  },
  {
    number: '04',
    title: 'TRACK YOUR PROGRESS',
    description: 'Measure your progress. Celebrate the work. Keep improving.',
  },
];

export default function WhyManAndMachine() {
  return (
    <section
      id="why"
      className="relative w-full max-w-[1440px] mx-auto px-6 md:px-14 py-16 sm:py-20 lg:py-[100px] scroll-mt-20"
    >
      <div className="flex flex-col items-start gap-10">
        {/* Header */}
        <div className="flex flex-col items-start gap-6">
          <Reveal delay={0}>
            <p className="font-editorial-label text-[#EB3E2E]">02 / NO SHORTCUTS</p>
          </Reveal>
          <Reveal variant="mask" delay={80}>
            <h2
              className="font-editorial-display font-semibold uppercase text-[#F5F5F5]"
              style={{ fontSize: 'clamp(2.75rem, 5vw, 4.5rem)' }}
            >
              WHY MAN &amp; MACHINE
            </h2>
          </Reveal>
        </div>

        {/* 2x2 Editorial Standards Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
          {standards.map((item, idx) => (
            <Reveal
              key={item.number}
              delay={idx * 90}
              className="group border-t border-[#303030] hover:border-[#EB3E2E] transition-colors duration-500 p-6 md:p-7 flex flex-col items-start gap-5 bg-transparent"
            >
              <span className="font-editorial-label text-[#EB3E2E]">{item.number}</span>
              <h3
                className="font-editorial-display font-semibold uppercase text-[#F5F5F5] text-2xl sm:text-[32px] leading-[1.08] tracking-[-0.025em] group-hover:translate-x-1 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              >
                {item.title}
              </h3>
              <p className="font-editorial-body text-[#B8B8B8] text-[15px] md:text-[16px]">
                {item.description}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
