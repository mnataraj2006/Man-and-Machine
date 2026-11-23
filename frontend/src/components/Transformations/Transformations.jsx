import React from 'react';

export default function Transformations() {
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

  return (
    <section className="w-full py-24 bg-surface" id="transformations">
      <div className="max-w-7xl mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop flex flex-col gap-space-xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md border-b border-[#252548] pb-space-lg">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary-container"></span>
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary-container">
                PROVEN OUTCOMES
              </span>
            </div>
            <h2 className="font-headline-lg text-headline-lg uppercase text-primary tracking-tight">
              YOUR JOURNEY. YOUR TRANSFORMATION.
            </h2>
            <p className="font-body-md text-body-md text-secondary">
              Real progress starts with showing up consistently. These are real results from our Kovilpatti community.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
          {stories.map((item) => (
            <div
              key={item.record}
              className="bg-surface-container-low rounded-xl border border-[#252548] p-space-lg flex flex-col justify-between hover:border-primary-container/50 transition-all"
            >
              <div className="flex flex-col gap-space-md">
                <div className="flex items-center justify-between border-b border-[#252548] pb-3">
                  <span className="font-label-sm text-label-sm text-primary-container font-mono">
                    {item.record}
                  </span>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                    {item.protocol}
                  </span>
                </div>
                <div className="py-2">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary bg-surface-container-high px-2.5 py-1 rounded">
                    {item.goal}
                  </span>
                </div>
                <blockquote className="font-body-md text-body-md text-on-surface-variant italic">
                  {item.quote}
                </blockquote>
              </div>

              <div className="pt-space-md border-t border-[#252548] mt-space-md flex items-center justify-between">
                <div>
                  <p className="font-label-md text-label-md uppercase text-primary font-semibold">
                    {item.name}
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant text-[12px]">
                    {item.detail}
                  </p>
                </div>
                <span className="material-symbols-outlined text-primary-container text-[20px]">
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
