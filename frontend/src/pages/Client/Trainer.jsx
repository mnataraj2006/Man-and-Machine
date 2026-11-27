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
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronRight,
  Dumbbell,
  CreditCard,
  ShieldCheck,
  Star,
  X,
  Filter,
  Check,
  Receipt,
} from 'lucide-react';
import clientService from '../../services/clientService.js';
import authService from '../../services/auth.js';
import TrainerAvatar from '../../components/UI/TrainerAvatar.jsx';

export default function Trainer({ onNavigate, selectedTrainerId }) {
  const [trainerData, setTrainerData] = useState({ assigned: false, trainer: null });
  const [availableTrainers, setAvailableTrainers] = useState([]);
  const [clientBookings, setClientBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Booking Modal State
  const [activeBookingTrainer, setActiveBookingTrainer] = useState(null);
  const [selectedService, setSelectedService] = useState('SINGLE_SESSION');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [availabilityData, setAvailabilityData] = useState(null);
  const [paymentChoice, setPaymentChoice] = useState('INSTANT'); // 'INSTANT' or 'RECEPTION'
  const [bookingNotes, setBookingNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccessModal, setBookingSuccessModal] = useState(null);
  const [bookingError, setBookingError] = useState(null);

  // Filter State for Trainer Browsing
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('ALL');

  const handleNav = (path) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const loadAllTrainerData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch assigned trainer details, available trainers, and existing bookings in parallel
      const [assignedRes, availableRes, bookingsRes] = await Promise.all([
        clientService.getTrainer(),
        clientService.getAvailableTrainers(selectedBranchFilter !== 'ALL' ? selectedBranchFilter : null),
        clientService.getClientBookings().catch(() => ({ bookings: [] })),
      ]);

      setTrainerData(assignedRes || { assigned: false, trainer: null });
      setAvailableTrainers(availableRes?.trainers || []);
      setClientBookings(bookingsRes?.bookings || []);

      // If a specific trainer was selected via URL, trigger booking modal
      if (selectedTrainerId && availableRes?.trainers) {
        const found = availableRes.trainers.find((t) => t._id === selectedTrainerId);
        if (found) {
          openBookingModal(found);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load trainer information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllTrainerData();
  }, [selectedBranchFilter]);

  // Generate next 14 days for date picker
  const generateDateOptions = () => {
    const dates = [];
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      dates.push({ iso, dayName, dayNum, monthName, isToday: i === 0 });
    }
    return dates;
  };

  const dateOptions = generateDateOptions();

  // Open Booking Modal for a specific trainer
  const openBookingModal = (trainer) => {
    setActiveBookingTrainer(trainer);
    setSelectedService('SINGLE_SESSION');
    setSelectedSlot('');
    setBookingNotes('');
    setBookingError(null);
    setPaymentChoice('INSTANT');

    // Default to tomorrow or today
    const initialDate = dateOptions[0]?.iso || new Date().toISOString().slice(0, 10);
    setSelectedDate(initialDate);
    fetchSlotsForDate(trainer._id, initialDate);
  };

  const closeBookingModal = () => {
    setActiveBookingTrainer(null);
    setSelectedSlot('');
    setBookingError(null);
  };

  // Fetch real-time available time slots for trainer on selected date
  const fetchSlotsForDate = async (trainerId, dateStr) => {
    try {
      setSlotsLoading(true);
      setSelectedSlot('');
      setBookingError(null);
      const res = await clientService.getTrainerAvailability(trainerId, dateStr);
      setAvailabilityData(res);
    } catch (err) {
      setBookingError(err.message || 'Failed to check trainer availability for this date.');
      setAvailabilityData(null);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleDateSelect = (isoDate) => {
    setSelectedDate(isoDate);
    if (activeBookingTrainer) {
      fetchSlotsForDate(activeBookingTrainer._id, isoDate);
    }
  };

  // Handle Booking Submission
  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    if (!selectedSlot) {
      setBookingError('Please choose an available time slot.');
      return;
    }

    try {
      setIsSubmitting(true);
      setBookingError(null);

      const bookingPayload = {
        serviceType: selectedService,
        date: selectedDate,
        startTime: selectedSlot,
        paymentMethod: paymentChoice === 'INSTANT' ? 'UPI' : 'COUNTER',
        instantConfirm: paymentChoice === 'INSTANT',
        notes: bookingNotes,
      };

      const res = await clientService.bookTrainerSession(activeBookingTrainer._id, bookingPayload);

      // Refresh auth profile in background to sync trainerAssigned
      await authService.getMe();

      // Show success modal
      setBookingSuccessModal({
        booking: res.booking,
        trainerName: activeBookingTrainer.name,
        instantConfirm: paymentChoice === 'INSTANT',
        slot: selectedSlot,
        date: selectedDate,
      });

      closeBookingModal();
      // Reload page data
      await loadAllTrainerData();
    } catch (err) {
      setBookingError(err.message || 'Booking failed. This time slot may have been reserved by another client.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-10 bg-[#181818] rounded-xl w-64" />
        <div className="h-64 bg-[#181818] rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-[#181818] rounded-2xl" />
          <div className="h-80 bg-[#181818] rounded-2xl" />
        </div>
      </div>
    );
  }

  const { assigned, trainer } = trainerData;

  // Calculate pricing for active booking
  const getSelectedPrice = () => {
    if (!activeBookingTrainer) return 500;
    const p = activeBookingTrainer.pricing;
    if (selectedService === 'PACKAGE_10') return p?.package10?.price || 4500;
    if (selectedService === 'MONTHLY_PT') return p?.monthlyPT?.price || 6000;
    return p?.singleSession?.price || 500;
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-1.5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181818] border border-[#303030] text-[10px] uppercase font-bold tracking-widest text-[#EB3E2E] w-fit">
          <span>{assigned ? 'DEDICATED COACHING' : 'COACHING DISCOVERY'}</span>
          <span>•</span>
          <span>{assigned ? 'TRAINER ASSIGNED' : 'SELF-TRAINED ATHLETE'}</span>
        </div>

        <h1
          className="uppercase font-bold tracking-tight text-[#F5F5F5]"
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 'clamp(1.75rem, 3.2vw, 2.75rem)',
          }}
        >
          {assigned && trainer ? 'MY ASSIGNED TRAINER.' : 'TRAIN WITH A PROFESSIONAL.'}
        </h1>

        <p className="text-xs sm:text-sm text-[#B8B8B8] max-w-2xl leading-relaxed">
          {assigned && trainer
            ? 'Certified 1-on-1 coaching guidance, prescribed workout progressions, and upcoming training floor sessions.'
            : "You're currently training independently. If you want professional guidance, choose a certified trainer based on their availability, specialization, and schedule."}
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          STATE B — CLIENT WITH ASSIGNED TRAINER
      ══════════════════════════════════════════════════════════════ */}
      {assigned && trainer ? (
        <div className="flex flex-col gap-6">
          {/* Active Coach Dossier */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col gap-6 relative overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 right-0 w-72 h-72 bg-[#EB3E2E]/5 rounded-full blur-3xl pointer-events-none" />

            {/* Coach Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-b border-[#303030] pb-6">
              <div className="flex items-center gap-4">
                <TrainerAvatar trainer={trainer} size="xl" rounded="rounded-2xl" lazy={false} />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h2
                      className="text-xl sm:text-2xl font-bold uppercase text-[#F5F5F5]"
                      style={{ fontFamily: "'Oswald', sans-serif" }}
                    >
                      {trainer.name}
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      ACTIVE COACH
                    </span>
                  </div>
                  <span className="text-xs text-[#EB3E2E] font-semibold">{trainer.specialization}</span>
                  <span className="text-[11px] text-[#B8B8B8]">
                    {trainer.experienceYears} Years Certified Experience • {trainer.branch?.city || 'HQ'} Branch
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {trainer.phone && (
                  <a
                    href={`tel:${trainer.phone}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#202020] hover:border-[#EB3E2E] text-[#F5F5F5] border border-[#303030] text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    <Phone className="w-4 h-4 text-[#EB3E2E]" />
                    <span>Contact</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => openBookingModal(trainer)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(235,62,46,0.25)] cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>BOOK NEXT SESSION</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNav('/client/workouts')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#202020] hover:bg-[#252525] text-[#F5F5F5] border border-[#303030] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Dumbbell className="w-4 h-4 text-[#EB3E2E]" />
                  <span>VIEW MY WORKOUTS</span>
                </button>
              </div>
            </div>

            {/* Coach Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[#202020] border border-[#303030] flex flex-col gap-1">
                <span className="text-[10px] font-mono text-[#B8B8B8] uppercase">FACILITY BRANCH</span>
                <span className="text-xs font-bold text-[#F5F5F5]">{trainer.branch?.name || 'Man & Machine HQ'}</span>
                <span className="text-[10px] text-[#858585]">{trainer.branch?.city || 'Kovilpatti'}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#202020] border border-[#303030] flex flex-col gap-1">
                <span className="text-[10px] font-mono text-[#B8B8B8] uppercase">COACHING METHODOLOGY</span>
                <span className="text-xs font-bold text-[#EB3E2E]">Biomechanical Progressive Overload</span>
                <span className="text-[10px] text-[#858585]">Form Calibration &amp; Hypertrophy</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#202020] border border-[#303030] flex flex-col gap-1">
                <span className="text-[10px] font-mono text-[#B8B8B8] uppercase">RATING &amp; REPUTATION</span>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#F5F5F5]">
                  <Star className="w-3.5 h-3.5 fill-[#EB3E2E] text-[#EB3E2E]" />
                  <span>4.9 / 5.0</span>
                  <span className="text-[10px] font-normal text-[#B8B8B8]">(18 verified reviews)</span>
                </div>
                <span className="text-[10px] text-emerald-400">Top Rated Master Coach</span>
              </div>
            </div>

            {/* Bio */}
            {trainer.bio && (
              <div className="p-4 rounded-xl bg-[#202020] border border-[#303030] flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  COACHING PHILOSOPHY
                </span>
                <p className="text-xs text-[#B8B8B8] leading-relaxed">{trainer.bio}</p>
              </div>
            )}

            {/* Upcoming Appointments */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center justify-between border-b border-[#303030] pb-2">
                <span className="text-xs font-bold uppercase text-emerald-400 flex items-center gap-1.5" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  <Calendar className="w-3.5 h-3.5" />
                  UPCOMING SCHEDULED FLOOR SESSIONS
                </span>
                <span className="text-[11px] font-mono text-[#B8B8B8]">
                  {trainerData.upcomingSessions?.length || 0} scheduled
                </span>
              </div>

              {trainerData.upcomingSessions && trainerData.upcomingSessions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {trainerData.upcomingSessions.map((s) => (
                    <div key={s._id} className="p-4 rounded-xl bg-[#202020] border border-[#303030] flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white uppercase">{s.sessionType}</span>
                        <span className="text-[11px] text-[#B8B8B8]">
                          {s.durationMinutes || 60} Minutes 1-on-1 Coaching
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#EB3E2E]">
                        {new Date(s.scheduledAt).toLocaleString([], {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#202020]/60 border border-[#303030] text-center text-xs text-[#B8B8B8] flex flex-col items-center justify-center gap-2">
                  <p>You have no upcoming sessions scheduled with Coach {trainer.name}.</p>
                  <button
                    type="button"
                    onClick={() => openBookingModal(trainer)}
                    className="text-xs font-bold uppercase text-[#EB3E2E] hover:underline"
                  >
                    + Schedule Next Session Now
                  </button>
                </div>
              )}
            </div>

            {/* Coach Directives */}
            {trainerData.notes && trainerData.notes.length > 0 && (
              <div className="flex flex-col gap-3 pt-2">
                <span className="text-xs font-bold uppercase text-[#EB3E2E] flex items-center gap-1.5" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  <MessageSquare className="w-3.5 h-3.5" />
                  COACH DIRECTIVES &amp; FEEDBACK
                </span>
                <div className="flex flex-col gap-2.5">
                  {trainerData.notes.map((n) => (
                    <div key={n._id} className="p-4 rounded-xl bg-[#202020] border border-[#303030] flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase">{n.title}</span>
                        <span className="text-[10px] text-[#858585]">{new Date(n.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-[#B8B8B8] leading-relaxed">{n.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking History Ledger */}
          {clientBookings.length > 0 && (
            <div className="p-6 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[#303030] pb-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-[#EB3E2E] uppercase tracking-wider font-bold">
                    TRANSACTION LEDGER
                  </span>
                  <h3 className="text-base sm:text-lg font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                    YOUR COACHING BOOKINGS
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#B8B8B8]">{clientBookings.length} total bookings</span>
              </div>

              <div className="flex flex-col divide-y divide-[#303030]">
                {clientBookings.map((b) => (
                  <div key={b._id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#F5F5F5] uppercase">{b.serviceTitle}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            b.bookingStatus === 'CONFIRMED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-[#EB3E2E]/10 text-[#EB3E2E] border border-[#EB3E2E]/30'
                          }`}
                        >
                          {b.bookingStatus}
                        </span>
                      </div>
                      <span className="text-[#B8B8B8]">
                        Coach: {b.trainerId?.name} • Ref: <span className="font-mono text-[10px]">{b.bookingReference}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-[#F5F5F5]">
                          {new Date(b.date).toLocaleDateString()} @ {b.startTime}
                        </span>
                        <span className="text-[10px] text-[#858585]">
                          {b.paymentStatus === 'PAID' ? 'Payment Verified' : 'Pending Payment'}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-[#EB3E2E] font-mono">₹{b.amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════
            STATE A — NO TRAINER ASSIGNED (DISCOVERY & BROWSE)
        ══════════════════════════════════════════════════════════════ */
        <div className="flex flex-col gap-6">
          {/* Discovery Hero Card */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#181818] to-[#181818] border border-[#303030] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#EB3E2E]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col gap-3 max-w-xl">
              <span className="px-3 py-1 rounded-full bg-[#EB3E2E]/10 border border-[#EB3E2E]/30 text-[#EB3E2E] text-[10px] font-bold uppercase tracking-wider w-fit">
                INDEPENDENT ATHLETE STATUS
              </span>
              <h2
                className="text-2xl sm:text-3xl font-bold uppercase text-[#F5F5F5]"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                ELEVATE YOUR GAINS WITH A CERTIFIED COACH.
              </h2>
              <p className="text-xs sm:text-sm text-[#B8B8B8] leading-relaxed">
                As a self-trained client, you have unrestricted gym floor access. When you're ready to accelerate muscle hypertrophy, perfect your form, or prepare for powerlifting, book an expert coach below.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#202020] border border-[#303030] flex flex-col gap-2.5 shrink-0 min-w-[240px]">
              <span className="text-[10px] font-mono text-[#EB3E2E] uppercase font-bold tracking-wider">
                COACHING GUARANTEE
              </span>
              <div className="flex items-center gap-2 text-xs text-[#F5F5F5]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>1-on-1 Biomechanical Form Audit</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#F5F5F5]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Prescribed Splits in "My Workouts"</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#F5F5F5]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Real-Time Slot Availability Booking</span>
              </div>
            </div>
          </div>

          {/* Available Trainers Roster */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#303030] pb-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-[#EB3E2E] uppercase tracking-wider font-bold">
                  VERIFIED ROSTER
                </span>
                <h3 className="text-lg font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  AVAILABLE COACHES ({availableTrainers.length})
                </h3>
              </div>

              {/* Branch Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-[#B8B8B8]" />
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => setSelectedBranchFilter(e.target.value)}
                  className="bg-[#202020] border border-[#303030] text-xs font-bold text-[#F5F5F5] rounded-lg px-3 py-1.5 focus:border-[#EB3E2E] focus:outline-none uppercase"
                >
                  <option value="ALL">ALL BRANCHES</option>
                  <option value="Kovilpatti">KOVILPATTI HQ</option>
                  <option value="Karur">KARUR BRANCH</option>
                  <option value="Sivakasi">SIVAKASI BRANCH</option>
                </select>
              </div>
            </div>

            {availableTrainers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {availableTrainers.map((t) => (
                  <div
                    key={t._id}
                    className="p-6 rounded-2xl bg-[#181818] border border-[#303030] hover:border-[#EB3E2E]/40 transition-all flex flex-col justify-between gap-5 relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.5)] group"
                  >
                    <div className="flex flex-col gap-4">
                      {/* Top: Photo & Info */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                          <TrainerAvatar trainer={t} size="lg" rounded="rounded-2xl" />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <h4
                                className="text-base font-bold uppercase text-[#F5F5F5] truncate"
                                style={{ fontFamily: "'Oswald', sans-serif" }}
                              >
                                {t.name}
                              </h4>
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-[#EB3E2E]/10 text-[#EB3E2E] border border-[#EB3E2E]/30 shrink-0">
                                CERTIFIED
                              </span>
                            </div>
                            <span className="text-xs text-[#EB3E2E] truncate font-medium">{t.specialization}</span>
                            <span className="text-[11px] text-[#B8B8B8]">
                              {t.experienceYears} Years Exp • {t.branch?.city || 'Main'} Branch
                            </span>
                          </div>
                        </div>

                        {/* Rating Badge */}
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#202020] border border-[#303030] text-xs font-bold text-[#F5F5F5] shrink-0">
                          <Star className="w-3.5 h-3.5 fill-[#EB3E2E] text-[#EB3E2E]" />
                          <span>{t.rating || 4.9}</span>
                        </div>
                      </div>

                      {/* Bio */}
                      <p className="text-xs text-[#B8B8B8] line-clamp-2 leading-relaxed">
                        {t.bio ||
                          'Specializes in structural posture, progressive overload protocols, and biomechanical form calibration.'}
                      </p>

                      {/* Pricing Snapshot */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#303030]">
                        <div className="p-2.5 rounded-xl bg-[#202020] border border-[#303030] flex flex-col">
                          <span className="text-[9px] font-mono text-[#B8B8B8] uppercase">1 SESSION</span>
                          <span className="text-xs font-bold text-[#F5F5F5] font-mono">
                            ₹{t.pricing?.singleSession?.price || 500}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#202020] border border-[#303030] flex flex-col">
                          <span className="text-[9px] font-mono text-[#EB3E2E] uppercase font-bold">10 SESSIONS</span>
                          <span className="text-xs font-bold text-[#EB3E2E] font-mono">
                            ₹{t.pricing?.package10?.price || 4500}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#202020] border border-[#303030] flex flex-col">
                          <span className="text-[9px] font-mono text-emerald-400 uppercase font-bold">MONTHLY PT</span>
                          <span className="text-xs font-bold text-emerald-400 font-mono">
                            ₹{t.pricing?.monthlyPT?.price || 6000}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-[#303030] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Accepting Clients</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => openBookingModal(t)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(235,62,46,0.25)] cursor-pointer"
                      >
                        <span>BOOK TRAINER</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col items-center justify-center text-center gap-3">
                <UserCheck className="w-10 h-10 text-[#EB3E2E]" />
                <h4 className="text-base font-bold uppercase text-[#F5F5F5]">NO COACHES FOUND FOR SELECTED BRANCH</h4>
                <p className="text-xs text-[#B8B8B8] max-w-sm">
                  Please change the branch filter to explore verified coaches across our other facility branches.
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedBranchFilter('ALL')}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#202020] text-xs font-bold uppercase text-[#EB3E2E]"
                >
                  Show All Branches
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          BOOKING & SCHEDULING MODAL
      ══════════════════════════════════════════════════════════════ */}
      {activeBookingTrainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-[#111111] border border-[#303030] rounded-2xl p-6 sm:p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#303030] pb-4">
              <div className="flex items-center gap-3">
                <TrainerAvatar trainer={activeBookingTrainer} size="md" rounded="rounded-xl" lazy={false} />
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-[#EB3E2E] uppercase font-bold tracking-wider">
                    BOOKING &amp; SCHEDULING
                  </span>
                  <h3
                    className="text-lg sm:text-xl font-bold uppercase text-[#F5F5F5]"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    COACH {activeBookingTrainer.name}
                  </h3>
                  <span className="text-[11px] text-[#B8B8B8]">{activeBookingTrainer.specialization}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={closeBookingModal}
                className="p-2 rounded-xl bg-[#202020] border border-[#303030] text-[#B8B8B8] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bookingError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-xs">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitBooking} className="flex flex-col gap-6">
              {/* 1. Service / Package Selector */}
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-bold uppercase text-[#B8B8B8]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  1. SELECT TRAINING PACKAGE / SERVICE:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Single Session */}
                  <button
                    type="button"
                    onClick={() => setSelectedService('SINGLE_SESSION')}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-2 cursor-pointer transition-all ${
                      selectedService === 'SINGLE_SESSION'
                        ? 'bg-[#EB3E2E]/10 border-[#EB3E2E] shadow-[0_0_15px_rgba(235,62,46,0.2)]'
                        : 'bg-[#181818] border-[#303030] hover:border-[#303030]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-[#B8B8B8]">1 SESSION</span>
                      {selectedService === 'SINGLE_SESSION' && <Check className="w-4 h-4 text-[#EB3E2E]" />}
                    </div>
                    <span className="text-xs font-bold text-white uppercase">Single Session</span>
                    <span className="text-sm font-bold text-[#EB3E2E] font-mono">
                      ₹{activeBookingTrainer.pricing?.singleSession?.price || 500}
                    </span>
                  </button>

                  {/* 10 Sessions Package */}
                  <button
                    type="button"
                    onClick={() => setSelectedService('PACKAGE_10')}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-2 cursor-pointer transition-all ${
                      selectedService === 'PACKAGE_10'
                        ? 'bg-[#EB3E2E]/10 border-[#EB3E2E] shadow-[0_0_15px_rgba(235,62,46,0.2)]'
                        : 'bg-[#181818] border-[#303030] hover:border-[#303030]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-[#EB3E2E] font-bold">10 SESSIONS</span>
                      {selectedService === 'PACKAGE_10' && <Check className="w-4 h-4 text-[#EB3E2E]" />}
                    </div>
                    <span className="text-xs font-bold text-white uppercase">Progressive Pack</span>
                    <span className="text-sm font-bold text-[#EB3E2E] font-mono">
                      ₹{activeBookingTrainer.pricing?.package10?.price || 4500}
                    </span>
                  </button>

                  {/* Monthly PT */}
                  <button
                    type="button"
                    onClick={() => setSelectedService('MONTHLY_PT')}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-2 cursor-pointer transition-all ${
                      selectedService === 'MONTHLY_PT'
                        ? 'bg-[#EB3E2E]/10 border-[#EB3E2E] shadow-[0_0_15px_rgba(235,62,46,0.2)]'
                        : 'bg-[#181818] border-[#303030] hover:border-[#303030]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">MONTHLY</span>
                      {selectedService === 'MONTHLY_PT' && <Check className="w-4 h-4 text-[#EB3E2E]" />}
                    </div>
                    <span className="text-xs font-bold text-white uppercase">Dedicated PT</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      ₹{activeBookingTrainer.pricing?.monthlyPT?.price || 6000}
                    </span>
                  </button>
                </div>
              </div>

              {/* 2. Interactive Date Strip */}
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-bold uppercase text-[#B8B8B8]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  2. CHOOSE DATE:
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {dateOptions.map((item) => (
                    <button
                      key={item.iso}
                      type="button"
                      onClick={() => handleDateSelect(item.iso)}
                      className={`min-w-[68px] p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all shrink-0 ${
                        selectedDate === item.iso
                          ? 'bg-[#EB3E2E] text-white border-[#EB3E2E] shadow-[0_0_15px_rgba(235,62,46,0.30)]'
                          : 'bg-[#181818] border-[#303030] text-[#B8B8B8] hover:text-white'
                      }`}
                    >
                      <span className="text-[10px] font-mono uppercase font-bold">{item.dayName}</span>
                      <span className="text-base font-bold font-mono">{item.dayNum}</span>
                      <span className="text-[9px] uppercase">{item.monthName}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Time Slots Selector */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-[#B8B8B8]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                    3. SELECT AVAILABLE TIME SLOT:
                  </span>
                  {availabilityData?.workingHours && (
                    <span className="text-[10px] font-mono text-[#858585]">
                      Working Hours: {availabilityData.workingHours}
                    </span>
                  )}
                </div>

                {slotsLoading ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-[#B8B8B8] animate-pulse">
                    <Clock className="w-5 h-5 text-[#EB3E2E]" />
                    <span>Checking coach schedule &amp; slot integrity...</span>
                  </div>
                ) : availabilityData?.available === false ? (
                  <div className="p-5 rounded-xl bg-[#181818] border border-[#303030] text-center text-xs text-[#B8B8B8]">
                    {availabilityData?.message || 'Coach is not available on this date. Please pick another day.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {availabilityData?.slots?.map((slot) => {
                      const isSelected = selectedSlot === slot.time;
                      const isAvailable = slot.available;

                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => setSelectedSlot(slot.time)}
                          className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center gap-0.5 transition-all text-xs font-bold font-mono ${
                            !isAvailable
                              ? 'bg-[#181818]/60 border-[#252525] text-[#555] cursor-not-allowed opacity-60'
                              : isSelected
                              ? 'bg-[#EB3E2E] text-white border-[#EB3E2E] shadow-[0_0_12px_rgba(235,62,46,0.3)]'
                              : 'bg-[#181818] border-[#303030] text-[#F5F5F5] hover:border-[#EB3E2E] cursor-pointer'
                          }`}
                        >
                          <span>{slot.time}</span>
                          <span
                            className={`text-[9px] font-sans uppercase ${
                              !isAvailable ? 'text-red-400/80' : isSelected ? 'text-white' : 'text-emerald-400'
                            }`}
                          >
                            {!isAvailable ? 'Booked' : 'Available'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4. Booking Summary & Payment Flow */}
              <div className="p-4 rounded-xl bg-[#181818] border border-[#303030] flex flex-col gap-3">
                <span className="text-xs font-bold uppercase text-[#F5F5F5] border-b border-[#303030] pb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  4. BOOKING SUMMARY &amp; PAYMENT METHOD
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[#B8B8B8] font-mono">COACH</span>
                    <span className="font-bold text-[#F5F5F5] truncate">{activeBookingTrainer.name}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[#B8B8B8] font-mono">DATE</span>
                    <span className="font-bold text-[#F5F5F5]">{selectedDate || 'Select Date'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[#B8B8B8] font-mono">TIME SLOT</span>
                    <span className="font-bold text-[#EB3E2E]">{selectedSlot || 'Select Slot'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[#B8B8B8] font-mono">TOTAL AMOUNT</span>
                    <span className="font-bold text-2xl text-[#EB3E2E] font-mono">₹{getSelectedPrice()}</span>
                  </div>
                </div>

                {/* Payment Selection Options */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[#303030]">
                  <span className="text-[11px] font-bold uppercase text-[#B8B8B8]">Payment Workflow:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPaymentChoice('INSTANT')}
                      className={`p-3 rounded-xl border text-left flex items-start gap-3 cursor-pointer transition-all ${
                        paymentChoice === 'INSTANT'
                          ? 'bg-[#EB3E2E]/10 border-[#EB3E2E]'
                          : 'bg-[#202020] border-[#303030] hover:border-[#303030]'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-[#EB3E2E] shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white uppercase">Direct Payment (UPI / POS)</span>
                        <span className="text-[10px] text-[#B8B8B8]">
                          Immediate confirmation. Unlocks "My Workouts" instantly.
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentChoice('RECEPTION')}
                      className={`p-3 rounded-xl border text-left flex items-start gap-3 cursor-pointer transition-all ${
                        paymentChoice === 'RECEPTION'
                          ? 'bg-[#EB3E2E]/10 border-[#EB3E2E]'
                          : 'bg-[#202020] border-[#303030] hover:border-[#303030]'
                      }`}
                    >
                      <Receipt className="w-4 h-4 text-[#EB3E2E] shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white uppercase">Pay at Reception (Cash / Desk)</span>
                        <span className="text-[10px] text-[#B8B8B8]">
                          Reserves slot. Confirmed by front-desk once settled.
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeBookingModal}
                  className="px-5 py-3 rounded-xl bg-[#202020] text-[#B8B8B8] hover:text-white font-bold text-xs uppercase cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!selectedSlot || isSubmitting}
                  className={`inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    !selectedSlot || isSubmitting
                      ? 'bg-gray-700 opacity-50 cursor-not-allowed'
                      : 'bg-[#EB3E2E] hover:bg-[#FF493B] shadow-[0_0_20px_rgba(235,62,46,0.30)]'
                  }`}
                >
                  {isSubmitting ? (
                    <span>PROCESSING BOOKING...</span>
                  ) : (
                    <>
                      <span>CONFIRM &amp; BOOK NOW (₹{getSelectedPrice()})</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          BOOKING CONFIRMATION CELEBRATION MODAL
      ══════════════════════════════════════════════════════════════ */}
      {bookingSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[#111111] border border-emerald-500/40 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center gap-5 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-wider">
                {bookingSuccessModal.instantConfirm ? 'PAYMENT & BOOKING CONFIRMED' : 'RESERVATION SUBMITTED'}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                {bookingSuccessModal.instantConfirm
                  ? `COACH ${bookingSuccessModal.trainerName} IS NOW ASSIGNED!`
                  : `SLOT RESERVED WITH COACH ${bookingSuccessModal.trainerName}`}
              </h3>
              <p className="text-xs sm:text-sm text-[#B8B8B8] leading-relaxed">
                {bookingSuccessModal.instantConfirm
                  ? 'Your payment was verified. Your personal trainer is actively assigned to your account, and "My Workouts" is now unlocked in your sidebar!'
                  : 'Your booking has been reserved in our system. Please complete payment at branch reception to confirm and activate coach workout plans.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#181818] border border-[#303030] w-full flex items-center justify-around text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#B8B8B8] font-mono">DATE</span>
                <span className="font-bold text-white">{bookingSuccessModal.date}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[#B8B8B8] font-mono">TIME</span>
                <span className="font-bold text-[#EB3E2E]">{bookingSuccessModal.slot}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[#B8B8B8] font-mono">REF CODE</span>
                <span className="font-bold text-white font-mono">{bookingSuccessModal.booking?.bookingReference}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
              {bookingSuccessModal.instantConfirm ? (
                <button
                  type="button"
                  onClick={() => {
                    setBookingSuccessModal(null);
                    handleNav('/client/workouts');
                  }}
                  className="w-full py-3.5 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(235,62,46,0.30)] cursor-pointer"
                >
                  GO TO MY WORKOUTS →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setBookingSuccessModal(null)}
                  className="w-full py-3.5 rounded-xl bg-[#EB3E2E] text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  CLOSE &amp; RETURN TO TRAINER
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
