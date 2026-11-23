import React, { useState } from 'react';
import { branches } from '../../data/branches.js';

export default function Branches() {
  const [activeBranchIndex, setActiveBranchIndex] = useState(0);
  const [expandedHours, setExpandedHours] = useState({});

  const toggleHours = (id) => {
    setExpandedHours((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <section className="w-full py-14 sm:py-20 lg:py-24 bg-[#09090B] relative overflow-hidden" id="branches">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8 sm:gap-12 lg:gap-14">

        {/* ── Section Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 border-b border-[#292936] pb-6 sm:pb-8">
          <div className="flex flex-col gap-2.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E58A32]"></span>
              <span 
                className="text-[10px] sm:text-xs uppercase tracking-widest text-[#E58A32] font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                OUR BRANCHES
              </span>
            </div>

            <h2 
              className="uppercase text-[#F5F5F5] font-bold tracking-tight"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 'clamp(1.75rem, 4.2vw, 2.85rem)',
                lineHeight: '1.05',
              }}
            >
              ONE BRAND. THREE LOCATIONS.
            </h2>

            <p className="text-xs sm:text-base text-[#B8B8C7] leading-relaxed">
              Wherever you are, your journey towards strength starts with Man &amp; Machine. Find your nearest training destination.
            </p>
          </div>

          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#141414] border border-[#292936] w-fit shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#E58A32] animate-pulse"></span>
            <span 
              className="text-[11px] font-bold uppercase tracking-wider text-[#F5F5F5]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              TAMIL NADU NETWORK
            </span>
          </div>
        </div>

        {/* ── Three-City Statistics Strip ── */}
        <div className="grid grid-cols-3 gap-2 sm:gap-6 bg-[#141414] border border-[#292936] rounded-2xl p-3 sm:p-6 text-center">
          <div className="flex flex-col items-center justify-center border-r border-[#292936] py-1">
            <span 
              className="font-bold text-xl sm:text-4xl text-[#E58A32] tracking-tight font-mono"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              03
            </span>
            <span 
              className="text-[8.5px] sm:text-xs font-bold uppercase tracking-widest text-[#B8B8C7] mt-0.5 sm:mt-1"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              LOCATIONS
            </span>
          </div>

          <div className="flex flex-col items-center justify-center border-r border-[#292936] py-1">
            <span 
              className="font-bold text-xl sm:text-4xl text-[#F5F5F5] tracking-tight font-mono"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              03
            </span>
            <span 
              className="text-[8.5px] sm:text-xs font-bold uppercase tracking-widest text-[#B8B8C7] mt-0.5 sm:mt-1"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              CITIES
            </span>
          </div>

          <div className="flex flex-col items-center justify-center py-1">
            <span 
              className="font-bold text-xl sm:text-4xl text-[#E58A32] tracking-tight uppercase"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              ONE
            </span>
            <span 
              className="text-[8.5px] sm:text-xs font-bold uppercase tracking-widest text-[#B8B8C7] mt-0.5 sm:mt-1"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              FITNESS CULTURE
            </span>
          </div>
        </div>

        {/* ── MOBILE HORIZONTAL SWIPEABLE CAROUSEL (lg:hidden) ── */}
        <div className="block lg:hidden flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <span 
              className="text-[10.5px] uppercase tracking-wider text-[#B8B8C7] font-semibold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              SELECT BRANCH ({activeBranchIndex + 1}/3)
            </span>
            {/* Pagination Dots */}
            <div className="flex items-center gap-1.5">
              {branches.map((b, idx) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setActiveBranchIndex(idx);
                    const el = document.getElementById(`mobile-branch-${b.id}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                  }}
                  aria-label={`View ${b.city} branch`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    activeBranchIndex === idx ? 'w-6 bg-[#E58A32]' : 'w-1.5 bg-[#292936]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Swipe Track */}
          <div 
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2 px-1"
            onScroll={(e) => {
              const scrollLeft = e.currentTarget.scrollLeft;
              const width = e.currentTarget.offsetWidth;
              const newIdx = Math.round(scrollLeft / width);
              if (newIdx !== activeBranchIndex && newIdx >= 0 && newIdx < branches.length) {
                setActiveBranchIndex(newIdx);
              }
            }}
          >
            {branches.map((b, idx) => {
              const isHoursOpen = !!expandedHours[b.id];
              return (
                <div
                  key={b.id}
                  id={`mobile-branch-${b.id}`}
                  className="snap-center shrink-0 w-[86vw] max-w-[340px] bg-[#141414] rounded-2xl border border-[#292936] overflow-hidden flex flex-col justify-between shadow-xl"
                >
                  <div>
                    {/* Image Banner */}
                    <div className="relative h-[180px] w-full overflow-hidden bg-[#09090B]">
                      <img
                        src={b.image}
                        alt={`${b.name} ${b.city}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent"></div>

                      {/* City Badge */}
                      <div className="absolute top-3 left-3 flex gap-1.5">
                        <span 
                          className="bg-[#09090B]/90 backdrop-blur-md text-[#E58A32] border border-[#292936] font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {b.city}
                        </span>
                        <span 
                          className="bg-[#E58A32] text-white font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {b.tag}
                        </span>
                      </div>

                      {/* Rating */}
                      <div className="absolute bottom-3 right-3 bg-[#09090B]/90 backdrop-blur-md border border-[#292936] px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <span className="text-[#E58A32] text-xs">★</span>
                        <span className="text-[#F5F5F5] font-bold text-xs">{b.rating}</span>
                        <span className="text-[#B8B8C7] text-[10px]">({b.reviewCount})</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex flex-col gap-3.5">
                      <div>
                        <h3 
                          className="text-base font-bold uppercase text-[#F5F5F5] tracking-tight"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {b.name}
                        </h3>
                        <p 
                          className="text-[11px] uppercase tracking-wider text-[#E58A32] font-semibold"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {b.city} Facility
                        </p>
                      </div>

                      {/* Address */}
                      <div className="flex items-start gap-2 text-xs text-[#B8B8C7] leading-relaxed">
                        <span className="material-symbols-outlined text-[#E58A32] text-[17px] shrink-0 mt-0.5">
                          location_on
                        </span>
                        <div>
                          <p className="text-[#F5F5F5] font-medium text-[11.5px]">{b.address}</p>
                          {b.landmark && (
                            <p className="text-[10.5px] text-[#B8B8C7]/80 mt-0.5">{b.landmark}</p>
                          )}
                          {b.addressNote && (
                            <p className="text-[10px] text-[#E58A32]/90 mt-0.5 italic">
                              ℹ️ {b.addressNote}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Collapsible Operating Hours Toggle */}
                      <div className="bg-[#09090B] rounded-xl border border-[#292936] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleHours(b.id)}
                          className="w-full px-3 py-2.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#B8B8C7] hover:text-[#F5F5F5] transition-colors"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[#E58A32] text-[15px]">schedule</span>
                            <span>{isHoursOpen ? 'HIDE OPERATING HOURS' : 'VIEW OPERATING HOURS'}</span>
                          </div>
                          <span className={`material-symbols-outlined text-[16px] text-[#E58A32] transition-transform duration-200 ${
                            isHoursOpen ? 'rotate-180' : ''
                          }`}>
                            keyboard_arrow_down
                          </span>
                        </button>

                        {isHoursOpen && (
                          <div className="px-3 pb-3 pt-1 border-t border-[#292936]/60 flex flex-col gap-1.5">
                            {b.hours.map((h, i) => (
                              <div key={i} className="flex items-center justify-between text-[10.5px] gap-2">
                                <span className="text-[#B8B8C7] truncate">{h.days}:</span>
                                <span className="text-[#F5F5F5] font-mono font-semibold shrink-0">{h.time}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Phone */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="material-symbols-outlined text-[#E58A32] text-[16px] shrink-0">
                          call
                        </span>
                        {b.phone ? (
                          <a 
                            href={`tel:${b.phoneRaw}`} 
                            className="text-[#F5F5F5] font-mono hover:text-[#E58A32] font-semibold transition-colors text-[11.5px]"
                          >
                            {b.phone}
                          </a>
                        ) : (
                          <span className="text-[#B8B8C7] italic text-[10.5px]">
                            {b.phoneDisplay}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Branch Action Buttons */}
                  <div className="p-4 pt-1 flex gap-2">
                    <a
                      href={b.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1 bg-[#E58A32] hover:bg-[#F09A43] text-white font-bold text-[10.5px] uppercase tracking-wider py-2.5 px-3 rounded-xl transition-all min-h-[44px] text-center"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      <span>DIRECTIONS</span>
                      <span className="material-symbols-outlined text-[15px]">near_me</span>
                    </a>

                    {b.phone && (
                      <a
                        href={`tel:${b.phoneRaw}`}
                        className="inline-flex items-center justify-center gap-1 bg-[#181822] text-[#F5F5F5] font-bold text-[10.5px] uppercase tracking-wider py-2.5 px-3 rounded-xl border border-[#292936] transition-all min-h-[44px] text-center"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        <span className="material-symbols-outlined text-[15px] text-[#E58A32]">call</span>
                        <span>CALL</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── DESKTOP CARDS GRID (hidden lg:grid) — 100% PRESERVED ── */}
        <div className="hidden lg:grid grid-cols-3 gap-8">
          {branches.map((b) => (
            <div
              key={b.id}
              className="bg-[#141414] rounded-2xl border border-[#292936] overflow-hidden flex flex-col justify-between hover:border-[#E58A32] transition-all duration-300 group shadow-lg"
            >
              <div>
                {/* Branch Image Banner */}
                <div className="relative h-[220px] w-full overflow-hidden bg-[#09090B]">
                  <img
                    src={b.image}
                    alt={`${b.name} ${b.city} training area`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent"></div>

                  {/* City & Tag Badge */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    <span 
                      className="bg-[#09090B]/90 backdrop-blur-md text-[#E58A32] border border-[#292936] font-bold text-[11px] uppercase tracking-wider px-3 py-1 rounded-full shadow"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {b.city}
                    </span>
                    <span 
                      className="bg-[#E58A32] text-white font-bold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full shadow"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {b.tag}
                    </span>
                  </div>

                  {/* Publicly Listed Rating */}
                  <div className="absolute bottom-3 right-3 bg-[#09090B]/90 backdrop-blur-md border border-[#292936] px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow">
                    <span className="text-[#E58A32] text-xs">★</span>
                    <span className="text-[#F5F5F5] font-bold text-xs">{b.rating}</span>
                    <span className="text-[#B8B8C7] text-[10px]">({b.reviewCount})</span>
                  </div>
                </div>

                {/* Branch Info Body */}
                <div className="p-6 flex flex-col gap-4">
                  {/* Title */}
                  <div>
                    <h3 
                      className="text-xl font-bold uppercase text-[#F5F5F5] tracking-tight group-hover:text-[#E58A32] transition-colors"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {b.name}
                    </h3>
                    <p 
                      className="text-xs uppercase tracking-wider text-[#E58A32] font-semibold mt-0.5"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {b.city} Branch
                    </p>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-2.5 text-xs text-[#B8B8C7] leading-relaxed">
                    <span className="material-symbols-outlined text-[#E58A32] text-[18px] shrink-0 mt-0.5">
                      location_on
                    </span>
                    <div>
                      <p className="text-[#F5F5F5] font-medium">{b.address}</p>
                      {b.landmark && (
                        <p className="text-[11px] text-[#B8B8C7]/80 mt-0.5">{b.landmark}</p>
                      )}
                      {b.addressNote && (
                        <p className="text-[11px] text-[#E58A32]/90 mt-1 italic">
                          ℹ️ {b.addressNote}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Operating Hours */}
                  <div className="bg-[#09090B] rounded-xl p-3 border border-[#292936] flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-[10.5px] uppercase font-bold text-[#B8B8C7] tracking-wider mb-0.5">
                      <span className="material-symbols-outlined text-[#E58A32] text-[15px]">schedule</span>
                      <span>LISTED OPERATING HOURS</span>
                    </div>
                    {b.hours.map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] gap-2">
                        <span className="text-[#B8B8C7] truncate">{h.days}:</span>
                        <span className="text-[#F5F5F5] font-mono font-semibold shrink-0">{h.time}</span>
                      </div>
                    ))}
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="material-symbols-outlined text-[#E58A32] text-[18px] shrink-0">
                      call
                    </span>
                    {b.phone ? (
                      <a 
                        href={`tel:${b.phoneRaw}`} 
                        className="text-[#F5F5F5] font-mono hover:text-[#E58A32] font-semibold transition-colors"
                      >
                        {b.phone}
                      </a>
                    ) : (
                      <span className="text-[#B8B8C7] italic text-[11px]">
                        {b.phoneDisplay}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Branch Action Buttons */}
              <div className="p-6 pt-0 flex gap-2.5">
                <a
                  href={b.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#E58A32] hover:bg-[#F09A43] text-white font-bold text-[11px] uppercase tracking-wider py-3 px-4 rounded-xl shadow-[0_0_12px_rgba(229,138,50,0.25)] transition-all min-h-[44px] text-center"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <span>GET DIRECTIONS</span>
                  <span className="material-symbols-outlined text-[16px]">near_me</span>
                </a>

                {b.phone && (
                  <a
                    href={`tel:${b.phoneRaw}`}
                    className="inline-flex items-center justify-center gap-1.5 bg-[#181822] hover:border-[#E58A32] hover:text-[#E58A32] text-[#F5F5F5] font-bold text-[11px] uppercase tracking-wider py-3 px-4 rounded-xl border border-[#292936] transition-all min-h-[44px] text-center shrink-0"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#E58A32]">call</span>
                    <span>CALL NOW</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Central Contact Guidance Note ── */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-[#141414] border border-[#292936] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#B8B8C7]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#E58A32] text-[18px] shrink-0">verified</span>
            <span className="text-[11.5px] sm:text-xs">All listings reflect publicly listed information. Training protocols remain consistent across all locations.</span>
          </div>
          <a 
            href="#contact" 
            className="text-[#E58A32] hover:underline font-bold uppercase tracking-wider text-[11px] shrink-0"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            VIEW FACILITY DETAILS →
          </a>
        </div>

      </div>
    </section>
  );
}