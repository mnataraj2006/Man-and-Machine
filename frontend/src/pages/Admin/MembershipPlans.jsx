import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building,
  Edit,
  Copy,
  Trash2,
  Power,
  Eye,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import adminService from '../../services/adminService.js';
import { useAdmin } from '../../components/Admin/AdminLayout.jsx';

export default function MembershipPlans() {
  const { branches, selectedBranch } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
  const [branchFilter, setBranchFilter] = useState(selectedBranch);
  const [planTypeFilter, setPlanTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [viewingPlanId, setViewingPlanId] = useState(null);
  const [viewingPlanData, setViewingPlanData] = useState(null);
  const [viewingLoading, setViewingLoading] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleteWarningModal, setDeleteWarningModal] = useState(null); // { plan, message }

  // Available benefit options
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

  // Default empty form
  const getInitialForm = () => {
    // Generate pricing for all known branches
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
      benefits: [
        'Access to all gym equipment',
        'Full Air-Conditioned Facility',
        'Steam Bath Access',
        'Locker Privileges',
      ],
      customBenefit: '',
      branchPricing: pricing.length > 0 ? pricing : [
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

  const fetchPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getMembershipPlans({
        search,
        branchId: branchFilter,
        planType: planTypeFilter,
        status: statusFilter,
        page,
        limit: 15,
      });

      setPlans(res.plans || []);
      if (res.summary) {
        setSummary(res.summary);
      }
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch membership plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [page, branchFilter, planTypeFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPlans();
  };

  // Helper to calculate preview price for a branch in form
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

  // Open Create Modal
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

  // Open Edit Modal
  const handleOpenEdit = (plan) => {
    setEditingPlan(plan);
    setFormError(null);

    // Build branch pricing matching current branches list
    const pricing = branches.map((b) => {
      const existing = plan.branchPricing?.find(
        (bp) => bp.branchId?._id === b._id || bp.branchId === b._id
      );

      return {
        branchId: b._id,
        branchName: b.city,
        isAvailable: existing ? existing.isAvailable : true,
        basePrice: existing ? existing.basePrice : plan.price || 2000,
        joiningFee: existing ? existing.joiningFee : 500,
        discountType: existing ? existing.discountType : 'NONE',
        discountValue: existing ? existing.discountValue : 0,
      };
    });

    setFormData({
      name: plan.name,
      code: plan.code || '',
      description: plan.description || '',
      planType: plan.planType || 'MONTHLY',
      durationDays: plan.durationDays || (plan.durationMonths * 30) || 30,
      benefits: plan.benefits && plan.benefits.length > 0 ? [...plan.benefits] : [...(plan.features || [])],
      customBenefit: '',
      branchPricing: pricing,
    });
    setIsCreateModalOpen(true);
  };

  // View Details Drawer/Modal
  const handleOpenView = async (id) => {
    setViewingPlanId(id);
    setViewingLoading(true);
    try {
      const res = await adminService.getMembershipPlanById(id);
      setViewingPlanData(res);
    } catch (err) {
      alert(err.message || 'Failed to load plan details');
    } finally {
      setViewingLoading(false);
    }
  };

  // Handle Form Submission (Create or Edit)
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

      // Check prices
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
      } else {
        await adminService.createMembershipPlan(payload);
      }

      setIsCreateModalOpen(false);
      fetchPlans();
    } catch (err) {
      setFormError(err.message || 'Failed to save membership plan');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle Plan Status
  const handleToggleStatus = async (plan) => {
    const nextState = !plan.isActive;
    const confirmMsg = nextState
      ? `Activate "${plan.name}" so clients can choose it?`
      : `Deactivate "${plan.name}"? New clients will no longer be able to select this plan, but existing memberships remain active.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await adminService.toggleMembershipPlanStatus(plan._id, nextState);
      fetchPlans();
    } catch (err) {
      alert(err.message || 'Failed to update plan status');
    }
  };

  // Duplicate Plan
  const handleDuplicate = async (plan) => {
    if (!window.confirm(`Create a duplicate copy of "${plan.name}"?`)) return;

    try {
      await adminService.duplicateMembershipPlan(plan._id);
      fetchPlans();
    } catch (err) {
      alert(err.message || 'Failed to duplicate plan');
    }
  };

  // Delete Plan
  const handleDelete = async (plan) => {
    if (!window.confirm(`Are you sure you want to delete "${plan.name}"? If any member has ever used this plan, hard deletion will be blocked by system safety controls.`)) return;

    try {
      await adminService.deleteMembershipPlan(plan._id);
      fetchPlans();
    } catch (err) {
      if (err.message && (err.message.includes('linked to member records') || err.message.includes('payment transactions'))) {
        setDeleteWarningModal({
          plan,
          message: err.message,
        });
      } else {
        alert(err.message || 'Failed to delete plan');
      }
    }
  };

  // Benefit toggle helper in form
  const toggleBenefit = (item) => {
    setFormData((prev) => {
      const exists = prev.benefits.includes(item);
      return {
        ...prev,
        benefits: exists ? prev.benefits.filter((b) => b !== item) : [...prev.benefits, item],
      };
    });
  };

  // Add custom benefit
  const handleAddCustomBenefit = (e) => {
    e.preventDefault();
    if (!formData.customBenefit.trim()) return;
    if (!formData.benefits.includes(formData.customBenefit.trim())) {
      setFormData((prev) => ({
        ...prev,
        benefits: [...prev.benefits, prev.customBenefit.trim()],
        customBenefit: '',
      }));
    }
  };

  // Update specific branch pricing field
  const updateBranchField = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.branchPricing];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, branchPricing: updated };
    });
  };

  // Format INR Currency
  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Find price for a city in table
  const getCityPricing = (plan, cityName) => {
    if (!plan.branchPricing || plan.branchPricing.length === 0) {
      // Legacy fallback
      return { isAvailable: plan.isActive, finalPrice: plan.price || 0, basePrice: plan.price || 0 };
    }

    const bp = plan.branchPricing.find((b) => {
      const name = b.branchId?.city || b.branchId?.name || '';
      return name.toLowerCase().includes(cityName.toLowerCase());
    });

    if (!bp) return { isAvailable: false };
    return bp;
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase text-[#E58A32] tracking-wider">
              PRICING &amp; MEMBERSHIP TIERS
            </span>
            <span className="text-[#292929]">•</span>
            <span className="text-xs text-[#A3A3A3] font-mono">Branch-Specific Rates</span>
          </div>
          <h2
            className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#F5F5F5] mt-1"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            MEMBERSHIP PLANS CATALOG
          </h2>
          <p className="text-xs text-[#A3A3A3] mt-0.5">
            Configure flexible gym pass templates with independent branch pricing for Kovilpatti, Karur, and Sivakasi.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] hover:bg-[#F09A43] text-black transition-all cursor-pointer shadow-lg shadow-[#E58A32]/10 shrink-0"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          <Plus className="w-4 h-4" />
          <span>+ Create New Plan</span>
        </button>
      </div>

      {/* ── 4 SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Plans */}
        <div className="bg-[#181818] border border-[#292929] rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-[#E58A32]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#A3A3A3]">TOTAL PLANS</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex flex-col">
            <span
              className="text-2xl sm:text-3xl font-bold text-[#F5F5F5]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {summary.totalPlans}
            </span>
            <span className="text-[11px] text-[#A3A3A3] mt-0.5">Configured Templates</span>
          </div>
        </div>

        {/* Active Plans */}
        <div className="bg-[#181818] border border-[#292929] rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-[#E58A32]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#A3A3A3]">ACTIVE PLANS</span>
            <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex flex-col">
            <span
              className="text-2xl sm:text-3xl font-bold text-green-400"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {summary.activePlans}
            </span>
            <span className="text-[11px] text-[#A3A3A3] mt-0.5">Available to Clients</span>
          </div>
        </div>

        {/* Inactive Plans */}
        <div className="bg-[#181818] border border-[#292929] rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-[#E58A32]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#A3A3A3]">INACTIVE PLANS</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex flex-col">
            <span
              className="text-2xl sm:text-3xl font-bold text-amber-400"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {summary.inactivePlans}
            </span>
            <span className="text-[11px] text-[#A3A3A3] mt-0.5">Archived / Paused</span>
          </div>
        </div>

        {/* Branches Covered */}
        <div className="bg-[#181818] border border-[#292929] rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-[#E58A32]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#A3A3A3]">BRANCHES COVERED</span>
            <div className="w-8 h-8 rounded-lg bg-[#E58A32]/10 border border-[#E58A32]/20 flex items-center justify-center text-[#E58A32]">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex flex-col">
            <span
              className="text-2xl sm:text-3xl font-bold text-[#F5F5F5]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {summary.branchesCovered} / 3
            </span>
            <span className="text-[11px] text-[#A3A3A3] mt-0.5">Kovilpatti, Karur, Sivakasi</span>
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div className="bg-[#141414] border border-[#292929] rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-[#A3A3A3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plans by name, code or description..."
            className="w-full pl-9 pr-4 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] placeholder-[#A3A3A3] focus:border-[#E58A32] focus:outline-none"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Branch Filter */}
          <select
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none cursor-pointer"
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
            value={planTypeFilter}
            onChange={(e) => {
              setPlanTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none cursor-pointer"
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
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* ── ERROR NOTICE & RETRY ── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 text-red-400">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Plans Catalog Error</p>
              <p className="text-xs text-red-300/80">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchPlans}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs font-bold uppercase text-red-300 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* ── MEMBERSHIP PLANS TABLE ── */}
      <div className="bg-[#181818] border border-[#292929] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#292929] bg-[#141414] text-[11px] font-mono uppercase tracking-wider text-[#A3A3A3]">
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
            <tbody className="divide-y divide-[#222222] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#A3A3A3]">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#E58A32]" />
                      <span>Loading membership plans...</span>
                    </div>
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#A3A3A3]">
                    No membership plans match the specified criteria.
                  </td>
                </tr>
              ) : (
                plans.map((p) => {
                  const kovilpatti = getCityPricing(p, 'Kovilpatti');
                  const karur = getCityPricing(p, 'Karur');
                  const sivakasi = getCityPricing(p, 'Sivakasi');

                  return (
                    <tr key={p._id} className="hover:bg-[#1E1E1E] transition-colors">
                      {/* Plan Name & Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#F5F5F5] text-sm">{p.name}</span>
                          <span className="text-[10px] text-[#E58A32] font-mono mt-0.5">
                            {p.code || 'NO-CODE'} • {p.benefits?.length || p.features?.length || 0} Benefits
                          </span>
                        </div>
                      </td>

                      {/* Plan Type */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-[#252525] text-[#A3A3A3] font-mono text-[10px] font-bold">
                          {p.planType}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[#F5F5F5]">
                          <Clock className="w-3.5 h-3.5 text-[#E58A32]" />
                          <span>{p.durationDays || (p.durationMonths * 30)} Days</span>
                        </div>
                      </td>

                      {/* Kovilpatti Price */}
                      <td className="py-3.5 px-4 font-mono">
                        {kovilpatti.isAvailable ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-[#F5F5F5]">{formatINR(kovilpatti.finalPrice)}</span>
                            {kovilpatti.joiningFee > 0 && (
                              <span className="text-[10px] text-[#A3A3A3]">
                                incl. {formatINR(kovilpatti.joiningFee)} fee
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px]">
                            Not Available
                          </span>
                        )}
                      </td>

                      {/* Karur Price */}
                      <td className="py-3.5 px-4 font-mono">
                        {karur.isAvailable ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-[#F5F5F5]">{formatINR(karur.finalPrice)}</span>
                            {karur.joiningFee > 0 && (
                              <span className="text-[10px] text-[#A3A3A3]">
                                incl. {formatINR(karur.joiningFee)} fee
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px]">
                            Not Available
                          </span>
                        )}
                      </td>

                      {/* Sivakasi Price */}
                      <td className="py-3.5 px-4 font-mono">
                        {sivakasi.isAvailable ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-[#F5F5F5]">{formatINR(sivakasi.finalPrice)}</span>
                            {sivakasi.joiningFee > 0 && (
                              <span className="text-[10px] text-[#A3A3A3]">
                                incl. {formatINR(sivakasi.joiningFee)} fee
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px]">
                            Not Available
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            p.isActive
                              ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                              : 'bg-red-500/10 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {p.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>

                      {/* Last Updated */}
                      <td className="py-3.5 px-4 text-[#A3A3A3] font-mono text-[11px]">
                        {new Date(p.updatedAt || p.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details */}
                          <button
                            type="button"
                            onClick={() => handleOpenView(p._id)}
                            className="p-1.5 rounded-lg bg-[#252525] hover:bg-[#E58A32] hover:text-black text-[#A3A3A3] transition-colors"
                            title="View Plan Details & Roster"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg bg-[#252525] hover:bg-[#E58A32] hover:text-black text-[#A3A3A3] transition-colors"
                            title="Edit Pricing & Duration"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Duplicate */}
                          <button
                            type="button"
                            onClick={() => handleDuplicate(p)}
                            className="p-1.5 rounded-lg bg-[#252525] hover:bg-blue-500/20 hover:text-blue-400 text-[#A3A3A3] transition-colors"
                            title="Duplicate Plan"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle status */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(p)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              p.isActive
                                ? 'bg-[#252525] hover:bg-amber-500/20 text-[#A3A3A3] hover:text-amber-400'
                                : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                            }`}
                            title={p.isActive ? 'Deactivate Plan' : 'Activate Plan'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(p)}
                            className="p-1.5 rounded-lg bg-[#252525] hover:bg-red-500/20 text-[#A3A3A3] hover:text-red-400 transition-colors"
                            title="Delete Plan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION BAR ── */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#292929] bg-[#141414] flex items-center justify-between">
            <span className="text-xs text-[#A3A3A3] font-mono">
              Showing page {page} of {totalPages} ({totalCount} total plans)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 bg-[#222222] text-[#F5F5F5] rounded text-xs disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 bg-[#222222] text-[#F5F5F5] rounded text-xs disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── CREATE / EDIT PLAN MODAL ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#181818] border border-[#292929] rounded-2xl w-full max-w-3xl p-6 relative my-8 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-start justify-between border-b border-[#292929] pb-4">
              <div>
                <h3
                  className="text-lg font-bold uppercase text-[#F5F5F5]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {editingPlan ? `Edit Membership Plan: ${editingPlan.name}` : 'Create New Membership Plan'}
                </h3>
                <p className="text-xs text-[#A3A3A3] mt-0.5">
                  Configure branch-specific pricing, joining fees, discounts, and member benefits.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg bg-[#252525] text-[#A3A3A3] hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitPlan} className="space-y-6">
              {/* SECTION A: BASIC INFORMATION */}
              <div className="space-y-4">
                <h4 className="text-xs font-mono uppercase text-[#E58A32] font-bold tracking-wider">
                  1. Basic Plan Specifications
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-mono text-[#A3A3A3] uppercase block mb-1">
                      Plan Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. 3 Months Transformation Pro"
                      className="w-full px-3 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-[#A3A3A3] uppercase block mb-1">
                      Plan Code (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="e.g. MM-3M-PRO"
                      className="w-full px-3 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] font-mono uppercase focus:border-[#E58A32] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-[#A3A3A3] uppercase block mb-1">
                      Plan Type
                    </label>
                    <select
                      value={formData.planType}
                      onChange={(e) => {
                        const type = e.target.value;
                        let defaultDays = 30;
                        if (type === 'MONTHLY') defaultDays = 30;
                        else if (type === 'QUARTERLY') defaultDays = 90;
                        else if (type === 'HALF_YEARLY') defaultDays = 180;
                        else if (type === 'YEARLY') defaultDays = 365;
                        setFormData({ ...formData, planType: type, durationDays: defaultDays });
                      }}
                      className="w-full px-3 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none cursor-pointer"
                    >
                      <option value="MONTHLY">Monthly (30 Days)</option>
                      <option value="QUARTERLY">Quarterly (90 Days)</option>
                      <option value="HALF_YEARLY">Half-Yearly (180 Days)</option>
                      <option value="YEARLY">Yearly (365 Days)</option>
                      <option value="CUSTOM">Custom Duration</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-[#A3A3A3] uppercase block mb-1">
                      Duration in Days *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.durationDays}
                      onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                      className="w-full px-3 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] font-mono focus:border-[#E58A32] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-[#A3A3A3] uppercase block mb-1">
                    Plan Description
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief overview of who this pass is for and included privileges..."
                    className="w-full px-3 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none"
                  />
                </div>
              </div>

              {/* SECTION B: BENEFITS */}
              <div className="space-y-3 border-t border-[#292929] pt-4">
                <h4 className="text-xs font-mono uppercase text-[#E58A32] font-bold tracking-wider">
                  2. Included Amenities &amp; Benefits
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {defaultBenefitOptions.map((opt) => {
                    const isChecked = formData.benefits.includes(opt);
                    return (
                      <label
                        key={opt}
                        onClick={() => toggleBenefit(opt)}
                        className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-[#E58A32]/10 border-[#E58A32]/40 text-[#F5F5F5]'
                            : 'bg-[#121212] border-[#252525] text-[#A3A3A3] hover:text-[#F5F5F5]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-[#E58A32] focus:ring-0"
                        />
                        <span className="text-xs select-none">{opt}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Custom Benefit Input */}
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={formData.customBenefit}
                    onChange={(e) => setFormData({ ...formData, customBenefit: e.target.value })}
                    placeholder="Add custom benefit (e.g. Free protein shake on workout days)..."
                    className="flex-1 px-3 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomBenefit}
                    className="px-3 py-2 bg-[#252525] hover:bg-[#303030] text-[#F5F5F5] text-xs font-semibold rounded-xl"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* SECTION C: BRANCH AVAILABILITY & INDEPENDENT PRICING */}
              <div className="space-y-4 border-t border-[#292929] pt-4">
                <div>
                  <h4 className="text-xs font-mono uppercase text-[#E58A32] font-bold tracking-wider">
                    3. Branch Availability &amp; Independent Pricing
                  </h4>
                  <p className="text-[11px] text-[#A3A3A3] mt-0.5">
                    Configure distinct pricing, joining fees, and discounts for each branch location independently.
                  </p>
                </div>

                <div className="space-y-4">
                  {formData.branchPricing.map((bp, idx) => {
                    const finalPreview = getBranchPreviewPrice(bp);

                    return (
                      <div
                        key={bp.branchId || idx}
                        className={`p-4 rounded-xl border transition-colors ${
                          bp.isAvailable
                            ? 'bg-[#121212] border-[#292929]'
                            : 'bg-[#0E0E0E] border-[#222222] opacity-60'
                        }`}
                      >
                        {/* Branch Title & Toggle */}
                        <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-[#E58A32]" />
                            <span className="font-bold text-sm text-[#F5F5F5]">
                              {bp.branchName} Hub
                            </span>
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <span className="text-[11px] font-mono uppercase text-[#A3A3A3]">
                              {bp.isAvailable ? 'Available' : 'Disabled'}
                            </span>
                            <input
                              type="checkbox"
                              checked={bp.isAvailable}
                              onChange={(e) => updateBranchField(idx, 'isAvailable', e.target.checked)}
                              className="w-4 h-4 rounded text-[#E58A32] focus:ring-0"
                            />
                          </label>
                        </div>

                        {bp.isAvailable && (
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3">
                            {/* Base Price */}
                            <div>
                              <label className="text-[10px] font-mono text-[#A3A3A3] uppercase block mb-1">
                                Base Price (₹) *
                              </label>
                              <input
                                type="number"
                                min={0}
                                required
                                value={bp.basePrice}
                                onChange={(e) => updateBranchField(idx, 'basePrice', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-[#181818] border border-[#292929] rounded-lg text-xs font-mono text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none"
                              />
                            </div>

                            {/* Joining Fee */}
                            <div>
                              <label className="text-[10px] font-mono text-[#A3A3A3] uppercase block mb-1">
                                Joining Fee (₹)
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={bp.joiningFee}
                                onChange={(e) => updateBranchField(idx, 'joiningFee', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-[#181818] border border-[#292929] rounded-lg text-xs font-mono text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none"
                              />
                            </div>

                            {/* Discount Type & Value */}
                            <div>
                              <label className="text-[10px] font-mono text-[#A3A3A3] uppercase block mb-1">
                                Discount
                              </label>
                              <div className="flex gap-1.5">
                                <select
                                  value={bp.discountType}
                                  onChange={(e) => updateBranchField(idx, 'discountType', e.target.value)}
                                  className="px-1.5 py-1.5 bg-[#181818] border border-[#292929] rounded-lg text-[10px] text-[#F5F5F5] focus:outline-none"
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
                                  className="w-full px-2 py-1.5 bg-[#181818] border border-[#292929] rounded-lg text-xs font-mono text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none disabled:opacity-40"
                                />
                              </div>
                            </div>

                            {/* Live Final Price Calculation Box */}
                            <div className="bg-[#181818] p-2 rounded-lg border border-[#292929] flex flex-col justify-between">
                              <span className="text-[9px] font-mono uppercase text-[#A3A3A3]">
                                Final Payable Rate
                              </span>
                              <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-base font-bold text-[#E58A32] font-mono">
                                  {formatINR(finalPreview)}
                                </span>
                              </div>
                              <span className="text-[9px] text-[#A3A3A3] font-mono">
                                Base ₹{bp.basePrice} + Fee ₹{bp.joiningFee}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="flex items-center justify-end gap-3 border-t border-[#292929] pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-[#222222] hover:bg-[#292929] text-[#A3A3A3] hover:text-white rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-[#E58A32] hover:bg-[#F09A43] text-black rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#E58A32]/10 disabled:opacity-50 cursor-pointer"
                >
                  {formSubmitting ? 'Saving Plan...' : editingPlan ? 'Save Plan Changes' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── VIEW PLAN DETAILS MODAL ── */}
      {viewingPlanId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#292929] rounded-2xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between border-b border-[#292929] pb-4">
              <div>
                <span className="text-[10px] font-mono text-[#E58A32] uppercase tracking-wider">
                  MEMBERSHIP SPECIFICATION DOSSIER
                </span>
                <h3
                  className="text-lg font-bold uppercase text-[#F5F5F5] mt-0.5"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {viewingPlanData?.plan?.name || 'Loading Plan...'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewingPlanId(null);
                  setViewingPlanData(null);
                }}
                className="p-1 rounded-lg bg-[#252525] text-[#A3A3A3] hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {viewingLoading ? (
              <div className="py-12 text-center text-xs text-[#A3A3A3]">
                Loading plan specifications...
              </div>
            ) : viewingPlanData?.plan ? (
              <div className="space-y-5 text-xs">
                {/* Meta Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#121212] p-4 rounded-xl border border-[#292929]">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#A3A3A3]">Plan Type</span>
                    <p className="font-bold text-[#F5F5F5] mt-0.5">{viewingPlanData.plan.planType}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#A3A3A3]">Duration</span>
                    <p className="font-mono text-[#F5F5F5] mt-0.5">
                      {viewingPlanData.plan.durationDays || (viewingPlanData.plan.durationMonths * 30)} Days
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#A3A3A3]">Active Athletes</span>
                    <p className="font-bold text-green-400 mt-0.5">
                      {viewingPlanData.activeMembershipsCount || 0} Members
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#A3A3A3]">Total All-Time</span>
                    <p className="font-bold text-[#E58A32] mt-0.5">
                      {viewingPlanData.totalMembershipsCount || 0} Passes
                    </p>
                  </div>
                </div>

                {/* Description */}
                {viewingPlanData.plan.description && (
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#A3A3A3] block mb-1">
                      Description:
                    </span>
                    <p className="text-xs text-[#CCCCCC] bg-[#141414] p-3 rounded-xl border border-[#252525]">
                      {viewingPlanData.plan.description}
                    </p>
                  </div>
                )}

                {/* Benefits */}
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#A3A3A3] block mb-1.5">
                    Included Benefits:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(viewingPlanData.plan.benefits || viewingPlanData.plan.features || []).map((b, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 p-2 rounded-lg bg-[#141414] border border-[#252525]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                        <span className="text-[#F5F5F5] text-xs">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Branch Breakdown Table */}
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#A3A3A3] block mb-1.5">
                    Branch Pricing Breakdown:
                  </span>
                  <div className="overflow-x-auto border border-[#292929] rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#141414] border-b border-[#292929] text-[10px] font-mono uppercase text-[#A3A3A3]">
                          <th className="py-2.5 px-3">Branch Location</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Base Price</th>
                          <th className="py-2.5 px-3">Joining Fee</th>
                          <th className="py-2.5 px-3">Discount</th>
                          <th className="py-2.5 px-3 text-right">Final Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#222222] font-mono text-xs">
                        {(viewingPlanData.plan.branchPricing || []).map((bp, i) => (
                          <tr key={i} className="hover:bg-[#1C1C1C]">
                            <td className="py-2.5 px-3 font-semibold text-[#F5F5F5]">
                              {bp.branchId?.city || 'HQ Hub'} ({bp.branchId?.name || 'Branch'})
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] ${
                                  bp.isAvailable
                                    ? 'bg-green-500/10 text-green-400'
                                    : 'bg-red-500/10 text-red-400'
                                }`}
                              >
                                {bp.isAvailable ? 'AVAILABLE' : 'DISABLED'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-[#CCCCCC]">{formatINR(bp.basePrice)}</td>
                            <td className="py-2.5 px-3 text-[#A3A3A3]">{formatINR(bp.joiningFee)}</td>
                            <td className="py-2.5 px-3 text-[#A3A3A3]">
                              {bp.discountType === 'NONE'
                                ? 'None'
                                : bp.discountType === 'PERCENTAGE'
                                ? `${bp.discountValue}%`
                                : formatINR(bp.discountValue)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-[#E58A32]">
                              {bp.isAvailable ? formatINR(bp.finalPrice) : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-[#292929]">
                  <button
                    type="button"
                    onClick={() => {
                      const p = viewingPlanData.plan;
                      setViewingPlanId(null);
                      setViewingPlanData(null);
                      handleOpenEdit(p);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#E58A32] hover:bg-[#F09A43] text-black font-bold rounded-xl uppercase tracking-wider text-xs cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Plan</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
      {/* ── SAFE DELETE PROTECTION MODAL ── */}
      {deleteWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#181818] border border-amber-500/40 rounded-2xl w-full max-w-md p-6 relative shadow-[0_0_40px_rgba(229,138,50,0.18)]">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6 text-[#E58A32]" />
            </div>

            <h3
              className="text-lg font-bold uppercase tracking-tight text-[#F5F5F5] mb-2"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Safe Delete Protection
            </h3>

            <p className="text-xs text-[#CCCCCC] leading-relaxed mb-3">
              Cannot delete <strong className="text-[#F5F5F5]">"{deleteWarningModal.plan.name}"</strong> because it is currently linked to active or historical athlete pass records in the gym database.
            </p>

            <div className="p-3.5 rounded-xl bg-[#121212] border border-[#292929] text-[11px] text-[#A3A3A3] mb-5 space-y-1">
              <div className="text-[#E58A32] font-semibold flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                <span>✓ Database Integrity Rule</span>
              </div>
              <p>
                Deleting plans with subscriber history would invalidate member cards and reporting figures. Instead, deactivating this plan immediately removes it from future athlete enrollments while preserving all historical data.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteWarningModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#222222] hover:bg-[#292929] text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={async () => {
                  const pId = deleteWarningModal.plan._id;
                  setDeleteWarningModal(null);
                  await handleToggleStatus(pId, false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] hover:bg-[#F09A43] text-black font-semibold transition-all shadow-lg shadow-[#E58A32]/20"
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
