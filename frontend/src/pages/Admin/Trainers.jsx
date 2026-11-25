import React, { useState, useEffect } from 'react';
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
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState(selectedBranch);

  // Action busy state
  const [actionBusyId, setActionBusyId] = useState(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTrainerDetails, setSelectedTrainerDetails] = useState(null);
  const [editingTrainer, setEditingTrainer] = useState(null);
  const [invitationModal, setInvitationModal] = useState(null);
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
  }, [selectedBranch]);

  const fetchTrainers = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, bRes] = await Promise.all([
        adminService.getTrainers({
          branchId: branchFilter,
          search,
        }),
        adminService
          .getTrainerBookings({
            branchId: branchFilter,
          })
          .catch(() => ({ bookings: [] })),
      ]);
      setTrainers(res.trainers || []);
      setBookings(bRes.bookings || []);
    } catch (err) {
      setError(err.message || 'Failed to load trainers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainers();
  }, [branchFilter]);

  const handleConfirmBookingPayment = async (bookingId) => {
    try {
      setConfirmingId(bookingId);
      await adminService.confirmTrainerBookingPayment(bookingId, { paymentMethod: 'CASH' });
      await fetchTrainers();
    } catch (err) {
      alert(err.message || 'Failed to confirm booking payment');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTrainers();
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
      setAddError('Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9 (e.g. 9876543210 or +91 9876543210).');
      return;
    }
    try {
      setSubmittingAdd(true);
      const res = await adminService.createTrainer(addForm);
      setIsAddModalOpen(false);
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
    try {
      const res = await adminService.getTrainerDetails(id);
      setSelectedTrainerDetails(res);
    } catch (err) {
      alert(err.message || 'Failed to load trainer dossier');
    }
  };

  const handleOpenEdit = (t) => {
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
    try {
      await adminService.updateTrainer(editingTrainer.id, editForm);
      setEditingTrainer(null);
      await fetchTrainers();
      if (selectedTrainerDetails) handleOpenDetails(editingTrainer.id);
    } catch (err) {
      alert(err.message || 'Failed to update trainer');
    }
  };

  const handleStatusChange = async (t, targetStatus) => {
    const labelMap = {
      ACTIVE: 'activate',
      SUSPENDED: 'suspend',
      INACTIVE: 'deactivate',
    };
    if (!window.confirm(`Are you sure you want to ${labelMap[targetStatus] || 'update'} ${t.name}?`)) return;
    try {
      setActionBusyId(t.id);
      await adminService.updateTrainerStatus(t.id, targetStatus);
      await fetchTrainers();
    } catch (err) {
      alert(err.message || 'Failed to update trainer status');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleResendInvitation = async (t) => {
    if (!window.confirm(`Generate and send a fresh 24-hour invitation for ${t.name}? Previous invitation links will be invalidated.`)) return;
    try {
      setActionBusyId(t.id);
      const res = await adminService.resendTrainerInvitation(t.id);
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
      alert(err.message || 'Failed to resend invitation');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleAdminResetPassword = async (t) => {
    if (!window.confirm(`Initiate a secure password reset for ${t.name}? Active trainer sessions will be invalidated immediately.`)) return;
    try {
      setActionBusyId(t.id);
      const res = await adminService.resetTrainerPassword(t.id);
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
      alert(err.message || 'Failed to initiate password reset');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleCopyManualUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      alert('Please copy the URL manually from the field.');
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> ACTIVE
          </span>
        );
      case 'PENDING_ACTIVATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" /> PENDING_ACTIVATION
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#EB3E2E]/15 text-[#FF493B] border border-[#EB3E2E]/40">
            <PauseCircle className="w-3 h-3" /> SUSPENDED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#202020] text-[#858585] border border-[#303030]">
            INACTIVE
          </span>
        );
    }
  };

  const renderInvitationBadge = (invStatus) => {
    switch (invStatus) {
      case 'ACTIVATED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            ACTIVATED
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#EB3E2E]/15 text-[#FF493B] border border-[#EB3E2E]/35">
            EXPIRED
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/25">
            INVITE PENDING
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#202020] text-[#858585] border border-[#303030]">
            {invStatus || '—'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
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
          className="mm-btn-primary rounded-lg shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Trainer</span>
        </button>
      </div>

      {/* ── TABS ── */}
      <div className="flex items-center gap-2 border-b border-[#252525] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('ROSTER')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'ROSTER'
              ? 'bg-[#EB3E2E] text-white'
              : 'text-[#B8B8B8] hover:text-white bg-[#181818] border border-[#303030]'
          }`}
        >
          Coaching Staff ({trainers.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('BOOKINGS')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'BOOKINGS'
              ? 'bg-[#EB3E2E] text-white'
              : 'text-[#B8B8B8] hover:text-white bg-[#181818] border border-[#303030]'
          }`}
        >
          Client Bookings &amp; Payments ({bookings.length})
        </button>
      </div>

      {/* ── SEARCH & FILTERS ── */}
      <div className="bg-[#181818] border border-[#303030] rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-[#858585] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trainers by name, phone, or email..."
            className="mm-input pl-9 text-xs"
          />
        </form>

        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="mm-select md:w-52 text-xs cursor-pointer"
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
        <div className="bg-[#EB3E2E]/10 border border-[#EB3E2E]/40 rounded-xl p-4 flex items-center justify-between gap-3 text-[#FF493B]">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Trainer Sync Error</p>
              <p className="text-xs text-[#B8B8B8]">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchTrainers}
            className="mm-btn-secondary !py-1.5 !px-3 text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── ROSTER VIEW (TABLE ON DESKTOP, CARDS ON MOBILE) ── */}
      {activeTab === 'ROSTER' ? (
        loading ? (
          <div className="py-12 text-center text-xs text-[#B8B8B8]">Loading coaching staff...</div>
        ) : trainers.length === 0 ? (
          <div className="bg-[#181818] border border-[#303030] rounded-xl py-12 text-center space-y-2">
            <p className="text-sm font-bold text-[#F5F5F5]">No trainers found</p>
            <p className="text-xs text-[#858585]">Click Add Trainer to invite a coach.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden xl:block bg-[#181818] border border-[#303030] rounded-xl overflow-hidden">
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
                                <div className="w-9 h-9 rounded-lg bg-[#202020] border border-[#303030] flex items-center justify-center text-[#EB3E2E] font-bold text-xs shrink-0">
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
                            <div className="text-xs font-semibold text-[#EB3E2E]">
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
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(t)}
                                className="p-2 rounded-lg bg-[#202020] hover:bg-[#303030] text-[#B8B8B8] hover:text-white cursor-pointer"
                                title="Edit Trainer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {t.status === 'PENDING_ACTIVATION' ? (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleResendInvitation(t)}
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
                                    onClick={() => handleAdminResetPassword(t)}
                                    className="p-2 rounded-lg bg-[#202020] hover:bg-[#EB3E2E]/20 text-[#B8B8B8] hover:text-[#EB3E2E] cursor-pointer"
                                    title="Send Secure Password Reset Link"
                                  >
                                    <KeyRound className="w-3.5 h-3.5" />
                                  </button>

                                  {t.status === 'ACTIVE' ? (
                                    <>
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => handleStatusChange(t, 'SUSPENDED')}
                                        className="p-2 rounded-lg bg-[#202020] hover:bg-amber-500/20 text-[#B8B8B8] hover:text-amber-400 cursor-pointer"
                                        title="Suspend Trainer"
                                      >
                                        <PauseCircle className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => handleStatusChange(t, 'INACTIVE')}
                                        className="p-2 rounded-lg bg-[#202020] hover:bg-[#EB3E2E]/20 text-[#B8B8B8] hover:text-[#FF493B] cursor-pointer"
                                        title="Deactivate Trainer"
                                      >
                                        <Power className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => handleStatusChange(t, 'ACTIVE')}
                                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                                      title="Activate Trainer"
                                    >
                                      Activate
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Responsive Cards (< xl) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:hidden">
              {trainers.map((t) => {
                const busy = actionBusyId === t.id;
                return (
                  <div
                    key={t.id}
                    className="bg-[#181818] border border-[#303030] rounded-xl p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#202020] border border-[#303030] flex items-center justify-center text-[#EB3E2E] font-bold text-sm shrink-0">
                            {t.name ? t.name[0].toUpperCase() : 'T'}
                          </div>
                          <div>
                            <h3 className="font-display text-lg font-bold uppercase text-[#F5F5F5]">
                              {t.name}
                            </h3>
                            <span className="text-[11px] font-mono text-[#858585]">
                              {t.branch?.city || 'HQ'} • {t.experienceYears} yrs exp
                            </span>
                          </div>
                        </div>
                        {renderStatusBadge(t.status)}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <span className="text-xs font-semibold text-[#EB3E2E]">{t.specialization}</span>
                        {renderInvitationBadge(t.invitationStatus)}
                      </div>

                      <div className="space-y-1 text-xs text-[#B8B8B8] border-t border-[#252525] pt-3">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-[#EB3E2E]" />
                          <span className="truncate">{t.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-[#EB3E2E]" />
                          <span className="font-mono">{t.phone}</span>
                        </div>
                        <div className="text-[10px] font-mono text-[#858585] pt-1">
                          Added: {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#252525]">
                      <button
                        type="button"
                        onClick={() => handleOpenDetails(t.id)}
                        className="flex-1 py-2 px-3 rounded-lg bg-[#202020] hover:bg-[#303030] text-xs font-bold uppercase text-[#F5F5F5]"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(t)}
                        className="py-2 px-3 rounded-lg bg-[#202020] hover:bg-[#303030] text-xs font-bold uppercase text-[#B8B8B8]"
                      >
                        Edit
                      </button>
                      {t.status === 'PENDING_ACTIVATION' ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleResendInvitation(t)}
                          className="py-2 px-3 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase"
                        >
                          Resend Invite
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleAdminResetPassword(t)}
                            className="py-2 px-3 rounded-lg bg-[#202020] text-xs font-bold uppercase text-[#B8B8B8]"
                          >
                            Reset PW
                          </button>
                          {t.status === 'ACTIVE' ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleStatusChange(t, 'SUSPENDED')}
                              className="py-2 px-3 rounded-lg bg-[#EB3E2E]/15 text-[#FF493B] text-xs font-bold uppercase"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleStatusChange(t, 'ACTIVE')}
                              className="py-2 px-3 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-bold uppercase"
                            >
                              Activate
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )
      ) : (
        /* ── BOOKINGS & PAYMENTS TABLE ── */
        <div className="bg-[#181818] border border-[#303030] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#252525] flex items-center justify-between">
            <span className="font-display text-sm font-bold uppercase tracking-wider text-[#F5F5F5]">
              CLIENT-TO-COACH BOOKING LEDGER ({bookings.length})
            </span>
            <span className="text-[11px] text-[#858585]">Desk payment verification &amp; assignments</span>
          </div>

          {bookings.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#B8B8B8]">No trainer bookings recorded yet.</div>
          ) : (
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
                        <td className="font-semibold text-[#EB3E2E]">{b.trainerId?.name}</td>
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
                                : 'bg-[#EB3E2E]/10 text-[#EB3E2E] border border-[#EB3E2E]/30'
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
          )}
        </div>
      )}

      {/* ── MODAL: INVITATION / MANUAL LINK RESULT ── */}
      {invitationModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setInvitationModal(null)}
        >
          <div
            className="bg-[#181818] border border-[#303030] rounded-xl w-full max-w-lg p-6 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#252525] pb-4">
              <div>
                <span className="font-label text-[#EB3E2E] block mb-1">
                  {invitationModal.emailDelivered ? 'EMAIL DELIVERED' : 'MANUAL INVITATION WORKFLOW'}
                </span>
                <h3 className="mm-page-title text-xl">{invitationModal.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setInvitationModal(null)}
                className="p-1.5 rounded-lg bg-[#202020] text-[#B8B8B8] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#B8B8B8]">
              <p>
                Coach: <strong className="text-[#F5F5F5]">{invitationModal.trainerName}</strong> ({invitationModal.email})
              </p>

              {invitationModal.emailDelivered ? (
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 leading-relaxed">
                  {invitationModal.emailNotice}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/35 text-amber-200 leading-relaxed">
                    <strong>Email invitations are not configured on this server.</strong>{' '}
                    {invitationModal.emailNotice || 'Share the secure single-use link below directly with the coach.'}
                  </div>

                  {invitationModal.manualUrl && (
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#F5F5F5]">
                        Secure Single-Use {invitationModal.linkType === 'reset' ? 'Reset' : 'Activation'} Link
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={invitationModal.manualUrl}
                          className="mm-input font-mono text-xs flex-1"
                          onFocus={(e) => e.target.select()}
                        />
                        <button
                          type="button"
                          onClick={() => handleCopyManualUrl(invitationModal.manualUrl)}
                          className="mm-btn-primary !py-2.5 !px-4 rounded-lg shrink-0"
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

            <div className="flex justify-end pt-2 border-t border-[#252525]">
              <button
                type="button"
                onClick={() => setInvitationModal(null)}
                className="mm-btn-secondary rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD TRAINER MODAL (NO PLAINTEXT PASSWORD) ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#303030] rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#252525] pb-3 mb-4">
              <div>
                <span className="font-label text-[#EB3E2E] block">SECURE ONBOARDING</span>
                <h3 className="mm-page-title text-xl">INVITE NEW TRAINER</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#202020] text-[#B8B8B8] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addError && (
              <div className="mb-4 p-3 rounded-lg bg-[#EB3E2E]/10 border border-[#EB3E2E] text-xs text-[#F5F5F5]">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#B8B8B8] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="mm-input text-xs"
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
                    className="mm-input text-xs"
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
                    className="mm-input text-xs"
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
                    className="mm-select text-xs"
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
                    className="mm-select text-xs"
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
                    className="mm-input text-xs"
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
                    className="mm-input text-xs"
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
                    className="mm-input text-xs"
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
                    className="mm-input text-xs"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <p className="text-[11px] text-[#858585] bg-[#111111] border border-[#252525] p-3 rounded-lg">
                Account status starts as <strong>PENDING_ACTIVATION</strong>. The coach sets their own password privately via a single-use 24-hour invitation link.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="mm-btn-secondary rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="mm-btn-primary rounded-lg"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#303030] rounded-xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between border-b border-[#252525] pb-4">
              <div>
                <h3 className="mm-page-title text-xl">{selectedTrainerDetails.trainer.name}</h3>
                <span className="text-xs text-[#B8B8B8] font-mono">
                  {selectedTrainerDetails.trainer.branch?.city} Branch •{' '}
                  {selectedTrainerDetails.trainer.specialization}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTrainerDetails(null)}
                className="p-1.5 rounded-lg bg-[#202020] text-[#B8B8B8] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-[#111111] p-3.5 rounded-lg border border-[#252525]">
              <div>
                <span className="text-[10px] font-mono text-[#858585] block">STATUS</span>
                <div className="mt-1">{renderStatusBadge(selectedTrainerDetails.trainer.status)}</div>
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#858585] block">INVITATION</span>
                <div className="mt-1">{renderInvitationBadge(selectedTrainerDetails.trainer.invitationStatus)}</div>
              </div>
            </div>

            <div>
              <span className="font-label text-[#EB3E2E] block mb-2">
                ASSIGNED ATHLETES ({selectedTrainerDetails.assignedClients?.length || 0})
              </span>
              <div className="bg-[#111111] border border-[#303030] rounded-lg divide-y divide-[#252525] max-h-48 overflow-y-auto">
                {selectedTrainerDetails.assignedClients?.length > 0 ? (
                  selectedTrainerDetails.assignedClients.map((client) => (
                    <div key={client._id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#F5F5F5] block">{client.name}</span>
                        <span className="text-[10px] text-[#858585] font-mono">
                          {client.phone} • {client.email}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400">
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
                      className="p-2.5 rounded-lg bg-[#111111] border border-[#252525] flex justify-between items-center text-xs"
                    >
                      <span className="font-semibold text-[#F5F5F5]">{wp.title}</span>
                      <span className="text-[10px] font-mono text-[#EB3E2E]">
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
        </div>
      )}

      {/* ── EDIT TRAINER MODAL ── */}
      {editingTrainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#303030] rounded-xl w-full max-w-md p-6">
            <h3 className="mm-page-title text-xl mb-4">EDIT TRAINER PROFILE</h3>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-[#B8B8B8] mb-1">
                  Coach Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="mm-input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#B8B8B8] mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="mm-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#B8B8B8] mb-1">
                    Branch
                  </label>
                  <select
                    value={editForm.branchId}
                    onChange={(e) => setEditForm({ ...editForm, branchId: e.target.value })}
                    className="mm-select text-xs"
                  >
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#B8B8B8] mb-1">
                    Specialization
                  </label>
                  <input
                    type="text"
                    value={editForm.specialization}
                    onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                    className="mm-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#B8B8B8] mb-1">
                    Experience (Yrs)
                  </label>
                  <input
                    type="number"
                    value={editForm.experienceYears}
                    onChange={(e) => setEditForm({ ...editForm, experienceYears: e.target.value })}
                    className="mm-input text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#B8B8B8] mb-1">
                    Qualification
                  </label>
                  <input
                    type="text"
                    value={editForm.qualification}
                    onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
                    className="mm-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#B8B8B8] mb-1">
                    Employment
                  </label>
                  <select
                    value={editForm.employmentStatus}
                    onChange={(e) => setEditForm({ ...editForm, employmentStatus: e.target.value })}
                    className="mm-select text-xs"
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="FREELANCE">Freelance</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingTrainer(null)}
                  className="mm-btn-secondary rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="mm-btn-primary rounded-lg">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
