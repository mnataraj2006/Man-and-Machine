import React, { useState } from 'react';
import { branches } from '../../data/branches.js';

export default function LocationAndHours() {
  const [selectedCityId, setSelectedCityId] = useState('kovilpatti');

  const selectedBranch = branches.find((b) => b.id === selectedCityId) || branches[0];

  // Coordinates mapping for live telemetry display
  const coordinates = {
    kovilpatti: '9.1726° N, 77.8687° E',
    karur: '10.9601° N, 78.0766° E',
    sivakasi: '9.4533° N, 77.7947° E',
  };

  return (
    <section className="w-full py-14 sm:py-20 lg:py-24 bg-[#09090B] relative overflow-hidden" id="contact">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8 sm:gap-10">

        {/* ── Section Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#292936] pb-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E58A32]"></span>
              <span 
                className="text-[10px] sm:text-xs uppercase tracking-widest text-[#E58A32] font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                REGIONAL DIRECTORY &amp; TIMINGS
              </span>
            </div>
            <h2 
              className="uppercase text-[#F5F5F5] font-bold tracking-tight"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                lineHeight: '1.1',
              }}
            >
              FIND YOUR FACILITY
            </h2>
            <p className="text-xs sm:text-sm text-[#B8B8C7] leading-relaxed">
              Select your city below to inspect facility addresses, operating schedules, and direct directions.
            </p>
          </div>

          {/* Interactive City Selector Tab Bar */}
          <div className="flex items-center gap-1.5 p-1.5 bg-[#141414] rounded-xl border border-[#292936] overflow-x-auto no-scrollbar shrink-0">
            {branches.map((b) => {
              const isActive = selectedCityId === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedCityId(b.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap min-h-[38px] ${
                    isActive
                      ? 'bg-[#E58A32] text-white shadow-[0_0_12px_rgba(229,138,50,0.35)]'
                      : 'text-[#B8B8C7] hover:text-[#F5F5F5] hover:bg-[#181822]'
                  }`}
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {b.city}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Details Grid (1 col mobile, 2 col desktop) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
          {/* Left Column: Dynamic Branch Details */}
          <div className="lg:col-span-6 flex flex-col gap-4 sm:gap-6">
            
            {/* Active Branch Badge */}
            <div className="flex items-center justify-between px-1">
              <span 
                className="text-xs uppercase tracking-wider text-[#E58A32] font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {selectedBranch.city.toUpperCase()} BRANCH DETAILS
              </span>
              <span className="text-[11px] text-[#B8B8C7] bg-[#141414] px-2.5 py-1 rounded-full border border-[#292936]">
                {selectedBranch.tag}
              </span>
            </div>

            {/* Address Card */}
            <div className="p-5 sm:p-6 bg-[#10102A] rounded-2xl border border-[#292936] flex flex-col gap-3">
              <div 
                className="flex items-center gap-2 text-[#F5F5F5] text-xs uppercase tracking-wider font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <span className="material-symbols-outlined text-[#E58A32] text-[20px]">location_on</span>
                <span>FACILITY ADDRESS</span>
              </div>
              <p className="text-sm sm:text-base text-[#F5F5F5] font-medium leading-relaxed">
                {selectedBranch.address}
              </p>
              {selectedBranch.landmark && (
                <p className="text-xs text-[#B8B8C7] leading-relaxed">
                  Landmark: {selectedBranch.landmark}
                </p>
              )}
              {selectedBranch.addressNote && (
                <p className="text-xs text-[#E58A32]/90 italic">
                  ℹ️ {selectedBranch.addressNote}
                </p>
              )}
            </div>

            {/* Operating Schedule Card */}
            <div className="p-5 sm:p-6 bg-[#10102A] rounded-2xl border border-[#292936] flex flex-col gap-3">
              <div 
                className="flex items-center gap-2 text-[#F5F5F5] text-xs uppercase tracking-wider font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <span className="material-symbols-outlined text-[#E58A32] text-[20px]">schedule</span>
                <span>OPERATING SCHEDULE</span>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                {selectedBranch.hours.map((h, i) => (
                  <div 
                    key={i} 
                    className={`flex flex-col xs:flex-row xs:items-center justify-between py-2 gap-1 ${
                      i !== selectedBranch.hours.length - 1 ? 'border-b border-[#292936]' : ''
                    }`}
                  >
                    <span 
                      className="text-xs uppercase text-[#B8B8C7] font-semibold"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {h.days}
                    </span>
                    <span className="text-xs sm:text-sm text-[#F5F5F5] font-mono font-bold">
                      {h.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Direct Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <a
                className="inline-flex items-center justify-center gap-2 bg-[#E58A32] text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-[0_0_15px_rgba(229,138,50,0.30)] hover:bg-[#F09A43] transition-all min-h-[48px] text-center flex-1"
                href={selectedBranch.mapUrl}
                rel="noopener noreferrer"
                target="_blank"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <span>DIRECTIONS TO {selectedBranch.city.toUpperCase()}</span>
                <span className="material-symbols-outlined text-[18px]">near_me</span>
              </a>

              {selectedBranch.phone ? (
                <a
                  className="inline-flex items-center justify-center gap-2 bg-[#181822] text-[#F5F5F5] hover:text-[#E58A32] font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl border border-[#292936] hover:border-[#E58A32] transition-all min-h-[48px] text-center"
                  href={`tel:${selectedBranch.phoneRaw}`}
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <span className="material-symbols-outlined text-[18px] text-[#E58A32]">call</span>
                  <span>{selectedBranch.phone}</span>
                </a>
              ) : (
                <a
                  className="inline-flex items-center justify-center gap-2 bg-[#181822] text-[#B8B8C7] hover:text-[#E58A32] font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl border border-[#292936] hover:border-[#E58A32] transition-all min-h-[48px] text-center"
                  href="tel:+917598885566"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <span className="material-symbols-outlined text-[18px] text-[#E58A32]">call</span>
                  <span>HQ: +91 75988 85566</span>
                </a>
              )}
            </div>
          </div>

          {/* Right Column: Styled Map Card with Dynamic Telemetry */}
          <div className="lg:col-span-6 flex flex-col w-full">
            <div className="relative w-full h-full min-h-[300px] sm:min-h-[380px] lg:min-h-[440px] rounded-2xl overflow-hidden border border-[#292936] bg-[#10102A] flex flex-col justify-between">
              {/* Simulated Map Background */}
              <div
                className="absolute inset-0 bg-cover bg-center opacity-65"
                style={{
                  backgroundImage:
                    "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBZCDFH4CjEO-w_RwRmEpn2M4wpPSEgRUD4oEEpXmZNgOSUbWfwsM7CAeOJ-_GnfuDZUSsoj00njHwIrr55IncST2Ht-OmcxsYXVmf_bx-OV30IRUd2wOxfSuNKNdKfKbv06RJOQr2mP94C0D9f2Rlf1QXcrAimMI3s2Iu9WJcFXeGo2NGDZo_pD4t_bm7JwikbV7m2iUpTISJXiHq4k4ULeGi_qAcAn2djhXBMH24T')",
                }}
              ></div>

              {/* Map Header */}
              <div className="relative z-10 p-3.5 sm:p-4 bg-[#09090B]/90 backdrop-blur-md border-b border-[#292936] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#E58A32] animate-ping"></span>
                  <span 
                    className="text-[10px] sm:text-xs text-[#F5F5F5] uppercase font-bold tracking-widest truncate"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    LIVE SATELLITE TELEMETRY
                  </span>
                </div>
                <span className="font-mono text-[#E58A32] text-[10.5px] sm:text-xs shrink-0">
                  {coordinates[selectedCityId] || coordinates.kovilpatti}
                </span>
              </div>

              {/* Central Pin */}
              <div className="relative z-10 my-auto flex flex-col items-center justify-center p-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#E58A32]/20 border border-[#E58A32] flex items-center justify-center animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-[#E58A32] text-white flex items-center justify-center shadow-[0_0_20px_rgba(229,138,50,0.6)]">
                    <span className="material-symbols-outlined text-[18px] sm:text-[20px]">fitness_center</span>
                  </div>
                </div>
                <div className="mt-2 px-3 py-1 bg-[#09090B]/95 rounded-lg border border-[#292936] shadow-lg text-center">
                  <span 
                    className="text-[11px] sm:text-xs text-[#F5F5F5] font-bold tracking-wider uppercase block"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    MAN &amp; MACHINE • {selectedBranch.city.toUpperCase()}
                  </span>
                  <span className="text-[9.5px] text-[#E58A32] font-mono">
                    ★ {selectedBranch.rating} • {selectedBranch.reviewCount} Reviews
                  </span>
                </div>
              </div>

              {/* Bottom readout */}
              <div className="relative z-10 p-3 sm:p-4 bg-[#09090B]/90 backdrop-blur-md border-t border-[#292936] flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-[10px] sm:text-xs text-[#B8B8C7] uppercase font-semibold">
                <span className="truncate">{selectedBranch.city} Arterial Access</span>
                <span className="text-[#E58A32] shrink-0">PARKING: COMPLIMENTARY</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}