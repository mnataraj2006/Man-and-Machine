import React, { useState, useEffect } from 'react';
import {
  Dumbbell,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  Award,
  Users,
  Building,
  Edit,
  Power,
  CheckCircle2,
  XCircle,
  Eye,
  Activity,
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

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTrainerDetails, setSelectedTrainerDetails] = useState(null);
  const [editingTrainer, setEditingTrainer] = useState(null);

  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'Password@123',
    branchId: '',
    specialization: 'Strength & Conditioning',
    experienceYears: 4,
    bio: '',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    branchId: '',
    specialization: '',
    experienceYears: 4,
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
        adminService.getTrainerBookings({
          branchId: branchFilter,
        }).catch(() => ({ bookings: [] })),
      ]);
      setTrainers(res.trainers || []);
      setBookings(bRes.bookings || []);
    } catch (err) {
      setError(err.message || 'Failed to load trainers');
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    fetchTrainers();
  }, [branchFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTrainers();
  };

  const handleOpenAdd = () => {
    setAddForm({
      name: '',
      email: '',
      phone: '',
      password: 'Password@123',
      branchId: branches[0]?._id || '',
      specialization: 'Strength & Conditioning',
      experienceYears: 4,
      bio: '',
    });
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminService.createTrainer(addForm);
      setIsAddModalOpen(false);
      fetchTrainers();
      alert('Trainer account created successfully!');
    } catch (err) {
      alert(err.message || 'Failed to onboard trainer');
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
      name: t.name,
      phone: t.phone,
      branchId: t.branch?._id || '',
      specialization: t.specialization || '',
      experienceYears: t.experienceYears || 3,
      bio: t.bio || '',
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminService.updateTrainer(editingTrainer.id, editForm);
      setEditingTrainer(null);
      fetchTrainers();
      if (selectedTrainerDetails) handleOpenDetails(editingTrainer.id);
      alert('Trainer updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update trainer');
    }
  };

  const handleToggleStatus = async (t) => {
    const newSt = t.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!window.confirm(`Set status for ${t.name} to ${newSt}?`)) return;
    try {
      await adminService.updateTrainer(t.id, { status: newSt });
      fetchTrainers();
    } catch (err) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2
            className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#F5F5F5]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            TRAINER ROSTER &amp; COACHING STAFF
          </h2>
          <p className="text-xs text-[#A3A3A3]">
            Managing certified coaches, branch assignments, and client rosters.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] hover:bg-[#F09A43] text-black transition-all cursor-pointer shadow-lg shadow-[#E58A32]/10"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          <Plus className="w-4 h-4" />
          <span>Add Trainer</span>
        </button>
      </div>

      {/* ── TABS ── */}
      <div className="flex items-center gap-2 border-b border-[#292929] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('ROSTER')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'ROSTER'
              ? 'bg-[#E58A32] text-black shadow-md shadow-[#E58A32]/20'
              : 'text-[#A3A3A3] hover:text-white bg-[#141414] border border-[#292929]'
          }`}
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Coaching Staff Roster ({trainers.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('BOOKINGS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'BOOKINGS'
              ? 'bg-[#E58A32] text-black shadow-md shadow-[#E58A32]/20'
              : 'text-[#A3A3A3] hover:text-white bg-[#141414] border border-[#292929]'
          }`}
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Client Bookings &amp; Payments ({bookings.length})
        </button>
      </div>

      {/* ── SEARCH & FILTERS ── */}
      <div className="bg-[#141414] border border-[#292929] rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-[#A3A3A3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trainers by name, phone, or email..."
            className="w-full pl-9 pr-4 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] placeholder-[#A3A3A3] focus:border-[#E58A32] focus:outline-none"
          />
        </form>

        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="px-3 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none cursor-pointer"
        >
          <option value="ALL">All Branches</option>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>
              {b.city} Branch
            </option>
          ))}
        </select>
      </div>

      {/* ── ERROR NOTICE & RETRY ── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 text-red-400">
          <div className="flex items-center gap-2.5">
            <Power className="w-5 h-5 shrink-0 rotate-90" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Trainer Staff Sync Error</p>
              <p className="text-xs text-red-300/80">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchTrainers}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs font-bold uppercase text-red-300 transition-colors cursor-pointer"
          >
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* ── TRAINER CARDS GRID / CLIENT BOOKINGS ── */}
      {activeTab === 'ROSTER' ? (
        loading ? (
          <div className="py-12 text-center text-xs text-[#A3A3A3]">Loading coaching staff...</div>
        ) : trainers.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#A3A3A3]">No trainers found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainers.map((t) => (
              <div
                key={t.id || t._id}
                className={`bg-[#181818] border ${
                  t.status === 'ACTIVE' ? 'border-[#292929] hover:border-[#E58A32]/50' : 'border-red-500/30 opacity-75'
                } rounded-2xl p-5 flex flex-col justify-between transition-all`}
              >
                <div>
                  {/* Header Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-sm shrink-0">
                        {t.name ? t.name[0].toUpperCase() : 'T'}
                      </div>
                      <div className="flex flex-col">
                        <h3
                          className="text-base font-bold uppercase text-[#F5F5F5]"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {t.name}
                        </h3>
                        <span className="text-[10px] text-[#A3A3A3] font-mono">
                          {t.branch?.city || 'HQ'} Hub • {t.experienceYears} Years Exp
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(t)}
                        className="p-1.5 rounded-lg bg-[#222222] hover:bg-[#292929] text-[#A3A3A3] hover:text-white"
                        title="Edit Trainer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(t)}
                        className={`p-1.5 rounded-lg ${
                          t.status === 'ACTIVE' ? 'bg-[#222222] text-[#A3A3A3] hover:text-red-400' : 'bg-green-500/20 text-green-400'
                        }`}
                        title={t.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Specialization */}
                  <div className="p-2.5 rounded-xl bg-[#121212] border border-[#222222] text-xs mb-3">
                    <span className="text-[10px] font-mono text-[#A3A3A3] uppercase block">Specialization:</span>
                    <span className="font-semibold text-[#E58A32]">{t.specialization}</span>
                  </div>

                  {/* Assigned Clients Metrics */}
                  <div className="grid grid-cols-2 gap-2 mb-3 bg-[#141414] p-3 rounded-xl border border-[#292929]">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#A3A3A3]">ASSIGNED CLIENTS</span>
                      <p className="text-base font-bold text-[#F5F5F5]">{t.assignedClientCount} Athletes</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#A3A3A3]">WORKOUT ROUTINES</span>
                      <p className="text-base font-bold text-green-400">{t.assignedWorkoutsCount} Plans</p>
                    </div>
                  </div>

                  {/* Contact info */}
                  <div className="space-y-1.5 text-xs text-[#A3A3A3]">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#E58A32]" />
                      <span className="font-mono">{t.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#E58A32]" />
                      <span className="truncate">{t.email}</span>
                    </div>
                  </div>
                </div>

                {/* View Dossier Button */}
                <button
                  type="button"
                  onClick={() => handleOpenDetails(t.id || t._id)}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#222222] hover:bg-[#E58A32] hover:text-black text-[#F5F5F5] transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Assigned Clients</span>
                </button>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ── BOOKINGS & PAYMENTS TABLE ── */
        <div className="bg-[#141414] border border-[#292929] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#292929] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              CLIENT-TO-COACH BOOKING LEDGER ({bookings.length})
            </span>
            <span className="text-[11px] text-[#A3A3A3]">Manage desk verification &amp; assignments</span>
          </div>

          {bookings.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#A3A3A3]">No trainer bookings recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#292929] bg-[#181818] text-[#A3A3A3] font-mono text-[10px] uppercase">
                    <th className="p-3.5">Ref Code</th>
                    <th className="p-3.5">Athlete Client</th>
                    <th className="p-3.5">Assigned Coach</th>
                    <th className="p-3.5">Session Date &amp; Time</th>
                    <th className="p-3.5">Service Pack</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Payment</th>
                    <th className="p-3.5">Booking Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242424]">
                  {bookings.map((b) => {
                    const isPending = b.bookingStatus === 'PENDING_PAYMENT' || b.paymentStatus === 'PENDING_PAYMENT';
                    return (
                      <tr key={b._id} className="hover:bg-[#1a1a1a] transition-colors">
                        <td className="p-3.5 font-mono text-white font-bold">{b.bookingReference}</td>
                        <td className="p-3.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-[#F5F5F5]">{b.clientId?.name}</span>
                            <span className="text-[10px] text-[#737373]">{b.clientId?.email}</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-[#E58A32]">{b.trainerId?.name}</span>
                        </td>
                        <td className="p-3.5 font-mono">
                          {new Date(b.date).toLocaleDateString()} @ {b.startTime}
                        </td>
                        <td className="p-3.5 uppercase text-[11px] font-medium">{b.serviceTitle}</td>
                        <td className="p-3.5 font-mono font-bold text-white">₹{b.amount}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              b.paymentStatus === 'PAID'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-[#E58A32]/10 text-[#E58A32] border border-[#E58A32]/30'
                            }`}
                          >
                            {b.paymentStatus}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              b.bookingStatus === 'CONFIRMED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {b.bookingStatus}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {isPending ? (
                            <button
                              type="button"
                              disabled={confirmingId === b._id}
                              onClick={() => handleConfirmBookingPayment(b._id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                            >
                              {confirmingId === b._id ? 'Verifying...' : 'Confirm & Assign'}
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-400 font-bold uppercase">Active Coach</span>
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

      {/* ── TRAINER DOSSIER MODAL ── */}
      {selectedTrainerDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#292929] rounded-2xl w-full max-w-xl p-6 relative max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between border-b border-[#292929] pb-4">
              <div>
                <h3
                  className="text-lg font-bold uppercase text-[#F5F5F5]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {selectedTrainerDetails.trainer.name}
                </h3>
                <span className="text-xs text-[#A3A3A3] font-mono">
                  {selectedTrainerDetails.trainer.branch?.city} Branch •{' '}
                  {selectedTrainerDetails.trainer.specialization}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTrainerDetails(null)}
                className="p-1.5 rounded-lg bg-[#222222] text-[#A3A3A3] hover:text-white"
              >
                &times; Close
              </button>
            </div>

            {/* Assigned Athletes List */}
            <div>
              <span className="text-xs font-mono uppercase text-[#E58A32] font-bold block mb-2">
                ASSIGNED ATHLETES ({selectedTrainerDetails.assignedClients?.length || 0})
              </span>
              <div className="bg-[#121212] border border-[#292929] rounded-xl divide-y divide-[#222222] max-h-48 overflow-y-auto">
                {selectedTrainerDetails.assignedClients?.length > 0 ? (
                  selectedTrainerDetails.assignedClients.map((client) => (
                    <div key={client._id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#F5F5F5] block">{client.name}</span>
                        <span className="text-[10px] text-[#A3A3A3] font-mono">{client.phone} • {client.email}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-green-500/10 text-green-400">
                        {client.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-[#A3A3A3]">
                    No clients currently assigned to this coach. (Clients can train self-managed).
                  </div>
                )}
              </div>
            </div>

            {/* Workout Plans Created */}
            <div>
              <span className="text-xs font-mono uppercase text-[#A3A3A3] font-bold block mb-2">
                ACTIVE WORKOUT PLANS ({selectedTrainerDetails.workoutPlans?.length || 0})
              </span>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedTrainerDetails.workoutPlans?.length > 0 ? (
                  selectedTrainerDetails.workoutPlans.map((wp) => (
                    <div key={wp._id} className="p-2.5 rounded-xl bg-[#121212] border border-[#222222] flex justify-between items-center text-xs">
                      <span className="font-semibold text-[#F5F5F5]">{wp.title}</span>
                      <span className="text-[10px] font-mono text-[#E58A32]">
                        For: {wp.assignedTo?.name || 'Template'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#A3A3A3] italic">No workout plans assigned yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD TRAINER MODAL ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#292929] rounded-2xl w-full max-w-md p-6 relative">
            <h3
              className="text-lg font-bold uppercase tracking-tight text-[#F5F5F5] mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Add New Trainer
            </h3>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none"
                  placeholder="e.g. Master Trainer Vignesh"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none"
                    placeholder="coach@domain.com"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none"
                    placeholder="9842100000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Branch</label>
                  <select
                    value={addForm.branchId}
                    onChange={(e) => setAddForm({ ...addForm, branchId: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none"
                  >
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.city}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    min="1"
                    value={addForm.experienceYears}
                    onChange={(e) => setAddForm({ ...addForm, experienceYears: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Specialization</label>
                <input
                  type="text"
                  value={addForm.specialization}
                  onChange={(e) => setAddForm({ ...addForm, specialization: e.target.value })}
                  className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none"
                  placeholder="e.g. Strength & Conditioning, Powerlifting"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#222222] hover:bg-[#292929] text-[#A3A3A3] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] hover:bg-[#F09A43] text-black cursor-pointer"
                >
                  Create Trainer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT TRAINER MODAL ── */}
      {editingTrainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#292929] rounded-2xl w-full max-w-md p-6 relative">
            <h3
              className="text-lg font-bold uppercase tracking-tight text-[#F5F5F5] mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Edit Trainer Profile
            </h3>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Coach Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Branch</label>
                  <select
                    value={editForm.branchId}
                    onChange={(e) => setEditForm({ ...editForm, branchId: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
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
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Specialization</label>
                  <input
                    type="text"
                    value={editForm.specialization}
                    onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Experience (Yrs)</label>
                  <input
                    type="number"
                    value={editForm.experienceYears}
                    onChange={(e) => setEditForm({ ...editForm, experienceYears: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingTrainer(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#222222] text-[#A3A3A3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] text-black"
                >
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
