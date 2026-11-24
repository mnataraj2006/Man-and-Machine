import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  Building,
  CreditCard,
  CalendarCheck,
  Activity,
  Receipt,
  KeyRound,
  Shield,
  Edit,
  Eye,
  UserPlus,
} from 'lucide-react';
import adminService from '../../services/adminService.js';
import { useAdmin } from '../../components/Admin/AdminLayout.jsx';

export default function Clients() {
  const { branches, selectedBranch } = useAdmin();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState(selectedBranch);
  const [membershipStatus, setMembershipStatus] = useState('ALL');
  const [accountStatus, setAccountStatus] = useState('ALL');

  // Modals & Drawers
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [clientDetailData, setClientDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [trainersList, setTrainersList] = useState([]);

  // Form states
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'Password@123',
    branchId: '',
    fitnessGoal: 'Muscle Building',
    experienceLevel: 'Intermediate',
    trainerId: '',
    membershipPlanName: '',
    durationMonths: 1,
    membershipAmount: 2000,
  });

  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    branchId: '',
    fitnessGoal: '',
    experienceLevel: '',
  });

  const [newPassword, setNewPassword] = useState('');

  // Update branch filter if top nav branch changes
  useEffect(() => {
    setBranchFilter(selectedBranch);
    setPage(1);
  }, [selectedBranch]);

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getClients({
        page,
        limit: 15,
        search,
        branchId: branchFilter,
        membershipStatus,
        accountStatus,
      });
      setClients(res.clients || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainers = async () => {
    try {
      const res = await adminService.getTrainers();
      if (res.trainers) setTrainersList(res.trainers);
    } catch (err) {
      console.error('Failed to load trainers:', err);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [page, branchFilter, membershipStatus, accountStatus]);

  useEffect(() => {
    fetchTrainers();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchClients();
  };

  const handleExportCSV = () => {
    const exportData = clients.map((c) => ({
      ID: c.id,
      Name: c.name,
      Email: c.email,
      Phone: c.phone,
      Branch: c.branch?.city || '',
      Status: c.status,
      MembershipPlan: c.membership?.planName || 'None',
      MembershipStatus: c.membership?.status || 'INACTIVE',
      ExpiryDate: c.membership?.expiryDate ? new Date(c.membership.expiryDate).toLocaleDateString() : 'N/A',
      RegisteredOn: new Date(c.createdAt).toLocaleDateString(),
    }));
    adminService.exportToCSV(exportData, `clients_${Date.now()}.csv`);
  };

  const handleOpenClientDetails = async (id) => {
    setSelectedClientId(id);
    setDetailLoading(true);
    try {
      const res = await adminService.getClientDetails(id);
      setClientDetailData(res);
    } catch (err) {
      alert(err.message || 'Failed to fetch client dossier');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenEdit = (c) => {
    setEditForm({
      name: c.name,
      phone: c.phone,
      email: c.email,
      branchId: c.branch?._id || '',
      fitnessGoal: c.fitnessGoal || 'General Fitness',
      experienceLevel: c.experienceLevel || 'Beginner',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await adminService.updateClient(selectedClientId, editForm);
      setIsEditModalOpen(false);
      handleOpenClientDetails(selectedClientId);
      fetchClients();
    } catch (err) {
      alert(err.message || 'Failed to update client');
    }
  };

  const handleToggleStatus = async (client) => {
    const newSt = client.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!window.confirm(`Set account status for ${client.name} to ${newSt}?`)) return;
    try {
      await adminService.updateClientStatus(client.id || client._id, newSt);
      fetchClients();
      if (selectedClientId) handleOpenClientDetails(selectedClientId);
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleAssignTrainer = async (trainerId) => {
    try {
      await adminService.assignTrainer(selectedClientId, trainerId);
      handleOpenClientDetails(selectedClientId);
      fetchClients();
    } catch (err) {
      alert(err.message || 'Failed to assign trainer');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }
    try {
      await adminService.resetClientPassword(selectedClientId, newPassword);
      alert('Password reset successfully!');
      setIsPasswordModalOpen(false);
      setNewPassword('');
    } catch (err) {
      alert(err.message || 'Failed to reset password');
    }
  };

  const handleCreateClientSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminService.createClient(addForm);
      setIsAddModalOpen(false);
      fetchClients();
      alert('Client registered successfully!');
    } catch (err) {
      alert(err.message || 'Failed to create client');
    }
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER & ACTIONS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2
            className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#F5F5F5]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            CLIENT MANAGEMENT DIRECTORY
          </h2>
          <p className="text-xs text-[#A3A3A3]">
            Total {totalCount} registered athletes across Kovilpatti, Karur and Sivakasi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#1F1F1F] hover:bg-[#252525] text-[#F5F5F5] border border-[#292929] hover:border-[#E58A32] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#E58A32]" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAddForm({
                name: '',
                email: '',
                phone: '',
                password: 'Password@123',
                branchId: branches[0]?._id || '',
                fitnessGoal: 'Muscle Building',
                experienceLevel: 'Intermediate',
                trainerId: '',
                membershipPlanName: '1 Month Kickstart',
                durationMonths: 1,
                membershipAmount: 2000,
              });
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] hover:bg-[#F09A43] text-black transition-all cursor-pointer shadow-lg shadow-[#E58A32]/10"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* ── SEARCH & FILTERS BAR ── */}
      <div className="bg-[#141414] border border-[#292929] rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-[#A3A3A3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or email..."
            className="w-full pl-9 pr-4 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] placeholder-[#A3A3A3] focus:border-[#E58A32] focus:outline-none transition-colors"
          />
        </form>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Branch filter */}
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
                {b.city}
              </option>
            ))}
          </select>

          {/* Membership Status filter */}
          <select
            value={membershipStatus}
            onChange={(e) => {
              setMembershipStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Memberships</option>
            <option value="ACTIVE">Active Pass</option>
            <option value="EXPIRED">Expired Pass</option>
            <option value="NO_MEMBERSHIP">No Membership</option>
          </select>

          {/* Account Status filter */}
          <select
            value={accountStatus}
            onChange={(e) => {
              setAccountStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Account Status</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* ── CLIENTS TABLE ── */}
      <div className="bg-[#181818] border border-[#292929] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#292929] bg-[#141414] text-[11px] font-mono uppercase tracking-wider text-[#A3A3A3]">
                <th className="py-3.5 px-4 font-semibold">Athlete</th>
                <th className="py-3.5 px-4 font-semibold">Contact</th>
                <th className="py-3.5 px-4 font-semibold">Branch</th>
                <th className="py-3.5 px-4 font-semibold">Membership</th>
                <th className="py-3.5 px-4 font-semibold">Trainer</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#A3A3A3]">
                    Loading athletes database...
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#A3A3A3]">
                    No clients match the specified search or filter criteria.
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.id} className="hover:bg-[#1E1E1E] transition-colors">
                    {/* Athlete info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#E58A32]/10 border border-[#E58A32]/30 flex items-center justify-center text-[#E58A32] font-bold text-xs shrink-0">
                          {c.name ? c.name[0].toUpperCase() : 'U'}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-[#F5F5F5]">{c.name}</span>
                          <span className="text-[10px] text-[#A3A3A3] font-mono">
                            ID: {c.id.slice(-6)} • {c.fitnessGoal}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-[#F5F5F5] font-mono">{c.phone}</span>
                        <span className="text-[10px] text-[#A3A3A3]">{c.email}</span>
                      </div>
                    </td>

                    {/* Branch */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-[#252525] text-[#E58A32] font-bold text-[10px] font-mono">
                        {c.branch?.city || 'HQ'}
                      </span>
                    </td>

                    {/* Membership */}
                    <td className="py-3 px-4">
                      {c.membership ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#F5F5F5] truncate max-w-[130px]">
                            {c.membership.planName}
                          </span>
                          <span
                            className={`text-[10px] font-mono ${
                              c.membership.isExpired ? 'text-red-400 font-bold' : 'text-green-400'
                            }`}
                          >
                            {c.membership.isExpired ? 'EXPIRED' : 'ACTIVE'} •{' '}
                            {new Date(c.membership.expiryDate).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#A3A3A3] italic">No active pass</span>
                      )}
                    </td>

                    {/* Assigned Trainer (Optional) */}
                    <td className="py-3 px-4">
                      {c.trainer ? (
                        <span className="text-xs font-medium text-[#F5F5F5]">{c.trainer.name}</span>
                      ) : (
                        <span className="text-[11px] text-[#A3A3A3]">Self-Managed</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          c.status === 'ACTIVE'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenClientDetails(c.id)}
                          className="px-2.5 py-1 rounded-lg bg-[#252525] hover:bg-[#E58A32] hover:text-black text-[#F5F5F5] font-semibold text-[11px] transition-colors cursor-pointer"
                        >
                          Dossier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(c)}
                          className={`p-1 rounded-lg transition-colors cursor-pointer ${
                            c.status === 'ACTIVE'
                              ? 'text-[#A3A3A3] hover:text-red-400'
                              : 'text-green-400 hover:text-green-300'
                          }`}
                          title={c.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-[#292929] bg-[#141414] flex items-center justify-between text-xs text-[#A3A3A3]">
          <span>
            Showing page <strong className="text-[#F5F5F5]">{page}</strong> of{' '}
            <strong className="text-[#F5F5F5]">{totalPages}</strong> ({totalCount} athletes)
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-1.5 rounded-lg bg-[#1F1F1F] text-[#F5F5F5] border border-[#292929] hover:border-[#E58A32] disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-1.5 rounded-lg bg-[#1F1F1F] text-[#F5F5F5] border border-[#292929] hover:border-[#E58A32] disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── CLIENT 360 DOSSIER DRAWER / MODAL ── */}
      {selectedClientId && clientDetailData && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#141414] border-l border-[#292929] h-full overflow-y-auto p-6 space-y-6 shadow-2xl">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-[#292929] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#E58A32]/20 border border-[#E58A32]/40 flex items-center justify-center text-[#E58A32] font-bold text-lg">
                  {clientDetailData.client.name ? clientDetailData.client.name[0].toUpperCase() : 'U'}
                </div>
                <div className="flex flex-col">
                  <h3
                    className="text-lg font-bold uppercase text-[#F5F5F5]"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {clientDetailData.client.name}
                  </h3>
                  <span className="text-xs text-[#A3A3A3] font-mono">
                    ID: {clientDetailData.client.id} • Joined{' '}
                    {new Date(clientDetailData.client.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedClientId(null);
                  setClientDetailData(null);
                }}
                className="p-2 rounded-lg bg-[#1F1F1F] text-[#A3A3A3] hover:text-white border border-[#292929]"
              >
                &times; Close
              </button>
            </div>

            {/* Quick Action Buttons for this client */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenEdit(clientDetailData.client)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#222222] hover:bg-[#292929] text-xs font-semibold text-[#F5F5F5] border border-[#292929]"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#222222] hover:bg-[#292929] text-xs font-semibold text-[#F5F5F5] border border-[#292929]"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Reset Password</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleStatus(clientDetailData.client)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                  clientDetailData.client.status === 'ACTIVE'
                    ? 'bg-red-500/10 text-red-400 border-red-500/30'
                    : 'bg-green-500/10 text-green-400 border-green-500/30'
                }`}
              >
                <span>{clientDetailData.client.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}</span>
              </button>
            </div>

            {/* Client Key Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#181818] p-4 rounded-xl border border-[#292929]">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#A3A3A3]">Mobile</span>
                <p className="text-xs font-bold text-[#F5F5F5] mt-0.5">{clientDetailData.client.phone}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#A3A3A3]">Email</span>
                <p className="text-xs font-bold text-[#F5F5F5] mt-0.5 truncate">{clientDetailData.client.email}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#A3A3A3]">Branch</span>
                <p className="text-xs font-bold text-[#E58A32] mt-0.5">
                  {clientDetailData.client.branch?.city || 'Kovilpatti HQ'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#A3A3A3]">Fitness Goal</span>
                <p className="text-xs font-bold text-[#F5F5F5] mt-0.5">
                  {clientDetailData.profile?.fitnessGoal || 'General Fitness'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#A3A3A3]">Experience Level</span>
                <p className="text-xs font-bold text-[#F5F5F5] mt-0.5">
                  {clientDetailData.profile?.experienceLevel || 'Beginner'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#A3A3A3]">Assigned Coach</span>
                <div className="mt-0.5 flex items-center gap-1">
                  <select
                    value={clientDetailData.profile?.trainerId?._id || ''}
                    onChange={(e) => handleAssignTrainer(e.target.value)}
                    className="bg-[#121212] border border-[#292929] rounded text-[11px] text-[#F5F5F5] px-1.5 py-0.5 focus:outline-none"
                  >
                    <option value="">No Coach (Self-Managed)</option>
                    {trainersList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.branch?.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Active Membership Details */}
            <div className="bg-[#181818] border border-[#292929] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase text-[#E58A32] font-bold">MEMBERSHIP SPECIFICATIONS</span>
                <span className="text-[10px] text-[#A3A3A3]">
                  {clientDetailData.activeMembership?.status || 'No Membership'}
                </span>
              </div>
              {clientDetailData.activeMembership ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-[#A3A3A3]">Plan</span>
                    <p className="font-bold text-[#F5F5F5]">{clientDetailData.activeMembership.planName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#A3A3A3]">Start Date</span>
                    <p className="font-mono text-[#F5F5F5]">
                      {new Date(clientDetailData.activeMembership.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#A3A3A3]">Expiry Date</span>
                    <p className="font-mono text-green-400 font-bold">
                      {new Date(clientDetailData.activeMembership.expiryDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#A3A3A3]">Amount Paid</span>
                    <p className="font-bold text-[#E58A32]">₹{clientDetailData.activeMembership.amount}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#A3A3A3] italic">No active membership assigned to this athlete.</p>
              )}
            </div>

            {/* Payments Ledger */}
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase text-[#A3A3A3]">PAYMENT TRANSACTIONS LEDGER</span>
              <div className="bg-[#181818] border border-[#292929] rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#292929] bg-[#121212] text-[10px] text-[#A3A3A3]">
                      <th className="p-2 font-mono">Date</th>
                      <th className="p-2 font-mono">Tx ID</th>
                      <th className="p-2 font-mono">Amount</th>
                      <th className="p-2 font-mono">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222222]">
                    {clientDetailData.payments?.length > 0 ? (
                      clientDetailData.payments.map((p) => (
                        <tr key={p._id}>
                          <td className="p-2 font-mono">{new Date(p.date).toLocaleDateString()}</td>
                          <td className="p-2 font-mono truncate max-w-[100px]">{p.transactionId}</td>
                          <td className="p-2 font-bold text-[#E58A32]">₹{p.amount}</td>
                          <td className="p-2">
                            <span className="text-[10px] font-bold text-green-400">{p.status}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-[#A3A3A3]">
                          No payment transactions recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Attendance History */}
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase text-[#A3A3A3]">RECENT ATTENDANCE VISITS</span>
              <div className="bg-[#181818] border border-[#292929] rounded-xl p-3 flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {clientDetailData.attendances?.length > 0 ? (
                  clientDetailData.attendances.map((a) => (
                    <span
                      key={a._id}
                      className="px-2 py-1 bg-[#121212] border border-[#292929] rounded text-[11px] font-mono text-[#F5F5F5]"
                    >
                      {new Date(a.date).toLocaleDateString()} •{' '}
                      {new Date(a.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[#A3A3A3] italic">No attendance visits recorded.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD CLIENT MODAL ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#292929] rounded-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
            <h3
              className="text-lg font-bold uppercase tracking-tight text-[#F5F5F5] mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Add New Client
            </h3>

            <form onSubmit={handleCreateClientSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none"
                  placeholder="e.g. S. Karthik"
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
                    placeholder="karthik@domain.com"
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
                    placeholder="9876543210"
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
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Temporary Password</label>
                  <input
                    type="text"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Fitness Goal</label>
                  <select
                    value={addForm.fitnessGoal}
                    onChange={(e) => setAddForm({ ...addForm, fitnessGoal: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none"
                  >
                    <option value="Muscle Building">Muscle Building</option>
                    <option value="Weight Loss">Weight Loss</option>
                    <option value="Strength Training">Strength Training</option>
                    <option value="General Fitness">General Fitness</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">
                    Assign Coach (OPTIONAL)
                  </label>
                  <select
                    value={addForm.trainerId}
                    onChange={(e) => setAddForm({ ...addForm, trainerId: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none"
                  >
                    <option value="">None (Self-Managed Athlete)</option>
                    {trainersList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.branch?.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Initial Membership Assignment */}
              <div className="pt-2 border-t border-[#292929]">
                <span className="text-[11px] font-mono uppercase text-[#E58A32] font-bold block mb-2">
                  OPTIONAL INITIAL MEMBERSHIP PASS
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-[#A3A3A3] mb-1">Plan Duration</label>
                    <select
                      value={addForm.durationMonths}
                      onChange={(e) => {
                        const dur = Number(e.target.value);
                        const cost = dur === 1 ? 2000 : dur === 3 ? 5000 : dur === 6 ? 9000 : 16000;
                        setAddForm({
                          ...addForm,
                          durationMonths: dur,
                          membershipPlanName: `${dur} Month${dur > 1 ? 's' : ''} Pass`,
                          membershipAmount: cost,
                        });
                      }}
                      className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                    >
                      <option value={1}>1 Month (₹2,000)</option>
                      <option value={3}>3 Months (₹5,000)</option>
                      <option value={6}>6 Months (₹9,000)</option>
                      <option value={12}>12 Months (₹16,000)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#A3A3A3] mb-1">Fee Amount (₹)</label>
                    <input
                      type="number"
                      value={addForm.membershipAmount}
                      onChange={(e) => setAddForm({ ...addForm, membershipAmount: e.target.value })}
                      className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5]"
                    />
                  </div>
                </div>
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
                  Create Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RESET PASSWORD MODAL ── */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#292929] rounded-2xl w-full max-w-sm p-6 relative">
            <h3
              className="text-base font-bold uppercase tracking-tight text-[#F5F5F5] mb-3"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Reset Client Password
            </h3>
            <p className="text-xs text-[#A3A3A3] mb-4">
              Enter a new secure password (minimum 8 characters) for this account.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min 8 chars)"
                  className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setNewPassword('');
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#222222] text-[#A3A3A3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#E58A32] text-black"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
