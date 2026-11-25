import React from 'react';
import { Reveal } from '../Motion/ScrollMotion.jsx';

export default function Footer({ onNavigate }) {
  const navLinks = [
    { name: 'HOME', href: '#home' },
    { name: 'ABOUT', href: '#about' },
    { name: 'MEMBERSHIPS', href: '#memberships' },
    { name: 'TRAINERS', href: '#trainers' },
    { name: 'FACILITIES', href: '#facilities' },
    { name: 'CONTACT', href: '#contact' },
  ];

  const handleSmoothScroll = (e, href) => {
    const id = href.replace('#', '');
    const target = document.getElementById(id);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBackToTop = (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full bg-[#090909] border-t border-[#303030]">
      <div className="max-w-[1440px] mx-auto px-6 md:px-14 pt-16 sm:pt-[72px] pb-8 flex flex-col items-start gap-8">
        {/* Brand Display Row */}
        <Reveal className="flex flex-col items-start gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white p-1.5 border border-[#303030] flex items-center justify-center shrink-0">
              <img
                src="/logo.jpg"
                alt="Man & Machine Fitness Centre Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <h2
              className="font-editorial-display font-semibold uppercase text-[#F5F5F5]"
              style={{ fontSize: 'clamp(2.25rem, 5vw, 4.5rem)' }}
            >
              MAN &amp; MACHINE
            </h2>
          </div>
          <p className="font-editorial-body text-[#B8B8B8] text-[15px] md:text-[16px]">
            Train Hard. Stay Consistent.
          </p>
        </Reveal>

        {/* Contact & Location 3-Column Strip */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-y border-[#303030]">
          {/* Column 1: Location */}
          <div className="flex flex-col items-start gap-2.5">
            <p className="font-editorial-label text-[#EB3E2E]">FIND YOUR STRONG</p>
            <p className="font-editorial-body text-[#F5F5F5] text-[15px]">
              Kovilpatti, Tamil Nadu, India
            </p>
            <p className="font-editorial-body text-[#B8B8B8] text-sm">
              Balaji Complex, 580E/5, Ettayapuram Road • Also in Karur &amp; Sivakasi
            </p>
          </div>

          {/* Column 2: Real Project Contact Info */}
          <div className="flex flex-col items-start gap-2.5">
            <p className="font-editorial-label text-[#EB3E2E]">CONTACT US</p>
            <p className="font-editorial-body text-[#B8B8B8] text-[15px]">
              Phone:{' '}
              <a
                href="tel:+917598885566"
                className="text-[#F5F5F5] hover:text-[#EB3E2E] transition-colors"
              >
                +91 75988 85566
              </a>
            </p>
            <p className="font-editorial-body text-[#B8B8B8] text-[15px]">
              Email:{' '}
              <a
                href="mailto:admin@manandmachine.com"
                className="text-[#F5F5F5] hover:text-[#EB3E2E] transition-colors"
              >
                admin@manandmachine.com
              </a>
            </p>
          </div>

          {/* Column 3: Social */}
          <div className="flex flex-col items-start gap-2.5">
            <p className="font-editorial-label text-[#EB3E2E]">FOLLOW THE WORK</p>
            <div className="flex flex-wrap items-center gap-3 font-editorial-body text-[#F5F5F5] text-[15px]">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#EB3E2E] transition-colors"
              >
                Instagram
              </a>
              <span className="text-[#303030]">/</span>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#EB3E2E] transition-colors"
              >
                Facebook
              </a>
              <span className="text-[#303030]">/</span>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#EB3E2E] transition-colors"
              >
                YouTube
              </a>
            </div>
          </div>
        </div>

        {/* Footer Navigation Links */}
        <nav className="flex flex-wrap items-center gap-x-7 gap-y-3" aria-label="Footer navigation">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => handleSmoothScroll(e, link.href)}
              className="font-editorial-label text-[#F5F5F5] hover:text-[#EB3E2E] transition-colors py-1"
            >
              {link.name}
            </a>
          ))}
          <a
            href="/login"
            onClick={(e) => {
              e.preventDefault();
              if (onNavigate) onNavigate('/login');
            }}
            className="font-editorial-label text-[#B8B8B8] hover:text-[#EB3E2E] transition-colors py-1"
          >
            MEMBER LOGIN
          </a>
        </nav>

        {/* Bottom Copyright & Back to Top */}
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#303030]/60">
          <p className="font-editorial-label text-[#B8B8B8]">
            © 2026 MAN &amp; MACHINE. ALL RIGHTS RESERVED.
          </p>

          <a
            href="#home"
            onClick={handleBackToTop}
            className="font-editorial-label text-[#F5F5F5] hover:text-[#EB3E2E] transition-colors inline-flex items-center gap-1.5 group w-fit"
          >
            <span>BACK TO TOP</span>
            <span className="group-hover:-translate-y-0.5 transition-transform">↑</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
