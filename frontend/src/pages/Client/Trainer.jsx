import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  MapPin,
  Mail,
  Phone,
  Award,
  Sparkles,
  Calendar,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import clientService from '../../services/clientService.js';

export default function Trainer() {
  const [data, setData] = useState({ assigned: false, trainer: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchTrainer = async () => {
      try {
        setLoading(true);
        const res = await clientService.getTrainer();
        if (isMounted) setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchTrainer();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-10 bg-[#151515] rounded-xl w-64" />
        <div className="h-72 bg-[#151515] rounded-2xl" />
      </div>
    );
  }

  const { assigned, trainer } = data;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-mono text-[#E58A32] uppercase tracking-wider font-bold">
          DEDICATED COACHING
        </span>
        <h1
          className="uppercase font-bold tracking-tight text-[#F5F5F5]"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)',
          }}
        >
          MY ASSIGNED TRAINER.
        </h1>
        <p className="text-xs sm:text-sm text-[#A3A3A3]">
          Certified coaching guidance for program progression and form calibration.
        </p>
      </div>

      {assigned && trainer ? (
        <div className="p-6 sm:p-8 rounded-2xl bg-[#151515] border border-[#292929] flex flex-col gap-6 relative overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#E58A32]/5 rounded-full blur-3xl pointer-events-none" />

          {/* Trainer Card Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#292929] pb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#1C1C1C] border border-[#292929] flex items-center justify-center text-[#E58A32] text-2xl font-bold shrink-0">
                {trainer.name ? trainer.name.charAt(0).toUpperCase() : 'T'}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h2
                    className="text-xl sm:text-2xl font-bold uppercase text-[#F5F5F5]"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {trainer.name}
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#E58A32]/10 text-[#E58A32] border border-[#E58A32]/30">
                    CERTIFIED COACH
                  </span>
                </div>
                <span className="text-xs text-[#E58A32] font-semibold">{trainer.specialization}</span>
                <span className="text-[11px] text-[#A3A3A3]">{trainer.experienceYears} Years Professional Coaching</span>
              </div>
            </div>

            {trainer.phone && (
              <a
                href={`tel:${trainer.phone}`}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#E58A32] hover:bg-[#F09A43] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(229,138,50,0.25)] shrink-0"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <Phone className="w-4 h-4" />
                <span>CONTACT TRAINER</span>
              </a>
            )}
          </div>

          {/* Details & Bio */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[#1C1C1C] border border-[#292929] flex flex-col gap-1">
                <span className="text-[10px] font-mono text-[#A3A3A3] uppercase">FACILITY BRANCH</span>
                <span className="text-xs font-bold text-[#F5F5F5]">
                  {trainer.branch?.city || 'Kovilpatti'} HQ
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#1C1C1C] border border-[#292929] flex flex-col gap-1">
                <span className="text-[10px] font-mono text-[#A3A3A3] uppercase">FOCUS METHODOLOGY</span>
                <span className="text-xs font-bold text-[#E58A32]">
                  Biomechanical Integrity
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#1C1C1C] border border-[#292929] flex flex-col gap-1">
                <span className="text-[10px] font-mono text-[#A3A3A3] uppercase">COACHING STATUS</span>
                <span className="text-xs font-bold text-emerald-400">
                  ACTIVE ON TRAINING FLOOR
                </span>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-[#1C1C1C] border border-[#292929] flex flex-col gap-2">
              <span className="text-xs font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                COACHING PHILOSOPHY &amp; PROFILE
              </span>
              <p className="text-xs text-[#A3A3A3] leading-relaxed">
                {trainer.bio ||
                  'Specializes in structural posture, progressive overload protocols, and competition preparation. Dedicated to guiding each athlete through correct form to ensure maximal results without injury.'}
              </p>
            </div>

            {/* Coach Directives & Notes */}
            {data.notes && data.notes.length > 0 && (
              <div className="flex flex-col gap-3 pt-2">
                <span className="text-xs font-bold uppercase text-[#E58A32] flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  <MessageSquare className="w-3.5 h-3.5" />
                  COACH DIRECTIVES &amp; FEEDBACK
                </span>
                <div className="flex flex-col gap-2.5">
                  {data.notes.map((n) => (
                    <div key={n._id} className="p-4 rounded-xl bg-[#1C1C1C] border border-[#292929] flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase">{n.title}</span>
                        <span className="text-[10px] text-[#737373]">{new Date(n.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-[#A3A3A3] leading-relaxed">{n.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Appointments */}
            {data.upcomingSessions && data.upcomingSessions.length > 0 && (
              <div className="flex flex-col gap-3 pt-2">
                <span className="text-xs font-bold uppercase text-emerald-400 flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  <Calendar className="w-3.5 h-3.5" />
                  UPCOMING SESSIONS WITH COACH
                </span>
                <div className="flex flex-col gap-2.5">
                  {data.upcomingSessions.map((s) => (
                    <div key={s._id} className="p-3.5 rounded-xl bg-[#1C1C1C] border border-[#292929] flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white uppercase">{s.sessionType}</span>
                        <span className="text-[11px] text-[#A3A3A3]">{s.durationMinutes} Minutes Floor Coaching</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#E58A32]">
                        {new Date(s.scheduledAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-10 rounded-2xl bg-[#151515] border border-[#292929] flex flex-col items-center justify-center text-center gap-3">
          <UserCheck className="w-10 h-10 text-[#E58A32]" />
          <h3 className="text-lg font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            YOUR TRAINER WILL APPEAR HERE
          </h3>
          <p className="text-xs text-[#A3A3A3] max-w-md">
            Your branch will assign a dedicated fitness coach to your profile during your facility onboarding. Reach out to reception if you need an immediate assignment.
          </p>
        </div>
      )}
    </div>
  );
}
