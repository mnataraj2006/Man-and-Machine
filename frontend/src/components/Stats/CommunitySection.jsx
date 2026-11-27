import React, { useEffect, useState } from 'react';
import clientService from '../../services/clientService.js';
import { Reveal, AnimatedCounter } from '../Motion/ScrollMotion.jsx';
import { useWebsiteContent } from '../../context/WebsiteContentContext.jsx';
import { resolveMediaUrl } from '../UI/TrainerAvatar.jsx';

export default function CommunitySection() {
  const { content } = useWebsiteContent();
  const comm = content?.community || {};
  const [stats, setStats] = useState({
    activeMembersCount: 500,
    workoutSessionsCount: 10000,
    daysPerWeek: 7,
    verifiedProductionScale: false,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const res = await clientService.getPublicStats();
        if (isMounted && res?.stats) {
          const s = res.stats;
          if (s.verifiedProductionScale) {
            setStats({
              activeMembersCount: s.activeMembersCount,
              workoutSessionsCount: s.workoutSessionsCount,
              daysPerWeek: s.daysPerWeek || 7,
              verifiedProductionScale: true,
            });
          }
        }
      } catch (err) {
        // Gracefully remain on Framer placeholder metrics if backend stats unreachable
      }
    };
    fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  const metricItems = [
    {
      target: stats.activeMembersCount,
      suffix: '+',
      label: 'MEMBERS',
      formatCommas: false,
    },
    {
      target: stats.workoutSessionsCount,
      suffix: '+',
      label: 'WORKOUTS',
      formatCommas: true,
    },
    {
      target: stats.daysPerWeek,
      suffix: '',
      label: 'DAYS A WEEK',
      formatCommas: false,
    },
  ];

  return (
    <section
      id="community"
      className="relative w-full max-w-[1440px] mx-auto px-6 md:px-14 py-16 sm:py-20 lg:py-[100px] scroll-mt-20"
    >
      <div className="flex flex-col items-start gap-10">
        {/* Header */}
        <div className="flex flex-col items-start gap-5">
          <Reveal delay={0}>
            <p className="font-editorial-label text-[#EB3E2E]">{comm.sectionLabel || '07 / OUR PEOPLE'}</p>
          </Reveal>
          <Reveal variant="mask" delay={80}>
            <h2
              className="font-editorial-display font-semibold uppercase text-[#F5F5F5]"
              style={{ fontSize: 'clamp(2.75rem, 5vw, 4.5rem)' }}
            >
              {comm.headline || 'STRONGER TOGETHER.'}
            </h2>
          </Reveal>
        </div>

        {/* Wide Community Photograph */}
        <Reveal variant="image" className="w-full border border-[#303030]/60 bg-[#181818]">
          <div className="relative w-full h-[300px] sm:h-[420px] lg:h-[520px] overflow-hidden">
            <img
              src={resolveMediaUrl(comm.imageUrl) || '/images/framer/community-together.png'}
              alt="Man & Machine Training Community"
              loading="lazy"
              className="w-full h-full object-cover object-center"
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, rgba(11,11,11,0.10) 0%, rgba(11,11,11,0.48) 100%)',
              }}
            />
          </div>
        </Reveal>

        {/* Animated Metrics Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
          {metricItems.map((metric, idx) => (
            <Reveal
              key={metric.label}
              delay={idx * 100}
              className="border-t border-[#303030] py-6 flex flex-col items-start gap-4"
            >
              <div
                className="font-editorial-display font-semibold text-[#F5F5F5]"
                style={{ fontSize: 'clamp(2.75rem, 4.5vw, 4.5rem)' }}
              >
                <AnimatedCounter
                  target={metric.target}
                  suffix={metric.suffix}
                  formatCommas={metric.formatCommas}
                />
              </div>
              <p className="font-editorial-label text-[#B8B8B8]">{metric.label}</p>
            </Reveal>
          ))}
        </div>

        {/* Transparent Placeholder / Live Verification Notice */}
        <Reveal delay={180}>
          <p className="font-editorial-label text-[#B8B8B8]">
            {stats.verifiedProductionScale
              ? 'LIVE VERIFIED FIGURES ACROSS ACTIVE MAN & MACHINE BRANCHES.'
              : 'COMMUNITY FIGURES SHOWN AS PLACEHOLDERS — VERIFIED TOTALS COMING SOON.'}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
