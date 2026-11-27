import React from 'react';
import authService from '../../services/auth.js';
import { Reveal } from '../Motion/ScrollMotion.jsx';
import { useWebsiteContent } from '../../context/WebsiteContentContext.jsx';
import { resolveMediaUrl } from '../UI/TrainerAvatar.jsx';

export default function FinalCTA({ onOpenJoinModal, onNavigate }) {
  const { content } = useWebsiteContent();
  const cta = content?.cta || {};
  const handleJoinClick = (e) => {
    e.preventDefault();
    if (authService.isAuthenticated()) {
      const route = authService.getDashboardRoute(authService.getRole());
      if (onNavigate) onNavigate(route);
      return;
    }
    if (onNavigate) {
      onNavigate('/signup');
    } else if (onOpenJoinModal) {
      onOpenJoinModal();
    } else {
      window.history.pushState({}, '', '/signup');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <section
      id="contact"
      className="relative w-full bg-[#EB3E2E] overflow-hidden scroll-mt-20"
    >
      {/* Dramatic Full-Width Background Image with Subtle Ambient Movement */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <img
          src={resolveMediaUrl(cta.backgroundImageUrl) || '/images/hero/Man & Machine_ Train Hard, Stay Strong.png'}
          alt="Train inside Man & Machine"
          loading="lazy"
          className="animate-ambient-drift w-full h-full object-cover object-center opacity-25 mix-blend-multiply"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(120deg, rgba(235,62,46,0.92) 0%, rgba(190,42,30,0.82) 55%, rgba(11,11,11,0.55) 100%)',
          }}
        />
      </div>

      {/* Editorial Content Container */}
      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 md:px-14 py-20 sm:py-24 lg:py-[100px] flex flex-col items-start gap-8">
        <Reveal delay={0}>
          <p className="font-editorial-label text-[#F5F5F5]">
            {cta.eyebrow || 'YOUR FIRST STEP STARTS HERE.'}
          </p>
        </Reveal>

        <Reveal variant="mask" delay={90} className="max-w-[850px]">
          <h2
            className="font-editorial-display font-semibold uppercase text-[#F5F5F5]"
            style={{ fontSize: 'clamp(2.85rem, 6vw, 5rem)', lineHeight: '1.06' }}
          >
            {cta.headline || 'READY TO BECOME STRONGER?'}
          </h2>
        </Reveal>

        <Reveal delay={160}>
          <p className="font-editorial-body text-[#F5F5F5]/90 text-[16px]">
            {cta.subheadline || 'Your first step starts here.'}
          </p>
        </Reveal>

        <Reveal delay={220}>
          <a
            href="/signup"
            onClick={handleJoinClick}
            className="inline-flex items-center justify-center gap-3 px-[26px] py-[20px] bg-[#090909] hover:bg-[#181818] text-[#F5F5F5] font-editorial-label transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.015] hover:-translate-y-0.5 cursor-pointer"
          >
            <span>{cta.ctaText || 'JOIN MAN & MACHINE'}</span>
          </a>
        </Reveal>
      </div>
    </section>
  );
}
