import React, { useState, useEffect } from 'react';
import { X, Check, Info } from 'lucide-react';
import clientService from '../../services/clientService.js';
import branchService from '../../services/branchService.js';
import authService from '../../services/auth.js';
import { Reveal } from '../Motion/ScrollMotion.jsx';

const FALLBACK_TIERS = [
  {
    _id: 'starter-fallback',
    eyebrow: '01 / MEMBERSHIP',
    name: 'STARTER',
    description: 'Your first step toward stronger.',
    durationLabel: '1 MONTH / PROPOSED',
    benefitsSummary: 'Gym floor access • Equipment induction',
    benefits: ['Gym floor access', 'Equipment induction'],
    isFeatured: false,
    finalPrice: null,
  },
  {
    _id: 'athlete-fallback',
    eyebrow: 'THE CONSISTENT CHOICE',
    name: 'ATHLETE',
    description: 'For those who keep showing up.',
    durationLabel: '3 MONTHS / PROPOSED',
    benefitsSummary: 'Gym floor access • Progress check-ins',
    benefits: ['Gym floor access', 'Progress check-ins'],
    isFeatured: true,
    finalPrice: null,
  },
  {
    _id: 'elite-fallback',
    eyebrow: '03 / MEMBERSHIP',
    name: 'ELITE',
    description: 'Go all in. Leave nothing behind.',
    durationLabel: '12 MONTHS / PROPOSED',
    benefitsSummary: 'Gym floor access • Training guidance',
    benefits: ['Gym floor access', 'Training guidance'],
    isFeatured: false,
    finalPrice: null,
  },
];

