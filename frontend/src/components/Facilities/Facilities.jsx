import React from 'react';

export default function Facilities() {
  return (
    <section className="w-full py-16 sm:py-24 bg-[#09090B]" id="facilities">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8 sm:gap-12">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E58A32]"></span>
            <span 
              className="text-[10px] sm:text-xs uppercase tracking-widest text-[#B8B8C7] font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              THE FACILITY SPECIFICATION
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
            BUILT FOR SERIOUS TRAINING.
          </h2>
          <p className="text-sm sm:text-base text-[#B8B8C7] max-w-xl leading-relaxed">
            A high-density training environment where every machine, barbell, and platform is selected for biomechanical integrity.
          </p>
        </div>

        {/* Asymmetric Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Large Hero Facility Tile */}
          <div className="lg:col-span-8 bg-[#10102A] rounded-2xl border border-[#292936] overflow-hidden flex flex-col group">
            <div className="relative h-[240px] sm:h-[320px] md:h-[380px] w-full overflow-hidden">
              <img
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                alt="Athletic training on high-end dark industrial gym cable and rack systems"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-gVHmaRbRYUsFExforkbRsxVPJmfbSo9aapqGL1NBQIiV0CVW2TiVO5ozvT_4Fuwnq79dhLrItL7cntx1OXjhF-EN5gy6r5d8-o7jiPbKZWl-viUiEXV2djMyIjqn0utQPfnXEf2lcBGULycV3NGSZIxj4NYsPHbUXPmHJOkRsxJ29K1DCinZCMZBVasnpmyNlwmcHUmDryxqaj4PaTp8T-mQqHjVbUz0A8jQvcov"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#10102A] via-transparent to-transparent"></div>
              <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-[#09090B]/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#292936] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E58A32]"></span>
                <span 
                  className="text-[10px] sm:text-xs text-[#F5F5F5] uppercase font-bold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  ZONE A // MACHINE MATRIX
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div>
                <h3 
                  className="text-base sm:text-xl uppercase text-[#F5F5F5] font-bold tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  TRAINING FLOOR &amp; CABLE SYSTEMS
                </h3>
                <p className="text-xs sm:text-sm text-[#B8B8C7] mt-1 leading-relaxed">
                  Dual adjustable pulleys, plate-loaded row stations, and dedicated hyper-extension modules.
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
          <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-6">
            <div className="bg-[#10102A] rounded-2xl border border-[#292936] overflow-hidden flex flex-col group flex-1">
              <div className="relative h-[180px] sm:h-[200px] w-full overflow-hidden">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  alt="Heavy calibrated iron barbell deadlift platform in a dark Kovilpatti gym"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCTJCmNpOexzNahVDQ74yvtaIvXhYSW4FwnFV2x3WgrdZig1z_gDo5p7ARX20HJF8WxmgDM4pBhInuhNTqBJnk4y1IYrW8sZkiTTkuRYFZzkV3fcUPc5cE-my0HEafzJRVW8Ftm4M0x6r7fOImblAy15PvEMOYjDT4VpByijBaIhAl4i4Kyv0SIoNEF4NfMbnroPbiMk-O-VCmooZo9leEUMXtVmeSDPBKM6Fe-F4l0"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#10102A] via-transparent to-transparent"></div>
              </div>
              <div className="p-4 sm:p-5">
                <p 
                  className="text-[10px] sm:text-xs text-[#E58A32] uppercase tracking-wider font-bold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  ZONE B // FREE WEIGHTS
                </p>
                <h4 
                  className="text-base sm:text-lg uppercase text-[#F5F5F5] font-bold tracking-tight mt-1"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  HEAVY IRON &amp; PLATFORMS
                </h4>
                <p className="text-xs sm:text-sm text-[#B8B8C7] mt-1 leading-relaxed">
                  Dumbbells up to 50kg, competition racks, and shock-absorbent drop mats.
                </p>
              </div>
            </div>

            {/* Specs readout mini-card */}
            <div className="bg-[#10102A] rounded-2xl border border-[#292936] p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-[#292936] pb-2">
                <span 
                  className="text-[10px] sm:text-xs uppercase tracking-wider text-[#B8B8C7] font-bold"
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
              <p className="text-xs sm:text-sm text-[#B8B8C7] pt-2.5 leading-relaxed">
                High-volume ventilation, dedicated sanitized dumbbell returns, and continuous maintenance for uncompromising focus.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
