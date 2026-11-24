import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building,
  AlertCircle,
  Dumbbell,
  UserCheck,
  Check,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  User,
  Zap,
  RefreshCw,
  Info,
} from 'lucide-react';
import clientService from '../../services/clientService.js';
import authService from '../../services/auth.js';

export default function Membership({ onNavigate }) {
  const [data, setData] = useState({ current: null, hasActiveMembership: false, history: [] });
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branchInfo, setBranchInfo] = useState(null);

  // Active Tab: 'status' (if active membership exists) or 'catalog' (to buy/explore plans)
  const [activeTab, setActiveTab] = useState('catalog');

  // Checkout Wizard State
  // Step 1: 'PLANS' -> Step 2: 'PREFERENCE' -> Step 3: 'TRAINER' (if coach) -> Step 4: 'SUMMARY' -> Step 5: 'SUCCESS'
  const [step, setStep] = useState('PLANS');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [trainingPreference, setTrainingPreference] = useState('SELF_TRAINED'); // 'SELF_TRAINED' | 'PERSONAL_TRAINER'

  // Trainer Selection State (Step 3)
  const [availableTrainers, setAvailableTrainers] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [trainersLoading, setTrainersLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [availabilitySlots, setAvailabilitySlots] = useState([]);

  // Payment & Confirmation State
  const [paymentChoice, setPaymentChoice] = useState('INSTANT'); // 'INSTANT' | 'RECEPTION'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(null);
  const [purchaseError, setPurchaseError] = useState(null);

  const handleNav = (path) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const loadMembershipData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [memRes, plansRes] = await Promise.all([
        clientService.getMembership().catch(() => ({ current: null, hasActiveMembership: false, history: [] })),
        clientService.getMembershipPlans().catch(() => ({ plans: [], branch: null })),
      ]);

      setData(memRes || { current: null, hasActiveMembership: false, history: [] });
      setPlans(plansRes.plans || []);
      setBranchInfo(plansRes.branch || null);

      // Check if user arrived with a preselected plan (e.g. from homepage or URL query)
      const params = new URLSearchParams(window.location.search);
      const preselectedPlanId = params.get('planId') || sessionStorage.getItem('mm_selected_plan_id');
      const foundPlan = preselectedPlanId && plansRes.plans?.find(
        (p) => p._id === preselectedPlanId || p.id === preselectedPlanId
      );

      if (foundPlan) {
        setSelectedPlan(foundPlan);
        setActiveTab('catalog');
        setStep('PREFERENCE'); // Bring directly into training preference & checkout step
        sessionStorage.removeItem('mm_selected_plan_id');
        sessionStorage.removeItem('mm_selected_branch_id');
      } else if (memRes?.hasActiveMembership) {
        setActiveTab('status');
      } else {
        setActiveTab('catalog');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load membership information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembershipData();
  }, []);

  // Fetch available trainers when Personal Trainer preference is chosen
  const loadTrainers = async () => {
    try {
      setTrainersLoading(true);
      const res = await clientService.getAvailableTrainers();
      setAvailableTrainers(res.trainers || []);
    } catch (err) {
      console.error('Failed to load trainers:', err);
    } finally {
      setTrainersLoading(false);
    }
  };

  // Fetch available slots for selected trainer and date
  const fetchSlots = async (trainerId, dateStr) => {
    try {
      setSlotsLoading(true);
      setSelectedSlot('');
      setPurchaseError(null);
      const res = await clientService.getTrainerAvailability(trainerId, dateStr);
      setAvailabilitySlots(res.slots || []);
    } catch (err) {
      setPurchaseError(err.message || 'Failed to load time slots for this date.');
      setAvailabilitySlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  // 14-day upcoming dates list
  const generateDateOptions = () => {
    const dates = [];
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const isoStr = d.toISOString().slice(0, 10);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      dates.push({ iso: isoStr, dayName, dayNum, monthName, isToday: i === 0 });
    }
    return dates;
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setPurchaseError(null);
    setStep('PREFERENCE');
  };

  const handleChoosePreference = (pref) => {
    setTrainingPreference(pref);
    setPurchaseError(null);
    if (pref === 'PERSONAL_TRAINER') {
      loadTrainers();
      setStep('TRAINER');
    } else {
      setSelectedTrainer(null);
      setSelectedDate('');
      setSelectedSlot('');
      setStep('SUMMARY');
    }
  };

  const handleSelectTrainer = (trainer) => {
    setSelectedTrainer(trainer);
    setSelectedSlot('');
    // Automatically pick first date
    const firstDate = generateDateOptions()[0].iso;
    setSelectedDate(firstDate);
    fetchSlots(trainer._id, firstDate);
  };

  const handleDateChange = (isoDate) => {
    setSelectedDate(isoDate);
    if (selectedTrainer) {
      fetchSlots(selectedTrainer._id, isoDate);
    }
  };

  const handleCompletePurchase = async () => {
    try {
      setIsSubmitting(true);
      setPurchaseError(null);

      const payload = {
        planId: selectedPlan._id,
        trainingPreference,
        trainerId: trainingPreference === 'PERSONAL_TRAINER' ? selectedTrainer?._id : null,
        date: trainingPreference === 'PERSONAL_TRAINER' ? selectedDate : null,
        startTime: trainingPreference === 'PERSONAL_TRAINER' ? selectedSlot : null,
        paymentMethod: paymentChoice === 'INSTANT' ? 'UPI' : 'COUNTER',
        instantConfirm: paymentChoice === 'INSTANT',
      };

      const res = await clientService.purchaseMembership(payload);

      // Re-sync local auth state
      await authService.getMe();

      setPurchaseSuccess(res);
      setStep('SUCCESS');

      // Refresh membership data
      loadMembershipData();
    } catch (err) {
      setPurchaseError(err.message || 'Membership purchase failed. Please review your selections.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-10 bg-[#151515] rounded-xl w-64" />
        <div className="h-64 bg-[#151515] rounded-2xl" />
        <div className="h-48 bg-[#151515] rounded-2xl" />
      </div>
    );
  }

  const { current, hasActiveMembership, history = [] } = data;
  const isExpiringSoon = current && current.daysRemaining <= 14 && current.status === 'ACTIVE';

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* ── 1. HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#151515] border border-[#292929] text-[10px] uppercase font-bold tracking-widest text-[#E58A32] w-fit">
            <span>{branchInfo?.name || 'MAN & MACHINE'}</span>
            <span>•</span>
            <span>{hasActiveMembership ? 'ACTIVE MEMBER' : 'ENROLLMENT OPEN'}</span>
          </div>
          <h1
            className="uppercase font-bold tracking-tight text-[#F5F5F5]"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(1.75rem, 3.2vw, 2.75rem)',
            }}
          >
            {hasActiveMembership ? 'MEMBERSHIP & ACCESS.' : 'JOIN MAN & MACHINE.'}
          </h1>
          <p className="text-xs sm:text-sm text-[#A3A3A3] max-w-2xl">
            {hasActiveMembership
              ? 'Review your active facility access pass, branch privileges, and duration.'
              : 'Choose a membership plan with branch-calibrated pricing to start your training journey.'}
          </p>
        </div>

        {/* Tab switchers if member already has active plan */}
        {hasActiveMembership && (
          <div className="flex items-center gap-2 bg-[#151515] p-1.5 rounded-2xl border border-[#292929] shrink-0">
            <button
              onClick={() => {
                setActiveTab('status');
                setStep('PLANS');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                activeTab === 'status'
                  ? 'bg-[#E58A32] text-white shadow-[0_0_15px_rgba(229,138,50,0.25)]'
                  : 'text-[#A3A3A3] hover:text-white'
              }`}
            >
              Current Pass
            </button>
            <button
              onClick={() => {
                setActiveTab('catalog');
                setStep('PLANS');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                activeTab === 'catalog'
                  ? 'bg-[#E58A32] text-white shadow-[0_0_15px_rgba(229,138,50,0.25)]'
                  : 'text-[#A3A3A3] hover:text-white'
              }`}
            >
              Explore Plans
            </button>
          </div>
        )}
      </div>

      {/* ── 2. VIEW: CURRENT ACTIVE MEMBERSHIP (IF HAS ACTIVE MEMBERSHIP & ON STATUS TAB) ── */}
      {hasActiveMembership && activeTab === 'status' && current && (
        <div className="flex flex-col gap-6">
          <div className="p-6 sm:p-8 rounded-2xl bg-[#151515] border border-[#292929] flex flex-col gap-6 relative overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 right-0 w-72 h-72 bg-[#E58A32]/5 rounded-full blur-3xl pointer-events-none" />

            {/* Expiry Warning */}
            {isExpiringSoon && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-400 text-xs flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-bold uppercase tracking-wider">RENEWAL WINDOW OPEN</span>
                  <span>
                    Your active membership has <strong>{current.daysRemaining} days remaining</strong>. Settle your renewal to ensure uninterrupted floor privileges.
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#292929] pb-6">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-[#E58A32] uppercase font-bold tracking-wider">
                  CURRENT ACTIVE MEMBERSHIP
                </span>
                <h2
                  className="text-2xl sm:text-3xl font-bold uppercase text-[#F5F5F5]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {current.planName}
                </h2>
                <span className="text-xs text-[#A3A3A3]">
                  Enrolled at {current.branch?.name || current.branch?.city || 'Home'} Branch
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  ✓ ACTIVE PASS
                </span>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-xl bg-[#1C1C1C] border border-[#292929] flex flex-col gap-0.5">
                <span className="text-[10px] font-mono text-[#A3A3A3] uppercase">START DATE</span>
                <span className="text-xs font-bold text-[#F5F5F5]">
                  {new Date(current.startDate).toLocaleDateString()}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#1C1C1C] border border-[#292929] flex flex-col gap-0.5">
                <span className="text-[10px] font-mono text-[#A3A3A3] uppercase">EXPIRY DATE</span>
                <span className="text-xs font-bold text-[#F5F5F5]">
                  {new Date(current.expiryDate).toLocaleDateString()}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#1C1C1C] border border-[#292929] flex flex-col gap-0.5">
                <span className="text-[10px] font-mono text-[#A3A3A3] uppercase">DAYS REMAINING</span>
                <span className="text-base font-bold text-[#E58A32] font-mono">{current.daysRemaining} Days</span>
              </div>

              <div className="p-4 rounded-xl bg-[#1C1C1C] border border-[#292929] flex flex-col gap-0.5">
                <span className="text-[10px] font-mono text-[#A3A3A3] uppercase">PLAN FEE PAID</span>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  ₹{(current.finalAmount || current.amount || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[#292929]">
              <div className="flex items-center gap-2 text-xs text-[#A3A3A3]">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>All biometric check-in & floor access protocols verified for this account.</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('catalog');
                  setStep('PLANS');
                }}
                className="px-5 py-2.5 rounded-xl bg-[#1C1C1C] hover:bg-[#252525] border border-[#292929] text-xs font-bold uppercase text-[#E58A32] tracking-wider transition-all"
              >
                Browse Other Plans →
              </button>
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="p-6 rounded-2xl bg-[#151515] border border-[#292929] flex flex-col gap-4">
              <h3 className="text-base font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                MEMBERSHIP HISTORY
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#292929] text-[10px] font-mono text-[#A3A3A3] uppercase">
                      <th className="py-2.5 px-3">PLAN</th>
                      <th className="py-2.5 px-3">START</th>
                      <th className="py-2.5 px-3">EXPIRY</th>
                      <th className="py-2.5 px-3">BRANCH</th>
                      <th className="py-2.5 px-3">AMOUNT</th>
                      <th className="py-2.5 px-3">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#292929]">
                    {history.map((h) => (
                      <tr key={h._id} className="hover:bg-[#1C1C1C] transition-colors">
                        <td className="py-3 px-3 font-bold text-[#F5F5F5]">{h.planName}</td>
                        <td className="py-3 px-3 text-[#A3A3A3]">{new Date(h.startDate).toLocaleDateString()}</td>
                        <td className="py-3 px-3 text-[#A3A3A3]">{new Date(h.expiryDate).toLocaleDateString()}</td>
                        <td className="py-3 px-3 text-[#F5F5F5]">{h.branchId?.city || 'Home'}</td>
                        <td className="py-3 px-3 text-emerald-400 font-mono">₹{(h.finalAmount || h.amount || 0).toLocaleString()}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#1C1C1C] text-[#A3A3A3] border border-[#292929]">
                            {h.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 3. VIEW: MEMBERSHIP CATALOG & PURCHASE WIZARD ── */}
      {(!hasActiveMembership || activeTab === 'catalog') && (
        <div className="flex flex-col gap-8">
          {/* Progress Tracker (4 Steps) */}
          <div className="grid grid-cols-4 gap-2 border-b border-[#292929] pb-4">
            {[
              { id: 'PLANS', label: '1. Select Plan' },
              { id: 'PREFERENCE', label: '2. Track' },
              { id: 'TRAINER', label: '3. Coach & Time' },
              { id: 'SUMMARY', label: '4. Settle & Activate' },
            ].map((s, idx) => {
              const isCurrent = step === s.id;
              const isCompleted =
                (s.id === 'PLANS' && step !== 'PLANS') ||
                (s.id === 'PREFERENCE' && (step === 'TRAINER' || step === 'SUMMARY' || step === 'SUCCESS')) ||
                (s.id === 'TRAINER' && (step === 'SUMMARY' || step === 'SUCCESS'));

              return (
                <div key={s.id} className="flex flex-col gap-1">
                  <span
                    className={`text-[10px] font-mono uppercase font-bold tracking-wider truncate ${
                      isCurrent ? 'text-[#E58A32]' : isCompleted ? 'text-emerald-400' : 'text-[#737373]'
                    }`}
                  >
                    {s.label}
                  </span>
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      isCurrent ? 'bg-[#E58A32]' : isCompleted ? 'bg-emerald-500' : 'bg-[#292929]'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Error Banner */}
          {purchaseError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{purchaseError}</span>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              STEP 1: MEMBERSHIP CATALOG (CARDS)
          ══════════════════════════════════════════════════════════════ */}
          {step === 'PLANS' && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs text-[#A3A3A3]">
                  Showing active plans calibrated for <strong className="text-white">{branchInfo?.name || 'Kovilpatti'}</strong> branch.
                </span>
                <span className="text-[11px] font-mono text-[#E58A32]">
                  {plans.length} PLANS AVAILABLE
                </span>
              </div>

              {plans.length === 0 ? (
                <div className="p-12 rounded-2xl bg-[#151515] border border-[#292929] text-center flex flex-col items-center justify-center gap-3">
                  <CreditCard className="w-10 h-10 text-[#737373]" />
                  <h3 className="text-sm font-bold uppercase text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    NO MEMBERSHIP PLANS AVAILABLE
                  </h3>
                  <p className="text-xs text-[#A3A3A3] max-w-sm">
                    No membership plans are currently published for your branch. Please check with gym reception.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                  {plans.map((p) => {
                    const isPopular = p.durationDays === 90 || p.durationDays === 365;

                    return (
                      <div
                        key={p._id}
                        className={`p-6 rounded-2xl bg-[#151515] border flex flex-col justify-between transition-all relative overflow-hidden group ${
                          isPopular
                            ? 'border-[#E58A32]/60 shadow-[0_0_25px_rgba(229,138,50,0.15)] hover:border-[#E58A32]'
                            : 'border-[#292929] hover:border-[#E58A32]/40'
                        }`}
                      >
                        {isPopular && (
                          <div className="absolute top-0 right-0 bg-[#E58A32] text-white text-[9px] font-mono font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                            RECOMMENDED
                          </div>
                        )}

                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-mono uppercase text-[#E58A32] font-bold">
                              {p.planType} • {p.durationDays} DAYS
                            </span>
                            <h3
                              className="text-xl font-bold uppercase text-white tracking-tight"
                              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                            >
                              {p.name}
                            </h3>
                            {p.description && (
                              <p className="text-[11px] text-[#A3A3A3] line-clamp-2 mt-0.5">
                                {p.description}
                              </p>
                            )}
                          </div>

                          {/* Price Tag */}
                          <div className="flex flex-col p-4 rounded-xl bg-[#1C1C1C] border border-[#292929] gap-1">
                            <div className="flex items-baseline gap-1">
                              <span className="text-3xl font-black text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                ₹{p.finalPrice.toLocaleString()}
                              </span>
                              <span className="text-xs text-[#A3A3A3]">/{p.durationDays} days</span>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] font-mono text-[#737373] mt-1 border-t border-[#292929] pt-1.5">
                              <span>Base: ₹{p.basePrice}</span>
                              {p.joiningFee > 0 ? (
                                <span>+ ₹{p.joiningFee} join fee</span>
                              ) : (
                                <span className="text-emerald-400 font-bold">Zero Join Fee</span>
                              )}
                              {p.discountValue > 0 && (
                                <span className="text-[#E58A32] font-bold">-₹{p.discountValue} Off</span>
                              )}
                            </div>
                          </div>

                          {/* Benefits Checklist */}
                          <div className="flex flex-col gap-2 pt-2">
                            <span className="text-[10px] font-mono text-[#A3A3A3] uppercase font-bold">INCLUDED PRIVILEGES:</span>
                            {p.benefits?.slice(0, 5).map((b, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-[#D4D4D4]">
                                <Check className="w-3.5 h-3.5 text-[#E58A32] shrink-0 mt-0.5" />
                                <span>{b}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-6 mt-4 border-t border-[#292929]">
                          <button
                            type="button"
                            onClick={() => handleSelectPlan(p)}
                            className="w-full py-3 rounded-xl bg-[#E58A32] hover:bg-[#F09A43] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(229,138,50,0.2)] flex items-center justify-center gap-2 cursor-pointer"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                          >
                            <span>SELECT PLAN</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              STEP 2: CHOOSE TRAINING PREFERENCE (SELF-TRAINED VS PERSONAL TRAINER)
          ══════════════════════════════════════════════════════════════ */}
          {step === 'PREFERENCE' && selectedPlan && (
            <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('PLANS')}
                  className="p-2 rounded-xl bg-[#1C1C1C] border border-[#292929] text-xs text-[#A3A3A3] hover:text-white flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Plans</span>
                </button>
                <span className="text-xs text-[#737373]">
                  Selected: <strong className="text-white">{selectedPlan.name}</strong> (₹{selectedPlan.finalPrice})
                </span>
              </div>

              <div className="text-center flex flex-col gap-1 py-2">
                <span className="text-[10px] font-mono uppercase text-[#E58A32] font-bold tracking-wider">
                  TRAINING METHODOLOGY
                </span>
                <h2 className="text-2xl sm:text-3xl font-black uppercase text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  CHOOSE YOUR TRAINING PREFERENCE.
                </h2>
                <p className="text-xs text-[#A3A3A3] max-w-md mx-auto">
                  Select whether you want to train independently or pair your membership with a certified 1-on-1 coach.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                {/* OPTION 1: SELF TRAINED */}
                <div
                  onClick={() => handleChoosePreference('SELF_TRAINED')}
                  className="p-6 sm:p-7 rounded-2xl bg-[#151515] border border-[#292929] hover:border-[#E58A32] flex flex-col justify-between gap-6 cursor-pointer transition-all hover:shadow-[0_0_20px_rgba(229,138,50,0.15)] group"
                >
                  <div className="flex flex-col gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#1C1C1C] border border-[#292929] flex items-center justify-center text-[#E58A32] group-hover:scale-110 transition-transform">
                      <Dumbbell className="w-6 h-6" />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-mono uppercase text-[#737373] font-bold">STANDARD FLOOR PASS</span>
                      <h3 className="text-xl font-bold uppercase text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        SELF-TRAINED
                      </h3>
                      <p className="text-xs text-[#A3A3A3] leading-relaxed">
                        Train independently using all gym floor equipment, free weights, and cardio stations.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-[#292929]">
                      <div className="flex items-center gap-2 text-xs text-[#D4D4D4]">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Full gym floor &amp; station access</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#D4D4D4]">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Manage your own training routines</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#D4D4D4]">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>No trainer fees added</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#D4D4D4]">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>You can book a trainer anytime later</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="w-full py-3 rounded-xl bg-[#1C1C1C] group-hover:bg-[#E58A32] text-white text-xs font-bold uppercase tracking-wider transition-colors border border-[#292929] group-hover:border-[#E58A32]"
                  >
                    CONTINUE AS SELF-TRAINED →
                  </button>
                </div>

                {/* OPTION 2: PERSONAL TRAINER */}
                <div
                  onClick={() => handleChoosePreference('PERSONAL_TRAINER')}
                  className="p-6 sm:p-7 rounded-2xl bg-[#151515] border border-[#292929] hover:border-[#E58A32] flex flex-col justify-between gap-6 cursor-pointer transition-all hover:shadow-[0_0_20px_rgba(229,138,50,0.15)] group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 bg-[#E58A32]/10 text-[#E58A32] text-[9px] font-mono font-bold uppercase px-3 py-1 rounded-bl-xl border-l border-b border-[#E58A32]/30">
                    COACHING
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#E58A32]/10 border border-[#E58A32]/30 flex items-center justify-center text-[#E58A32] group-hover:scale-110 transition-transform">
                      <UserCheck className="w-6 h-6" />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-mono uppercase text-[#E58A32] font-bold">1-ON-1 COACHING</span>
                      <h3 className="text-xl font-bold uppercase text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        PERSONAL TRAINER
                      </h3>
                      <p className="text-xs text-[#A3A3A3] leading-relaxed">
                        Get direct guidance, progressive programming, and scheduled floor sessions with a certified coach.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-[#292929]">
                      <div className="flex items-center gap-2 text-xs text-[#D4D4D4]">
                        <Check className="w-4 h-4 text-[#E58A32] shrink-0" />
                        <span>Dedicated certified trainer assigned</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#D4D4D4]">
                        <Check className="w-4 h-4 text-[#E58A32] shrink-0" />
                        <span>Trainer-prescribed custom workout splits</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#D4D4D4]">
                        <Check className="w-4 h-4 text-[#E58A32] shrink-0" />
                        <span>Unlocks "My Workouts" immediately</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#D4D4D4]">
                        <Check className="w-4 h-4 text-[#E58A32] shrink-0" />
                        <span>Real-time availability slot booking</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="w-full py-3 rounded-xl bg-[#E58A32] hover:bg-[#F09A43] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(229,138,50,0.2)]"
                  >
                    CHOOSE A TRAINER →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              STEP 3: TRAINER DISCOVERY, DATE STRIP & SLOT SELECTION
          ══════════════════════════════════════════════════════════════ */}
          {step === 'TRAINER' && (
            <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('PREFERENCE')}
                  className="p-2 rounded-xl bg-[#1C1C1C] border border-[#292929] text-xs text-[#A3A3A3] hover:text-white flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Track Selection</span>
                </button>
                <span className="text-xs text-[#737373]">
                  Step 3 of 4: Select Coach &amp; Session Time
                </span>
              </div>

              {/* 3A. Select Coach */}
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-mono text-[#E58A32] uppercase font-bold tracking-wider">
                  STEP 3A: SELECT YOUR ASSIGNED COACH
                </span>

                {trainersLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-32 bg-[#1C1C1C] rounded-2xl animate-pulse" />
                    <div className="h-32 bg-[#1C1C1C] rounded-2xl animate-pulse" />
                  </div>
                ) : availableTrainers.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#151515] border border-[#292929] text-center flex flex-col items-center justify-center gap-2">
                    <User className="w-8 h-8 text-[#737373]" />
                    <h4 className="text-sm font-bold uppercase text-white">No Trainers Available</h4>
                    <p className="text-xs text-[#A3A3A3]">
                      No active coaches are available for booking at this branch right now. You can continue as Self-Trained.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleChoosePreference('SELF_TRAINED')}
                      className="mt-2 px-4 py-2 rounded-xl bg-[#E58A32] text-white text-xs font-bold uppercase"
                    >
                      Continue as Self-Trained
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {availableTrainers.map((t) => {
                      const isSelected = selectedTrainer?._id === t._id;
                      const sessionPrice = t.pricing?.singleSession?.price || 500;

                      return (
                        <div
                          key={t._id}
                          onClick={() => handleSelectTrainer(t)}
                          className={`p-5 rounded-2xl bg-[#151515] border flex items-center justify-between gap-4 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#E58A32] shadow-[0_0_20px_rgba(229,138,50,0.2)] bg-[#1A1A1A]'
                              : 'border-[#292929] hover:border-[#E58A32]/40'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-[#1C1C1C] border border-[#292929] flex items-center justify-center text-[#E58A32] font-black text-sm shrink-0">
                              {t.name ? t.name.charAt(0).toUpperCase() : 'C'}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-bold text-white uppercase truncate">{t.name}</span>
                              <span className="text-xs text-[#E58A32] truncate">{t.specialization}</span>
                              <span className="text-[11px] text-[#737373]">{t.experienceYears || 5} Yrs Exp • {t.branch?.city || 'Home'}</span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end shrink-0">
                            <span className="text-sm font-bold text-white font-mono">₹{sessionPrice}</span>
                            <span className="text-[10px] text-[#A3A3A3]">per session</span>
                            {isSelected && (
                              <span className="mt-1 px-2 py-0.5 rounded text-[9px] font-bold bg-[#E58A32] text-white uppercase">
                                SELECTED
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3B. Date Selection & 3C. Slot Selection (Visible once trainer is selected) */}
              {selectedTrainer && (
                <div className="flex flex-col gap-6 pt-4 border-t border-[#292929]">
                  {/* Date Strip */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-mono text-[#E58A32] uppercase font-bold tracking-wider">
                      STEP 3B: SELECT SESSION DATE (NEXT 14 DAYS)
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                      {generateDateOptions().map((d) => {
                        const isChosen = selectedDate === d.iso;

                        return (
                          <button
                            key={d.iso}
                            type="button"
                            onClick={() => handleDateChange(d.iso)}
                            className={`flex flex-col items-center justify-center min-w-[70px] py-3 px-2 rounded-xl border transition-all shrink-0 cursor-pointer ${
                              isChosen
                                ? 'bg-[#E58A32] border-[#E58A32] text-white shadow-[0_0_15px_rgba(229,138,50,0.3)]'
                                : 'bg-[#1C1C1C] border-[#292929] text-[#A3A3A3] hover:text-white'
                            }`}
                          >
                            <span className="text-[10px] uppercase font-mono font-bold">{d.dayName}</span>
                            <span className="text-lg font-black">{d.dayNum}</span>
                            <span className="text-[9px] uppercase">{d.monthName}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Slot Selector */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[#E58A32] uppercase font-bold tracking-wider">
                        STEP 3C: SELECT 1-HOUR FLOOR TIME SLOT
                      </span>
                      {selectedDate && (
                        <span className="text-[11px] text-[#A3A3A3]">
                          Showing slots for {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                        </span>
                      )}
                    </div>

                    {slotsLoading ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="h-12 bg-[#1C1C1C] rounded-xl animate-pulse" />
                        ))}
                      </div>
                    ) : availabilitySlots.length === 0 ? (
                      <div className="p-6 rounded-xl bg-[#1C1C1C] border border-[#292929] text-center text-xs text-[#A3A3A3]">
                        No available slots on this date. Please choose another date above.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {availabilitySlots.map((slot) => {
                          const isBooked = !slot.available;
                          const isChosen = selectedSlot === slot.time;

                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={isBooked}
                              onClick={() => setSelectedSlot(slot.time)}
                              className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                                isBooked
                                  ? 'bg-[#141414] border-[#252525] text-[#525252] cursor-not-allowed line-through'
                                  : isChosen
                                  ? 'bg-[#E58A32] border-[#E58A32] text-white shadow-[0_0_12px_rgba(229,138,50,0.3)]'
                                  : 'bg-[#1C1C1C] border-[#292929] text-white hover:border-[#E58A32]/50 cursor-pointer'
                              }`}
                            >
                              <span className="font-mono">{slot.time}</span>
                              <span className="text-[9px] uppercase font-normal opacity-80">
                                {isBooked ? 'Booked' : 'Available'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Continue Button */}
                  <div className="flex items-center justify-end pt-4 border-t border-[#292929]">
                    <button
                      type="button"
                      disabled={!selectedSlot}
                      onClick={() => setStep('SUMMARY')}
                      className="px-6 py-3 rounded-xl bg-[#E58A32] hover:bg-[#F09A43] text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                    >
                      Continue to Summary →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              STEP 4: CHECKOUT SUMMARY & REAL PAYMENT SELECTION
          ══════════════════════════════════════════════════════════════ */}
          {step === 'SUMMARY' && selectedPlan && (
            <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(trainingPreference === 'PERSONAL_TRAINER' ? 'TRAINER' : 'PREFERENCE')}
                  className="p-2 rounded-xl bg-[#1C1C1C] border border-[#292929] text-xs text-[#A3A3A3] hover:text-white flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <span className="text-xs text-[#737373]">
                  Step 4 of 4: Checkout Summary
                </span>
              </div>

              {/* Summary Card */}
              <div className="p-6 sm:p-8 rounded-2xl bg-[#151515] border border-[#292929] flex flex-col gap-6 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                <div className="flex flex-col gap-1 border-b border-[#292929] pb-4">
                  <span className="text-[10px] font-mono text-[#E58A32] uppercase font-bold tracking-wider">
                    CHECKOUT OVERVIEW
                  </span>
                  <h3 className="text-2xl font-black uppercase text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    MEMBERSHIP SUMMARY.
                  </h3>
                </div>

                {/* Plan Line Item */}
                <div className="flex items-start justify-between border-b border-[#292929] pb-4">
                  <div className="flex flex-col">
                    <span className="text-base font-bold text-white">{selectedPlan.name}</span>
                    <span className="text-xs text-[#A3A3A3]">{selectedPlan.durationDays} Days Facility Pass • {branchInfo?.city || 'Home'} Branch</span>
                    <span className="text-[10px] font-mono text-[#737373] mt-0.5">
                      Base: ₹{selectedPlan.basePrice} {selectedPlan.joiningFee > 0 ? `+ ₹${selectedPlan.joiningFee} join fee` : ''} {selectedPlan.discountValue > 0 ? `- ₹${selectedPlan.discountValue} discount` : ''}
                    </span>
                  </div>
                  <span className="text-base font-bold text-white font-mono">₹{selectedPlan.finalPrice}</span>
                </div>

                {/* Training Track Line Item */}
                <div className="flex items-start justify-between border-b border-[#292929] pb-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-mono uppercase text-[#E58A32] font-bold">TRAINING TRACK</span>
                    <span className="text-sm font-bold text-white mt-0.5">
                      {trainingPreference === 'PERSONAL_TRAINER' ? 'Personal Trainer Coaching' : 'Self-Trained (Independent)'}
                    </span>
                    {trainingPreference === 'PERSONAL_TRAINER' && selectedTrainer && (
                      <span className="text-xs text-[#A3A3A3] mt-0.5">
                        Coach: {selectedTrainer.name} • Session: {selectedDate} at {selectedSlot}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-white font-mono">
                    {trainingPreference === 'PERSONAL_TRAINER'
                      ? `₹${selectedTrainer?.pricing?.singleSession?.price || 500}`
                      : '₹0 (Included)'}
                  </span>
                </div>

                {/* Grand Total */}
                {(() => {
                  const trainerFee = trainingPreference === 'PERSONAL_TRAINER' ? (selectedTrainer?.pricing?.singleSession?.price || 500) : 0;
                  const grandTotal = selectedPlan.finalPrice + trainerFee;

                  return (
                    <div className="p-4 rounded-xl bg-[#1C1C1C] border border-[#292929] flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase text-white tracking-wider">TOTAL AMOUNT PAYABLE</span>
                        <span className="text-[10px] text-[#A3A3A3]">All facility &amp; coaching fees inclusive</span>
                      </div>
                      <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                        ₹{grandTotal.toLocaleString()}
                      </span>
                    </div>
                  );
                })()}

                {/* Payment Selection Options */}
                <div className="flex flex-col gap-3 pt-2">
                  <span className="text-[10px] font-mono uppercase text-[#A3A3A3] font-bold tracking-wider">
                    SELECT PAYMENT METHOD
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Method 1: Instant Online / UPI */}
                    <div
                      onClick={() => setPaymentChoice('INSTANT')}
                      className={`p-4 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                        paymentChoice === 'INSTANT'
                          ? 'bg-[#E58A32]/10 border-[#E58A32] shadow-[0_0_15px_rgba(229,138,50,0.15)]'
                          : 'bg-[#1C1C1C] border-[#292929] hover:border-[#383838]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase">INSTANT VERIFIED UPI / CARD</span>
                        {paymentChoice === 'INSTANT' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#E58A32]" />
                        )}
                      </div>
                      <span className="text-[10px] text-[#A3A3A3]">
                        Immediate activation. Unlocks floor access pass and "My Workouts" instantly.
                      </span>
                    </div>

                    {/* Method 2: Pay at Reception Desk */}
                    <div
                      onClick={() => setPaymentChoice('RECEPTION')}
                      className={`p-4 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                        paymentChoice === 'RECEPTION'
                          ? 'bg-[#E58A32]/10 border-[#E58A32] shadow-[0_0_15px_rgba(229,138,50,0.15)]'
                          : 'bg-[#1C1C1C] border-[#292929] hover:border-[#383838]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase">PAY AT FRONT DESK (CASH)</span>
                        {paymentChoice === 'RECEPTION' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#E58A32]" />
                        )}
                      </div>
                      <span className="text-[10px] text-[#A3A3A3]">
                        Reserve your spot now and settle your fee at your branch reception desk.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleCompletePurchase}
                    className="w-full py-3.5 rounded-xl bg-[#E58A32] hover:bg-[#F09A43] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(229,138,50,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {isSubmitting ? (
                      <span>PROCESSING ENROLLMENT...</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>CONFIRM &amp; COMPLETE ENROLLMENT</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              STEP 5: SUCCESS CONFIRMATION MODAL / SCREEN
          ══════════════════════════════════════════════════════════════ */}
          {step === 'SUCCESS' && (
            <div className="p-8 sm:p-12 rounded-2xl bg-[#151515] border border-emerald-500/40 text-center flex flex-col items-center justify-center gap-5 max-w-lg mx-auto shadow-[0_0_40px_rgba(16,185,129,0.15)]">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold tracking-widest">
                  {purchaseSuccess?.paymentStatus === 'PAID' ? 'MEMBERSHIP ACTIVATED' : 'RESERVATION PLACED'}
                </span>
                <h3 className="text-2xl font-black uppercase text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  WELCOME TO THE MACHINE.
                </h3>
                <p className="text-xs text-[#A3A3A3] max-w-sm mt-1">
                  {purchaseSuccess?.paymentStatus === 'PAID'
                    ? `Your ${selectedPlan?.name} membership is active! Your account now has full access to facility stations.`
                    : 'Your membership reservation is recorded. Please settle the amount at the branch reception desk to complete your activation.'}
                </p>
              </div>

              {trainingPreference === 'PERSONAL_TRAINER' && selectedTrainer && purchaseSuccess?.paymentStatus === 'PAID' && (
                <div className="w-full p-4 rounded-xl bg-[#1C1C1C] border border-[#292929] flex items-center justify-between text-xs text-left">
                  <div className="flex flex-col">
                    <span className="font-bold text-white uppercase">Coach {selectedTrainer.name}</span>
                    <span className="text-[11px] text-[#A3A3A3]">First Session: {selectedDate} at {selectedSlot}</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#E58A32] uppercase bg-[#E58A32]/10 px-2 py-0.5 rounded border border-[#E58A32]/20">
                    UNLOCKED
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 w-full pt-2">
                <button
                  type="button"
                  onClick={() => handleNav('/client/dashboard')}
                  className="flex-1 py-3 rounded-xl bg-[#E58A32] hover:bg-[#F09A43] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(229,138,50,0.25)]"
                >
                  Go to Dashboard
                </button>
                {purchaseSuccess?.trainerAssigned && (
                  <button
                    type="button"
                    onClick={() => handleNav('/client/workouts')}
                    className="flex-1 py-3 rounded-xl bg-[#1C1C1C] border border-[#292929] hover:border-white text-white text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    View My Workouts
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