export default function MembershipPlansPreview({ onNavigate, onOpenJoinModal }) {
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [detailsModalPlan, setDetailsModalPlan] = useState(null);
  const [roleNotice, setRoleNotice] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadBranches = async () => {
      try {
        const branchList = await branchService.getBranches();
        if (isMounted && branchList?.length > 0) {
          setBranches(branchList);
          const currentUser = authService.getUser();
          const userBranchId = currentUser?.branchId?._id || currentUser?.branchId;
          const savedBranchId = sessionStorage.getItem('mm_selected_branch_id');

          let defaultId = '';
          if (userBranchId && branchList.some((b) => (b.id || b._id) === userBranchId)) {
            defaultId = userBranchId;
          } else if (savedBranchId && branchList.some((b) => (b.id || b._id) === savedBranchId)) {
            defaultId = savedBranchId;
          } else {
            const hq =
              branchList.find((b) => b.city?.toLowerCase() === 'kovilpatti') || branchList[0];
            defaultId = hq.id || hq._id;
          }
          setSelectedBranchId(defaultId);
        }
      } catch (err) {
        if (isMounted) {
          setUsingFallback(true);
          setLoadingPlans(false);
        }
      }
    };
    loadBranches();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedBranchId) return;
    let isMounted = true;
    const loadPlans = async () => {
      try {
        setLoadingPlans(true);
        const res = await clientService.getPublicAvailablePlans(selectedBranchId);
        const fetchedPlans = res?.plans || [];
        if (isMounted) {
          if (fetchedPlans.length > 0) {
            setPlans(fetchedPlans);
            setUsingFallback(false);
          } else {
            setPlans(FALLBACK_TIERS);
            setUsingFallback(true);
          }
          sessionStorage.setItem('mm_selected_branch_id', selectedBranchId);
        }
      } catch (err) {
        if (isMounted) {
          setPlans(FALLBACK_TIERS);
          setUsingFallback(true);
        }
      } finally {
        if (isMounted) setLoadingPlans(false);
      }
    };
    loadPlans();
    return () => {
      isMounted = false;
    };
  }, [selectedBranchId]);

  const formatDurationLabel = (plan) => {
    if (plan.durationLabel) return plan.durationLabel;
    const days = plan.durationDays || 30;
    if (days >= 360) return '12 MONTHS';
    if (days >= 180) return '6 MONTHS';
    if (days >= 85 && days <= 95) return '3 MONTHS';
    if (days >= 28 && days <= 31) return '1 MONTH';
    return `${days} DAYS`;
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
      return null;
    }
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };

  const handlePlanCTA = (plan) => {
    setRoleNotice(null);
    const isAuthed = authService.isAuthenticated();
    const role = authService.getRole();

    if (plan._id && !String(plan._id).endsWith('-fallback')) {
      sessionStorage.setItem('mm_selected_plan_id', plan._id);
    }
    if (selectedBranchId) {
      sessionStorage.setItem('mm_selected_branch_id', selectedBranchId);
    }

    if (isAuthed) {
      if (role === 'CLIENT') {
        const target =
          plan._id && !String(plan._id).endsWith('-fallback')
            ? `/client/membership?planId=${plan._id}`
            : '/client/membership';
        if (onNavigate) onNavigate(target);
        return;
      }
      setRoleNotice(`Signed in as ${role}. Membership enrollment is available for Client accounts.`);
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

  const displayedPlans = plans.length > 0 ? plans : FALLBACK_TIERS;

  return (
    <section
      id="memberships"
      className="relative w-full max-w-[1440px] mx-auto px-6 md:px-14 py-16 sm:py-20 lg:py-[100px] scroll-mt-20"
    >
      <div className="flex flex-col items-start gap-10">
        {/* Top Row: Title + Optional Branch Filter */}
        <div className="w-full flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="flex flex-col items-start gap-5">
            <Reveal delay={0}>
              <p className="font-editorial-label text-[#EB3E2E]">05 / MAKE THE COMMITMENT</p>
            </Reveal>
            <Reveal variant="mask" delay={80}>
              <h2
                className="font-editorial-display font-semibold uppercase text-[#F5F5F5]"
                style={{ fontSize: 'clamp(2.75rem, 5vw, 4.5rem)' }}
              >
                CHOOSE YOUR LEVEL.
              </h2>
            </Reveal>
          </div>

          {/* Minimal Branch Selector Tabs */}
          {branches.length > 0 && (
            <Reveal delay={120}>
              <div
                className="flex flex-wrap items-center gap-2 border border-[#303030] bg-[#181818] p-1"
                role="tablist"
                aria-label="Select gym branch for membership pricing"
              >
                {branches.map((branch) => {
                  const id = branch.id || branch._id;
                  const active = id === selectedBranchId;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedBranchId(id)}
                      className={`font-editorial-label px-4 py-2.5 transition-colors duration-300 cursor-pointer ${
                        active
                          ? 'bg-[#EB3E2E] text-[#F5F5F5]'
                          : 'text-[#B8B8B8] hover:text-[#F5F5F5]'
                      }`}
                    >
                      {branch.city}
                    </button>
                  );
                })}
              </div>
            </Reveal>
          )}
        </div>

        {/* Role Notice */}
        {roleNotice && (
          <div className="w-full border border-[#EB3E2E] bg-[#181818] px-5 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-[#F5F5F5]">
              <Info className="w-4 h-4 text-[#EB3E2E] shrink-0" />
              <span>{roleNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setRoleNotice(null)}
              className="text-[#B8B8B8] hover:text-[#F5F5F5] cursor-pointer"
              aria-label="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Membership Architectural Grid */}
        {loadingPlans ? (
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-[420px] bg-[#181818] border border-[#303030] p-8 animate-pulse flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="h-3 w-28 bg-[#303030]" />
                  <div className="h-8 w-44 bg-[#303030]" />
                  <div className="h-4 w-56 bg-[#303030]" />
                </div>
                <div className="h-12 w-full bg-[#303030]" />
              </div>
            ))}
          </div>
        ) : (
          <div
            className={`w-full grid grid-cols-1 md:grid-cols-2 ${
              displayedPlans.length >= 4 ? 'xl:grid-cols-4' : 'lg:grid-cols-3'
            } gap-6`}
          >
            {displayedPlans.map((plan, idx) => {
              const isFeatured =
                Boolean(plan.isFeatured) ||
                (displayedPlans.length >= 3 && idx === 1 && !displayedPlans.some((p) => p.isFeatured));
              const eyebrow =
                plan.eyebrow ||
                (isFeatured
                  ? 'THE CONSISTENT CHOICE'
                  : `0${idx + 1} / MEMBERSHIP`);
              const formattedPrice = formatCurrency(plan.finalPrice);
              const formattedBase = formatCurrency(plan.basePrice);
              const hasDiscount =
                plan.basePrice &&
                plan.finalPrice &&
                Number(plan.basePrice) > Number(plan.finalPrice);
              const benefitsText =
                plan.benefitsSummary ||
                (plan.benefits && plan.benefits.length > 0
                  ? plan.benefits.slice(0, 3).join(' • ')
                  : 'Gym floor access • Equipment guidance');

              return (
                <Reveal
                  key={plan._id || plan.name}
                  delay={idx * 90}
                  className={`flex flex-col justify-between gap-7 p-8 bg-[#181818] border transition-colors duration-500 ${
                    isFeatured
                      ? 'border-[#EB3E2E]'
                      : 'border-[#303030] hover:border-[#B8B8B8]'
                  }`}
                >
                  <div className="flex flex-col items-start gap-5">
                    {/* Top Eyebrow */}
                    <p
                      className={`font-editorial-label ${
                        isFeatured ? 'text-[#EB3E2E]' : 'text-[#B8B8B8]'
                      }`}
                    >
                      {eyebrow}
                    </p>

                    {/* Tier / Plan Name */}
                    <h3 className="font-editorial-display font-semibold uppercase text-[#F5F5F5] text-[30px] sm:text-[32px] leading-[1.08] tracking-[-0.025em]">
                      {plan.name}
                    </h3>

                    {/* Short Description */}
                    <p className="font-editorial-body text-[#B8B8B8] text-[15px] leading-relaxed min-h-[44px]">
                      {plan.description ||
                        'Structured training floor access built for measurable consistency.'}
                    </p>

                    {/* Duration */}
                    <div className="pt-2 border-t border-[#303030] w-full flex flex-col gap-2.5">
                      <span className="font-editorial-label text-[#F5F5F5]">
                        {formatDurationLabel(plan)}
                      </span>
                      <p className="font-editorial-body text-[#B8B8B8] text-sm">
                        {benefitsText}
                      </p>
                    </div>
                  </div>

                  {/* Price & Action */}
                  <div className="flex flex-col items-start gap-5 w-full pt-2">
                    <div className="flex flex-col items-start gap-1">
                      {formattedPrice ? (
                        <div className="flex items-baseline gap-2.5">
                          <span className="font-editorial-display font-semibold text-2xl sm:text-[28px] text-[#F5F5F5]">
                            {formattedPrice}
                          </span>
                          {hasDiscount && formattedBase && (
                            <span className="font-editorial-body text-sm text-[#B8B8B8] line-through">
                              {formattedBase}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="font-editorial-label text-[#F5F5F5]">
                          PRICE TO BE CONFIRMED
                        </span>
                      )}
                      {plan.joiningFee > 0 && (
                        <span className="font-editorial-label text-[#B8B8B8] text-[10px]">
                          + ₹{Number(plan.joiningFee).toLocaleString('en-IN')} ONE-TIME JOINING FEE
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-3 w-full">
                      <button
                        type="button"
                        onClick={() => handlePlanCTA(plan)}
                        className="btn-editorial-primary w-full"
                      >
                        <span>VIEW MEMBERSHIPS</span>
                      </button>

                      {plan.benefits && plan.benefits.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setDetailsModalPlan(plan)}
                          className="btn-editorial-secondary !px-4 shrink-0"
                        >
                          DETAILS
                        </button>
                      )}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}

        {/* Footnote Disclaimer */}
        <Reveal delay={180}>
          <p className="font-editorial-body text-[#B8B8B8] text-sm">
            {usingFallback
              ? 'Membership details are indicative. Contact the team for confirmed plans, benefits and pricing.'
              : 'Live membership pricing displayed for the selected branch. Proceed to sign up or log in to enroll.'}
          </p>
        </Reveal>
      </div>

      {/* Plan Details Modal */}
      {detailsModalPlan && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDetailsModalPlan(null)}
        >
          <div
            className="w-full max-w-lg bg-[#181818] border border-[#303030] p-8 flex flex-col gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#303030] pb-4">
              <div>
                <p className="font-editorial-label text-[#EB3E2E] mb-2">
                  {formatDurationLabel(detailsModalPlan)}
                </p>
                <h3 className="font-editorial-display text-3xl font-semibold uppercase text-[#F5F5F5]">
                  {detailsModalPlan.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailsModalPlan(null)}
                className="text-[#B8B8B8] hover:text-[#F5F5F5] p-1 cursor-pointer"
                aria-label="Close plan details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailsModalPlan.description && (
              <p className="font-editorial-body text-[#B8B8B8] text-sm">
                {detailsModalPlan.description}
              </p>
            )}

            <ul className="flex flex-col gap-3">
              {(detailsModalPlan.benefits || []).map((benefit, bIdx) => (
                <li key={bIdx} className="flex items-start gap-3 text-sm text-[#F5F5F5]">
                  <Check className="w-4 h-4 text-[#EB3E2E] shrink-0 mt-0.5" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            <div className="pt-4 border-t border-[#303030] flex items-center justify-between gap-4">
              <div>
                <span className="font-editorial-label text-[#B8B8B8] block">TOTAL</span>
                <span className="font-editorial-display text-2xl font-semibold text-[#F5F5F5]">
                  {formatCurrency(detailsModalPlan.finalPrice) || 'PRICE TO BE CONFIRMED'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const chosen = detailsModalPlan;
                  setDetailsModalPlan(null);
                  handlePlanCTA(chosen);
                }}
                className="btn-editorial-primary"
              >
                <span>SELECT PLAN</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
