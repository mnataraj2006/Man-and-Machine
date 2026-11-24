import React, { useState, useEffect } from 'react';
import {
  Check,
  Building,
  ArrowRight,
  Sparkles,
  Info,
  X,
  CreditCard,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  PhoneCall,
} from 'lucide-react';
import clientService from '../../services/clientService.js';
import branchService from '../../services/branchService.js';
import authService from '../../services/auth.js';

export default function MembershipPlansPreview({ onNavigate, onOpenJoinModal }) {
  // Branches & selection
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [loadingBranches, setLoadingBranches] = useState(true);

  // Plans & display state
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modal inspection state
  const [detailsModalPlan, setDetailsModalPlan] = useState(null);

  // Role notification for Admin/Trainer attempting to purchase
  const [roleNotice, setRoleNotice] = useState(null);

  // 1. Load active branches on mount
  useEffect(() => {
    let isMounted = true;
    const fetchBranches = async () => {
      try {
        setLoadingBranches(true);
        const branchList = await branchService.getBranches();
        if (isMounted && branchList && branchList.length > 0) {
          setBranches(branchList);

          // Default branch logic:
          // 1) If user is logged in and has an assigned branchId, use that
          // 2) If sessionStorage has a saved branch from previous interaction, use that
          // 3) Else default to Kovilpatti (HQ) or first branch
          const currentUser = authService.getUser();
          const userBranchId = currentUser?.branchId?._id || currentUser?.branchId;
          const savedBranchId = sessionStorage.getItem('mm_selected_branch_id');

          let defaultId = '';
          if (userBranchId && branchList.some((b) => (b.id || b._id) === userBranchId)) {
            defaultId = userBranchId;
          } else if (savedBranchId && branchList.some((b) => (b.id || b._id) === savedBranchId)) {
            defaultId = savedBranchId;
          } else {
            const hq = branchList.find((b) => b.city?.toLowerCase() === 'kovilpatti') || branchList[0];
            defaultId = hq.id || hq._id;
          }

          setSelectedBranchId(defaultId);
        }
      } catch (err) {
        console.error('Failed to load branches for preview:', err);
      } finally {
        if (isMounted) setLoadingBranches(false);
      }
    };

    fetchBranches();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch plans whenever selectedBranchId changes
  const fetchPlansForBranch = async (branchId) => {
    if (!branchId) return;
    try {
      setLoadingPlans(true);
      setError(null);
      const res = await clientService.getPublicAvailablePlans(branchId);
      setPlans(res.plans || []);
      // Reset category filter if previous category no longer exists
      setSelectedCategory('ALL');
    } catch (err) {
      console.error('Failed to load available plans:', err);
      setError('Unable to load membership plans right now. Please try again.');
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    if (selectedBranchId) {
      fetchPlansForBranch(selectedBranchId);
      sessionStorage.setItem('mm_selected_branch_id', selectedBranchId);
    }
  }, [selectedBranchId]);

  // Handle branch tab switch
  const handleSelectBranch = (branchId) => {
    if (branchId === selectedBranchId) return;
    setSelectedBranchId(branchId);
  };

  // Currently active branch object
  const currentBranch = branches.find((b) => (b.id || b._id) === selectedBranchId) || branches[0];

  // Derive unique categories present in the plans (e.g. 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY')
  const availableCategories = ['ALL'];
  plans.forEach((p) => {
    const type = p.planType || (p.durationDays <= 31 ? 'MONTHLY' : p.durationDays <= 95 ? 'QUARTERLY' : p.durationDays <= 185 ? 'HALF_YEARLY' : 'YEARLY');
    if (!availableCategories.includes(type)) {
      availableCategories.push(type);
    }
  });

  // Filtered plans based on category
  const filteredPlans = plans.filter((p) => {
    if (selectedCategory === 'ALL') return true;
    const type = p.planType || (p.durationDays <= 31 ? 'MONTHLY' : p.durationDays <= 95 ? 'QUARTERLY' : p.durationDays <= 185 ? 'HALF_YEARLY' : 'YEARLY');
    return type === selectedCategory;
  });

  // Check if any plan is explicitly marked as featured/popular
  const hasExplicitFeatured = plans.some((p) => p.isFeatured || p.isPopular);

  // Map category code to human-readable label
  const formatCategoryLabel = (cat) => {
    switch (cat) {
      case 'ALL':
        return 'ALL PLANS';
      case 'MONTHLY':
        return 'MONTHLY';
      case 'QUARTERLY':
        return 'QUARTERLY';
      case 'HALF_YEARLY':
        return 'HALF-YEARLY';
      case 'YEARLY':
        return 'ANNUAL';
      case 'CUSTOM':
        return 'SPECIAL';
      default:
        return cat.replace('_', ' ');
    }
  };

  // Format duration text
  const formatDurationText = (plan) => {
    if (plan.durationMonths && plan.durationMonths > 1) {
      return `${plan.durationMonths} MONTHS`;
    }
    if (plan.durationDays >= 365) {
      return '1 YEAR';
    }
    return `${plan.durationDays} DAYS`;
  };

  // 3. Handle CHOOSE PLAN action
  const handleChoosePlan = (plan) => {
    setRoleNotice(null);

    // Save plan and branch in sessionStorage for handoff
    sessionStorage.setItem('mm_selected_plan_id', plan._id);
    sessionStorage.setItem('mm_selected_branch_id', selectedBranchId);

    const isAuthed = authService.isAuthenticated();
    const role = authService.getRole();

    if (!isAuthed) {
      // Unauthenticated visitor -> redirect to signup preserving selection
      if (onNavigate) {
        onNavigate('/signup');
      } else {
        window.history.pushState({}, '', '/signup');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      return;
    }

    if (role === 'CLIENT') {
      // Authenticated client -> proceed to client membership checkout
      const targetUrl = `/client/membership?planId=${encodeURIComponent(plan._id)}`;
      if (onNavigate) {
        onNavigate(targetUrl);
      } else {
        window.history.pushState({}, '', targetUrl);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      return;
    }

    // If Admin or Trainer is logged in, inform them they cannot purchase client memberships
    setRoleNotice({
      role,
      message: `You are currently logged in as ${role === 'ADMIN' ? 'an Administrator' : 'a Trainer'}. Membership enrollments are designed for client athlete accounts.`,
    });
  };

  const handleViewAllPlans = () => {
    const isAuthed = authService.isAuthenticated();
    const role = authService.getRole();

    if (isAuthed && role === 'CLIENT') {
      if (onNavigate) onNavigate('/client/membership');
      else {
        window.history.pushState({}, '', '/client/membership');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    } else {
      // Smooth scroll to top of membership plans preview or navigate
      const elem = document.getElementById('membership-plans');
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <section
      id="membership-plans"
      className="w-full py-16 sm:py-24 bg-[#09090B] text-[#F5F5F5] relative overflow-hidden border-t border-[#1C1C1F]"
    >
      {/* Background ambient lighting accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#E58A32]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#E58A32]/3 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* ── 1. SECTION HEADER ── */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#181818] border border-[#292929] mb-4">
            <span className="w-2 h-2 rounded-full bg-[#E58A32] animate-pulse" />
            <span
              className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em] text-[#E58A32] font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              YOUR JOURNEY STARTS HERE
            </span>
          </div>

          <span className="text-xs sm:text-sm font-mono tracking-widest text-[#A3A3A3] uppercase block mb-2">
            MEMBERSHIP PLANS
          </span>

          <h2
            className="uppercase font-bold tracking-tight text-[#F5F5F5] leading-[1.05]"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(2rem, 4.5vw, 3.4rem)',
            }}
          >
            CHOOSE YOUR COMMITMENT.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F5F5F5] via-[#E58A32] to-[#F5F5F5]">
              BUILD YOUR STRENGTH.
            </span>
          </h2>

          <p className="mt-4 text-xs sm:text-base text-[#A3A3A3] max-w-2xl leading-relaxed">
            Find the membership that fits your goals. Choose your plan, train your way, and become part of Man &amp; Machine.
          </p>
        </div>

        {/* ── 2. ROLE NOTICE FOR ADMIN/TRAINER ── */}
        {roleNotice && (
          <div className="max-w-2xl mx-auto mb-8 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 shrink-0" />
              <span>{roleNotice.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setRoleNotice(null)}
              className="text-amber-400 hover:text-white p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── 3. BRANCH SELECTOR ── */}
        <div className="flex flex-col items-center gap-3.5 mb-10">
          <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-[#A3A3A3] font-bold">
            SELECT YOUR GYM
          </span>

          <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-[#141416] border border-[#252528] shadow-inner max-w-full">
            {loadingBranches ? (
              <div className="h-10 w-64 bg-[#1F1F23] rounded-xl animate-pulse" />
            ) : (
              branches.map((b) => {
                const bId = b.id || b._id;
                const isSelected = bId === selectedBranchId;
                return (
                  <button
                    key={bId}
                    type="button"
                    onClick={() => handleSelectBranch(bId)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-[#E58A32] text-white shadow-[0_0_20px_rgba(229,138,50,0.35)] scale-[1.02]'
                        : 'text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#1E1E22]'
                    }`}
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {b.city || b.name}
                  </button>
                );
              })
            )}
          </div>

          {/* Current Branch Location Hint */}
          {currentBranch && !loadingBranches && (
            <div className="flex items-center gap-2 text-xs text-[#A3A3A3]">
              <Building className="w-3.5 h-3.5 text-[#E58A32]" />
              <span>
                Showing branch-calibrated pricing for{' '}
                <strong className="text-[#F5F5F5]">{currentBranch.name || currentBranch.city}</strong> ({currentBranch.city})
              </span>
            </div>
          )}
        </div>

        {/* ── 4. CATEGORY FILTER (IF > 1 CATEGORY) ── */}
        {availableCategories.length > 2 && (
          <div className="flex items-center justify-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none">
            {availableCategories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-[11px] font-mono uppercase tracking-wider transition-colors cursor-pointer shrink-0 ${
                    active
                      ? 'bg-[#292929] text-[#F5F5F5] border border-[#E58A32]/60'
                      : 'text-[#A3A3A3] hover:text-[#F5F5F5] bg-[#141416] border border-[#252528]'
                  }`}
                >
                  {formatCategoryLabel(cat)}
                </button>
              );
            })}
          </div>
        )}

        {/* ── 5. MEMBERSHIP CARDS CONTAINER ── */}
        {loadingPlans ? (
          // Skeleton Cards
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-[#181818] border border-[#292929] rounded-2xl p-6 flex flex-col justify-between h-[450px] animate-pulse"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-20 bg-[#252525] rounded" />
                    <div className="h-4 w-16 bg-[#252525] rounded" />
                  </div>
                  <div className="h-6 w-3/4 bg-[#252525] rounded" />
                  <div className="h-10 w-1/2 bg-[#252525] rounded mt-4" />
                  <div className="space-y-2 pt-6">
                    <div className="h-3 w-full bg-[#222222] rounded" />
                    <div className="h-3 w-5/6 bg-[#222222] rounded" />
                    <div className="h-3 w-4/6 bg-[#222222] rounded" />
                  </div>
                </div>
                <div className="space-y-2 pt-6">
                  <div className="h-10 w-full bg-[#222222] rounded-xl" />
                  <div className="h-10 w-full bg-[#252525] rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          // Error State
          <div className="p-8 sm:p-12 rounded-2xl bg-[#141416] border border-[#292929] text-center max-w-lg mx-auto flex flex-col items-center gap-4">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <h3
              className="text-base font-bold uppercase text-[#F5F5F5]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              UNABLE TO LOAD PLANS
            </h3>
            <p className="text-xs text-[#A3A3A3]">{error}</p>
            <button
              type="button"
              onClick={() => fetchPlansForBranch(selectedBranchId)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E58A32] hover:bg-[#F09A43] text-black font-bold text-xs uppercase tracking-wider transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          </div>
        ) : filteredPlans.length === 0 ? (
          // Empty State
          <div className="p-8 sm:p-12 rounded-2xl bg-[#141416] border border-[#292929] text-center max-w-lg mx-auto flex flex-col items-center gap-4">
            <Info className="w-10 h-10 text-[#E58A32]" />
            <h3
              className="text-base font-bold uppercase text-[#F5F5F5]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              NO PLANS AVAILABLE
            </h3>
            <p className="text-xs text-[#A3A3A3] leading-relaxed">
              Membership plans are currently unavailable for this branch. Please contact the gym for assistance.
            </p>
            <a
              href="tel:+917598885566"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1F1F23] hover:bg-[#252528] text-[#F5F5F5] border border-[#292929] text-xs font-bold uppercase tracking-wider transition-all"
            >
              <PhoneCall className="w-4 h-4 text-[#E58A32]" />
              <span>Call +91 75988 85566</span>
            </a>
          </div>
        ) : (
          // Plan Cards Grid
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {filteredPlans.map((plan) => {
              const isFeatured = hasExplicitFeatured && (plan.isFeatured || plan.isPopular);
              const hasDiscount = plan.discountValue && plan.discountValue > 0;
              const durationLabel = formatDurationText(plan);
              const benefitsList = plan.benefits || [];

              return (
                <div
                  key={plan._id}
                  className={`rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 relative group ${
                    isFeatured
                      ? 'bg-[#191715] border-2 border-[#E58A32] shadow-[0_0_30px_rgba(229,138,50,0.15)] hover:shadow-[0_0_40px_rgba(229,138,50,0.25)]'
                      : 'bg-[#181818] border border-[#292929] hover:border-[#3e3e3e] hover:-translate-y-1'
                  }`}
                >
                  {/* Featured Badge if explicitly flagged */}
                  {isFeatured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#E58A32] text-black font-mono font-bold text-[10px] tracking-wider uppercase shadow-[0_0_15px_rgba(229,138,50,0.4)] shrink-0 whitespace-nowrap">
                      MOST POPULAR
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Header: Category & Duration Pill */}
                    <div className="flex items-center justify-between gap-2 border-b border-[#252525] pb-3">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[#E58A32] font-bold">
                        {plan.planType || 'STANDARD'}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#252525] text-[#A3A3A3]">
                        {durationLabel}
                      </span>
                    </div>

                    {/* Plan Name */}
                    <div className="min-h-[48px] flex items-center">
                      <h3
                        className="text-lg font-bold uppercase text-[#F5F5F5] group-hover:text-[#E58A32] transition-colors line-clamp-2"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {plan.name}
                      </h3>
                    </div>

                    {/* Pricing Block */}
                    <div className="py-2">
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-3xl sm:text-4xl font-bold text-[#F5F5F5] tracking-tight"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          ₹{(plan.finalPrice ?? plan.basePrice).toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-[#A3A3A3] font-mono">
                          / {durationLabel.toLowerCase()}
                        </span>
                      </div>

                      {/* Struck-through base price & discount badge if applicable */}
                      {hasDiscount && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-[#737373] line-through font-mono">
                            ₹{plan.basePrice.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                            SAVE ₹{plan.discountValue.toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}

                      {/* Joining Fee Note */}
                      <div className="mt-1 text-[11px] text-[#A3A3A3]">
                        {plan.joiningFee === 0 ? (
                          <span className="text-emerald-400 font-medium">✓ Zero Joining Fee</span>
                        ) : (
                          <span>+ ₹{plan.joiningFee} joining fee</span>
                        )}
                      </div>
                    </div>

                    {/* Benefits Preview */}
                    <div className="space-y-2 pt-2 border-t border-[#252525]">
                      <span className="text-[10px] font-mono uppercase text-[#A3A3A3] tracking-wider block">
                        WHAT'S INCLUDED:
                      </span>
                      <ul className="space-y-1.5 text-xs text-[#CCCCCC]">
                        {benefitsList.slice(0, 4).map((b, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-[#E58A32] shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{b}</span>
                          </li>
                        ))}
                        {benefitsList.length > 4 && (
                          <li className="text-[11px] text-[#A3A3A3] italic pl-5">
                            + {benefitsList.length - 4} more privileges
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Actions: VIEW DETAILS & CHOOSE PLAN */}
                  <div className="space-y-2.5 pt-6 mt-4 border-t border-[#252525]">
                    <button
                      type="button"
                      onClick={() => setDetailsModalPlan(plan)}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#202020] hover:bg-[#292929] text-[#CCCCCC] hover:text-white border border-[#2e2e2e] transition-colors cursor-pointer text-center"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      VIEW DETAILS
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChoosePlan(plan)}
                      className={`w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_4px_15px_rgba(0,0,0,0.3)] ${
                        isFeatured
                          ? 'bg-[#E58A32] hover:bg-[#F09A43] text-black shadow-[0_0_20px_rgba(229,138,50,0.3)] font-black'
                          : 'bg-[#E58A32] hover:bg-[#F09A43] text-white hover:text-white'
                      }`}
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      <span>CHOOSE PLAN</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── 6. VIEW ALL MEMBERSHIP PLANS CTA ── */}
        <div className="mt-14 sm:mt-16 text-center">
          <button
            type="button"
            onClick={handleViewAllPlans}
            className="inline-flex items-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#E58A32] hover:text-[#F09A43] group transition-all cursor-pointer py-2 px-4 rounded-xl border border-transparent hover:border-[#E58A32]/30 bg-[#141416]/50"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <span>VIEW ALL MEMBERSHIP PLANS</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* ── 7. DETAILED PLAN SPECIFICATION MODAL ── */}
      {detailsModalPlan && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
        >
          <div className="bg-[#181818] border border-[#2E2E2E] rounded-2xl w-full max-w-lg p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setDetailsModalPlan(null)}
              className="absolute top-5 right-5 p-1.5 rounded-lg bg-[#222222] hover:bg-[#2b2b2b] text-[#A3A3A3] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="space-y-1 mb-5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#E58A32] font-bold">
                  {detailsModalPlan.planType || 'PLAN SPECIFICATIONS'}
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#252525] text-[#A3A3A3]">
                  {formatDurationText(detailsModalPlan)}
                </span>
              </div>
              <h3
                className="text-xl sm:text-2xl font-bold uppercase text-[#F5F5F5]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {detailsModalPlan.name}
              </h3>
              {detailsModalPlan.description && (
                <p className="text-xs text-[#A3A3A3] pt-1">{detailsModalPlan.description}</p>
              )}
            </div>

            {/* Branch Association */}
            <div className="p-3 rounded-xl bg-[#141416] border border-[#252528] flex items-center gap-2.5 text-xs text-[#A3A3A3] mb-5">
              <Building className="w-4 h-4 text-[#E58A32] shrink-0" />
              <span>
                Facility Access Pass valid at{' '}
                <strong className="text-[#F5F5F5]">
                  {currentBranch?.name || 'Man & Machine Fitness'} ({currentBranch?.city || 'Selected Location'})
                </strong>
              </span>
            </div>

            {/* Itemized Pricing Breakdown */}
            <div className="p-4 rounded-xl bg-[#1C1C1F] border border-[#2E2E2E] space-y-2 mb-6">
              <span className="text-[10px] font-mono uppercase text-[#A3A3A3] tracking-wider block mb-1 font-bold">
                PRICING BREAKDOWN
              </span>
              <div className="flex justify-between text-xs text-[#CCCCCC]">
                <span>Base Membership Fee</span>
                <span className="font-mono">₹{detailsModalPlan.basePrice.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-xs text-[#CCCCCC]">
                <span>Registration / Joining Fee</span>
                <span className="font-mono">
                  {detailsModalPlan.joiningFee === 0 ? (
                    <span className="text-emerald-400 font-semibold">Waived (₹0)</span>
                  ) : (
                    `₹${detailsModalPlan.joiningFee.toLocaleString('en-IN')}`
                  )}
                </span>
              </div>
              {detailsModalPlan.discountValue > 0 && (
                <div className="flex justify-between text-xs text-emerald-400 font-semibold">
                  <span>Branch Discount Savings</span>
                  <span className="font-mono">- ₹{detailsModalPlan.discountValue.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="pt-2 border-t border-[#292929] flex justify-between items-baseline">
                <span className="text-xs uppercase font-bold text-[#F5F5F5]">Total Payable Amount</span>
                <span
                  className="text-xl font-bold text-[#E58A32]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  ₹{(detailsModalPlan.finalPrice ?? detailsModalPlan.basePrice).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* All Benefits List */}
            <div className="space-y-3 mb-6">
              <span className="text-[10px] font-mono uppercase text-[#A3A3A3] tracking-wider block font-bold">
                COMPREHENSIVE PRIVILEGES:
              </span>
              <ul className="space-y-2 text-xs text-[#F5F5F5]">
                {(detailsModalPlan.benefits || []).map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#E58A32] shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-[#292929]">
              <button
                type="button"
                onClick={() => setDetailsModalPlan(null)}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#222222] hover:bg-[#2b2b2b] text-[#CCCCCC] transition-colors cursor-pointer text-center"
              >
                CLOSE
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetPlan = detailsModalPlan;
                  setDetailsModalPlan(null);
                  handleChoosePlan(targetPlan);
                }}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] hover:bg-[#F09A43] text-black font-black transition-all shadow-[0_0_20px_rgba(229,138,50,0.3)] flex items-center justify-center gap-1.5 cursor-pointer"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <span>CHOOSE THIS PLAN</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
