import React from 'react';

export default function LocationAndHours() {
  return (
    <section className="w-full py-16 sm:py-24 bg-[#09090B]" id="contact">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column: Details */}
          <div className="lg:col-span-6 flex flex-col gap-6 sm:gap-8">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E58A32]"></span>
                <span 
                  className="text-[10px] sm:text-xs uppercase tracking-widest text-[#B8B8C7] font-bold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  HEADQUARTERS &amp; REGIONAL LOCATIONS
                </span>
              </div>
              <h2 
                className="uppercase text-[#F5F5F5] font-bold tracking-tight"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 'clamp(1.8rem, 4vw, 2.75rem)',
                  lineHeight: '1.1',
                }}
              >
                FIND YOUR FACILITY
              </h2>
              <p className="text-sm text-[#B8B8C7] leading-relaxed">
                Operating across Kovilpatti, Karur, and Sivakasi. Detailed below is our flagship Kovilpatti facility.
              </p>
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
                Balaji Complex, 580E/5, Ettayapuram Road, Thittankulam, Kovilpatti, Tamil Nadu – 628501
              </p>
              <p className="text-xs sm:text-sm text-[#B8B8C7] leading-relaxed">
                Landmark: Near Thittankulam junction, easy arterial road access with dedicated member parking.
              </p>
            </div>

            {/* Timings Card */}
            <div className="p-5 sm:p-6 bg-[#10102A] rounded-2xl border border-[#292936] flex flex-col gap-3">
              <div 
                className="flex items-center gap-2 text-[#F5F5F5] text-xs uppercase tracking-wider font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <span className="material-symbols-outlined text-[#E58A32] text-[20px]">schedule</span>
                <span>OPERATING SCHEDULE</span>
              </div>
              <div className="flex flex-col gap-2.5 pt-1">
                <div className="flex flex-col xs:flex-row xs:items-center justify-between py-2 border-b border-[#292936] gap-1">
                  <span 
                    className="text-xs uppercase text-[#B8B8C7] font-semibold"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    MONDAY — SATURDAY
                  </span>
                  <span className="text-xs sm:text-sm text-[#F5F5F5] font-mono font-bold">
                    5:30 AM — 9:30 PM
                  </span>
                </div>
                <div className="flex flex-col xs:flex-row xs:items-center justify-between py-2 gap-1">
                  <span 
                    className="text-xs uppercase text-[#B8B8C7] font-semibold"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    SUNDAY RECOVERY SESSION
                  </span>
                  <span className="text-xs sm:text-sm text-[#E58A32] font-mono font-bold">
                    5:30 AM — 10:00 AM
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Actions (Comfortable touch spacing) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <a
                className="inline-flex items-center justify-center gap-2 bg-[#E58A32] text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-[0_0_15px_rgba(229,138,50,0.30)] hover:bg-[#F09A43] transition-all min-h-[48px] text-center"
                href="https://maps.google.com/?q=Man+and+Machine+Fitness+Gym+Kovilpatti"
                rel="noopener noreferrer"
                target="_blank"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <span>GET DIRECTIONS</span>
                <span className="material-symbols-outlined text-[18px]">near_me</span>
              </a>
              <a
                className="inline-flex items-center justify-center gap-2 bg-[#181822] text-[#F5F5F5] hover:text-[#E58A32] font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl border border-[#292936] hover:border-[#E58A32] transition-all min-h-[48px] text-center"
                href="tel:+917598885566"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <span className="material-symbols-outlined text-[18px] text-[#E58A32]">call</span>
                <span>+91 75988 85566</span>
              </a>
            </div>
          </div>

          {/* Right Column: Styled Map Card */}
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
              <div className="relative z-10 p-4 bg-[#09090B]/90 backdrop-blur-md border-b border-[#292936] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#E58A32] animate-ping"></span>
                  <span 
                    className="text-[10px] sm:text-xs text-[#F5F5F5] uppercase font-bold tracking-widest truncate"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    LIVE SATELLITE TELEMETRY
                  </span>
                </div>
                <span className="font-mono text-[#E58A32] text-[11px] sm:text-xs shrink-0">9.1726° N, 77.8687° E</span>
              </div>

              {/* Central Pin */}
              <div className="relative z-10 my-auto flex flex-col items-center justify-center p-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#E58A32]/20 border border-[#E58A32] flex items-center justify-center animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-[#E58A32] text-white flex items-center justify-center shadow-[0_0_20px_rgba(229,138,50,0.6)]">
                    <span className="material-symbols-outlined text-[18px] sm:text-[20px]">fitness_center</span>
                  </div>
                </div>
                <div className="mt-2 px-3 py-1 bg-[#09090B]/95 rounded-lg border border-[#292936] shadow-lg">
                  <span 
                    className="text-[11px] sm:text-xs text-[#F5F5F5] font-bold tracking-wider uppercase"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    MAN &amp; MACHINE GYM
                  </span>
                </div>
              </div>

              {/* Bottom readout */}
              <div className="relative z-10 p-3 sm:p-4 bg-[#09090B]/90 backdrop-blur-md border-t border-[#292936] flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-[10px] sm:text-xs text-[#B8B8C7] uppercase font-semibold">
                <span>ETTAYAPURAM RD ACCESS</span>
                <span className="text-[#E58A32]">PARKING: COMPLIMENTARY</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
