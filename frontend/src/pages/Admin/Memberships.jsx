import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  RotateCw,
  Calendar,
  Search,
  Filter,
  Building,
  Edit,
  DollarSign,
} from 'lucide-react';
import adminService from '../../services/adminService.js';
import { useAdmin } from '../../components/Admin/AdminLayout.jsx';

export default function Memberships() {
  const { branches, selectedBranch } = useAdmin();
  const [activeTab, setActiveTab] = useState('CLIENT_MEMBERSHIPS'); // 'CLIENT_MEMBERSHIPS' | 'PLANS'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Client Memberships State
  const [memberships, setMemberships] = useState([]);
  const [branchFilter, setBranchFilter] = useState(selectedBranch);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expiryFilter, setExpiryFilter] = useState('ALL'); // 'ALL' | '7' | '30'

  // Plans Catalog State
  const [plans, setPlans] = useState([]);

  // Modals
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [actionModal, setActionModal] = useState(null); // { membership, action: 'RENEW' | 'EXTEND' | 'PAUSE' | 'CANCEL' }
  const [actionExtensionMonths, setActionExtensionMonths] = useState(1);

  // Forms
  const [allClientsList, setAllClientsList] = useState([]);
  const [assignForm, setAssignForm] = useState({
    userId: '',
    branchId: '',
    planName: '1 Month Kickstart',
    durationMonths: 1,
    amount: 2000,
    startDate: new Date().toISOString().slice(0, 10),
  });

  const [planForm, setPlanForm] = useState({
    name: '',
    code: '',
    durationMonths: 1,
    price: 2000,
    description: '',
    features: '',
  });

  useEffect(() => {
    setBranchFilter(selectedBranch);
  }, [selectedBranch]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'CLIENT_MEMBERSHIPS') {
        const res = await adminService.getClientMemberships({
          branchId: branchFilter,
          status: statusFilter,
          expiringSoon: expiryFilter !== 'ALL' ? expiryFilter : undefined,
        });
        setMemberships(res.memberships || []);

        const clientsRes = await adminService.getClients({ limit: 100 });
        if (clientsRes.clients) setAllClientsList(clientsRes.clients);
      } else {
        const res = await adminService.getMembershipPlans();
        setPlans(res.plans || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load membership records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, branchFilter, statusFilter, expiryFilter]);

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      const feats = planForm.features ? planForm.features.split(',').map((f) => f.trim()) : [];
      await adminService.createMembershipPlan({ ...planForm, features: feats });
      setIsCreatePlanOpen(false);
      fetchData();
      alert('Plan added to catalog');
    } catch (err) {
      alert(err.message || 'Failed to save plan');
    }
  };

  const handleAssignMembership = async (e) => {
    e.preventDefault();
    try {
      await adminService.createClientMembership(assignForm);
      setIsAssignModalOpen(false);
      fetchData();
      alert('Membership pass successfully assigned to athlete!');
    } catch (err) {
      alert(err.message || 'Failed to assign membership');
    }
  };

  const handleMembershipAction = async (e) => {
    e.preventDefault();
    if (!actionModal) return;

    try {
      await adminService.updateClientMembershipStatus(actionModal.membership._id, {
        action: actionModal.action,
        extensionMonths: actionExtensionMonths,
      });
      setActionModal(null);
      fetchData();
      alert(`Membership status updated: ${actionModal.action}`);
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER & TAB SWITCHER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2
            className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#F5F5F5]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            MEMBERSHIP PLANS &amp; SUBSCRIBERS
          </h2>
          <p className="text-xs text-[#A3A3A3]">
            Manage subscription plans, athlete memberships, validity periods, and renewals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'CLIENT_MEMBERSHIPS' ? (
            <button
              type="button"
              onClick={() => {
                setAssignForm({
                  userId: allClientsList[0]?.id || '',
                  branchId: branches[0]?._id || '',
                  planName: '1 Month Kickstart',
                  durationMonths: 1,
                  amount: 2000,
                  startDate: new Date().toISOString().slice(0, 10),
                });
                setIsAssignModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] hover:bg-[#F09A43] text-black transition-all cursor-pointer shadow-lg shadow-[#E58A32]/10"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <Plus className="w-4 h-4" />
              <span>Assign Membership</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setPlanForm({
                  name: '',
                  code: '',
                  durationMonths: 1,
                  price: 2000,
                  description: '',
                  features: '',
                });
                setIsCreatePlanOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] hover:bg-[#F09A43] text-black transition-all cursor-pointer shadow-lg shadow-[#E58A32]/10"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <Plus className="w-4 h-4" />
              <span>Create Plan</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-[#292929] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('CLIENT_MEMBERSHIPS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
            activeTab === 'CLIENT_MEMBERSHIPS'
              ? 'bg-[#E58A32] text-black font-bold'
              : 'bg-[#181818] text-[#A3A3A3] hover:text-[#F5F5F5] border border-[#292929]'
          }`}
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Active Subscriptions &amp; Expirations
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PLANS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
            activeTab === 'PLANS'
              ? 'bg-[#E58A32] text-black font-bold'
              : 'bg-[#181818] text-[#A3A3A3] hover:text-[#F5F5F5] border border-[#292929]'
          }`}
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Membership Plans Catalog
        </button>
      </div>

      {/* ── TAB 1: CLIENT MEMBERSHIPS ── */}
      {activeTab === 'CLIENT_MEMBERSHIPS' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-[#141414] border border-[#292929] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="px-3 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Branches</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.city} Branch
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="PAUSED">PAUSED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>

              <select
                value={expiryFilter}
                onChange={(e) => setExpiryFilter(e.target.value)}
                className="px-3 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Expiry Dates</option>
                <option value="7">⚠️ Expiring within 7 Days</option>
                <option value="30">⏳ Expiring within 30 Days</option>
              </select>
            </div>

            <span className="text-xs font-mono text-[#A3A3A3]">
              Found {memberships.length} records
            </span>
          </div>

          {/* Memberships Table */}
          <div className="bg-[#181818] border border-[#292929] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#292929] bg-[#141414] text-[11px] font-mono uppercase tracking-wider text-[#A3A3A3]">
                    <th className="py-3 px-4 font-semibold">Athlete</th>
                    <th className="py-3 px-4 font-semibold">Branch</th>
                    <th className="py-3 px-4 font-semibold">Plan Name</th>
                    <th className="py-3 px-4 font-semibold">Validity Dates</th>
                    <th className="py-3 px-4 font-semibold">Fee</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222222] text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#A3A3A3]">
                        Loading memberships...
                      </td>
                    </tr>
                  ) : memberships.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#A3A3A3]">
                        No client memberships match the specified filter.
                      </td>
                    </tr>
                  ) : (
                    memberships.map((m) => {
                      const now = new Date();
                      const expiry = new Date(m.expiryDate);
                      const isExpired = expiry < now;
                      const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

                      return (
                        <tr key={m._id} className="hover:bg-[#1E1E1E] transition-colors">
                          <td className="py-3 px-4 font-bold text-[#F5F5F5]">
                            {m.userId?.name || 'Athlete'}
                            <span className="block text-[10px] text-[#A3A3A3] font-mono font-normal">
                              {m.userId?.phone}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[#E58A32]">
                            {m.branchId?.city || 'HQ'}
                          </td>
                          <td className="py-3 px-4 font-medium text-[#F5F5F5]">{m.planName}</td>
                          <td className="py-3 px-4 font-mono">
                            <div>
                              <span>{new Date(m.startDate).toLocaleDateString()}</span> &rarr;{' '}
                              <span className={isExpired ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>
                                {expiry.toLocaleDateString()}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#A3A3A3]">
                              {isExpired ? 'Expired' : `${daysLeft} days remaining`}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-[#E58A32]">₹{m.amount}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                m.status === 'ACTIVE' && !isExpired
                                  ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                                  : m.status === 'PAUSED'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/30'
                              }`}
                            >
                              {isExpired && m.status === 'ACTIVE' ? 'EXPIRED' : m.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setActionModal({ membership: m, action: 'RENEW' })}
                                className="px-2 py-1 rounded bg-[#252525] hover:bg-[#E58A32] hover:text-black text-[#F5F5F5] font-semibold text-[10px] transition-colors cursor-pointer"
                              >
                                Renew
                              </button>
                              <button
                                type="button"
                                onClick={() => setActionModal({ membership: m, action: 'EXTEND' })}
                                className="px-2 py-1 rounded bg-[#252525] hover:bg-[#2F2F2F] text-[#A3A3A3] hover:text-white text-[10px] transition-colors cursor-pointer"
                              >
                                Extend
                              </button>
                              {m.status === 'ACTIVE' ? (
                                <button
                                  type="button"
                                  onClick={() => setActionModal({ membership: m, action: 'PAUSE' })}
                                  className="p-1 rounded bg-[#252525] hover:bg-amber-500/20 text-[#A3A3A3] hover:text-amber-400 cursor-pointer"
                                  title="Pause Membership"
                                >
                                  <Pause className="w-3 h-3" />
                                </button>
                              ) : m.status === 'PAUSED' ? (
                                <button
                                  type="button"
                                  onClick={() => setActionModal({ membership: m, action: 'RESUME' })}
                                  className="p-1 rounded bg-green-500/20 text-green-400 cursor-pointer"
                                  title="Resume Membership"
                                >
                                  <Play className="w-3 h-3" />
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: MEMBERSHIP PLANS CATALOG ── */}
      {activeTab === 'PLANS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((p) => (
            <div
              key={p._id}
              className="bg-[#181818] border border-[#292929] hover:border-[#E58A32]/40 rounded-2xl p-5 flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#252525] text-[#E58A32] font-bold">
                    {p.code || 'PASS'}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-green-400">
                    {p.durationMonths} MONTH{p.durationMonths > 1 ? 'S' : ''}
                  </span>
                </div>

                <h3
                  className="text-base font-bold uppercase text-[#F5F5F5] mb-1"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {p.name}
                </h3>
                <p className="text-xs text-[#A3A3A3] mb-3">{p.description}</p>

                <div className="text-2xl font-bold text-[#E58A32] mb-4">
                  ₹{p.price.toLocaleString()}
                </div>

                {/* Benefits */}
                <div className="space-y-1.5 border-t border-[#292929] pt-3 text-xs text-[#F5F5F5]">
                  <span className="text-[10px] font-mono text-[#A3A3A3] uppercase block">INCLUDED BENEFITS:</span>
                  {p.features?.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-[#A3A3A3]">
                      <CheckCircle2 className="w-3 h-3 text-[#E58A32] shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#222222] flex justify-between items-center text-[11px] text-[#A3A3A3]">
                <span>Status: {p.isActive ? 'Active Plan' : 'Inactive'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ASSIGN MEMBERSHIP MODAL ── */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#292929] rounded-2xl w-full max-w-md p-6 relative">
            <h3
              className="text-lg font-bold uppercase tracking-tight text-[#F5F5F5] mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Assign Client Membership
            </h3>

            <form onSubmit={handleAssignMembership} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Select Athlete</label>
                <select
                  required
                  value={assignForm.userId}
                  onChange={(e) => setAssignForm({ ...assignForm, userId: e.target.value })}
                  className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none"
                >
                  <option value="">-- Choose Athlete --</option>
                  {allClientsList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone || c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Duration</label>
                  <select
                    value={assignForm.durationMonths}
                    onChange={(e) => {
                      const dur = Number(e.target.value);
                      const basePrice = dur === 1 ? 2000 : dur === 3 ? 5000 : dur === 6 ? 9000 : 16000;
                      setAssignForm({
                        ...assignForm,
                        durationMonths: dur,
                        planName: `${dur} Month${dur > 1 ? 's' : ''} Pass`,
                        amount: basePrice,
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
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Fee (₹)</label>
                  <input
                    type="number"
                    value={assignForm.amount}
                    onChange={(e) => setAssignForm({ ...assignForm, amount: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Start Date</label>
                  <input
                    type="date"
                    value={assignForm.startDate}
                    onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Branch</label>
                  <select
                    value={assignForm.branchId}
                    onChange={(e) => setAssignForm({ ...assignForm, branchId: e.target.value })}
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

              <p className="text-[10px] text-[#A3A3A3] italic pt-1">
                Notice: Assigning a membership creates an active pass record. To register the confirmed fee, record an
                offline payment under Payments.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#222222] text-[#A3A3A3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] text-black"
                >
                  Confirm Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CREATE PLAN MODAL ── */}
      {isCreatePlanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#292929] rounded-2xl w-full max-w-md p-6 relative">
            <h3
              className="text-lg font-bold uppercase tracking-tight text-[#F5F5F5] mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Add Membership Plan to Catalog
            </h3>

            <form onSubmit={handleCreatePlan} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5]"
                  placeholder="e.g. 6 Months Half-Year Elite"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Duration (Months)</label>
                  <select
                    value={planForm.durationMonths}
                    onChange={(e) => setPlanForm({ ...planForm, durationMonths: Number(e.target.value) })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                  >
                    <option value={1}>1 Month</option>
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                    <option value={12}>12 Months</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Standard Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Plan Description</label>
                <textarea
                  rows={2}
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5]"
                  placeholder="Summary of this training subscription..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">
                  Features (comma-separated)
                </label>
                <input
                  type="text"
                  value={planForm.features}
                  onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
                  className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5]"
                  placeholder="Full gym access, Steam bath, Locker access"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreatePlanOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#222222] text-[#A3A3A3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] text-black"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ACTION MODAL (RENEW / EXTEND / PAUSE) ── */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#292929] rounded-2xl w-full max-w-sm p-6 relative">
            <h3
              className="text-base font-bold uppercase tracking-tight text-[#F5F5F5] mb-2"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {actionModal.action === 'RENEW'
                ? 'Renew Athlete Membership'
                : actionModal.action === 'EXTEND'
                ? 'Extend Expiry Date'
                : actionModal.action === 'PAUSE'
                ? 'Pause Subscription'
                : 'Membership Action'}
            </h3>
            <p className="text-xs text-[#A3A3A3] mb-4">
              Athlete: <strong className="text-[#F5F5F5]">{actionModal.membership.userId?.name}</strong> • Current
              plan: {actionModal.membership.planName}
            </p>

            <form onSubmit={handleMembershipAction} className="space-y-4">
              {(actionModal.action === 'RENEW' || actionModal.action === 'EXTEND') && (
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">
                    Months to Add:
                  </label>
                  <select
                    value={actionExtensionMonths}
                    onChange={(e) => setActionExtensionMonths(Number(e.target.value))}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                  >
                    <option value={1}>1 Month Extension</option>
                    <option value={3}>3 Months Extension</option>
                    <option value={6}>6 Months Extension</option>
                    <option value={12}>12 Months Extension</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#222222] text-[#A3A3A3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#E58A32] text-black"
                >
                  Confirm {actionModal.action}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
