import React, { useEffect, useState } from 'react';
import clientService from '../../services/clientService.js';
import authService from '../../services/auth.js';
import { Reveal } from '../Motion/ScrollMotion.jsx';
import { resolveMediaUrl } from '../UI/TrainerAvatar.jsx';

const ILLUSTRATIVE_COACHES = [
  {
    _id: 'coach-strength',
    name: 'STRENGTH & CONDITIONING LEAD',
    specialization: 'STRENGTH & CONDITIONING',
    bio: 'Purposeful coaching built around your movement, consistency and long-term progress.',
    image: '/images/framer/trainer-strength.png',
    isIllustrative: true,
  },
  {
    _id: 'coach-functional',
    name: 'FUNCTIONAL PERFORMANCE COACH',
    specialization: 'FUNCTIONAL TRAINING',
    bio: 'Purposeful coaching built around your movement, consistency and long-term progress.',
    image: '/images/framer/experience-conditioning.png',
    isIllustrative: true,
  },
];

const FALLBACK_PORTRAITS = [
  '/images/framer/trainer-strength.png',
  '/images/framer/experience-conditioning.png',
];

export default function TrainersSection({ onNavigate }) {
  const [trainers, setTrainers] = useState([]);
  const [loadedFromApi, setLoadedFromApi] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchTrainers = async () => {
      try {
        const res = await clientService.getPublicTrainers();
        if (isMounted && res?.trainers && res.trainers.length > 0) {
          setTrainers(res.trainers);
          setLoadedFromApi(true);
        }
      } catch (err) {
        // Fallback smoothly to illustrative portraits if endpoint unreachable or empty
      }
    };
    fetchTrainers();
    return () => {
      isMounted = false;
    };
  }, []);

  const displayCoaches = loadedFromApi && trainers.length > 0 ? trainers : ILLUSTRATIVE_COACHES;

  const handleMeetTrainers = (e) => {
    e.preventDefault();
    const isAuthed = authService.isAuthenticated();
    const role = authService.getRole();

    if (isAuthed && role === 'CLIENT') {
      if (onNavigate) onNavigate('/client/my-trainer');
      return;
    }

    if (onNavigate) {
      onNavigate('/signup');
    } else {
      const el = document.getElementById('contact');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="trainers"
      className="relative w-full max-w-[1440px] mx-auto px-6 md:px-14 py-16 sm:py-20 lg:py-[100px] scroll-mt-20"
    >
      <div className="flex flex-col items-start gap-10">
        {/* Header */}
        <div className="flex flex-col items-start gap-5">
          <Reveal delay={0}>
            <p className="font-editorial-label text-[#EB3E2E]">06 / IN YOUR CORNER</p>
          </Reveal>
          <Reveal variant="mask" delay={80}>
            <h2
              className="font-editorial-display font-semibold uppercase text-[#F5F5F5]"
              style={{ fontSize: 'clamp(2.75rem, 5vw, 4.5rem)' }}
            >
              TRAIN WITH PURPOSE.
            </h2>
          </Reveal>
          <Reveal delay={140}>
            <p className="font-editorial-body text-[#B8B8B8] text-[15px] md:text-[16px]">
              Good coaching. Better habits. Stronger you.
            </p>
          </Reveal>
        </div>

        {/* 2-Column Editorial Trainer Cards */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayCoaches.slice(0, 4).map((coach, idx) => (
            <Reveal
              key={coach._id}
              delay={idx * 100}
              className="group flex flex-col items-start gap-5 w-full"
            >
              {/* Tall Portrait Container */}
              <Reveal
                variant="image"
                delay={idx * 100}
                className="relative w-full h-[380px] sm:h-[460px] lg:h-[500px] bg-[#181818] border border-[#303030]/60"
              >
                <div className="relative w-full h-full overflow-hidden">
                  <img
                    src={
                      resolveMediaUrl(coach.profilePhoto?.url || coach.profileImage || coach.image) ||
                      FALLBACK_PORTRAITS[idx % FALLBACK_PORTRAITS.length]
                    }
                    alt={`${coach.name} — ${coach.specialization}`}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_PORTRAITS[idx % FALLBACK_PORTRAITS.length];
                    }}
                    className="w-full h-full object-cover object-top transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(11,11,11,0.08) 0%, rgba(11,11,11,0.38) 100%)',
                    }}
                  />
                </div>
              </Reveal>

              {/* Coach Metadata */}
              <div className="flex flex-col items-start gap-2.5 pt-1">
                <h3 className="font-editorial-display font-semibold uppercase text-[#F5F5F5] text-2xl sm:text-[32px] leading-[1.08] tracking-[-0.025em]">
                  {coach.name}
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-editorial-label text-[#EB3E2E]">
                    {coach.specialization}
                  </span>
                  {coach.branch?.city && (
                    <span className="font-editorial-label text-[#B8B8B8]">
                      • {coach.branch.city.toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="font-editorial-body text-[#B8B8B8] text-[15px] max-w-lg">
                  {coach.bio}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Bottom Caption + CTA */}
        <div className="flex flex-col items-start gap-6 pt-2">
          {!loadedFromApi && (
            <Reveal delay={160}>
              <p className="font-editorial-body text-[#B8B8B8] text-sm">
                Illustrative portraits. Meet the real coaching team at the gym.
              </p>
            </Reveal>
          )}
          <Reveal delay={200}>
            <a
              href="#contact"
              onClick={handleMeetTrainers}
              className="btn-editorial-primary"
            >
              <span>MEET OUR TRAINERS</span>
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
