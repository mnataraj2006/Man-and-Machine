import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Phone,
  Mail,
  Edit,
  Power,
  Eye,
  Send,
  KeyRound,
  Copy,
  Check,
  ShieldAlert,
  PauseCircle,
  CheckCircle2,
  Clock,
  X,
  Trash2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users,
  Calendar,
  SlidersHorizontal,
} from 'lucide-react';
import adminService from '../../services/adminService.js';
import { useAdmin } from '../../components/Admin/AdminLayout.jsx';

export default function Trainers() {
  const { branches, selectedBranch } = useAdmin();
  const [trainers, setTrainers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('ROSTER'); // 'ROSTER' | 'BOOKINGS'
  const [confirmingId, setConfirmingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null); // { type: 'success'|'error', message }
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState(selectedBranch);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  // Action busy state
  const [actionBusyId, setActionBusyId] = useState(null);

  // Modals & Mobile Bottom Sheets
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTrainerDetails, setSelectedTrainerDetails] = useState(null);
  const [editingTrainer, setEditingTrainer] = useState(null);
  const [editError, setEditError] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [invitationModal, setInvitationModal] = useState(null);
  const [actionSheetTrainer, setActionSheetTrainer] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [addError, setAddError] = useState(null);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    phone: '',
    branchId: '',
    specialization: 'Strength & Conditioning',
    experienceYears: 4,
    qualification: '',
    profileImage: '',
    employmentStatus: 'FULL_TIME',
    bio: '',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    branchId: '',
    specialization: '',
    experienceYears: 4,
    qualification: '',
    profileImage: '',
    employmentStatus: 'FULL_TIME',
    bio: '',
  });

  useEffect(() => {
    setBranchFilter(selectedBranch);
    setPage(1);
  }, [selectedBranch]);

  const anyOverlayOpen = Boolean(
    isAddModalOpen ||
      selectedTrainerDetails ||
      editingTrainer ||
      invitationModal ||
      actionSheetTrainer ||
      confirmDialog
  );

  // Lock background scroll whenever any modal or bottom sheet is open
  useEffect(() => {
    if (!anyOverlayOpen) return undefined;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [anyOverlayOpen]);

  // Close top-most modal / sheet on Escape key
  useEffect(() => {
    if (!anyOverlayOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (confirmDialog) {
        setConfirmDialog(null);
      } else if (actionSheetTrainer) {
        setActionSheetTrainer(null);
      } else if (invitationModal) {
        setInvitationModal(null);
      } else if (editingTrainer) {
        setEditingTrainer(null);
      } else if (selectedTrainerDetails) {
        setSelectedTrainerDetails(null);
      } else if (isAddModalOpen) {
        setIsAddModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    anyOverlayOpen,
    confirmDialog,
    actionSheetTrainer,
    invitationModal,
    editingTrainer,
    selectedTrainerDetails,
    isAddModalOpen,
  ]);

  const fetchTrainers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, bRes] = await Promise.all([
        adminService.getTrainers({
          branchId: branchFilter,
          search: appliedSearch,
          page,
          limit: pageSize,
        }),
        adminService
          .getTrainerBookings({
            branchId: branchFilter,
          })
          .catch(() => ({ bookings: [] })),
      ]);

      const fetchedTrainers = res.trainers || [];
      setTrainers(fetchedTrainers);
      setBookings(bRes.bookings || []);

      if (res.pagination) {
        setPagination({
          total: res.pagination.total ?? fetchedTrainers.length,
          page: res.pagination.page ?? page,
          limit: res.pagination.limit ?? pageSize,
          totalPages: Math.max(1, res.pagination.totalPages ?? 1),
        });
      } else {
        setPagination({
          total: fetchedTrainers.length,
          page: 1,
          limit: pageSize,
          totalPages: 1,
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load trainers');
    } finally {
      setLoading(false);
    }
  }, [branchFilter, appliedSearch, page, pageSize]);

  useEffect(() => {
    fetchTrainers();
  }, [fetchTrainers]);

  const showFeedback = (type, message) => {
    setActionFeedback({ type, message });
    setTimeout(() => {
      setActionFeedback((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  const handleConfirmBookingPayment = async (bookingId) => {
    try {
      setConfirmingId(bookingId);
      await adminService.confirmTrainerBookingPayment(bookingId, { paymentMethod: 'CASH' });
      showFeedback('success', 'Booking payment confirmed and trainer assigned.');
      await fetchTrainers();
    } catch (err) {
      showFeedback('error', err.message || 'Failed to confirm booking payment');
    } finally {
      setConfirmingId(null);
    }
  };

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

  const handleBranchFilterChange = (val) => {
    setBranchFilter(val);
    setPage(1);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(Number(newSize));
    setPage(1);
  };

  const handleOpenAdd = () => {
    setAddError(null);
    setAddForm({
      name: '',
      email: '',
      phone: '',
      branchId: branches[0]?._id || '',
      specialization: 'Strength & Conditioning',
      experienceYears: 4,
      qualification: '',
      profileImage: '',
      employmentStatus: 'FULL_TIME',
      bio: '',
    });
    setIsAddModalOpen(true);
  };

  const isValidIndianMobile = (raw) => {
    const d = String(raw || '').replace(/\D/g, '');
    return (
      (d.length === 10 && /^[6-9]\d{9}$/.test(d)) ||
      (d.length === 11 && /^0[6-9]\d{9}$/.test(d)) ||
      (d.length === 12 && /^91[6-9]\d{9}$/.test(d)) ||
      (d.length === 14 && /^0091[6-9]\d{9}$/.test(d))
    );
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddError(null);
    if (!isValidIndianMobile(addForm.phone)) {
      setAddError(
        'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9 (e.g. 9876543210 or +91 9876543210).'
      );
      return;
    }
    try {
      setSubmittingAdd(true);
      const res = await adminService.createTrainer(addForm);
      setIsAddModalOpen(false);
      setPage(1);
      await fetchTrainers();
      setCopiedLink(false);
      setInvitationModal({
        title: 'Trainer Account Created',
        trainerName: res.trainer?.name || addForm.name,
        email: res.trainer?.email || addForm.email,
        emailConfigured: res.emailConfigured,
        emailDelivered: res.emailDelivered,
        emailNotice: res.emailNotice || res.message,
        manualUrl: res.manualActivationUrl || null,
        linkType: 'activation',
      });
    } catch (err) {
      setAddError(err.message || 'Failed to onboard trainer');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleOpenDetails = async (id) => {
    setActionSheetTrainer(null);
    try {
      const res = await adminService.getTrainerDetails(id);
      setSelectedTrainerDetails(res);
    } catch (err) {
      showFeedback('error', err.message || 'Failed to load trainer dossier');
    }
  };

  const handleOpenEdit = (t) => {
    setActionSheetTrainer(null);
    setEditError(null);
    setEditingTrainer(t);
    setEditForm({
      name: t.name || '',
      phone: t.phone || '',
      branchId: t.branch?._id || '',
      specialization: t.specialization || '',
      experienceYears: t.experienceYears ?? 3,
      qualification: t.qualification || '',
      profileImage: t.profileImage || '',
      employmentStatus: t.employmentStatus || 'FULL_TIME',
      bio: t.bio || '',
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError(null);
    if (!isValidIndianMobile(editForm.phone)) {
      setEditError('Enter a valid 10-digit Indian mobile number starting with 6–9.');
      return;
    }
    try {
      setSavingEdit(true);
      await adminService.updateTrainer(editingTrainer.id, editForm);
      const editedId = editingTrainer.id;
      setEditingTrainer(null);
      showFeedback('success', 'Trainer profile updated.');
      await fetchTrainers();
      if (selectedTrainerDetails?.trainer?.id === editedId) {
        handleOpenDetails(editedId);
      }
    } catch (err) {
      setEditError(err.message || 'Failed to update trainer');
    } finally {
      setSavingEdit(false);
    }
  };

  const requestStatusChange = (t, targetStatus) => {
    setActionSheetTrainer(null);
    const metaMap = {
      ACTIVE: {
        title: t.status === 'SUSPENDED' ? 'Reactivate Trainer' : 'Activate Trainer',
        confirmLabel: t.status === 'SUSPENDED' ? 'Reactivate' : 'Activate',
        tone: 'emerald',
        description: `Restore Trainer Portal access for ${t.name}?`,
      },
      SUSPENDED: {
        title: 'Suspend Trainer',
        confirmLabel: 'Suspend Account',
        tone: 'amber',
        description: `Suspend ${t.name}? Active login sessions will be revoked immediately until reactivated.`,
      },
      INACTIVE: {
        title: 'Deactivate Trainer',
        confirmLabel: 'Deactivate Account',
        tone: 'red',
        description: `Deactivate ${t.name}? They will immediately lose access to protected Trainer Portal APIs.`,
      },
    };
    const meta = metaMap[targetStatus];
    setConfirmDialog({
      ...meta,
      onConfirm: async () => {
        try {
          setActionBusyId(t.id);
          await adminService.updateTrainerStatus(t.id, targetStatus);
          setConfirmDialog(null);
          showFeedback('success', `${t.name} marked as ${targetStatus}.`);
          await fetchTrainers();
        } catch (err) {
          setConfirmDialog(null);
          showFeedback('error', err.message || 'Failed to update trainer status');
        } finally {
          setActionBusyId(null);
        }
      },
    });
  };

  const requestResendInvitation = (t) => {
    setActionSheetTrainer(null);
    setConfirmDialog({
      title: 'Resend Activation Invitation',
      confirmLabel: 'Regenerate & Send',
      tone: 'amber',
      description: `Generate a fresh 24-hour invitation link for ${t.name}? Any previous invitation link will become invalid.`,
      onConfirm: async () => {
        try {
          setActionBusyId(t.id);
          const res = await adminService.resendTrainerInvitation(t.id);
          setConfirmDialog(null);
          await fetchTrainers();
          setCopiedLink(false);
          setInvitationModal({
            title: 'Invitation Regenerated',
            trainerName: t.name,
            email: t.email,
            emailConfigured: res.emailConfigured,
            emailDelivered: res.emailDelivered,
            emailNotice: res.emailNotice || res.message,
            manualUrl: res.manualActivationUrl || null,
            linkType: 'activation',
          });
        } catch (err) {
          setConfirmDialog(null);
          showFeedback('error', err.message || 'Failed to resend invitation');
        } finally {
          setActionBusyId(null);
        }
      },
    });
  };

  const requestAdminResetPassword = (t) => {
    setActionSheetTrainer(null);
    setConfirmDialog({
      title: 'Send Password Reset Link',
      confirmLabel: 'Generate Reset Link',
      tone: 'red',
      description: `Initiate a secure password reset for ${t.name}? Their active trainer sessions will be invalidated immediately.`,
      onConfirm: async () => {
        try {
          setActionBusyId(t.id);
          const res = await adminService.resetTrainerPassword(t.id);
          setConfirmDialog(null);
          setCopiedLink(false);
          setInvitationModal({
            title: 'Password Reset Link Ready',
            trainerName: t.name,
            email: t.email,
            emailConfigured: res.emailConfigured,
            emailDelivered: res.emailDelivered,
            emailNotice: res.emailNotice || res.message,
            manualUrl: res.manualResetUrl || null,
            linkType: 'reset',
          });
        } catch (err) {
          setConfirmDialog(null);
          showFeedback('error', err.message || 'Failed to initiate password reset');
        } finally {
          setActionBusyId(null);
        }
      },
    });
  };

  const requestDeleteTrainer = (t) => {
    setActionSheetTrainer(null);
    setConfirmDialog({
      title: 'Delete Trainer Permanently',
      confirmLabel: 'Delete Permanently',
      tone: 'red',
      description: `Permanently delete trainer "${t.name}"? Any assigned clients will be unassigned and this action cannot be undone.`,
      onConfirm: async () => {
        try {
          setActionBusyId(t.id);
          await adminService.deleteTrainer(t.id);
          setConfirmDialog(null);
          if (selectedTrainerDetails?.trainer?.id === t.id) {
            setSelectedTrainerDetails(null);
          }
          showFeedback('success', `Trainer "${t.name}" deleted permanently.`);
          if (trainers.length === 1 && page > 1) {
            setPage((p) => p - 1);
          } else {
            await fetchTrainers();
          }
        } catch (err) {
          setConfirmDialog(null);
          showFeedback('error', err.message || 'Failed to delete trainer');
        } finally {
          setActionBusyId(null);
        }
      },
    });
  };

  const handleCopyManualUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      showFeedback('error', 'Clipboard unavailable. Please copy the URL from the text field.');
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3 shrink-0" /> ACTIVE
          </span>
        );
      case 'PENDING_ACTIVATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 whitespace-nowrap">
            <Clock className="w-3 h-3 shrink-0" /> PENDING
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F03B2E]/15 text-[#FF493B] border border-[#F03B2E]/40 whitespace-nowrap">
            <PauseCircle className="w-3 h-3 shrink-0" /> SUSPENDED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#202020] text-[#858585] border border-[#303030] whitespace-nowrap">
            INACTIVE
          </span>
        );
    }
  };

  const renderInvitationBadge = (invStatus) => {
    switch (invStatus) {
      case 'ACTIVATED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 whitespace-nowrap">
            ACTIVATED
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#F03B2E]/15 text-[#FF493B] border border-[#F03B2E]/35 whitespace-nowrap">
            EXPIRED
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/25 whitespace-nowrap">
            INVITE PENDING
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#202020] text-[#858585] border border-[#303030] whitespace-nowrap">
            {invStatus || '—'}
          </span>
        );
    }
  };

  const startIndex = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endIndex = Math.min(pagination.total, pagination.page * pagination.limit);

  return (
    <div className="space-y-5 sm:space-y-6 min-w-0">
      {/* ── HEADER & PRIMARY CTA ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="mm-page-title text-2xl sm:text-3xl">
            TRAINER ROSTER &amp; ONBOARDING
          </h2>
          <p className="text-xs sm:text-sm text-[#B8B8B8] mt-1">
            Invite certified coaches via single-use activation links, manage account status, and track rosters.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="mm-btn-primary rounded-lg w-full sm:w-auto min-h-[44px] shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Add Trainer</span>
        </button>
      </div>

      {/* ── TABS (Horizontal scroll-safe on narrow screens) ── */}
      <div className="flex items-center gap-2 border-b border-[#252525] pb-3 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('ROSTER')}
          className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'ROSTER'
              ? 'bg-[#F03B2E] text-white shadow-sm'
              : 'text-[#B8B8B8] hover:text-white bg-[#181818] border border-[#303030]'
          }`}
        >
          Coaching Staff ({pagination.total || trainers.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('BOOKINGS')}
          className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'BOOKINGS'
              ? 'bg-[#F03B2E] text-white shadow-sm'
              : 'text-[#B8B8B8] hover:text-white bg-[#181818] border border-[#303030]'
          }`}
        >
          Client Bookings &amp; Payments ({bookings.length})
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

      {/* ── SEARCH & BRANCH FILTERS ── */}
      <div className="bg-[#181818] border border-[#303030] rounded-xl p-3.5 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-[#858585] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, or phone..."
              aria-label="Search trainers by name, email, or phone"
              className="mm-input pl-10 pr-10 min-h-[44px] text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear search"
                className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-md text-[#858585] hover:text-[#F5F5F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="mm-btn-secondary !px-3.5 !py-2.5 min-h-[44px] rounded-lg shrink-0"
          >
            Search
          </button>
        </form>

        <select
          aria-label="Filter trainers by branch"
          value={branchFilter}
          onChange={(e) => handleBranchFilterChange(e.target.value)}
          className="mm-select w-full md:w-56 min-h-[44px] text-xs cursor-pointer"
        >
          <option value="ALL">All Branches</option>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>
              {b.city} Branch
            </option>
          ))}
        </select>
      </div>

      {/* ── ERROR NOTICE ── */}
      {error && (
        <div className="bg-[#F03B2E]/10 border border-[#F03B2E]/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#FF493B]">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider">Trainer Sync Error</p>
              <p className="text-xs text-[#B8B8B8] break-words">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchTrainers}
            className="mm-btn-secondary !py-2 !px-4 min-h-[44px] text-xs w-full sm:w-auto"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── ROSTER VIEW (DESKTOP TABLE >= 1024px, CARDS < 1024px) ── */}
      {activeTab === 'ROSTER' ? (
        loading ? (
          <div className="py-12 text-center text-xs text-[#B8B8B8]">Loading coaching staff...</div>
        ) : trainers.length === 0 ? (
          <div className="bg-[#181818] border border-[#303030] rounded-xl py-12 px-4 text-center space-y-3">
            <p className="text-sm font-bold text-[#F5F5F5]">No trainers found</p>
            <p className="text-xs text-[#858585]">
              {appliedSearch || branchFilter !== 'ALL'
                ? 'Try clearing your search or switching branch filters.'
                : 'Click Add Trainer to invite a coach.'}
            </p>
            {(appliedSearch || branchFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setAppliedSearch('');
                  setBranchFilter('ALL');
                  setPage(1);
                }}
                className="mm-btn-secondary min-h-[44px] rounded-lg mx-auto"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── DESKTOP TABLE (>= 1024px, Preserved Design) ── */}
            <div className="hidden lg:block bg-[#181818] border border-[#303030] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="mm-table">
                  <thead>
                    <tr>
                      <th>Trainer</th>
                      <th>Contact</th>
                      <th>Branch</th>
                      <th>Specialization</th>
                      <th>Account Status</th>
                      <th>Invitation</th>
                      <th>Created</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainers.map((t) => {
                      const busy = actionBusyId === t.id;
                      return (
                        <tr key={t.id}>
                          <td>
                            <div className="flex items-center gap-3">
                              {t.profileImage ? (
                                <img
                                  src={t.profileImage}
                                  alt={t.name}
                                  className="w-9 h-9 rounded-lg object-cover border border-[#303030] shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-[#202020] border border-[#303030] flex items-center justify-center text-[#F03B2E] font-bold text-xs shrink-0">
                                  {t.name ? t.name[0].toUpperCase() : 'T'}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-[#F5F5F5] text-sm">{t.name}</div>
                                <div className="text-[11px] text-[#858585]">
                                  {t.experienceYears} yrs exp • {t.assignedClientCount} clients
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="text-xs text-[#F5F5F5]">{t.email}</div>
                            <div className="text-[11px] font-mono text-[#858585]">{t.phone}</div>
                          </td>
                          <td>
                            <span className="text-xs font-semibold text-[#F5F5F5]">
                              {t.branch?.city || 'HQ'}
                            </span>
                          </td>
                          <td>
                            <div className="text-xs font-semibold text-[#F03B2E]">
                              {t.specialization}
                            </div>
                            <div className="text-[10px] text-[#858585] uppercase">
                              {(t.employmentStatus || 'FULL_TIME').replace('_', ' ')}
                              {t.qualification ? ` • ${t.qualification}` : ''}
                            </div>
                          </td>
                          <td>{renderStatusBadge(t.status)}</td>
                          <td>{renderInvitationBadge(t.invitationStatus)}</td>
                          <td className="text-xs font-mono text-[#B8B8B8]">
                            {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenDetails(t.id)}
                                className="p-2 rounded-lg bg-[#202020] hover:bg-[#303030] text-[#B8B8B8] hover:text-white cursor-pointer"
                                title="View Trainer"
                                aria-label={`View ${t.name}`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(t)}
                                className="p-2 rounded-lg bg-[#202020] hover:bg-[#303030] text-[#B8B8B8] hover:text-white cursor-pointer"
                                title="Edit Trainer"
                                aria-label={`Edit ${t.name}`}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {t.status === 'PENDING_ACTIVATION' ? (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => requestResendInvitation(t)}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                  title="Resend Invitation"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Resend</span>
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => requestAdminResetPassword(t)}
                                    className="p-2 rounded-lg bg-[#202020] hover:bg-[#F03B2E]/20 text-[#B8B8B8] hover:text-[#F03B2E] cursor-pointer"
                                    title="Send Secure Password Reset Link"
                                    aria-label={`Reset password for ${t.name}`}
                                  >
                                    <KeyRound className="w-3.5 h-3.5" />
                                  </button>

                                  {t.status === 'ACTIVE' ? (
                                    <>
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => requestStatusChange(t, 'SUSPENDED')}
                                        className="p-2 rounded-lg bg-[#202020] hover:bg-amber-500/20 text-[#B8B8B8] hover:text-amber-400 cursor-pointer"
                                        title="Suspend Trainer"
                                        aria-label={`Suspend ${t.name}`}
                                      >
                                        <PauseCircle className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => requestStatusChange(t, 'INACTIVE')}
                                        className="p-2 rounded-lg bg-[#202020] hover:bg-[#F03B2E]/20 text-[#B8B8B8] hover:text-[#FF493B] cursor-pointer"
                                        title="Deactivate Trainer"
                                        aria-label={`Deactivate ${t.name}`}
                                      >
                                        <Power className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => requestStatusChange(t, 'ACTIVE')}
                                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                                      title="Activate Trainer"
                                    >
                                      {t.status === 'SUSPENDED' ? 'Reactivate' : 'Activate'}
                                    </button>
                                  )}
                                </>
                              )}

                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => requestDeleteTrainer(t)}
                                className="p-2 rounded-lg bg-[#202020] hover:bg-[#F03B2E]/25 text-[#B8B8B8] hover:text-[#FF493B] border border-transparent hover:border-[#F03B2E]/40 cursor-pointer disabled:opacity-50"
                                title="Delete Trainer"
                                aria-label={`Delete ${t.name}`}
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

            {/* ── MOBILE & TABLET CARDS (< 1024px) ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 lg:hidden">
              {trainers.map((t) => {
                const busy = actionBusyId === t.id;
                return (
                  <article
                    key={t.id}
                    className="bg-[#181818] border border-[#303030] rounded-xl p-4 flex flex-col justify-between gap-3.5 min-w-0"
                  >
                    {/* Card Header: Name + Status + Three-dot Menu */}
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {t.profileImage ? (
                          <img
                            src={t.profileImage}
                            alt={t.name}
                            className="w-10 h-10 rounded-lg object-cover border border-[#303030] shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[#202020] border border-[#303030] flex items-center justify-center text-[#F03B2E] font-bold text-sm shrink-0">
                            {t.name ? t.name[0].toUpperCase() : 'T'}
                          </div>
                        )}
                        <div className="min-w-0 flex-1 space-y-1">
                          <h3 className="font-display text-base sm:text-lg font-bold uppercase text-[#F5F5F5] leading-tight truncate">
                            {t.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {renderStatusBadge(t.status)}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setActionSheetTrainer(t)}
                        aria-label={`Open actions for ${t.name}`}
                        aria-haspopup="dialog"
                        className="min-w-[44px] min-h-[44px] -mr-1.5 -mt-1 flex items-center justify-center rounded-lg bg-[#202020] hover:bg-[#303030] text-[#F5F5F5] border border-[#303030] hover:border-[#F03B2E] cursor-pointer shrink-0 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Primary Specialization & Invitation Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#252525]">
                      <span className="text-xs font-semibold text-[#F03B2E] truncate max-w-full">
                        {t.specialization}
                      </span>
                      {renderInvitationBadge(t.invitationStatus)}
                    </div>

                    {/* Structured Hierarchy Details */}
                    <div className="space-y-2 text-xs text-[#B8B8B8] min-w-0">
                      <div className="flex items-start gap-2 min-w-0">
                        <Mail className="w-3.5 h-3.5 text-[#F03B2E] shrink-0 mt-0.5" />
                        <span className="break-all min-w-0 text-[#F5F5F5]">{t.email}</span>
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone className="w-3.5 h-3.5 text-[#F03B2E] shrink-0" />
                        <span className="font-mono text-[#F5F5F5]">{t.phone}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 px-3 py-2.5 rounded-lg bg-[#111111] border border-[#252525] text-[11px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MapPin className="w-3 h-3 text-[#858585] shrink-0" />
                          <span className="truncate text-[#F5F5F5] font-medium">{t.branch?.city || 'HQ'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Users className="w-3 h-3 text-[#858585] shrink-0" />
                          <span className="truncate">{t.assignedClientCount} clients</span>
                        </div>
                        <div className="truncate text-[#858585]">
                          {t.experienceYears} yrs exp
                        </div>
                        <div className="flex items-center gap-1 text-[#858585] font-mono truncate">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span className="truncate">
                            {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Manage Trainer & Quick View */}
                    <div className="flex items-center gap-2 pt-2 border-t border-[#252525]">
                      <button
                        type="button"
                        onClick={() => handleOpenDetails(t.id)}
                        className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase tracking-wider text-[#F5F5F5] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#B8B8B8]" />
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setActionSheetTrainer(t)}
                        className="flex-1 min-h-[44px] px-3.5 py-2 rounded-lg bg-[#F03B2E]/15 hover:bg-[#F03B2E]/25 border border-[#F03B2E]/40 text-xs font-bold uppercase tracking-wider text-[#F5F5F5] inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[#F03B2E]" />
                        <span>{busy ? 'Working...' : 'Manage Trainer'}</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* ── PAGINATION CONTROLS ── */}
            <div className="bg-[#181818] border border-[#303030] rounded-xl px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#B8B8B8]">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <span>
                  Showing <strong className="text-[#F5F5F5]">{startIndex}–{endIndex}</strong> of{' '}
                  <strong className="text-[#F5F5F5]">{pagination.total}</strong> trainers
                </span>
                <label className="inline-flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-[#858585]">Per page</span>
                  <select
                    aria-label="Trainers per page"
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(e.target.value)}
                    className="bg-[#111111] border border-[#303030] rounded-lg px-2.5 py-1.5 min-h-[36px] text-xs text-[#F5F5F5] cursor-pointer"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </label>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <button
                  type="button"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase tracking-wider text-[#F5F5F5] inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <span className="font-mono text-xs text-[#F5F5F5] px-2 whitespace-nowrap">
                  Page {pagination.page} / {pagination.totalPages}
                </span>

                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages || loading}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase tracking-wider text-[#F5F5F5] inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )
      ) : (
        /* ── BOOKINGS & PAYMENTS TAB (Desktop table + Mobile cards) ── */
        <div className="space-y-4">
          <div className="bg-[#181818] border border-[#303030] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="font-display text-sm font-bold uppercase tracking-wider text-[#F5F5F5]">
              CLIENT-TO-COACH BOOKING LEDGER ({bookings.length})
            </span>
            <span className="text-[11px] text-[#858585]">Desk payment verification &amp; assignments</span>
          </div>

          {bookings.length === 0 ? (
            <div className="bg-[#181818] border border-[#303030] rounded-xl p-12 text-center text-xs text-[#B8B8B8]">
              No trainer bookings recorded yet.
            </div>
          ) : (
            <>
              {/* Desktop Bookings Table */}
              <div className="hidden lg:block bg-[#181818] border border-[#303030] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="mm-table">
                    <thead>
                      <tr>
                        <th>Ref Code</th>
                        <th>Athlete Client</th>
                        <th>Coach</th>
                        <th>Schedule</th>
                        <th>Pack</th>
                        <th>Amount</th>
                        <th>Payment</th>
                        <th>Status</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b) => {
                        const isPending =
                          b.bookingStatus === 'PENDING_PAYMENT' || b.paymentStatus === 'PENDING_PAYMENT';
                        return (
                          <tr key={b._id}>
                            <td className="font-mono font-bold text-[#F5F5F5]">{b.bookingReference}</td>
                            <td>
                              <div className="font-bold text-[#F5F5F5]">{b.clientId?.name}</div>
                              <div className="text-[11px] text-[#858585]">{b.clientId?.email}</div>
                            </td>
                            <td className="font-semibold text-[#F03B2E]">{b.trainerId?.name}</td>
                            <td className="font-mono text-xs">
                              {new Date(b.date).toLocaleDateString()} @ {b.startTime}
                            </td>
                            <td className="uppercase text-xs">{b.serviceTitle}</td>
                            <td className="font-mono font-bold text-white">₹{b.amount}</td>
                            <td>
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  b.paymentStatus === 'PAID'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-[#F03B2E]/10 text-[#F03B2E] border border-[#F03B2E]/30'
                                }`}
                              >
                                {b.paymentStatus}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  b.bookingStatus === 'CONFIRMED'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-[#202020] text-[#B8B8B8] border border-[#303030]'
                                }`}
                              >
                                {b.bookingStatus}
                              </span>
                            </td>
                            <td className="text-right">
                              {isPending ? (
                                <button
                                  type="button"
                                  disabled={confirmingId === b._id}
                                  onClick={() => handleConfirmBookingPayment(b._id)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold uppercase cursor-pointer"
                                >
                                  {confirmingId === b._id ? 'Verifying...' : 'Confirm & Assign'}
                                </button>
                              ) : (
                                <span className="text-[10px] text-emerald-400 font-bold uppercase">
                                  Active Coach
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile & Tablet Bookings Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 lg:hidden">
                {bookings.map((b) => {
                  const isPending =
                    b.bookingStatus === 'PENDING_PAYMENT' || b.paymentStatus === 'PENDING_PAYMENT';
                  return (
                    <div
                      key={b._id}
                      className="bg-[#181818] border border-[#303030] rounded-xl p-4 space-y-3 min-w-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-mono text-xs font-bold text-[#F5F5F5] block truncate">
                            {b.bookingReference}
                          </span>
                          <span className="text-xs font-bold text-[#F03B2E] truncate block">
                            Coach: {b.trainerId?.name}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-sm text-[#F5F5F5] shrink-0">
                          ₹{b.amount}
                        </span>
                      </div>

                      <div className="text-xs space-y-1 border-t border-[#252525] pt-2.5">
                        <div className="font-semibold text-[#F5F5F5] truncate">{b.clientId?.name}</div>
                        <div className="text-[11px] text-[#858585] break-all">{b.clientId?.email}</div>
                        <div className="text-[11px] font-mono text-[#B8B8B8] pt-1">
                          {new Date(b.date).toLocaleDateString()} @ {b.startTime} • {b.serviceTitle}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            b.paymentStatus === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-[#F03B2E]/10 text-[#F03B2E] border border-[#F03B2E]/30'
                          }`}
                        >
                          Pay: {b.paymentStatus}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            b.bookingStatus === 'CONFIRMED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-[#202020] text-[#B8B8B8] border border-[#303030]'
                          }`}
                        >
                          {b.bookingStatus}
                        </span>
                      </div>

                      {isPending ? (
                        <button
                          type="button"
                          disabled={confirmingId === b._id}
                          onClick={() => handleConfirmBookingPayment(b._id)}
                          className="w-full min-h-[44px] py-2.5 px-4 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-xs font-bold uppercase cursor-pointer"
                        >
                          {confirmingId === b._id ? 'Verifying...' : 'Confirm & Assign'}
                        </button>
                      ) : (
                        <div className="text-[11px] text-emerald-400 font-bold uppercase pt-1">
                          Active Coach Assigned
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── MOBILE TRAINER ACTION BOTTOM SHEET ── */}
      {actionSheetTrainer && (
        <div
          id="trainer-action-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={`Manage ${actionSheetTrainer.name}`}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setActionSheetTrainer(null)}
        >
          <div
            className="bg-[#181818] border-t sm:border border-[#303030] rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[88dvh] flex flex-col overflow-hidden shadow-2xl pb-[env(safe-area-inset-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Drag Handle (Mobile) & Header */}
            <div className="pt-2.5 sm:pt-4 px-5 pb-4 border-b border-[#252525] shrink-0">
              <div className="w-10 h-1 bg-[#303030] rounded-full mx-auto mb-3 sm:hidden" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-label text-[#F03B2E] block mb-0.5">TRAINER ACTIONS</span>
                  <h3 className="mm-page-title text-lg sm:text-xl truncate">
                    {actionSheetTrainer.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {renderStatusBadge(actionSheetTrainer.status)}
                    {renderInvitationBadge(actionSheetTrainer.invitationStatus)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActionSheetTrainer(null)}
                  aria-label="Close action menu"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#202020] hover:bg-[#303030] text-[#B8B8B8] hover:text-white border border-[#303030] cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Action Grid */}
            <div className="p-4 sm:p-5 overflow-y-auto overscroll-contain space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleOpenDetails(actionSheetTrainer.id)}
                  className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center gap-2.5 cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-[#F03B2E] shrink-0" />
                  <span className="truncate">View Trainer</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(actionSheetTrainer)}
                  className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center gap-2.5 cursor-pointer"
                >
                  <Edit className="w-4 h-4 text-[#F03B2E] shrink-0" />
                  <span className="truncate">Edit Trainer</span>
                </button>

                {actionSheetTrainer.status === 'PENDING_ACTIVATION' ? (
                  <button
                    type="button"
                    onClick={() => requestResendInvitation(actionSheetTrainer)}
                    className="col-span-2 min-h-[48px] px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <Send className="w-4 h-4 shrink-0" />
                    <span>Resend Invitation</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => requestAdminResetPassword(actionSheetTrainer)}
                      className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center gap-2.5 cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-[#F03B2E] shrink-0" />
                      <span className="truncate">Reset Password</span>
                    </button>

                    {actionSheetTrainer.status === 'ACTIVE' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => requestStatusChange(actionSheetTrainer, 'SUSPENDED')}
                          className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2.5 cursor-pointer"
                        >
                          <PauseCircle className="w-4 h-4 shrink-0" />
                          <span className="truncate">Suspend</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => requestStatusChange(actionSheetTrainer, 'INACTIVE')}
                          className="col-span-2 min-h-[48px] px-3.5 py-2.5 rounded-xl bg-[#202020] hover:bg-[#F03B2E]/20 border border-[#303030] hover:border-[#F03B2E]/40 text-xs font-bold uppercase tracking-wider text-[#B8B8B8] hover:text-[#FF493B] flex items-center justify-center gap-2.5 cursor-pointer"
                        >
                          <Power className="w-4 h-4 shrink-0" />
                          <span>Deactivate Account</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => requestStatusChange(actionSheetTrainer, 'ACTIVE')}
                        className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="truncate">
                          {actionSheetTrainer.status === 'SUSPENDED' ? 'Reactivate' : 'Activate'}
                        </span>
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="pt-2 border-t border-[#252525]">
                <button
                  type="button"
                  onClick={() => requestDeleteTrainer(actionSheetTrainer)}
                  className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-[#F03B2E]/12 hover:bg-[#F03B2E]/25 border border-[#F03B2E]/40 text-xs font-bold uppercase tracking-wider text-[#FF493B] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>Delete Trainer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRMATION DIALOG (Mobile & Desktop) ── */}
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
                className="mm-btn-secondary min-h-[44px] rounded-lg w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`min-h-[44px] px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white cursor-pointer w-full sm:w-auto ${
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

      {/* ── MODAL: INVITATION / MANUAL LINK RESULT ── */}
      {invitationModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={invitationModal.title}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setInvitationModal(null)}
        >
          <div
            className="bg-[#181818] border-t sm:border border-[#303030] rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl pb-[env(safe-area-inset-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#252525] flex items-start justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <span className="font-label text-[#F03B2E] block mb-1">
                  {invitationModal.emailDelivered ? 'EMAIL DELIVERED' : 'MANUAL INVITATION WORKFLOW'}
                </span>
                <h3 className="mm-page-title text-lg sm:text-xl truncate">{invitationModal.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setInvitationModal(null)}
                aria-label="Close modal"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#202020] text-[#B8B8B8] hover:text-white border border-[#303030] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto overscroll-contain space-y-3 text-xs text-[#B8B8B8]">
              <p className="break-words">
                Coach: <strong className="text-[#F5F5F5]">{invitationModal.trainerName}</strong> ({invitationModal.email})
              </p>

              {invitationModal.emailDelivered ? (
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 leading-relaxed">
                  {invitationModal.emailNotice}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/35 text-amber-200 leading-relaxed">
                    <strong>
                      {invitationModal.emailConfigured
                        ? 'Automated email could not be delivered from this server.'
                        : 'Email invitations are not configured on this server.'}
                    </strong>{' '}
                    {invitationModal.emailNotice || 'Share the secure single-use link below directly with the coach.'}
                  </div>

                  {invitationModal.manualUrl && (
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#F5F5F5]">
                        Secure Single-Use {invitationModal.linkType === 'reset' ? 'Reset' : 'Activation'} Link
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={invitationModal.manualUrl}
                          className="mm-input font-mono text-xs flex-1 min-h-[44px]"
                          onFocus={(e) => e.target.select()}
                        />
                        <button
                          type="button"
                          onClick={() => handleCopyManualUrl(invitationModal.manualUrl)}
                          className="mm-btn-primary !py-2.5 !px-4 min-h-[44px] rounded-lg shrink-0"
                        >
                          {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-[#858585]">
                        This link is single-use and expires in{' '}
                        {invitationModal.linkType === 'reset' ? '30 minutes' : '24 hours'}. Only its cryptographic hash is stored in MongoDB, so it cannot be retrieved again once closed.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-[#252525] flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setInvitationModal(null)}
                className="mm-btn-secondary min-h-[44px] rounded-lg w-full sm:w-auto"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD TRAINER MODAL (NO PLAINTEXT PASSWORD) ── */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Invite New Trainer"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="bg-[#181818] border-t sm:border border-[#303030] rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl pb-[env(safe-area-inset-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#252525] flex items-center justify-between shrink-0">
              <div>
                <span className="font-label text-[#F03B2E] block">SECURE ONBOARDING</span>
                <h3 className="mm-page-title text-lg sm:text-xl">INVITE NEW TRAINER</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close modal"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#202020] text-[#B8B8B8] hover:text-white border border-[#303030] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-5 overflow-y-auto overscroll-contain space-y-3.5 flex-1">
                {addError && (
                  <div className="p-3 rounded-lg bg-[#F03B2E]/10 border border-[#F03B2E] text-xs text-[#F5F5F5]">
                    {addError}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#B8B8B8] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="mm-input min-h-[44px] text-xs"
                    placeholder="e.g. Master Coach Vignesh"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#B8B8B8] mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={addForm.email}
                      onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                      className="mm-input min-h-[44px] text-xs"
                      placeholder="coach@domain.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#B8B8B8] mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      inputMode="tel"
                      required
                      value={addForm.phone}
                      onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                      className="mm-input min-h-[44px] text-xs"
                      placeholder="9842100000 or +91 98421 00000"
                    />
                    <span className="text-[10px] text-[#858585] mt-1 block">
                      10 digits starting with 6–9 (optional +91 or 0)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#B8B8B8] mb-1">
                      Assigned Branch *
                    </label>
                    <select
                      required
                      value={addForm.branchId}
                      onChange={(e) => setAddForm({ ...addForm, branchId: e.target.value })}
                      className="mm-select min-h-[44px] text-xs"
                    >
                      {branches.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.city} Branch
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#B8B8B8] mb-1">
                      Employment Status
                    </label>
                    <select
                      value={addForm.employmentStatus}
                      onChange={(e) => setAddForm({ ...addForm, employmentStatus: e.target.value })}
                      className="mm-select min-h-[44px] text-xs"
                    >
                      <option value="FULL_TIME">Full Time</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="CONTRACT">Contract</option>
                      <option value="FREELANCE">Freelance</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#B8B8B8] mb-1">
                      Specialization *
                    </label>
                    <input
                      type="text"
                      required
                      value={addForm.specialization}
                      onChange={(e) => setAddForm({ ...addForm, specialization: e.target.value })}
                      className="mm-input min-h-[44px] text-xs"
                      placeholder="Strength & Conditioning"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#B8B8B8] mb-1">
                      Experience (Years)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={addForm.experienceYears}
                      onChange={(e) => setAddForm({ ...addForm, experienceYears: e.target.value })}
                      className="mm-input min-h-[44px] text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#B8B8B8] mb-1">
                      Qualification (Optional)
                    </label>
                    <input
                      type="text"
                      value={addForm.qualification}
                      onChange={(e) => setAddForm({ ...addForm, qualification: e.target.value })}
                      className="mm-input min-h-[44px] text-xs"
                      placeholder="e.g. ACE Certified / CSCS"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#B8B8B8] mb-1">
                      Profile Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={addForm.profileImage}
                      onChange={(e) => setAddForm({ ...addForm, profileImage: e.target.value })}
                      className="mm-input min-h-[44px] text-xs"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <p className="text-[11px] text-[#858585] bg-[#111111] border border-[#252525] p-3 rounded-lg">
                  Account status starts as <strong>PENDING_ACTIVATION</strong>. The coach sets their own password privately via a single-use 24-hour invitation link.
                </p>
              </div>

              <div className="px-5 py-4 border-t border-[#252525] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0 bg-[#181818]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="mm-btn-secondary min-h-[44px] rounded-lg w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="mm-btn-primary min-h-[44px] rounded-lg w-full sm:w-auto"
                >
                  {submittingAdd ? 'Creating...' : 'Create & Generate Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TRAINER DOSSIER MODAL ── */}
      {selectedTrainerDetails && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Trainer dossier for ${selectedTrainerDetails.trainer.name}`}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedTrainerDetails(null)}
        >
          <div
            className="bg-[#181818] border-t sm:border border-[#303030] rounded-t-2xl sm:rounded-xl w-full sm:max-w-xl max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl pb-[env(safe-area-inset-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#252525] flex items-start justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <span className="font-label text-[#F03B2E] block mb-0.5">COACH DOSSIER</span>
                <h3 className="mm-page-title text-lg sm:text-xl truncate">
                  {selectedTrainerDetails.trainer.name}
                </h3>
                <span className="text-xs text-[#B8B8B8] font-mono block truncate">
                  {selectedTrainerDetails.trainer.branch?.city} Branch •{' '}
                  {selectedTrainerDetails.trainer.specialization}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTrainerDetails(null)}
                aria-label="Close trainer dossier"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#202020] text-[#B8B8B8] hover:text-white border border-[#303030] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto overscroll-contain space-y-5 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#111111] p-3.5 rounded-lg border border-[#252525]">
                <div>
                  <span className="text-[10px] font-mono text-[#858585] block">STATUS</span>
                  <div className="mt-1">{renderStatusBadge(selectedTrainerDetails.trainer.status)}</div>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-[#858585] block">INVITATION</span>
                  <div className="mt-1">{renderInvitationBadge(selectedTrainerDetails.trainer.invitationStatus)}</div>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono text-[#858585] block">EMAIL</span>
                  <span className="text-[#F5F5F5] break-all">{selectedTrainerDetails.trainer.email}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-[#858585] block">PHONE</span>
                  <span className="font-mono text-[#F5F5F5]">{selectedTrainerDetails.trainer.phone}</span>
                </div>
              </div>

              <div>
                <span className="font-label text-[#F03B2E] block mb-2">
                  ASSIGNED ATHLETES ({selectedTrainerDetails.assignedClients?.length || 0})
                </span>
                <div className="bg-[#111111] border border-[#303030] rounded-lg divide-y divide-[#252525] max-h-48 overflow-y-auto">
                  {selectedTrainerDetails.assignedClients?.length > 0 ? (
                    selectedTrainerDetails.assignedClients.map((client) => (
                      <div key={client._id} className="p-3 flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <span className="font-bold text-[#F5F5F5] block truncate">{client.name}</span>
                          <span className="text-[10px] text-[#858585] font-mono break-all block">
                            {client.phone} • {client.email}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 shrink-0">
                          {client.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-[#B8B8B8]">
                      No clients currently assigned to this coach.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <span className="font-label text-[#B8B8B8] block mb-2">
                  ACTIVE WORKOUT PLANS ({selectedTrainerDetails.workoutPlans?.length || 0})
                </span>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedTrainerDetails.workoutPlans?.length > 0 ? (
                    selectedTrainerDetails.workoutPlans.map((wp) => (
                      <div
                        key={wp._id}
                        className="p-2.5 rounded-lg bg-[#111111] border border-[#252525] flex justify-between items-center gap-2 text-xs"
                      >
                        <span className="font-semibold text-[#F5F5F5] truncate">{wp.title}</span>
                        <span className="text-[10px] font-mono text-[#F03B2E] shrink-0">
                          For: {wp.assignedTo?.name || 'Template'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#858585] italic">No workout plans assigned yet.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-[#252525] flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedTrainerDetails(null)}
                className="mm-btn-secondary min-h-[44px] rounded-lg w-full sm:w-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT TRAINER MODAL ── */}
      {editingTrainer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Edit ${editingTrainer.name}`}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setEditingTrainer(null)}
        >
          <div
            className="bg-[#181818] border-t sm:border border-[#303030] rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl pb-[env(safe-area-inset-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#252525] flex items-center justify-between shrink-0">
              <div>
                <span className="font-label text-[#F03B2E] block">UPDATE RECORD</span>
                <h3 className="mm-page-title text-lg sm:text-xl">EDIT TRAINER PROFILE</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTrainer(null)}
                aria-label="Close edit modal"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#202020] text-[#B8B8B8] hover:text-white border border-[#303030] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-5 overflow-y-auto overscroll-contain space-y-3 flex-1">
                {editError && (
                  <div className="p-3 rounded-lg bg-[#F03B2E]/10 border border-[#F03B2E] text-xs text-[#F5F5F5]">
                    {editError}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#B8B8B8] mb-1">
                    Coach Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="mm-input min-h-[44px] text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-[#B8B8B8] mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      inputMode="tel"
                      required
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="mm-input min-h-[44px] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-[#B8B8B8] mb-1">
                      Branch
                    </label>
                    <select
                      value={editForm.branchId}
                      onChange={(e) => setEditForm({ ...editForm, branchId: e.target.value })}
                      className="mm-select min-h-[44px] text-xs"
                    >
                      {branches.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.city}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-[#B8B8B8] mb-1">
                      Specialization
                    </label>
                    <input
                      type="text"
                      value={editForm.specialization}
                      onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                      className="mm-input min-h-[44px] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-[#B8B8B8] mb-1">
                      Experience (Yrs)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.experienceYears}
                      onChange={(e) => setEditForm({ ...editForm, experienceYears: e.target.value })}
                      className="mm-input min-h-[44px] text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-[#B8B8B8] mb-1">
                      Qualification
                    </label>
                    <input
                      type="text"
                      value={editForm.qualification}
                      onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
                      className="mm-input min-h-[44px] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-[#B8B8B8] mb-1">
                      Employment
                    </label>
                    <select
                      value={editForm.employmentStatus}
                      onChange={(e) => setEditForm({ ...editForm, employmentStatus: e.target.value })}
                      className="mm-select min-h-[44px] text-xs"
                    >
                      <option value="FULL_TIME">Full Time</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="CONTRACT">Contract</option>
                      <option value="FREELANCE">Freelance</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-[#252525] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0 bg-[#181818]">
                <button
                  type="button"
                  onClick={() => setEditingTrainer(null)}
                  className="mm-btn-secondary min-h-[44px] rounded-lg w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="mm-btn-primary min-h-[44px] rounded-lg w-full sm:w-auto"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
