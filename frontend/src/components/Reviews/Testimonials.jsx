import React from 'react';

export default function Testimonials() {
  const reviews = [
    {
      author: 'SURESH KANNAN',
      role: 'Local Guide',
      text: '"Best training facility in Kovilpatti without question. The equipment is serious, the space is meticulously maintained, and the training culture inspires you."',
    },
    {
      author: 'MANIKANDAN P.',
      role: 'Verified Member',
      text: '"Unlike other commercial gyms, Man & Machine has ample squat cages, high-spec bars, and serious lifters who respect the iron. Highly recommended."',
    },
    {
      author: 'PRIYA DHARSHINI',
      role: 'Verified Member',
      text: '"Great coaching guidance and clean timings from 5:30 AM. Perfect for early morning strength training before work. Exceptional community."',
    },
  ];

  return (
    <section className="w-full py-16 sm:py-24 bg-[#060614]" id="reviews">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8 sm:gap-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span 
              className="text-[10px] sm:text-xs uppercase tracking-widest text-[#E58A32] font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              VERIFIED REVIEWS
            </span>
            <h2 
              className="uppercase text-[#F5F5F5] font-bold tracking-tight mt-1"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 'clamp(1.8rem, 4vw, 2.75rem)',
                lineHeight: '1.1',
              }}
            >
              THE COMMUNITY SPEAKS.
            </h2>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#10102A] rounded-xl border border-[#292936] w-fit">
            <span className="text-[#E58A32] font-bold text-xs sm:text-sm">★ 4.9 ON GOOGLE</span>
            <span className="text-[#B8B8C7] text-xs sm:text-sm">• 183+ REVIEWS</span>
          </div>
        </div>

        {/* Reviews Grid — 1 col mobile, 3 col desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {reviews.map((r, i) => (
            <div
              key={i}
              className="bg-[#10102A] rounded-2xl border border-[#292936] p-5 sm:p-6 flex flex-col justify-between hover:border-[#E58A32]/60 transition-colors"
            >
              <div>
                <div className="text-[#E58A32] text-sm tracking-widest mb-3">★★★★★</div>
                <p className="text-sm sm:text-base text-[#B8B8C7] leading-relaxed">
                  {r.text}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#292936] flex items-center justify-between">
                <span 
                  className="text-xs sm:text-sm text-[#F5F5F5] uppercase font-bold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {r.author}
                </span>
                <span className="text-[11px] sm:text-xs text-[#B8B8C7]">
                  {r.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
