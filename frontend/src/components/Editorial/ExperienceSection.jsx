import React, { useEffect, useRef, useState } from 'react';
import { Reveal, prefersReducedMotion } from '../Motion/ScrollMotion.jsx';

const panels = [
  {
    id: 'strength',
    label: '01 / STRENGTH',
    image: '/images/framer/experience-strength.png',
    alt: 'Heavy barbell and free weights strength zone',
  },
  {
    id: 'conditioning',
    label: '02 / CONDITIONING',
    image: '/images/framer/experience-conditioning.png',
    alt: 'High intensity metabolic conditioning training',
  },
  {
    id: 'community',
    label: '03 / COMMUNITY',
    image: '/images/framer/community-together.png',
    alt: 'Members training together inside Man & Machine',
  },
  {
    id: 'progress',
    label: '04 / PROGRESS',
    image: '/images/framer/trainer-strength.png',
    alt: 'Disciplined progressive overload and coaching',
  },
];

export default function ExperienceSection() {
  const outerRef = useRef(null);
  const trackRef = useRef(null);
  const [translateX, setTranslateX] = useState(0);

  // Desktop vertical scroll -> smooth horizontal strip translation
  useEffect(() => {
    if (prefersReducedMotion()) return;

    let rafId = null;

    const calculateScroll = () => {
      rafId = null;
      const isDesktop = window.innerWidth >= 1024;
      const outer = outerRef.current;
      const track = trackRef.current;

      if (!isDesktop || !outer || !track) {
        setTranslateX(0);
        return;
      }

      const outerRect = outer.getBoundingClientRect();
      const totalScrollable = outer.offsetHeight - window.innerHeight;
      if (totalScrollable <= 0) {
        setTranslateX(0);
        return;
      }

      const scrolled = Math.max(0, Math.min(totalScrollable, -outerRect.top));
      const progress = scrolled / totalScrollable;

      const maxHorizontalShift = Math.max(0, track.scrollWidth - track.parentElement.clientWidth);
      setTranslateX(-progress * maxHorizontalShift);
    };

    const onScroll = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(calculateScroll);
      }
    };

    calculateScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <section
      id="experience"
      ref={outerRef}
      className="relative w-full lg:h-[210vh] scroll-mt-20"
    >
      <div className="lg:sticky lg:top-0 lg:min-h-screen w-full flex flex-col justify-center overflow-hidden">
        <div className="w-full max-w-[1440px] mx-auto px-6 md:px-14 py-16 sm:py-20 lg:py-16 flex flex-col items-start gap-8 md:gap-10">
          {/* Header */}
          <div className="flex flex-col items-start gap-5">
            <Reveal delay={0}>
              <p className="font-editorial-label text-[#EB3E2E]">03 / FIND YOUR EDGE</p>
            </Reveal>
            <Reveal variant="mask" delay={80}>
              <h2
                className="font-editorial-display font-semibold uppercase text-[#F5F5F5]"
                style={{ fontSize: 'clamp(2.75rem, 5vw, 4.5rem)' }}
              >
                THE MAN &amp; MACHINE EXPERIENCE
              </h2>
            </Reveal>
          </div>

          {/* Horizontal Filmstrip (Desktop scroll-driven, Mobile swipeable) */}
          <div className="w-full overflow-x-auto lg:overflow-hidden no-scrollbar snap-x snap-mandatory py-2">
            <div
              ref={trackRef}
              className="flex flex-row items-center gap-4 lg:gap-6 will-change-transform transition-transform duration-75 ease-out"
              style={{
                transform: `translate3d(${translateX}px, 0, 0)`,
              }}
            >
              {panels.map((panel) => (
                <div
                  key={panel.id}
                  className="group relative shrink-0 w-[290px] sm:w-[340px] lg:w-[380px] xl:w-[410px] h-[400px] sm:h-[440px] lg:h-[480px] overflow-hidden snap-start flex flex-col justify-end p-6 border border-[#303030]/60 bg-[#181818]"
                >
                  <img
                    src={panel.image}
                    alt={panel.alt}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                  />
                  {/* Dark bottom contrast gradient */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(11,11,11,0.10) 0%, rgba(11,11,11,0.45) 60%, rgba(11,11,11,0.88) 100%)',
                    }}
                  />
                  {/* Label Overlay Badge matching Framer <mark> */}
                  <div className="relative z-10">
                    <span
                      className="inline-block bg-[#0b0b0bcc] px-3 py-1.5 font-editorial-display font-semibold text-2xl sm:text-[32px] leading-[1.08] tracking-[-0.025em] text-[#F5F5F5] uppercase"
                    >
                      {panel.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Explore Hint */}
          <Reveal delay={160}>
            <p className="font-editorial-label text-[#B8B8B8]">
              FOUR WAYS TO FIND YOUR STRONG. SWIPE TO EXPLORE.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
