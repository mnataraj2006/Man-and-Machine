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
  ArrowRight,
  ClipboardList,
} from 'lucide-react';
import adminService from '../../services/adminService.js';
import { useAdmin } from '../../components/Admin/AdminLayout.jsx';

export default function Memberships({ onNavigate }) {
  const { branches, selectedBranch } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Client Memberships State
  const [memberships, setMemberships] = useState([]);
  const [branchFilter, setBranchFilter] = useState(selectedBranch);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expiryFilter, setExpiryFilter] = useState('ALL'); // 'ALL' | '7' | '30'

  // Plans Catalog (used for Assign Membership pricing lookup)
  const [plans, setPlans] = useState([]);

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [actionModal, setActionModal] = useState(null); // { membership, action: 'RENEW' | 'EXTEND' | 'PAUSE' | 'CANCEL' }
  const [actionExtensionMonths, setActionExtensionMonths] = useState(1);

  // Forms
  const [allClientsList, setAllClientsList] = useState([]);
  const [assignForm, setAssignForm] = useState({
    userId: '',
    branchId: '',
    planId: '',
    planName: '',
    durationDays: 30,
    durationMonths: 1,
    basePrice: 0,
    joiningFee: 0,
    discountType: 'NONE',
    discountValue: 0,
    discountAmount: 0,
    calculatedPrice: 0,
    amount: 0,
    startDate: new Date().toISOString().slice(0, 10),
    isAvailable: true,
  });

  useEffect(() => {
    setBranchFilter(selectedBranch);
  }, [selectedBranch]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansRes, res, clientsRes] = await Promise.all([
        adminService.getMembershipPlans(),
        adminService.getClientMemberships({
          branchId: branchFilter,
          status: statusFilter,
          expiringSoon: expiryFilter !== 'ALL' ? expiryFilter : undefined,
        }),
        adminService.getClients({ limit: 100 }),
      ]);
      setPlans(plansRes.plans || []);
      setMemberships(res.memberships || []);
      if (clientsRes.clients) setAllClientsList(clientsRes.clients);
    } catch (err) {
      setError(err.message || 'Failed to load membership records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [branchFilter, statusFilter, expiryFilter]);

  // Helper to re-calculate pricing for assignment
  const recalculateAssignPricing = (userId, branchId, planId, currentPlans = plans) => {
    const selectedClient = allClientsList.find((c) => (c.id || c._id) === userId);
    const activeBranchId = branchId || (selectedClient?.branch?._id || selectedClient?.branchId || branches[0]?._id);
    const selectedPlan = currentPlans.find((p) => p._id === planId) || currentPlans[0];

    if (!selectedPlan) {
      return {
        userId,
        branchId: activeBranchId,
        planId: '',
        planName: '',
        durationDays: 30,
        durationMonths: 1,
        basePrice: 0,
        joiningFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        discountAmount: 0,
        calculatedPrice: 0,
        amount: 0,
        isAvailable: true,
      };
    }

    const branchPricing = selectedPlan.branchPricing?.find(
      (bp) => (bp.branchId?._id || bp.branchId || '').toString() === (activeBranchId || '').toString()
    );

    const isAvailable = branchPricing ? branchPricing.isAvailable : true;
    const basePrice = branchPricing ? branchPricing.basePrice : (selectedPlan.price || 0);
    const joiningFee = branchPricing ? (branchPricing.joiningFee || 0) : 0;
    const discountType = branchPricing ? branchPricing.discountType : 'NONE';
    const discountValue = branchPricing ? (branchPricing.discountValue || 0) : 0;

    let discountAmount = 0;
    if (discountType === 'PERCENTAGE') {
      discountAmount = Math.round((basePrice * Math.min(100, discountValue)) / 100);
    } else if (discountType === 'FIXED') {
      discountAmount = Math.min(discountValue, basePrice + joiningFee);
    }

    const calculatedPrice = branchPricing?.finalPrice !== undefined
      ? branchPricing.finalPrice
      : Math.max(0, basePrice + joiningFee - discountAmount);

    return {
      userId,
      branchId: activeBranchId,
      planId: selectedPlan._id,
      planName: selectedPlan.name,
      durationDays: selectedPlan.durationDays || (selectedPlan.durationMonths * 30) || 30,
      durationMonths: selectedPlan.durationMonths || 1,
      basePrice,
      joiningFee,
      discountType,
      discountValue,
      discountAmount,
      calculatedPrice,
      amount: calculatedPrice,
      isAvailable,
    };
  };

  const openAssignModal = () => {
    const firstClient = allClientsList[0];
    const initialUserId = firstClient ? (firstClient.id || firstClient._id) : '';
    const initialBranchId = firstClient?.branch?._id || firstClient?.branchId || branches[0]?._id || '';
    const initialPlanId = plans[0]?._id || '';

    const calculated = recalculateAssignPricing(initialUserId, initialBranchId, initialPlanId, plans);
    setAssignForm({
      ...calculated,
      startDate: new Date().toISOString().slice(0, 10),
    });
    setIsAssignModalOpen(true);
  };

  const handleAssignMembership = async (e) => {
    e.preventDefault();
    if (!assignForm.isAvailable) {
      alert('This plan is not available at the selected branch.');
      return;
    }
    try {
      await adminService.createClientMembership({
        userId: assignForm.userId,
        branchId: assignForm.branchId,
        planId: assignForm.planId,
        planName: assignForm.planName,
        durationDays: assignForm.durationDays,
        durationMonths: assignForm.durationMonths,
        amount: Number(assignForm.amount),
        startDate: assignForm.startDate,
      });
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
      {/* ── HEADER & ACTIONS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2
            className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#F5F5F5]"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            CLIENT MEMBERSHIPS &amp; SUBSCRIPTIONS
          </h2>
          <p className="text-xs text-[#B8B8B8]">
            Manage active athlete subscriptions, validity periods, expirations, and renewals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onNavigate ? onNavigate('/admin/membership-plans') : (window.location.href = '/admin/membership-plans')
            }
            className="min-h-[44px] flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#202020] hover:bg-[#303030] text-[#F5F5F5] border border-[#303030] transition-colors cursor-pointer"
          >
            <ClipboardList className="w-4 h-4 text-[#EB3E2E]" />
            <span>Plans Catalog</span>
          </button>

          <button
            type="button"
            onClick={openAssignModal}
            className="min-h-[44px] flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#EB3E2E] hover:bg-[#FF493B] text-white transition-all cursor-pointer shadow-lg shadow-[#EB3E2E]/10"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Membership</span>
          </button>
        </div>
      </div>

      {/* ── CLIENT MEMBERSHIPS LIST ── */}
      <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-[#111111] border border-[#303030] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="px-3 py-2 bg-[#111111] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] focus:outline-none cursor-pointer"
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
                className="px-3 py-2 bg-[#111111] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] focus:outline-none cursor-pointer"
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
                className="px-3 py-2 bg-[#111111] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Expiry Dates</option>
                <option value="7">⚠️ Expiring within 7 Days</option>
                <option value="30">⏳ Expiring within 30 Days</option>
              </select>
            </div>

            <span className="text-xs font-mono text-[#B8B8B8]">
              Found {memberships.length} records
            </span>
          </div>

          {/* Memberships Table */}
          <div className="bg-[#181818] border border-[#303030] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#303030] bg-[#111111] text-[11px] font-mono uppercase tracking-wider text-[#B8B8B8]">
                    <th className="py-3 px-4 font-semibold">Athlete</th>
                    <th className="py-3 px-4 font-semibold">Branch</th>
                    <th className="py-3 px-4 font-semibold">Plan Name</th>
                    <th className="py-3 px-4 font-semibold">Validity Dates</th>
                    <th className="py-3 px-4 font-semibold">Fee</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#202020] text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#B8B8B8]">
                        Loading memberships...
                      </td>
                    </tr>
                  ) : memberships.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#B8B8B8]">
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
                        <tr key={m._id} className="hover:bg-[#202020] transition-colors">
                          <td className="py-3 px-4 font-bold text-[#F5F5F5]">
                            {m.userId?.name || 'Athlete'}
                            <span className="block text-[10px] text-[#B8B8B8] font-mono font-normal">
                              {m.userId?.phone}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[#EB3E2E]">
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
                            <span className="text-[10px] text-[#B8B8B8]">
                              {isExpired ? 'Expired' : `${daysLeft} days remaining`}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-[#EB3E2E]">₹{m.amount}</td>
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
                                className="px-2 py-1 rounded bg-[#252525] hover:bg-[#EB3E2E] hover:text-white text-[#F5F5F5] font-semibold text-[10px] transition-colors cursor-pointer"
                              >
                                Renew
                              </button>
                              <button
                                type="button"
                                onClick={() => setActionModal({ membership: m, action: 'EXTEND' })}
                                className="px-2 py-1 rounded bg-[#252525] hover:bg-[#2F2F2F] text-[#B8B8B8] hover:text-white text-[10px] transition-colors cursor-pointer"
                              >
                                Extend
                              </button>
                              {m.status === 'ACTIVE' ? (
                                <button
                                  type="button"
                                  onClick={() => setActionModal({ membership: m, action: 'PAUSE' })}
                                  className="p-1 rounded bg-[#252525] hover:bg-amber-500/20 text-[#B8B8B8] hover:text-amber-400 cursor-pointer"
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

      {/* ── ASSIGN MEMBERSHIP MODAL ── */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#303030] rounded-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
            <h3
              className="text-lg font-bold uppercase tracking-tight text-[#F5F5F5] mb-1"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              Assign Client Membership
            </h3>
            <p className="text-xs text-[#B8B8B8] mb-4">
              Select client, target branch, and a valid membership plan. Multi-branch pricing and fee breakdown calculate live.
            </p>

            <form onSubmit={handleAssignMembership} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Select Athlete *</label>
                <select
                  required
                  value={assignForm.userId}
                  onChange={(e) => {
                    const newUserId = e.target.value;
                    const calculated = recalculateAssignPricing(newUserId, assignForm.branchId, assignForm.planId, plans);
                    setAssignForm((prev) => ({ ...prev, ...calculated }));
                  }}
                  className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#EB3E2E]"
                >
                  <option value="">-- Choose Athlete --</option>
                  {allClientsList.map((c) => (
                    <option key={c.id || c._id} value={c.id || c._id}>
                      {c.name} ({c.phone || c.email}) • {c.branch?.city || 'No branch'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Target Branch *</label>
                  <select
                    value={assignForm.branchId}
                    onChange={(e) => {
                      const newBranchId = e.target.value;
                      const calculated = recalculateAssignPricing(assignForm.userId, newBranchId, assignForm.planId, plans);
                      setAssignForm((prev) => ({ ...prev, ...calculated }));
                    }}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#EB3E2E]"
                  >
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.city}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Membership Plan *</label>
                  <select
                    value={assignForm.planId}
                    onChange={(e) => {
                      const newPlanId = e.target.value;
                      const calculated = recalculateAssignPricing(assignForm.userId, assignForm.branchId, newPlanId, plans);
                      setAssignForm((prev) => ({ ...prev, ...calculated }));
                    }}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#EB3E2E]"
                  >
                    {plans.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.durationDays ? `${p.durationDays}d` : `${p.durationMonths}m`}) {!p.isActive ? '[INACTIVE]' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Branch Pricing Breakdown Card */}
              <div className="p-3.5 rounded-xl bg-[#111111] border border-[#303030] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] font-mono text-[#B8B8B8] uppercase">Branch Price Breakdown</span>
                  {!assignForm.isAvailable ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/10 border border-red-500/30 text-red-400">
                      NOT AVAILABLE AT THIS BRANCH
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      AVAILABLE
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-2 rounded-lg bg-[#181818] border border-[#262626]">
                    <span className="text-[9px] font-mono text-[#B8B8B8] block uppercase">Base Price</span>
                    <span className="text-xs font-bold text-[#F5F5F5]">₹{assignForm.basePrice.toLocaleString()}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#181818] border border-[#262626]">
                    <span className="text-[9px] font-mono text-[#B8B8B8] block uppercase">Joining Fee</span>
                    <span className="text-xs font-bold text-[#F5F5F5]">₹{assignForm.joiningFee.toLocaleString()}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#181818] border border-[#262626]">
                    <span className="text-[9px] font-mono text-[#B8B8B8] block uppercase">Discount</span>
                    <span className="text-xs font-bold text-amber-400">
                      -₹{assignForm.discountAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#202020] border border-[#EB3E2E]/30">
                    <span className="text-[9px] font-mono text-[#EB3E2E] block uppercase">Branch Total</span>
                    <span className="text-xs font-bold text-[#EB3E2E]">₹{assignForm.calculatedPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {!assignForm.isAvailable && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    The plan <strong>{assignForm.planName}</strong> is disabled for this branch in the plan catalog. Choose another plan or branch.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Pass Start Date *</label>
                  <input
                    type="date"
                    required
                    value={assignForm.startDate}
                    onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Confirmed Fee (₹) *</label>
                  <input
                    type="number"
                    required
                    value={assignForm.amount}
                    onChange={(e) => setAssignForm({ ...assignForm, amount: e.target.value })}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#EB3E2E]"
                  />
                </div>
              </div>

              <p className="text-[10px] text-[#B8B8B8] italic pt-1">
                Notice: Assigning creates an active membership snapshot in the client's file. To log the paid receipt, record an offline transaction under Payments.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#202020] text-[#B8B8B8] hover:text-[#F5F5F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!assignForm.isAvailable}
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#EB3E2E] hover:bg-[#FF493B] text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Confirm &amp; Assign Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── ACTION MODAL (RENEW / EXTEND / PAUSE) ── */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#303030] rounded-2xl w-full max-w-sm p-6 relative">
            <h3
              className="text-base font-bold uppercase tracking-tight text-[#F5F5F5] mb-2"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              {actionModal.action === 'RENEW'
                ? 'Renew Athlete Membership'
                : actionModal.action === 'EXTEND'
                ? 'Extend Expiry Date'
                : actionModal.action === 'PAUSE'
                ? 'Pause Subscription'
                : 'Membership Action'}
            </h3>
            <p className="text-xs text-[#B8B8B8] mb-4">
              Athlete: <strong className="text-[#F5F5F5]">{actionModal.membership.userId?.name}</strong> • Current
              plan: {actionModal.membership.planName}
            </p>

            <form onSubmit={handleMembershipAction} className="space-y-4">
              {(actionModal.action === 'RENEW' || actionModal.action === 'EXTEND') && (
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">
                    Months to Add:
                  </label>
                  <select
                    value={actionExtensionMonths}
                    onChange={(e) => setActionExtensionMonths(Number(e.target.value))}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
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
                  className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#202020] text-[#B8B8B8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#EB3E2E] text-white"
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
