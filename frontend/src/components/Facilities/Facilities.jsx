import React, { useState, useEffect } from 'react';

export default function Facilities() {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const galleryItems = [
    {
      title: 'ZONE A // MACHINE MATRIX',
      subtitle: 'Training Floor & Cable Systems',
      description: 'Dual adjustable pulleys, plate-loaded row stations, and dedicated hyper-extension modules.',
      src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB-gVHmaRbRYUsFExforkbRsxVPJmfbSo9aapqGL1NBQIiV0CVW2TiVO5ozvT_4Fuwnq79dhLrItL7cntx1OXjhF-EN5gy6r5d8-o7jiPbKZWl-viUiEXV2djMyIjqn0utQPfnXEf2lcBGULycV3NGSZIxj4NYsPHbUXPmHJOkRsxJ29K1DCinZCMZBVasnpmyNlwmcHUmDryxqaj4PaTp8T-mQqHjVbUz0A8jQvcov',
      alt: 'Athletic training on high-end dark industrial gym cable and rack systems',
    },
    {
      title: 'ZONE B // FREE WEIGHTS',
      subtitle: 'Heavy Iron & Platforms',
      description: 'Dumbbells up to 50kg, competition racks, and shock-absorbent drop mats.',
      src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTJCmNpOexzNahVDQ74yvtaIvXhYSW4FwnFV2x3WgrdZig1z_gDo5p7ARX20HJF8WxmgDM4pBhInuhNTqBJnk4y1IYrW8sZkiTTkuRYFZzkV3fcUPc5cE-my0HEafzJRVW8Ftm4M0x6r7fOImblAy15PvEMOYjDT4VpByijBaIhAl4i4Kyv0SIoNEF4NfMbnroPbiMk-O-VCmooZo9leEUMXtVmeSDPBKM6Fe-F4l0',
      alt: 'Heavy calibrated iron barbell deadlift platform in a dark Kovilpatti gym',
    },
    {
      title: 'ZONE C // OLYMPIC LIFTING',
      subtitle: 'Calibrated Barbell Platforms',
      description: 'Dedicated competition-grade barbells with knurling and high-tensile collars.',
      src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBqsSy4MbhT_2yyFpji6XWFXfNz85bGohPKA7s-_m68TItaIl5y9alhcv5cBOzizHbTSkPDmf7wYO0D16qnTeWIWY_XHs9rCC3FXVeqQggzGX8Q_0L5-QMwJmuSvdAMCKfie9klcLKe2J5U054VUwU92-87OQ9ezUi_BZZWCQ5QiHczVxEHiE0GxlKEA-_UI9ZUVFC-gDMeTB39fQ2YeW2sFsJmTwHr6o61FATVBqO8',
      alt: 'Olympic barbell and precision weight plates on lifting platform',
    },
  ];

  // Lock body scroll while lightbox is open
  useEffect(() => {
    if (lightboxIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [lightboxIndex]);

  // Escape key handler for lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight' && lightboxIndex !== null) {
        setLightboxIndex((prev) => (prev + 1) % galleryItems.length);
      }
      if (e.key === 'ArrowLeft' && lightboxIndex !== null) {
        setLightboxIndex((prev) => (prev - 1 + galleryItems.length) % galleryItems.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex]);

  return (
    <section className="w-full py-14 sm:py-20 lg:py-24 bg-[#09090B]" id="facilities">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-6 sm:gap-10 lg:gap-12">

        {/* Section Header */}
        <div className="flex flex-col gap-2">
          <span 
            className="text-[10px] sm:text-xs uppercase tracking-widest text-[#E58A32] font-bold"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            THE FACILITY SPECIFICATION
          </span>
          <h2 
            className="uppercase text-[#F5F5F5] font-bold tracking-tight"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              lineHeight: '1.08',
            }}
          >
            BUILT FOR SERIOUS TRAINING.
          </h2>
          <p className="text-xs sm:text-sm lg:text-base text-[#A3A3A3] max-w-xl leading-relaxed">
            A high-density training environment where every machine, barbell, and platform is selected for biomechanical integrity.
          </p>
        </div>

        {/* ── MOBILE: Masonry Gallery with Lightbox Interaction (< 1024px) ── */}
        <div className="block lg:hidden flex flex-col gap-3.5">
          {/* Featured Large Image Tile */}
          <div 
            onClick={() => setLightboxIndex(0)}
            className="relative rounded-2xl overflow-hidden bg-[#141414] border border-[#292929] cursor-pointer group shadow-lg"
          >
            <div className="relative h-[210px] sm:h-[280px] w-full overflow-hidden">
              <img
                src={galleryItems[0].src}
                alt={galleryItems[0].alt}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-transparent to-transparent"></div>

              <div className="absolute top-3 left-3 bg-[#09090B]/85 backdrop-blur-sm px-2.5 py-1 rounded-md border border-[#292929]">
                <span className="text-[9.5px] text-[#F5F5F5] font-bold uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {galleryItems[0].title}
                </span>
              </div>

              <div className="absolute bottom-3 right-3 bg-[#09090B]/90 backdrop-blur-sm px-2.5 py-1 rounded-md border border-[#292929] flex items-center gap-1 text-[10px] text-[#E58A32] font-bold">
                <span className="material-symbols-outlined text-[14px]">fullscreen</span>
                <span>TAP TO EXPAND</span>
              </div>
            </div>

            <div className="p-3.5 bg-[#141414] flex items-center justify-between gap-2 border-t border-[#292929]">
              <span className="text-xs font-bold uppercase text-[#F5F5F5] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {galleryItems[0].subtitle}
              </span>
              <span className="text-[10px] text-[#E58A32] font-semibold uppercase px-2 py-0.5 rounded bg-[#E58A32]/10 border border-[#E58A32]/30">
                ZONE A
              </span>
            </div>
          </div>

          {/* Two Smaller Images Row */}
          <div className="grid grid-cols-2 gap-3">
            {galleryItems.slice(1).map((item, idx) => {
              const itemIdx = idx + 1;
              return (
                <div
                  key={item.title}
                  onClick={() => setLightboxIndex(itemIdx)}
                  className="relative rounded-xl overflow-hidden bg-[#141414] border border-[#292929] cursor-pointer group shadow"
                >
                  <div className="relative h-[125px] sm:h-[160px] w-full overflow-hidden">
                    <img
                      src={item.src}
                      alt={item.alt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-transparent to-transparent"></div>
                    <div className="absolute top-2 left-2 bg-[#09090B]/85 backdrop-blur-sm px-2 py-0.5 rounded text-[8.5px] font-bold text-[#E58A32] uppercase">
                      {idx === 0 ? 'ZONE B' : 'ZONE C'}
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#141414] border-t border-[#292929]">
                    <p className="text-[11px] font-bold uppercase text-[#F5F5F5] truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {item.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Specifications Pill */}
          <div className="p-3 rounded-xl bg-[#141414] border border-[#292929] flex items-center justify-between text-[11px] text-[#A3A3A3]">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#E58A32] text-[16px]">air</span>
              <span>Airflow &amp; Sanitization: Continuous</span>
            </span>
            <span className="text-[#E58A32] font-mono font-bold">100% FOCUS</span>
          </div>
        </div>

        {/* ── DESKTOP: Asymmetric Bento Grid (>= 1024px) UNCHANGED ── */}
        <div className="hidden lg:grid grid-cols-12 gap-6">
          {/* Large Hero Facility Tile */}
          <div className="col-span-8 bg-[#10102A] rounded-2xl border border-[#292936] overflow-hidden flex flex-col group">
            <div className="relative h-[380px] w-full overflow-hidden">
              <img
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                alt={galleryItems[0].alt}
                src={galleryItems[0].src}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#10102A] via-transparent to-transparent"></div>
              <div className="absolute top-4 left-4 bg-[#09090B]/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#292936]">
                <span 
                  className="text-xs text-[#F5F5F5] uppercase font-bold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {galleryItems[0].title}
                </span>
              </div>
            </div>

            <div className="p-6 flex items-center justify-between gap-4">
              <div>
                <h3 
                  className="text-xl uppercase text-[#F5F5F5] font-bold tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {galleryItems[0].subtitle}
                </h3>
                <p className="text-sm text-[#B8B8C7] mt-1 leading-relaxed">
                  {galleryItems[0].description}
                </p>
              </div>
              <span 
                className="text-xs font-semibold text-[#E58A32] px-3 py-1.5 bg-[#181822] rounded-lg border border-[#292936] whitespace-nowrap shrink-0"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                SEAMLESS MOTION
              </span>
            </div>
          </div>

          {/* Secondary Stack */}
          <div className="col-span-4 flex flex-col gap-6">
            <div className="bg-[#10102A] rounded-2xl border border-[#292936] overflow-hidden flex flex-col group flex-1">
              <div className="relative h-[200px] w-full overflow-hidden">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  alt={galleryItems[1].alt}
                  src={galleryItems[1].src}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#10102A] via-transparent to-transparent"></div>
              </div>
              <div className="p-5">
                <p 
                  className="text-xs text-[#E58A32] uppercase tracking-wider font-bold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {galleryItems[1].title}
                </p>
                <h4 
                  className="text-lg uppercase text-[#F5F5F5] font-bold tracking-tight mt-1"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {galleryItems[1].subtitle}
                </h4>
                <p className="text-sm text-[#B8B8C7] mt-1 leading-relaxed">
                  {galleryItems[1].description}
                </p>
              </div>
            </div>

            {/* Specs readout mini-card */}
            <div className="bg-[#10102A] rounded-2xl border border-[#292936] p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-[#292936] pb-2">
                <span 
                  className="text-xs uppercase tracking-wider text-[#B8B8C7] font-bold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  AIR FLOW &amp; HYGIENE
                </span>
                <span 
                  className="text-xs text-[#E58A32] font-semibold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  OPTIMIZED
                </span>
              </div>
              <p className="text-sm text-[#B8B8C7] pt-2.5 leading-relaxed">
                High-volume ventilation, dedicated sanitized dumbbell returns, and continuous maintenance for uncompromising focus.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* ── FULL-SCREEN LIGHTBOX MODAL ── */}
      {lightboxIndex !== null && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-8 animate-fadeInScale"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Top Bar with Title and Close */}
          <div className="flex items-center justify-between w-full max-w-4xl mx-auto z-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col">
              <span className="text-xs uppercase font-bold text-[#E58A32] tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {galleryItems[lightboxIndex].title}
              </span>
              <span className="text-sm sm:text-base text-[#F5F5F5] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {galleryItems[lightboxIndex].subtitle}
              </span>
            </div>

            <button
              onClick={() => setLightboxIndex(null)}
              aria-label="Close Lightbox"
              className="w-10 h-10 rounded-full bg-[#141414] border border-[#292929] text-[#F5F5F5] hover:text-[#E58A32] hover:border-[#E58A32] flex items-center justify-center transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Centered Image Container with Navigation Arrows */}
          <div className="relative flex-1 flex items-center justify-center my-auto py-4" onClick={(e) => e.stopPropagation()}>
            {/* Prev Button */}
            <button
              onClick={() => setLightboxIndex((prev) => (prev - 1 + galleryItems.length) % galleryItems.length)}
              aria-label="Previous image"
              className="absolute left-2 sm:left-4 z-10 w-11 h-11 rounded-full bg-[#141414]/80 border border-[#292929] text-[#F5F5F5] hover:text-[#E58A32] hover:border-[#E58A32] flex items-center justify-center transition-all cursor-pointer shadow-lg"
            >
              <span className="material-symbols-outlined text-[22px]">chevron_left</span>
            </button>

            {/* Active Image */}
            <img
              src={galleryItems[lightboxIndex].src}
              alt={galleryItems[lightboxIndex].alt}
              className="max-h-[65vh] sm:max-h-[75vh] max-w-full rounded-xl object-contain border border-[#292929] shadow-2xl"
            />

            {/* Next Button */}
            <button
              onClick={() => setLightboxIndex((prev) => (prev + 1) % galleryItems.length)}
              aria-label="Next image"
              className="absolute right-2 sm:right-4 z-10 w-11 h-11 rounded-full bg-[#141414]/80 border border-[#292929] text-[#F5F5F5] hover:text-[#E58A32] hover:border-[#E58A32] flex items-center justify-center transition-all cursor-pointer shadow-lg"
            >
              <span className="material-symbols-outlined text-[22px]">chevron_right</span>
            </button>
          </div>

          {/* Bottom Caption & Pagination Dots */}
          <div className="flex flex-col items-center gap-2 max-w-xl mx-auto text-center z-10" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs text-[#A3A3A3] line-clamp-2">
              {galleryItems[lightboxIndex].description}
            </p>
            <div className="flex items-center gap-2 pt-1">
              {galleryItems.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    lightboxIndex === i ? 'bg-[#E58A32] w-6' : 'bg-[#292929]'
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
