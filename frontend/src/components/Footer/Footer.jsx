import React from 'react';
import { branches } from '../../data/branches.js';

export default function Footer({ onOpenJoinModal }) {
  return (
    <footer className="w-full bg-[#040410] border-t border-[#292936] pt-12 sm:pt-16 pb-8 sm:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 pb-10 sm:pb-12">

          {/* Brand Info */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 border border-[#292936] shadow-[0_0_15px_rgba(229,138,50,0.20)]">
                <img src="/logo.jpg" alt="Man & Machine Fitness Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span 
                  className="text-base sm:text-lg text-[#F5F5F5] font-bold uppercase tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  MAN &amp; MACHINE FITNESS
                </span>
                <span 
                  className="text-[11px] uppercase tracking-wider text-[#E58A32] font-semibold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Kovilpatti | Karur | Sivakasi
                </span>
              </div>
            </div>

            <p 
              className="text-xs uppercase tracking-widest text-[#B8B8C7] font-semibold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              THREE CITIES • ONE FITNESS CULTURE
            </p>

            {/* Branch-Specific Contact Details */}
            <div className="flex flex-col gap-3 text-[#B8B8C7] text-xs pt-1 border-t border-[#292936]/60">
              {branches.map((b) => (
                <div key={b.id} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#F5F5F5]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E58A32]"></span>
                    <span className="uppercase">{b.city} BRANCH</span>
                  </div>
                  <div className="pl-3 flex flex-col text-[11.5px] text-[#B8B8C7]">
                    <span>{b.city === 'Kovilpatti' ? 'Ettayapuram Road, Thittankulam' : `${b.city}, Tamil Nadu`}</span>
                    {b.phone ? (
                      <a href={`tel:${b.phoneRaw}`} className="text-[#E58A32] hover:underline font-mono">
                        {b.phone}
                      </a>
                    ) : (
                      <span className="text-[#B8B8C7]/60 italic text-[11px]">{b.phoneDisplay}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <h3 
              className="text-xs uppercase text-[#F5F5F5] tracking-wider font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              EXPLORE
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs sm:text-sm">
              <a className="text-[#B8B8C7] hover:text-[#E58A32] transition-colors py-1" href="#home">Home</a>
              <a className="text-[#E58A32] hover:underline font-semibold transition-colors py-1" href="#branches">Our Branches</a>
              <a className="text-[#B8B8C7] hover:text-[#E58A32] transition-colors py-1" href="#about">About Ethos</a>
              <a className="text-[#B8B8C7] hover:text-[#E58A32] transition-colors py-1" href="#training">Training Programs</a>
              <a className="text-[#B8B8C7] hover:text-[#E58A32] transition-colors py-1" href="#facilities">Equipment &amp; Facilities</a>
              <a className="text-[#B8B8C7] hover:text-[#E58A32] transition-colors py-1" href="#reviews">Member Reviews</a>
              <a className="text-[#B8B8C7] hover:text-[#E58A32] transition-colors py-1" href="#contact">Contact &amp; Location</a>
              <button
                onClick={onOpenJoinModal}
                className="text-left text-[#E58A32] hover:underline cursor-pointer py-1 font-semibold"
              >
                Membership Plans
              </button>
            </div>
          </div>

          {/* Community & Ratings */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            <h3 
              className="text-xs uppercase text-[#F5F5F5] tracking-wider font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              COMMUNITY &amp; RATINGS
            </h3>
            <div className="flex flex-col gap-3">
              <div className="bg-[#10102A] p-4 rounded-xl border border-[#292936] flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] sm:text-xs uppercase tracking-wider text-[#B8B8C7]">
                    Google Rating Across Branches
                  </span>
                  <span 
                    className="text-lg sm:text-xl text-[#F5F5F5] font-bold"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    4.9 <span className="text-[#E58A32] text-xs font-semibold">/ 5.0</span>
                  </span>
                </div>
                <span className="material-symbols-outlined text-[#E58A32] text-[26px]">verified</span>
              </div>

              {/* Social icons */}
              <div className="flex items-center gap-3 pt-1">
                <a
                  aria-label="Instagram"
                  className="w-11 h-11 rounded-xl bg-[#10102A] border border-[#292936] flex items-center justify-center text-[#B8B8C7] hover:border-[#E58A32] hover:text-[#E58A32] transition-all"
                  href="https://instagram.com" target="_blank" rel="noopener noreferrer"
                >
                  <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                </a>
                <a
                  aria-label="Facebook"
                  className="w-11 h-11 rounded-xl bg-[#10102A] border border-[#292936] flex items-center justify-center text-[#B8B8C7] hover:border-[#E58A32] hover:text-[#E58A32] transition-all"
                  href="https://facebook.com" target="_blank" rel="noopener noreferrer"
                >
                  <span className="material-symbols-outlined text-[20px]">public</span>
                </a>
                <a
                  aria-label="Google Maps"
                  className="w-11 h-11 rounded-xl bg-[#10102A] border border-[#292936] flex items-center justify-center text-[#B8B8C7] hover:border-[#E58A32] hover:text-[#E58A32] transition-all"
                  href="#branches"
                >
                  <span className="material-symbols-outlined text-[20px]">near_me</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright row */}
        <div className="pt-6 border-t border-[#292936] flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left text-[#B8B8C7] text-xs">
          <p>© 2026 MAN &amp; MACHINE FITNESS. All rights reserved.</p>
          <p 
            className="text-[10px] sm:text-xs uppercase tracking-wider text-[#B8B8C7]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Kovilpatti • Karur • Sivakasi
          </p>
        </div>
      </div>
    </footer>
  );
}
