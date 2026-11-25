import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building,
  Edit,
  Copy,
  Trash2,
  Power,
  Eye,
  RefreshCw,
  Clock,
  ShieldAlert,
  MoreVertical,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
} from 'lucide-react';
import adminService from '../../services/adminService.js';
import { useAdmin } from '../../components/Admin/AdminLayout.jsx';

export default function MembershipPlans() {
  const { branches, selectedBranch } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Plans and Summary state
  const [plans, setPlans] = useState([]);
  const [summary, setSummary] = useState({
    totalPlans: 0,
    activePlans: 0,
    inactivePlans: 0,
    branchesCovered: 3,
  });

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState(selectedBranch);
  const [planTypeFilter, setPlanTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [durationFilter, setDurationFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals & Bottom Sheets
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [viewingPlanId, setViewingPlanId] = useState(null);
  const [viewingPlanData, setViewingPlanData] = useState(null);
  const [viewingLoading, setViewingLoading] = useState(false);
  const [actionSheetPlan, setActionSheetPlan] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [busyPlanId, setBusyPlanId] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleteWarningModal, setDeleteWarningModal] = useState(null); // { plan, message }

  const defaultBenefitOptions = [
    'Access to all gym equipment',
    'Full Air-Conditioned Facility',
    'Steam Bath Access',
    'Locker Privileges',
    'Certified Trainer Guidance',
    'Complimentary Fitness Assessment',
    'Personalized Nutrition Chart',
    'Free Guest Passes (2/month)',
    '1-on-1 Personal Training Session Included',
  ];

  const getInitialForm = () => {
    const pricing = branches.map((b) => ({
      branchId: b._id,
      branchName: b.city,
      isAvailable: true,
      basePrice: 2000,
      joiningFee: 500,
      discountType: 'NONE',
      discountValue: 0,
    }));

    return {
      name: '',
      code: '',
      description: '',
      planType: 'MONTHLY',
      durationDays: 30,
      isActive: true,
      benefits: [
        'Access to all gym equipment',
        'Full Air-Conditioned Facility',
        'Steam Bath Access',
        'Locker Privileges',
      ],
      customBenefit: '',
      branchPricing:
        pricing.length > 0
          ? pricing
          : [
              { branchId: '', branchName: 'Kovilpatti', isAvailable: true, basePrice: 2000, joiningFee: 500, discountType: 'NONE', discountValue: 0 },
              { branchId: '', branchName: 'Karur', isAvailable: true, basePrice: 2200, joiningFee: 500, discountType: 'NONE', discountValue: 0 },
              { branchId: '', branchName: 'Sivakasi', isAvailable: true, basePrice: 2100, joiningFee: 500, discountType: 'NONE', discountValue: 0 },
            ],
    };
  };

  const [formData, setFormData] = useState(getInitialForm());

  useEffect(() => {
    setBranchFilter(selectedBranch);
    setPage(1);
  }, [selectedBranch]);

  const anyOverlayOpen = Boolean(
    isCreateModalOpen ||
      viewingPlanId ||
      actionSheetPlan ||
      confirmDialog ||
      deleteWarningModal
  );

  // Lock background scroll whenever any modal/sheet is open
  useEffect(() => {
    if (!anyOverlayOpen) return undefined;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [anyOverlayOpen]);

  // Close topmost overlay on Escape
  useEffect(() => {
    if (!anyOverlayOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (deleteWarningModal) setDeleteWarningModal(null);
      else if (confirmDialog) setConfirmDialog(null);
      else if (isCreateModalOpen) setIsCreateModalOpen(false);
      else if (actionSheetPlan) setActionSheetPlan(null);
      else if (viewingPlanId) {
        setViewingPlanId(null);
        setViewingPlanData(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    anyOverlayOpen,
    deleteWarningModal,
    confirmDialog,
    isCreateModalOpen,
    actionSheetPlan,
    viewingPlanId,
  ]);

  const showFeedback = (type, message) => {
    setActionFeedback({ type, message });
    setTimeout(() => {
      setActionFeedback((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getMembershipPlans({
        search: appliedSearch,
        branchId: branchFilter,
        planType: planTypeFilter,
        status: statusFilter,
        durationDays: durationFilter,
        page,
        limit: pageSize,
      });

      setPlans(res.plans || []);
      if (res.summary) {
        setSummary(res.summary);
      }
      setTotalPages(Math.max(1, res.totalPages || 1));
      setTotalCount(res.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch membership plans');
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, branchFilter, planTypeFilter, statusFilter, durationFilter, page, pageSize]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(search.trim());
  };

  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
    setAppliedSearch('');
  };

  const handleResetFilters = () => {
    setSearch('');
    setAppliedSearch('');
    setBranchFilter('ALL');
    setPlanTypeFilter('ALL');
    setStatusFilter('ALL');
    setDurationFilter('ALL');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    appliedSearch ||
      branchFilter !== 'ALL' ||
      planTypeFilter !== 'ALL' ||
      statusFilter !== 'ALL' ||
      durationFilter !== 'ALL'
  );

  // Helper to calculate preview price for a branch in form (matches backend calculateBranchFinalPrice)
  const getBranchPreviewPrice = (bp) => {
    const base = Math.max(0, Number(bp.basePrice) || 0);
    const fee = Math.max(0, Number(bp.joiningFee) || 0);
    const disc = Math.max(0, Number(bp.discountValue) || 0);

    let discountAmt = 0;
    if (bp.discountType === 'FIXED') {
      discountAmt = Math.min(disc, base + fee);
    } else if (bp.discountType === 'PERCENTAGE') {
      const pct = Math.min(100, disc);
      discountAmt = Math.round((base * pct) / 100);
    }

    return Math.max(0, base + fee - discountAmt);
  };

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormError(null);

    const pricing = branches.map((b) => ({
      branchId: b._id,
      branchName: b.city,
      isAvailable: true,
      basePrice: 2000,
      joiningFee: 500,
      discountType: 'NONE',
      discountValue: 0,
    }));

    setFormData({
      name: '',
      code: '',
      description: '',
      planType: 'MONTHLY',
      durationDays: 30,
      isActive: true,
      benefits: [
        'Access to all gym equipment',
        'Full Air-Conditioned Facility',
        'Steam Bath Access',
        'Locker Privileges',
      ],
      customBenefit: '',
      branchPricing: pricing,
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (plan) => {
    setActionSheetPlan(null);
    setEditingPlan(plan);
    setFormError(null);

    const pricing = branches.map((b) => {
      const existing = plan.branchPricing?.find(
        (bp) => (bp.branchId?._id || bp.branchId) === b._id
      );

      return {
        branchId: b._id,
        branchName: b.city,
        isAvailable: existing ? existing.isAvailable : false,
        basePrice: existing ? existing.basePrice : plan.price || 0,
        joiningFee: existing ? existing.joiningFee : 0,
        discountType: existing ? existing.discountType : 'NONE',
        discountValue: existing ? existing.discountValue : 0,
      };
    });

    setFormData({
      name: plan.name,
      code: plan.code || '',
      description: plan.description || '',
      planType: plan.planType || 'MONTHLY',
      durationDays: plan.durationDays || plan.durationMonths * 30 || 30,
      isActive: Boolean(plan.isActive),
      benefits: plan.benefits && plan.benefits.length > 0 ? [...plan.benefits] : [...(plan.features || [])],
      customBenefit: '',
      branchPricing: pricing,
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenView = async (id) => {
    setActionSheetPlan(null);
    setViewingPlanId(id);
    setViewingLoading(true);
    try {
      const res = await adminService.getMembershipPlanById(id);
      setViewingPlanData(res);
    } catch (err) {
      setViewingPlanId(null);
      showFeedback('error', err.message || 'Failed to load plan details');
    } finally {
      setViewingLoading(false);
    }
  };

  const handleSubmitPlan = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      if (!formData.name.trim()) {
        throw new Error('Please enter a plan name.');
      }
      if (!formData.durationDays || Number(formData.durationDays) < 1) {
        throw new Error('Please enter a valid positive duration in days.');
      }

      const hasAvailable = formData.branchPricing.some((bp) => bp.isAvailable);
      if (!hasAvailable) {
        throw new Error('At least one branch must be enabled for this membership plan.');
      }

      for (const bp of formData.branchPricing) {
        if (bp.isAvailable) {
          if (Number(bp.basePrice) < 0) {
            throw new Error(`Base price for ${bp.branchName} cannot be negative.`);
          }
          if (Number(bp.joiningFee) < 0) {
            throw new Error(`Joining fee for ${bp.branchName} cannot be negative.`);
          }
          if (bp.discountType === 'PERCENTAGE' && Number(bp.discountValue) > 100) {
            throw new Error(`Discount percentage for ${bp.branchName} cannot exceed 100%.`);
          }
        }
      }

      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        description: formData.description.trim(),
        planType: formData.planType,
        durationDays: Number(formData.durationDays),
        isActive: Boolean(formData.isActive),
        benefits: formData.benefits,
        branchPricing: formData.branchPricing.map((bp) => ({
          branchId: bp.branchId,
          isAvailable: bp.isAvailable,
          basePrice: Number(bp.basePrice) || 0,
          joiningFee: Number(bp.joiningFee) || 0,
          discountType: bp.discountType,
          discountValue: Number(bp.discountValue) || 0,
        })),
      };

      if (editingPlan) {
        await adminService.updateMembershipPlan(editingPlan._id, payload);
        showFeedback('success', `Plan "${payload.name}" updated. Existing client passes keep their historical pricing.`);
      } else {
        await adminService.createMembershipPlan(payload);
        setPage(1);
        showFeedback('success', `Membership plan "${payload.name}" created.`);
      }

      setIsCreateModalOpen(false);
      await fetchPlans();
    } catch (err) {
      setFormError(err.message || 'Failed to save membership plan');
    } finally {
      setFormSubmitting(false);
    }
  };

  const executeToggleStatus = async (planId, nextState, planName = 'plan') => {
    try {
      setBusyPlanId(planId);
      await adminService.toggleMembershipPlanStatus(planId, nextState);
      showFeedback('success', `"${planName}" ${nextState ? 'activated' : 'deactivated'}.`);
      await fetchPlans();
    } catch (err) {
      showFeedback('error', err.message || 'Failed to update plan status');
    } finally {
      setBusyPlanId(null);
    }
  };

  const requestToggleStatus = (plan) => {
    setActionSheetPlan(null);
    const nextState = !plan.isActive;
    setConfirmDialog({
      title: nextState ? 'Activate Membership Plan' : 'Deactivate Membership Plan',
      confirmLabel: nextState ? 'Activate Plan' : 'Deactivate Plan',
      tone: nextState ? 'emerald' : 'amber',
      description: nextState
        ? `Activate "${plan.name}" so branches and clients can select it?`
        : `Deactivate "${plan.name}"? New purchases will be prevented while existing client memberships remain intact.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        await executeToggleStatus(plan._id, nextState, plan.name);
      },
    });
  };

  const requestDuplicate = (plan) => {
    setActionSheetPlan(null);
    setConfirmDialog({
      title: 'Duplicate Membership Plan',
      confirmLabel: 'Duplicate Plan',
      tone: 'red',
      description: `Create a duplicate template copy of "${plan.name}" with all branch pricing rules?`,
      onConfirm: async () => {
        try {
          setBusyPlanId(plan._id);
          await adminService.duplicateMembershipPlan(plan._id);
          setConfirmDialog(null);
          showFeedback('success', `Duplicated "${plan.name}".`);
          await fetchPlans();
        } catch (err) {
          setConfirmDialog(null);
          showFeedback('error', err.message || 'Failed to duplicate plan');
        } finally {
          setBusyPlanId(null);
        }
      },
    });
  };

  const requestDelete = (plan) => {
    setActionSheetPlan(null);
    setConfirmDialog({
      title: 'Delete Membership Plan',
      confirmLabel: 'Delete Plan',
      tone: 'red',
      description: `Delete "${plan.name}"? If any active or historical memberships or payment transactions reference this plan, deletion will be safely blocked.`,
      onConfirm: async () => {
        try {
          setBusyPlanId(plan._id);
          await adminService.deleteMembershipPlan(plan._id);
          setConfirmDialog(null);
          showFeedback('success', `Membership plan "${plan.name}" deleted.`);
          if (plans.length === 1 && page > 1) {
            setPage((p) => p - 1);
          } else {
            await fetchPlans();
          }
        } catch (err) {
          setConfirmDialog(null);
          if (
            err.message &&
            (err.message.includes('linked to member records') ||
              err.message.includes('payment transactions') ||
              err.message.includes('Cannot delete plan'))
          ) {
            setDeleteWarningModal({
              plan,
              message: err.message,
            });
          } else {
            showFeedback('error', err.message || 'Failed to delete plan');
          }
        } finally {
          setBusyPlanId(null);
        }
      },
    });
  };

  const toggleBenefit = (item) => {
    setFormData((prev) => {
      const exists = prev.benefits.includes(item);
      return {
        ...prev,
        benefits: exists ? prev.benefits.filter((b) => b !== item) : [...prev.benefits, item],
      };
    });
  };

  const handleAddCustomBenefit = (e) => {
    e.preventDefault();
    const val = formData.customBenefit.trim();
    if (!val) return;
    if (!formData.benefits.includes(val)) {
      setFormData((prev) => ({
        ...prev,
        benefits: [...prev.benefits, val],
        customBenefit: '',
      }));
    } else {
      setFormData((prev) => ({ ...prev, customBenefit: '' }));
    }
  };

  const updateBranchField = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.branchPricing];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, branchPricing: updated };
    });
  };

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const getCityPricing = (plan, cityName) => {
    if (!plan.branchPricing || plan.branchPricing.length === 0) {
      return { isAvailable: Boolean(plan.isActive && plan.price !== undefined), finalPrice: plan.price || 0, basePrice: plan.price || 0, joiningFee: 0 };
    }

    const bp = plan.branchPricing.find((b) => {
      const name = b.branchId?.city || b.branchId?.name || '';
      return name.toLowerCase().includes(cityName.toLowerCase());
    });

    if (!bp) return { isAvailable: false };
    return bp;
  };

  // Normalized list of branches + actual DB pricing for mobile cards
  const getPlanBranchRows = (plan) => {
    if (branches.length > 0) {
      return branches.map((b) => {
        const bp = plan.branchPricing?.find(
          (item) => (item.branchId?._id || item.branchId) === b._id
        );
        return {
          key: b._id,
          city: b.city,
          isAvailable: Boolean(bp?.isAvailable),
          basePrice: bp?.basePrice || 0,
          joiningFee: bp?.joiningFee || 0,
          discountType: bp?.discountType || 'NONE',
          discountValue: bp?.discountValue || 0,
          finalPrice: bp?.finalPrice ?? 0,
        };
      });
    }
    return (plan.branchPricing || []).map((bp, idx) => ({
      key: bp.branchId?._id || idx,
      city: bp.branchId?.city || bp.branchId?.name || `Branch ${idx + 1}`,
      isAvailable: Boolean(bp.isAvailable),
      basePrice: bp.basePrice || 0,
      joiningFee: bp.joiningFee || 0,
      discountType: bp.discountType || 'NONE',
      discountValue: bp.discountValue || 0,
      finalPrice: bp.finalPrice ?? 0,
    }));
  };

  const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(totalCount, page * pageSize);

  return (
    <div className="space-y-5 sm:space-y-6 min-w-0">
      {/* ── HEADER & CREATE CTA ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono uppercase text-[#F03B2E] tracking-wider">
              PRICING &amp; MEMBERSHIP TIERS
            </span>
            <span className="text-[#303030]">•</span>
            <span className="text-xs text-[#B8B8B8] font-mono">Branch-Specific Rates</span>
          </div>
          <h2 className="mm-page-title text-2xl sm:text-3xl mt-1">
            MEMBERSHIP PLANS CATALOG
          </h2>
          <p className="text-xs sm:text-sm text-[#B8B8B8] mt-0.5">
            Configure gym pass templates with independent branch pricing for Kovilpatti, Karur, and Sivakasi.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="min-h-[44px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#F03B2E] hover:bg-[#FF493B] text-white transition-all cursor-pointer shadow-lg shadow-[#F03B2E]/15 w-full sm:w-auto shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Add Membership Plan</span>
        </button>
      </div>

      {/* ── ACTION FEEDBACK BANNER ── */}
      {actionFeedback && (
        <div
          role="status"
          className={`rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs border ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-200'
              : 'bg-[#F03B2E]/10 border-[#F03B2E]/40 text-[#FF6A5E]'
          }`}
        >
          <span className="min-w-0 break-words">{actionFeedback.message}</span>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            aria-label="Dismiss notification"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-black/20 shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── 4 SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono uppercase text-[#B8B8B8]">TOTAL PLANS</span>
            <div className="w-8 h-8 rounded-lg bg-[#202020] border border-[#303030] flex items-center justify-center text-[#F5F5F5] shrink-0">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="mm-kpi-value text-2xl sm:text-3xl block">{summary.totalPlans}</span>
            <span className="text-[11px] text-[#B8B8B8]">Plan Templates</span>
          </div>
        </div>

        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono uppercase text-[#B8B8B8]">ACTIVE</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="font-display text-2xl sm:text-3xl font-bold text-emerald-400 block">
              {summary.activePlans}
            </span>
            <span className="text-[11px] text-[#B8B8B8]">Available</span>
          </div>
        </div>

        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono uppercase text-[#B8B8B8]">INACTIVE</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="font-display text-2xl sm:text-3xl font-bold text-amber-400 block">
              {summary.inactivePlans}
            </span>
            <span className="text-[11px] text-[#B8B8B8]">Paused</span>
          </div>
        </div>

        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono uppercase text-[#B8B8B8]">BRANCHES</span>
            <div className="w-8 h-8 rounded-lg bg-[#F03B2E]/10 border border-[#F03B2E]/20 flex items-center justify-center text-[#F03B2E] shrink-0">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="mm-kpi-value text-2xl sm:text-3xl block">
              {summary.branchesCovered} / {branches.length || 3}
            </span>
            <span className="text-[11px] text-[#B8B8B8] truncate block">Covered Hubs</span>
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div className="bg-[#111111] border border-[#303030] rounded-2xl p-3.5 sm:p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-[#858585] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plans by name or code..."
              aria-label="Search membership plans by name"
              className="w-full min-h-[44px] pl-10 pr-10 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] placeholder-[#858585] focus:border-[#F03B2E] focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear search"
                className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[#858585] hover:text-[#F5F5F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase tracking-wider text-[#F5F5F5] cursor-pointer shrink-0"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Branch Filter */}
          <select
            aria-label="Filter plans by branch"
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setPage(1);
            }}
            className="w-full min-h-[44px] px-3 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.city} Branch
              </option>
            ))}
          </select>

          {/* Plan Type Filter */}
          <select
            aria-label="Filter plans by type"
            value={planTypeFilter}
            onChange={(e) => {
              setPlanTypeFilter(e.target.value);
              setPage(1);
            }}
            className="w-full min-h-[44px] px-3 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Plan Types</option>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="HALF_YEARLY">Half-Yearly</option>
            <option value="YEARLY">Yearly</option>
            <option value="CUSTOM">Custom Duration</option>
          </select>

          {/* Status Filter */}
          <select
            aria-label="Filter plans by status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full min-h-[44px] px-3 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>

          {/* Duration Filter */}
          <select
            aria-label="Filter plans by duration"
            value={durationFilter}
            onChange={(e) => {
              setDurationFilter(e.target.value);
              setPage(1);
            }}
            className="w-full min-h-[44px] px-3 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Durations</option>
            <option value="30">30 Days</option>
            <option value="90">90 Days</option>
            <option value="180">180 Days</option>
            <option value="365">365 Days</option>
          </select>
        </div>

        {hasActiveFilters && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#181818] hover:bg-[#202020] border border-[#303030] text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] hover:text-[#F5F5F5] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#F03B2E]" />
              <span>Clear Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* ── ERROR NOTICE & RETRY ── */}
      {error && (
        <div className="bg-[#F03B2E]/10 border border-[#F03B2E]/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#FF493B]">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider">Plans Catalog Error</p>
              <p className="text-xs text-[#B8B8B8] break-words">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchPlans}
            className="min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#F03B2E]/20 hover:bg-[#F03B2E]/30 text-xs font-bold uppercase text-[#F5F5F5] cursor-pointer w-full sm:w-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* ── PLANS LIST: DESKTOP TABLE (>= 1024px) & MOBILE/TABLET CARDS (< 1024px) ── */}
      {loading ? (
        <div className="bg-[#181818] border border-[#303030] rounded-2xl py-12 text-center text-xs text-[#B8B8B8] flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#F03B2E]" />
          <span>Loading membership plans...</span>
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-[#181818] border border-[#303030] rounded-2xl py-12 px-4 text-center space-y-3">
          <p className="text-sm font-bold text-[#F5F5F5]">No membership plans found</p>
          <p className="text-xs text-[#858585]">No membership plans match the specified criteria.</p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#202020] border border-[#303030] text-xs font-bold uppercase text-[#F5F5F5] cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── DESKTOP TABLE (>= 1024px, Preserved Design) ── */}
          <div className="hidden lg:block bg-[#181818] border border-[#303030] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#303030] bg-[#111111] text-[11px] font-mono uppercase tracking-wider text-[#B8B8B8]">
                    <th className="py-3.5 px-4 font-semibold">Plan Name</th>
                    <th className="py-3.5 px-4 font-semibold">Type</th>
                    <th className="py-3.5 px-4 font-semibold">Duration</th>
                    <th className="py-3.5 px-4 font-semibold">Kovilpatti Price</th>
                    <th className="py-3.5 px-4 font-semibold">Karur Price</th>
                    <th className="py-3.5 px-4 font-semibold">Sivakasi Price</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold">Last Updated</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#202020] text-xs">
                  {plans.map((p) => {
                    const kovilpatti = getCityPricing(p, 'Kovilpatti');
                    const karur = getCityPricing(p, 'Karur');
                    const sivakasi = getCityPricing(p, 'Sivakasi');
                    const busy = busyPlanId === p._id;

                    return (
                      <tr key={p._id} className="hover:bg-[#202020] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-[#F5F5F5] text-sm">{p.name}</span>
                            <span className="text-[10px] text-[#F03B2E] font-mono mt-0.5">
                              {p.code || 'NO-CODE'} • {p.benefits?.length || p.features?.length || 0} Benefits
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-[#252525] text-[#B8B8B8] font-mono text-[10px] font-bold">
                            {p.planType}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-mono text-[#F5F5F5]">
                            <Clock className="w-3.5 h-3.5 text-[#F03B2E]" />
                            <span>{p.durationDays || p.durationMonths * 30} Days</span>
                          </div>
                        </td>

                        {[kovilpatti, karur, sivakasi].map((bp, idx) => (
                          <td key={idx} className="py-3.5 px-4 font-mono">
                            {bp.isAvailable ? (
                              <div className="flex flex-col">
                                <span className="font-bold text-[#F5F5F5]">{formatINR(bp.finalPrice)}</span>
                                {bp.joiningFee > 0 && (
                                  <span className="text-[10px] text-[#B8B8B8]">
                                    incl. {formatINR(bp.joiningFee)} fee
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-[#F03B2E]/10 text-[#FF493B] border border-[#F03B2E]/20 text-[10px]">
                                Not Available
                              </span>
                            )}
                          </td>
                        ))}

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              p.isActive
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-[#F03B2E]/10 text-[#FF493B] border border-[#F03B2E]/30'
                            }`}
                          >
                            {p.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-[#B8B8B8] font-mono text-[11px]">
                          {new Date(p.updatedAt || p.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenView(p._id)}
                              className="p-1.5 rounded-lg bg-[#252525] hover:bg-[#F03B2E] hover:text-white text-[#B8B8B8] transition-colors cursor-pointer"
                              title="View Plan Details"
                              aria-label={`View ${p.name}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 rounded-lg bg-[#252525] hover:bg-[#F03B2E] hover:text-white text-[#B8B8B8] transition-colors cursor-pointer"
                              title="Edit Pricing & Duration"
                              aria-label={`Edit ${p.name}`}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => requestDuplicate(p)}
                              className="p-1.5 rounded-lg bg-[#252525] hover:bg-[#F03B2E] hover:text-white text-[#B8B8B8] transition-colors cursor-pointer"
                              title="Duplicate Plan"
                              aria-label={`Duplicate ${p.name}`}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => requestToggleStatus(p)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                p.isActive
                                  ? 'bg-[#252525] hover:bg-amber-500/20 text-[#B8B8B8] hover:text-amber-400'
                                  : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                              }`}
                              title={p.isActive ? 'Deactivate Plan' : 'Activate Plan'}
                              aria-label={p.isActive ? `Deactivate ${p.name}` : `Activate ${p.name}`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => requestDelete(p)}
                              className="p-1.5 rounded-lg bg-[#252525] hover:bg-[#F03B2E]/20 text-[#B8B8B8] hover:text-[#FF493B] transition-colors cursor-pointer"
                              title="Delete Plan"
                              aria-label={`Delete ${p.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── MOBILE & TABLET MEMBERSHIP PLAN CARDS (< 1024px) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 lg:hidden">
            {plans.map((p) => {
              const busy = busyPlanId === p._id;
              const branchRows = getPlanBranchRows(p);
              const availableCount = branchRows.filter((b) => b.isAvailable).length;
              const benefitsList = p.benefits?.length ? p.benefits : p.features || [];

              return (
                <article
                  key={p._id}
                  className="bg-[#181818] border border-[#303030] rounded-xl p-4 flex flex-col justify-between gap-3.5 min-w-0"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <h3 className="font-display text-base sm:text-lg font-bold uppercase text-[#F5F5F5] leading-tight truncate">
                        {p.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-[#202020] border border-[#303030] text-[#B8B8B8] font-mono text-[10px] font-bold uppercase">
                          {p.planType}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                            p.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-[#F03B2E]/15 text-[#FF493B] border-[#F03B2E]/35'
                          }`}
                        >
                          {p.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setActionSheetPlan(p)}
                      aria-label={`Open actions for ${p.name}`}
                      aria-haspopup="dialog"
                      className="min-w-[44px] min-h-[44px] -mr-1.5 -mt-1 flex items-center justify-center rounded-lg bg-[#202020] hover:bg-[#303030] text-[#F5F5F5] border border-[#303030] hover:border-[#F03B2E] cursor-pointer shrink-0 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Plan Specs Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#B8B8B8] border-t border-[#252525] pt-2.5">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[#F5F5F5] font-semibold">
                      <Clock className="w-3.5 h-3.5 text-[#F03B2E]" />
                      {p.durationDays || p.durationMonths * 30} Days
                    </span>
                    <span className="text-[11px] font-mono text-[#858585]">
                      {availableCount}/{branchRows.length} Branches • Updated{' '}
                      {new Date(p.updatedAt || p.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  </div>

                  {/* Branch-Specific Pricing Block (Compact & Real DB Values) */}
                  <div className="rounded-lg bg-[#111111] border border-[#252525] divide-y divide-[#252525]">
                    {branchRows.map((br) => (
                      <div
                        key={br.key}
                        className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-mono font-bold uppercase text-[#B8B8B8] block truncate">
                            {br.city}
                          </span>
                          {br.isAvailable && (br.joiningFee > 0 || (br.discountType !== 'NONE' && br.discountValue > 0)) && (
                            <span className="text-[10px] font-mono text-[#858585] block">
                              {br.joiningFee > 0 ? `+${formatINR(br.joiningFee)} join fee` : ''}
                              {br.joiningFee > 0 && br.discountType !== 'NONE' && br.discountValue > 0 ? ' • ' : ''}
                              {br.discountType === 'PERCENTAGE' && br.discountValue > 0
                                ? `${br.discountValue}% off`
                                : br.discountType === 'FIXED' && br.discountValue > 0
                                ? `-${formatINR(br.discountValue)}`
                                : ''}
                            </span>
                          )}
                        </div>

                        {br.isAvailable ? (
                          <span className="font-mono font-bold text-sm text-[#F5F5F5] shrink-0">
                            {formatINR(br.finalPrice)}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-[#F03B2E]/10 text-[#FF493B] border border-[#F03B2E]/25 font-mono text-[10px] font-semibold shrink-0">
                            Not Available
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Benefits Summary */}
                  {benefitsList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {benefitsList.slice(0, 3).map((b, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-[#111111] border border-[#252525] text-[10px] text-[#B8B8B8] truncate max-w-full"
                        >
                          {b}
                        </span>
                      ))}
                      {benefitsList.length > 3 && (
                        <span className="px-2 py-0.5 rounded bg-[#202020] text-[10px] font-mono text-[#F03B2E]">
                          +{benefitsList.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Card Footer */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[#252525]">
                    <button
                      type="button"
                      onClick={() => handleOpenView(p._id)}
                      className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase tracking-wider text-[#F5F5F5] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#B8B8B8]" />
                      <span>Details</span>
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setActionSheetPlan(p)}
                      className="flex-1 min-h-[44px] px-3.5 py-2 rounded-lg bg-[#F03B2E]/15 hover:bg-[#F03B2E]/25 border border-[#F03B2E]/40 text-xs font-bold uppercase tracking-wider text-[#F5F5F5] inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#F03B2E]" />
                      <span>{busy ? 'Working...' : 'Manage Plan'}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* ── PAGINATION BAR ── */}
          <div className="bg-[#181818] border border-[#303030] rounded-xl px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#B8B8B8]">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <span>
                Showing <strong className="text-[#F5F5F5]">{startIndex}–{endIndex}</strong> of{' '}
                <strong className="text-[#F5F5F5]">{totalCount}</strong> plans
              </span>
              <label className="inline-flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-[#858585]">Per page</span>
                <select
                  aria-label="Plans per page"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-[#111111] border border-[#303030] rounded-lg px-2.5 py-1.5 min-h-[36px] text-xs text-[#F5F5F5] cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase tracking-wider text-[#F5F5F5] inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <span className="font-mono text-xs text-[#F5F5F5] px-2 whitespace-nowrap">
                Page {page} / {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase tracking-wider text-[#F5F5F5] inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── MOBILE PLAN ACTION BOTTOM SHEET ── */}
      {actionSheetPlan && (
        <div
          id="plan-action-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={`Manage ${actionSheetPlan.name}`}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setActionSheetPlan(null)}
        >
          <div
            className="bg-[#181818] border-t sm:border border-[#303030] rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[88dvh] flex flex-col overflow-hidden shadow-2xl pb-[env(safe-area-inset-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pt-2.5 sm:pt-4 px-5 pb-4 border-b border-[#252525] shrink-0">
              <div className="w-10 h-1 bg-[#303030] rounded-full mx-auto mb-3 sm:hidden" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-label text-[#F03B2E] block mb-0.5">PLAN ACTIONS</span>
                  <h3 className="mm-page-title text-lg sm:text-xl truncate">
                    {actionSheetPlan.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="px-2 py-0.5 rounded bg-[#202020] border border-[#303030] text-[#B8B8B8] font-mono text-[10px] font-bold">
                      {actionSheetPlan.planType} • {actionSheetPlan.durationDays || 30}d
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                        actionSheetPlan.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-[#F03B2E]/15 text-[#FF493B] border-[#F03B2E]/35'
                      }`}
                    >
                      {actionSheetPlan.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActionSheetPlan(null)}
                  aria-label="Close action menu"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#202020] text-[#B8B8B8] hover:text-white border border-[#303030] cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto overscroll-contain space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleOpenView(actionSheetPlan._id)}
                  className="min-h-[48px] px-3 py-2.5 rounded-xl bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center gap-2 cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-[#F03B2E] shrink-0" />
                  <span className="truncate">View Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(actionSheetPlan)}
                  className="min-h-[48px] px-3 py-2.5 rounded-xl bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center gap-2 cursor-pointer"
                >
                  <Edit className="w-4 h-4 text-[#F03B2E] shrink-0" />
                  <span className="truncate">Edit Plan</span>
                </button>

                <button
                  type="button"
                  onClick={() => requestDuplicate(actionSheetPlan)}
                  className="min-h-[48px] px-3 py-2.5 rounded-xl bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center gap-2 cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-[#F03B2E] shrink-0" />
                  <span className="truncate">Duplicate Plan</span>
                </button>

                <button
                  type="button"
                  onClick={() => requestToggleStatus(actionSheetPlan)}
                  className={`min-h-[48px] px-3 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer ${
                    actionSheetPlan.isActive
                      ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/35 text-amber-300'
                      : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/35 text-emerald-400'
                  }`}
                >
                  <Power className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {actionSheetPlan.isActive ? 'Deactivate' : 'Activate'}
                  </span>
                </button>
              </div>

              <div className="pt-2 border-t border-[#252525]">
                <button
                  type="button"
                  onClick={() => requestDelete(actionSheetPlan)}
                  className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-[#F03B2E]/12 hover:bg-[#F03B2E]/25 border border-[#F03B2E]/40 text-xs font-bold uppercase tracking-wider text-[#FF493B] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>Delete Plan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRMATION DIALOG ── */}
      {confirmDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={confirmDialog.title}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setConfirmDialog(null)}
        >
          <div
            className="bg-[#181818] border-t sm:border border-[#303030] rounded-t-2xl sm:rounded-xl w-full sm:max-w-md p-5 sm:p-6 space-y-4 shadow-2xl pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-label text-[#F03B2E] block mb-1">CONFIRM ACTION</span>
                <h3 className="mm-page-title text-lg sm:text-xl">{confirmDialog.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                aria-label="Close confirmation dialog"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#202020] text-[#B8B8B8] hover:text-white border border-[#303030] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[#B8B8B8] leading-relaxed">
              {confirmDialog.description}
            </p>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="min-h-[44px] px-4 py-2 rounded-lg bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase text-[#B8B8B8] cursor-pointer w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`min-h-[44px] px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-white cursor-pointer w-full sm:w-auto ${
                  confirmDialog.tone === 'emerald'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : confirmDialog.tone === 'amber'
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-[#F03B2E] hover:bg-[#FF493B]'
                }`}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT PLAN MODAL (BOTTOM SHEET ON MOBILE) ── */}
      {isCreateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editingPlan ? `Edit ${editingPlan.name}` : 'Create New Membership Plan'}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="bg-[#181818] border-t sm:border border-[#303030] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl pb-[env(safe-area-inset-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="px-5 py-4 border-b border-[#303030] flex items-start justify-between gap-3 shrink-0 bg-[#181818]">
              <div className="min-w-0">
                <span className="font-label text-[#F03B2E] block mb-0.5">
                  {editingPlan ? 'EDIT PLAN TEMPLATE' : 'NEW PLAN TEMPLATE'}
                </span>
                <h3 className="mm-page-title text-lg sm:text-xl truncate">
                  {editingPlan ? `Edit: ${editingPlan.name}` : 'Create Membership Plan'}
                </h3>
                <p className="text-[11px] text-[#B8B8B8] mt-0.5">
                  Changes affect future enrollments only; existing memberships keep their historical price snapshot.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Close modal"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#202020] text-[#B8B8B8] hover:text-white border border-[#303030] cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Independently Scrollable Form + Sticky Footer */}
            <form onSubmit={handleSubmitPlan} className="flex flex-col flex-1 min-h-0">
              <div className="p-5 overflow-y-auto overscroll-contain space-y-6 flex-1">
                {formError && (
                  <div className="p-3 rounded-xl bg-[#F03B2E]/10 border border-[#F03B2E] text-xs text-[#F5F5F5] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#F03B2E] shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* SECTION A: BASIC INFORMATION */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-mono uppercase text-[#F03B2E] font-bold tracking-wider">
                      1. Basic Plan Specifications
                    </h4>

                    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111111] border border-[#303030] cursor-pointer select-none min-h-[36px]">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 rounded accent-[#F03B2E]"
                      />
                      <span className="text-[11px] font-mono uppercase text-[#F5F5F5]">
                        {formData.isActive ? 'Plan Active' : 'Plan Inactive'}
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[11px] font-mono text-[#B8B8B8] uppercase block mb-1">
                        Plan Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. 3 Months Transformation Pro"
                        className="w-full min-h-[44px] px-3 py-2 bg-[#111111] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-[#B8B8B8] uppercase block mb-1">
                        Plan Code (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="e.g. MM-3M-PRO"
                        className="w-full min-h-[44px] px-3 py-2 bg-[#111111] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] font-mono uppercase focus:border-[#F03B2E] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-[#B8B8B8] uppercase block mb-1">
                        Plan Type
                      </label>
                      <select
                        value={formData.planType}
                        onChange={(e) => {
                          const type = e.target.value;
                          let defaultDays = Number(formData.durationDays) || 30;
                          if (type === 'MONTHLY') defaultDays = 30;
                          else if (type === 'QUARTERLY') defaultDays = 90;
                          else if (type === 'HALF_YEARLY') defaultDays = 180;
                          else if (type === 'YEARLY') defaultDays = 365;
                          setFormData({ ...formData, planType: type, durationDays: defaultDays });
                        }}
                        className="w-full min-h-[44px] px-3 py-2 bg-[#111111] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none cursor-pointer"
                      >
                        <option value="MONTHLY">Monthly (30 Days)</option>
                        <option value="QUARTERLY">Quarterly (90 Days)</option>
                        <option value="HALF_YEARLY">Half-Yearly (180 Days)</option>
                        <option value="YEARLY">Yearly (365 Days)</option>
                        <option value="CUSTOM">Custom Duration</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-[#B8B8B8] uppercase block mb-1">
                        Duration in Days *
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={formData.durationDays}
                        onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                        className="w-full min-h-[44px] px-3 py-2 bg-[#111111] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] font-mono focus:border-[#F03B2E] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-[#B8B8B8] uppercase block mb-1">
                      Plan Description
                    </label>
                    <textarea
                      rows={2}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief overview of who this pass is for and included privileges..."
                      className="w-full px-3 py-2 bg-[#111111] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                    />
                  </div>
                </div>

                {/* SECTION B: BENEFITS */}
                <div className="space-y-3 border-t border-[#303030] pt-4">
                  <h4 className="text-xs font-mono uppercase text-[#F03B2E] font-bold tracking-wider">
                    2. Included Amenities &amp; Benefits
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {defaultBenefitOptions.map((opt) => {
                      const isChecked = formData.benefits.includes(opt);
                      return (
                        <label
                          key={opt}
                          className={`flex items-center gap-2.5 p-2.5 min-h-[44px] rounded-xl border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-[#F03B2E]/10 border-[#F03B2E]/40 text-[#F5F5F5]'
                              : 'bg-[#111111] border-[#252525] text-[#B8B8B8] hover:text-[#F5F5F5]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleBenefit(opt)}
                            className="w-4 h-4 rounded accent-[#F03B2E]"
                          />
                          <span className="text-xs select-none">{opt}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <input
                      type="text"
                      value={formData.customBenefit}
                      onChange={(e) => setFormData({ ...formData, customBenefit: e.target.value })}
                      placeholder="Add custom benefit..."
                      className="flex-1 min-h-[44px] px-3 py-2 bg-[#111111] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomBenefit}
                      className="min-h-[44px] px-4 py-2 bg-[#252525] hover:bg-[#303030] text-[#F5F5F5] text-xs font-semibold rounded-xl cursor-pointer shrink-0"
                    >
                      + Add Benefit
                    </button>
                  </div>
                </div>

                {/* SECTION C: BRANCH AVAILABILITY & INDEPENDENT PRICING */}
                <div className="space-y-4 border-t border-[#303030] pt-4">
                  <div>
                    <h4 className="text-xs font-mono uppercase text-[#F03B2E] font-bold tracking-wider">
                      3. Branch Availability &amp; Independent Pricing
                    </h4>
                    <p className="text-[11px] text-[#B8B8B8] mt-0.5">
                      Configure pricing, joining fees, and discounts for each branch independently.
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    {formData.branchPricing.map((bp, idx) => {
                      const finalPreview = getBranchPreviewPrice(bp);

                      return (
                        <div
                          key={bp.branchId || idx}
                          className={`p-3.5 sm:p-4 rounded-xl border transition-colors ${
                            bp.isAvailable
                              ? 'bg-[#111111] border-[#303030]'
                              : 'bg-[#111111] border-[#202020] opacity-70'
                          }`}
                        >
                          <div className="flex items-center justify-between pb-3 border-b border-[#202020]">
                            <div className="flex items-center gap-2 min-w-0">
                              <Building className="w-4 h-4 text-[#F03B2E] shrink-0" />
                              <span className="font-bold text-sm text-[#F5F5F5] truncate">
                                {bp.branchName} Hub
                              </span>
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer select-none min-h-[36px]">
                              <span className="text-[11px] font-mono uppercase text-[#B8B8B8]">
                                {bp.isAvailable ? 'Available' : 'Disabled'}
                              </span>
                              <input
                                type="checkbox"
                                checked={bp.isAvailable}
                                onChange={(e) => updateBranchField(idx, 'isAvailable', e.target.checked)}
                                className="w-4 h-4 rounded accent-[#F03B2E]"
                              />
                            </label>
                          </div>

                          {bp.isAvailable && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
                              <div>
                                <label className="text-[10px] font-mono text-[#B8B8B8] uppercase block mb-1">
                                  Base Price (₹) *
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  required
                                  value={bp.basePrice}
                                  onChange={(e) => updateBranchField(idx, 'basePrice', e.target.value)}
                                  className="w-full min-h-[42px] px-2.5 py-1.5 bg-[#181818] border border-[#303030] rounded-lg text-xs font-mono text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-mono text-[#B8B8B8] uppercase block mb-1">
                                  Joining Fee (₹)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={bp.joiningFee}
                                  onChange={(e) => updateBranchField(idx, 'joiningFee', e.target.value)}
                                  className="w-full min-h-[42px] px-2.5 py-1.5 bg-[#181818] border border-[#303030] rounded-lg text-xs font-mono text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-mono text-[#B8B8B8] uppercase block mb-1">
                                  Discount
                                </label>
                                <div className="flex gap-1.5">
                                  <select
                                    value={bp.discountType}
                                    onChange={(e) => updateBranchField(idx, 'discountType', e.target.value)}
                                    className="min-h-[42px] px-2 py-1.5 bg-[#181818] border border-[#303030] rounded-lg text-[11px] text-[#F5F5F5] focus:outline-none"
                                  >
                                    <option value="NONE">None</option>
                                    <option value="FIXED">Flat ₹</option>
                                    <option value="PERCENTAGE">%</option>
                                  </select>
                                  <input
                                    type="number"
                                    min={0}
                                    disabled={bp.discountType === 'NONE'}
                                    value={bp.discountValue}
                                    onChange={(e) => updateBranchField(idx, 'discountValue', e.target.value)}
                                    className="w-full min-h-[42px] px-2 py-1.5 bg-[#181818] border border-[#303030] rounded-lg text-xs font-mono text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none disabled:opacity-40"
                                  />
                                </div>
                              </div>

                              <div className="bg-[#181818] p-2.5 rounded-lg border border-[#303030] flex flex-col justify-between">
                                <span className="text-[9px] font-mono uppercase text-[#B8B8B8]">
                                  Final Payable Rate
                                </span>
                                <span className="text-base font-bold text-[#F03B2E] font-mono mt-0.5">
                                  {formatINR(finalPreview)}
                                </span>
                                <span className="text-[9px] text-[#858585] font-mono">
                                  Base ₹{bp.basePrice || 0} + Fee ₹{bp.joiningFee || 0}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-5 py-4 border-t border-[#303030] bg-[#181818] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 bg-[#202020] hover:bg-[#303030] text-[#B8B8B8] hover:text-white rounded-xl text-xs font-semibold cursor-pointer w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="min-h-[44px] px-5 py-2 bg-[#F03B2E] hover:bg-[#FF493B] text-white rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer w-full sm:w-auto"
                >
                  {formSubmitting ? 'Saving Plan...' : editingPlan ? 'Save Plan Changes' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── VIEW PLAN DETAILS SHEET ── */}
      {viewingPlanId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Membership Plan Details"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => {
            setViewingPlanId(null);
            setViewingPlanData(null);
          }}
        >
          <div
            className="bg-[#181818] border-t sm:border border-[#303030] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl pb-[env(safe-area-inset-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#303030] flex items-start justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <span className="text-[10px] font-mono text-[#F03B2E] uppercase tracking-wider block">
                  MEMBERSHIP SPECIFICATION DOSSIER
                </span>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <h3 className="mm-page-title text-lg sm:text-xl truncate">
                    {viewingPlanData?.plan?.name || 'Loading Plan...'}
                  </h3>
                  {viewingPlanData?.plan && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                        viewingPlanData.plan.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-[#F03B2E]/15 text-[#FF493B] border-[#F03B2E]/35'
                      }`}
                    >
                      {viewingPlanData.plan.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewingPlanId(null);
                  setViewingPlanData(null);
                }}
                aria-label="Close plan details"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#202020] text-[#B8B8B8] hover:text-white border border-[#303030] cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto overscroll-contain flex-1 space-y-5 text-xs">
              {viewingLoading ? (
                <div className="py-12 text-center text-xs text-[#B8B8B8]">
                  Loading plan specifications...
                </div>
              ) : viewingPlanData?.plan ? (
                <>
                  {/* Meta Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#111111] p-4 rounded-xl border border-[#303030]">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#858585]">Plan Type</span>
                      <p className="font-bold text-[#F5F5F5] mt-0.5">{viewingPlanData.plan.planType}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#858585]">Duration</span>
                      <p className="font-mono text-[#F5F5F5] mt-0.5">
                        {viewingPlanData.plan.durationDays || viewingPlanData.plan.durationMonths * 30} Days
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#858585]">Active Passes</span>
                      <p className="font-bold text-emerald-400 mt-0.5">
                        {viewingPlanData.activeMembershipsCount || 0} Members
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#858585]">Total Passes</span>
                      <p className="font-bold text-[#F03B2E] mt-0.5">
                        {viewingPlanData.totalMembershipsCount || 0} Passes
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#858585]">Created</span>
                      <p className="font-mono text-[#B8B8B8] mt-0.5">
                        {viewingPlanData.plan.createdAt
                          ? new Date(viewingPlanData.plan.createdAt).toLocaleDateString('en-IN')
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#858585]">Updated</span>
                      <p className="font-mono text-[#B8B8B8] mt-0.5">
                        {viewingPlanData.plan.updatedAt
                          ? new Date(viewingPlanData.plan.updatedAt).toLocaleDateString('en-IN')
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {viewingPlanData.plan.description && (
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#858585] block mb-1">
                        Description
                      </span>
                      <p className="text-xs text-[#CCCCCC] bg-[#111111] p-3 rounded-xl border border-[#252525]">
                        {viewingPlanData.plan.description}
                      </p>
                    </div>
                  )}

                  {/* Benefits */}
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#858585] block mb-1.5">
                      Included Benefits
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(viewingPlanData.plan.benefits || viewingPlanData.plan.features || []).map((b, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 p-2.5 rounded-lg bg-[#111111] border border-[#252525]"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-[#F5F5F5] text-xs">{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Branch Breakdown: Table on sm+, Mobile Cards on < sm */}
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#858585] block mb-1.5">
                      Branch Pricing Breakdown
                    </span>

                    <div className="hidden sm:block overflow-x-auto border border-[#303030] rounded-xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#111111] border-b border-[#303030] text-[10px] font-mono uppercase text-[#B8B8B8]">
                            <th className="py-2.5 px-3">Branch</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Base</th>
                            <th className="py-2.5 px-3">Joining Fee</th>
                            <th className="py-2.5 px-3">Discount</th>
                            <th className="py-2.5 px-3 text-right">Final Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#202020] font-mono text-xs">
                          {(viewingPlanData.plan.branchPricing || []).map((bp, i) => (
                            <tr key={i} className="hover:bg-[#202020]">
                              <td className="py-2.5 px-3 font-semibold text-[#F5F5F5]">
                                {bp.branchId?.city || 'HQ Hub'}
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] ${
                                    bp.isAvailable
                                      ? 'bg-emerald-500/10 text-emerald-400'
                                      : 'bg-[#F03B2E]/10 text-[#FF493B]'
                                  }`}
                                >
                                  {bp.isAvailable ? 'AVAILABLE' : 'DISABLED'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-[#CCCCCC]">{formatINR(bp.basePrice)}</td>
                              <td className="py-2.5 px-3 text-[#B8B8B8]">{formatINR(bp.joiningFee)}</td>
                              <td className="py-2.5 px-3 text-[#B8B8B8]">
                                {bp.discountType === 'NONE'
                                  ? 'None'
                                  : bp.discountType === 'PERCENTAGE'
                                  ? `${bp.discountValue}%`
                                  : formatINR(bp.discountValue)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-[#F03B2E]">
                                {bp.isAvailable ? formatINR(bp.finalPrice) : 'Not Available'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="sm:hidden space-y-2">
                      {(viewingPlanData.plan.branchPricing || []).map((bp, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-[#111111] border border-[#252525] space-y-1.5 font-mono text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[#F5F5F5]">
                              {bp.branchId?.city || 'HQ Hub'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] ${
                                bp.isAvailable
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-[#F03B2E]/10 text-[#FF493B]'
                              }`}
                            >
                              {bp.isAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}
                            </span>
                          </div>
                          {bp.isAvailable && (
                            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-[#B8B8B8] pt-1">
                              <span>Base: {formatINR(bp.basePrice)}</span>
                              <span>Fee: {formatINR(bp.joiningFee)}</span>
                              <span>
                                Disc:{' '}
                                {bp.discountType === 'NONE'
                                  ? 'None'
                                  : bp.discountType === 'PERCENTAGE'
                                  ? `${bp.discountValue}%`
                                  : formatINR(bp.discountValue)}
                              </span>
                              <span className="text-[#F03B2E] font-bold">
                                Final: {formatINR(bp.finalPrice)}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {viewingPlanData?.plan && (
              <div className="px-5 py-3.5 border-t border-[#303030] bg-[#181818] flex flex-col-reverse sm:flex-row justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setViewingPlanId(null);
                    setViewingPlanData(null);
                  }}
                  className="min-h-[44px] px-4 py-2 bg-[#202020] hover:bg-[#303030] text-[#B8B8B8] rounded-xl text-xs font-bold uppercase cursor-pointer w-full sm:w-auto"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const p = viewingPlanData.plan;
                    setViewingPlanId(null);
                    setViewingPlanData(null);
                    handleOpenEdit(p);
                  }}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2 bg-[#F03B2E] hover:bg-[#FF493B] text-white font-bold rounded-xl uppercase tracking-wider text-xs cursor-pointer w-full sm:w-auto"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Plan</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SAFE DELETE PROTECTION MODAL ── */}
      {deleteWarningModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Safe Delete Protection"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setDeleteWarningModal(null)}
        >
          <div
            className="bg-[#181818] border-t sm:border border-amber-500/40 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 sm:p-6 shadow-2xl pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-[#F03B2E]" />
              </div>
              <button
                type="button"
                onClick={() => setDeleteWarningModal(null)}
                aria-label="Close protection modal"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#202020] text-[#B8B8B8] hover:text-white border border-[#303030] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="mm-page-title text-lg mb-2">Safe Delete Protection</h3>

            <p className="text-xs text-[#CCCCCC] leading-relaxed mb-3">
              Cannot delete <strong className="text-[#F5F5F5]">"{deleteWarningModal.plan.name}"</strong> because it is linked to existing or historical athlete memberships or payment transactions.
            </p>

            <div className="p-3.5 rounded-xl bg-[#111111] border border-[#303030] text-[11px] text-[#B8B8B8] mb-5 space-y-1">
              <div className="text-[#F03B2E] font-semibold uppercase tracking-wider text-[10px]">
                ✓ Database Integrity Rule
              </div>
              <p>
                Deactivating removes this template from future enrollments while preserving all existing member passes and historical pricing snapshots.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteWarningModal(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#202020] hover:bg-[#303030] text-[#B8B8B8] hover:text-[#F5F5F5] cursor-pointer w-full sm:w-auto"
              >
                Keep Current Status
              </button>
              <button
                type="button"
                onClick={async () => {
                  const p = deleteWarningModal.plan;
                  setDeleteWarningModal(null);
                  await executeToggleStatus(p._id, false, p.name);
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#F03B2E] hover:bg-[#FF493B] text-white cursor-pointer w-full sm:w-auto"
              >
                Deactivate Plan Instead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
