import React, { useState, useEffect, useCallback } from 'react';
import {
  Banknote,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Receipt,
  AlertCircle,
  X,
} from 'lucide-react';
import financeService from '../../../services/financeService.js';
import { useAdmin } from '../../../components/Admin/AdminLayout.jsx';
import {
  formatINR,
  formatISTDate,
  EmptyFinanceState,
  ReceiptModal,
} from '../../../components/Finance/FinanceShared.jsx';

const TABS = [
  { key: 'PENDING_APPROVAL', label: 'Pending Cash Approvals' },
  { key: 'PAID', label: 'Approved Cash Payments' },
  { key: 'REJECTED', label: 'Rejected Cash Payments' },
  { key: 'ALL', label: 'All Cash' },
];

export default function CashApprovals() {
  const { branches, selectedBranch } = useAdmin();
  const [branchFilter, setBranchFilter] = useState(selectedBranch || 'ALL');
  const [statusTab, setStatusTab] = useState('PENDING_APPROVAL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({
    pendingCount: 0,
    pendingAmount: 0,
    approvedCount: 0,
    approvedAmount: 0,
    rejectedCount: 0,
    rejectedAmount: 0,
  });

  const [busyId, setBusyId] = useState(null);
  const [rejectModalPayment, setRejectModalPayment] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [receiptPaymentId, setReceiptPaymentId] = useState(null);

  useEffect(() => {
    setBranchFilter(selectedBranch || 'ALL');
  }, [selectedBranch]);

  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await financeService.getCashApprovals({
        status: statusTab,
        branchId: branchFilter,
        search: search.trim(),
      });
      setPayments(res.payments || []);
      if (res.summary) setSummary(res.summary);
    } catch (err) {
      setError(err.message || 'Failed to load cash approvals.');
    } finally {
      setLoading(false);
    }
  }, [statusTab, branchFilter, search]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const showNotice = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleApprove = async (p) => {
    try {
      setBusyId(p._id);
      await financeService.approveCashPayment(p._id, {});
      showNotice('success', `Approved ₹${p.amount} cash payment. Receipt finalized and membership activated.`);
      await fetchApprovals();
    } catch (err) {
      showNotice('error', err.message || 'Failed to approve cash payment.');
    } finally {
      setBusyId(null);
    }
  };

  const openRejectModal = (p) => {
    setRejectModalPayment(p);
    setRejectReason('');
    setRejectError('');
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      setRejectError('Please enter a rejection reason.');
      return;
    }
    try {
      setBusyId(rejectModalPayment._id);
      setRejectError('');
      await financeService.rejectCashPayment(rejectModalPayment._id, {
        reason: rejectReason.trim(),
      });
      setRejectModalPayment(null);
      showNotice('success', 'Cash payment rejected. Membership remains inactive.');
      await fetchApprovals();
    } catch (err) {
      setRejectError(err.message || 'Failed to reject cash payment.');
    } finally {
      setBusyId(null);
    }
  };

  const renderStatusBadge = (st) => {
    if (st === 'PENDING_APPROVAL') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <Clock className="w-3 h-3" />
          PENDING APPROVAL
        </span>
      );
    }
    if (st === 'PAID') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3" />
          PAID / APPROVED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
        <XCircle className="w-3 h-3" />
        REJECTED
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono text-[#EB3E2E] uppercase tracking-wider font-bold">
            FINANCE / CASH DESK GOVERNANCE
          </span>
          <h1
            className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            CASH PAYMENT APPROVALS.
          </h1>
          <p className="text-xs text-[#B8B8B8]">
            Cash desk purchases remain pending until explicitly verified and approved by an authorized Admin.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchApprovals}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#181818] hover:bg-[#222222] border border-[#303030] text-xs font-bold uppercase tracking-wider text-white self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-current opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#181818] border border-amber-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-amber-300 block">Pending Cash</span>
            <span className="text-2xl font-black text-white">{formatINR(summary.pendingAmount)}</span>
            <span className="text-[11px] text-[#B8B8B8] block">{summary.pendingCount} awaiting approval</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-300 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-emerald-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-emerald-300 block">Actual Collected Cash</span>
            <span className="text-2xl font-black text-white">{formatINR(summary.approvedAmount)}</span>
            <span className="text-[11px] text-[#B8B8B8] block">{summary.approvedCount} approved payments</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center">
            <Banknote className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-rose-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-rose-300 block">Rejected Cash</span>
            <span className="text-2xl font-black text-white">{formatINR(summary.rejectedAmount)}</span>
            <span className="text-[11px] text-[#B8B8B8] block">{summary.rejectedCount} rejected</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-500/15 text-rose-300 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#111111] p-4 rounded-2xl border border-[#252525]">
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusTab(tab.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                statusTab === tab.key
                  ? 'bg-[#EB3E2E] text-white'
                  : 'bg-[#181818] text-[#B8B8B8] hover:text-white border border-[#303030]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#858585] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Client, ID, plan..."
              className="mm-input pl-9 min-h-[40px] text-xs w-full sm:w-56"
            />
          </div>

          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="mm-select min-h-[40px] text-xs"
          >
            <option value="ALL">All Branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.city} Branch
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl bg-[#111111] border border-[#252525] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#858585]">Loading cash desk transactions...</div>
        ) : payments.length === 0 ? (
          <div className="p-8">
            <EmptyFinanceState
              title="No Cash Transactions Found"
              subtitle="There are no cash payments matching the current filter."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#252525] text-[10px] font-mono uppercase text-[#858585] bg-[#161616]">
                  <th className="py-3.5 px-4">Client</th>
                  <th className="py-3.5 px-4">Client ID</th>
                  <th className="py-3.5 px-4">Branch</th>
                  <th className="py-3.5 px-4">Membership Plan</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Method</th>
                  <th className="py-3.5 px-4">Created By</th>
                  <th className="py-3.5 px-4">Created At</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202020] text-xs">
                {payments.map((p) => {
                  const clientName = p.clientProfileId?.name || p.userId?.name || 'Walk-in Client';
                  const clientCode = p.clientProfileId?.clientId || '—';
                  const planName = p.membershipId?.planName || p.description || 'Membership';
                  const isPending = p.status === 'PENDING_APPROVAL';
                  const isBusy = busyId === p._id;

                  return (
                    <tr key={p._id} className="hover:bg-[#161616] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">{clientName}</td>
                      <td className="py-3.5 px-4 font-mono text-[#B8B8B8]">{clientCode}</td>
                      <td className="py-3.5 px-4 text-[#B8B8B8]">{p.branchId?.city || 'Branch'}</td>
                      <td className="py-3.5 px-4 text-[#F5F5F5]">{planName}</td>
                      <td className="py-3.5 px-4 font-bold text-white">{formatINR(p.amount)}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-[#202020] border border-[#303030] font-mono text-[10px] text-[#F5F5F5]">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#B8B8B8]">
                        {p.createdBy?.name || 'Desk Staff'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#B8B8B8]">
                        {formatISTDate(p.createdAt || p.date, true)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {renderStatusBadge(p.status)}
                          {p.status === 'REJECTED' && p.rejectionReason && (
                            <span className="text-[10px] text-rose-300/80 max-w-[180px] truncate" title={p.rejectionReason}>
                              Reason: {p.rejectionReason}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleApprove(p)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] uppercase tracking-wider disabled:opacity-50"
                              >
                                {isBusy ? '...' : 'Approve'}
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => openRejectModal(p)}
                                className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-bold text-[11px] uppercase tracking-wider disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {p.status === 'PAID' && (
                            <button
                              type="button"
                              onClick={() => setReceiptPaymentId(p._id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#202020] hover:bg-[#2A2A2A] border border-[#303030] text-white text-[11px] font-semibold"
                            >
                              <Receipt className="w-3.5 h-3.5 text-[#EB3E2E]" />
                              Receipt
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Reason Modal */}
      {rejectModalPayment && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setRejectModalPayment(null)}
        >
          <div
            className="w-full max-w-md bg-[#181818] border border-[#303030] rounded-2xl p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#EB3E2E] font-bold">
                  CASH DESK REJECTION
                </span>
                <h3 className="text-lg font-bold text-white uppercase">Reject Cash Payment</h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalPayment(null)}
                className="text-[#858585] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#B8B8B8]">
              Rejecting {formatINR(rejectModalPayment.amount)} for{' '}
              <strong className="text-white">
                {rejectModalPayment.clientProfileId?.name || rejectModalPayment.userId?.name || 'Client'}
              </strong>{' '}
              will keep their membership inactive and preserve the audit record.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#B8B8B8] mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Cash not received at reception desk / amount mismatch"
                  className="mm-input w-full text-xs"
                />
              </div>

              {rejectError && <p className="text-xs text-rose-400">{rejectError}</p>}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModalPayment(null)}
                  className="mm-btn-secondary rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busyId === rejectModalPayment._id}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                >
                  {busyId === rejectModalPayment._id ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {receiptPaymentId && (
        <ReceiptModal
          paymentId={receiptPaymentId}
          onClose={() => setReceiptPaymentId(null)}
        />
      )}
    </div>
  );
}
