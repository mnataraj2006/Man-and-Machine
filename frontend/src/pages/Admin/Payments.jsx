import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Download,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  Building,
  CheckCircle2,
  XCircle,
  FileText,
  Printer,
} from 'lucide-react';
import adminService from '../../services/adminService.js';
import { useAdmin } from '../../components/Admin/AdminLayout.jsx';

export default function Payments() {
  const { branches, selectedBranch } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Financial Overview
  const [overview, setOverview] = useState(null);

  // Payments Ledger
  const [payments, setPayments] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState(selectedBranch);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [receiptModal, setReceiptModal] = useState(null); // Receipt viewing
  const [allClients, setAllClients] = useState([]);

  const [paymentForm, setPaymentForm] = useState({
    userId: '',
    branchId: '',
    amount: '',
    paymentMethod: 'UPI',
    description: 'Quarterly Gym Membership Fee',
    date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    setBranchFilter(selectedBranch);
  }, [selectedBranch]);

  const fetchFinancials = async () => {
    setLoading(true);
    setError(null);
    try {
      const overviewRes = await adminService.getFinancialOverview(branchFilter);
      setOverview(overviewRes.summary);

      const paymentsRes = await adminService.getPayments({
        page,
        limit: 20,
        search,
        branchId: branchFilter,
        status: statusFilter,
        startDate,
        endDate,
      });
      setPayments(paymentsRes.payments || []);
      setTotalPages(paymentsRes.totalPages || 1);
      setTotalCount(paymentsRes.total || 0);

      const clientsRes = await adminService.getClients({ limit: 100 });
      if (clientsRes.clients) setAllClients(clientsRes.clients);
    } catch (err) {
      setError(err.message || 'Failed to fetch financial data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancials();
  }, [page, branchFilter, statusFilter, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchFinancials();
  };

  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminService.recordOfflinePayment(paymentForm);
      setIsRecordModalOpen(false);
      fetchFinancials();
      alert('Offline payment registered successfully!');
    } catch (err) {
      alert(err.message || 'Failed to record payment');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    if (!window.confirm(`Update transaction status to ${status}?`)) return;
    try {
      await adminService.updatePaymentStatus(id, status);
      fetchFinancials();
    } catch (err) {
      alert(err.message || 'Failed to update payment');
    }
  };

  const handleExportCSV = () => {
    const exportData = payments.map((p) => ({
      TransactionID: p.transactionId,
      Client: p.userId?.name || 'Client',
      Phone: p.userId?.phone || '',
      Branch: p.branchId?.city || '',
      Description: p.description,
      Amount: p.amount,
      Method: p.paymentMethod,
      Date: new Date(p.date).toLocaleDateString(),
      Status: p.status,
    }));
    adminService.exportToCSV(exportData, `payments_${Date.now()}.csv`);
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
            PAYMENTS &amp; FINANCIAL LEDGER
          </h2>
          <p className="text-xs text-[#A3A3A3]">
            Track revenue collections, confirmed offline settlements, receipts, and outstanding dues.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#1F1F1F] hover:bg-[#252525] text-[#F5F5F5] border border-[#292929] hover:border-[#E58A32] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#E58A32]" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPaymentForm({
                userId: allClients[0]?.id || '',
                branchId: branches[0]?._id || '',
                amount: '',
                paymentMethod: 'UPI',
                description: 'Gym Membership Settlement',
                date: new Date().toISOString().slice(0, 10),
              });
              setIsRecordModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] hover:bg-[#F09A43] text-black transition-all cursor-pointer shadow-lg shadow-[#E58A32]/10"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* ── FINANCIAL OVERVIEW METRICS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#181818] border border-[#292929] rounded-2xl p-4">
          <span className="text-[10px] font-mono uppercase text-[#A3A3A3]">TODAY'S COLLECTIONS</span>
          <p
            className="text-2xl font-bold text-green-400 mt-1"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            ₹{(overview?.todayCollections ?? 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-[#A3A3A3]">Confirmed settlements today</span>
        </div>

        <div className="bg-[#181818] border border-[#292929] rounded-2xl p-4">
          <span className="text-[10px] font-mono uppercase text-[#A3A3A3]">THIS MONTH REVENUE</span>
          <p
            className="text-2xl font-bold text-[#E58A32] mt-1"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            ₹{(overview?.thisMonthCollections ?? 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-[#A3A3A3]">
            Last Month: ₹{(overview?.lastMonthCollections ?? 0).toLocaleString()}
          </span>
        </div>

        <div className="bg-[#181818] border border-[#292929] rounded-2xl p-4">
          <span className="text-[10px] font-mono uppercase text-[#A3A3A3]">OUTSTANDING / PENDING</span>
          <p
            className="text-2xl font-bold text-amber-400 mt-1"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            ₹{(overview?.outstandingTotal ?? 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-amber-400/80">Pending verification</span>
        </div>

        <div className="bg-[#181818] border border-[#292929] rounded-2xl p-4">
          <span className="text-[10px] font-mono uppercase text-[#A3A3A3]">REFUNDS PROCESSED</span>
          <p
            className="text-2xl font-bold text-red-400 mt-1"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            ₹{(overview?.refundsTotal ?? 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-[#A3A3A3]">Strict audit record</span>
        </div>
      </div>

      {/* ── SEARCH & FILTERS ── */}
      <div className="bg-[#141414] border border-[#292929] rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-[#A3A3A3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client name or transaction ID..."
            className="w-full pl-9 pr-4 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setPage(1);
            }}
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
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="PAID">PAID (Confirmed)</option>
            <option value="PENDING">PENDING</option>
            <option value="FAILED">FAILED</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>
        </div>
      </div>

      {/* ── TRANSACTIONS TABLE ── */}
      <div className="bg-[#181818] border border-[#292929] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#292929] bg-[#141414] text-[11px] font-mono uppercase tracking-wider text-[#A3A3A3]">
                <th className="py-3 px-4 font-semibold">Transaction ID</th>
                <th className="py-3 px-4 font-semibold">Athlete</th>
                <th className="py-3 px-4 font-semibold">Branch</th>
                <th className="py-3 px-4 font-semibold">Description</th>
                <th className="py-3 px-4 font-semibold">Amount</th>
                <th className="py-3 px-4 font-semibold">Method</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#A3A3A3]">
                    Loading payment ledger...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#A3A3A3]">
                    No transactions match the specified filter criteria.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p._id} className="hover:bg-[#1E1E1E] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#F5F5F5]">
                      {p.transactionId}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#F5F5F5] block">{p.userId?.name || 'Client'}</span>
                      <span className="text-[10px] text-[#A3A3A3] font-mono">{p.userId?.phone}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#E58A32]">
                      {p.branchId?.city || 'HQ'}
                    </td>
                    <td className="py-3 px-4 text-[#A3A3A3] max-w-[150px] truncate">{p.description}</td>
                    <td className="py-3 px-4 font-bold text-base text-[#F5F5F5]">
                      ₹{p.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-[#A3A3A3]">
                      {p.paymentMethod}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#A3A3A3]">
                      {new Date(p.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          p.status === 'PAID'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                            : p.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setReceiptModal(p)}
                        className="px-2.5 py-1 rounded bg-[#252525] hover:bg-[#E58A32] hover:text-black text-[#F5F5F5] font-semibold text-[11px] transition-colors cursor-pointer"
                      >
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── RECORD PAYMENT MODAL ── */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#292929] rounded-2xl w-full max-w-md p-6 relative">
            <h3
              className="text-lg font-bold uppercase tracking-tight text-[#F5F5F5] mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Record Confirmed Payment
            </h3>

            <form onSubmit={handleRecordSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Select Athlete</label>
                <select
                  required
                  value={paymentForm.userId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, userId: e.target.value })}
                  className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none"
                >
                  <option value="">-- Choose Client --</option>
                  {allClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone || c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5]"
                    placeholder="e.g. 5000"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Payment Method</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                  >
                    <option value="UPI">UPI (GPay/PhonePe)</option>
                    <option value="CASH">Cash Desk</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="NET_BANKING">Net Banking</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Description / Memo</label>
                <input
                  type="text"
                  required
                  value={paymentForm.description}
                  onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                  className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5]"
                  placeholder="e.g. Quarterly Elite Membership"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Date</label>
                  <input
                    type="date"
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Branch</label>
                  <select
                    value={paymentForm.branchId}
                    onChange={(e) => setPaymentForm({ ...paymentForm, branchId: e.target.value })}
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

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#222222] text-[#A3A3A3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] text-black"
                >
                  Confirm &amp; Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RECEIPT PREVIEW MODAL ── */}
      {receiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141414] border border-[#292929] rounded-2xl w-full max-w-md p-6 relative space-y-4">
            <div className="border-b border-[#292929] pb-3 text-center">
              <span className="text-xs font-mono text-[#E58A32] uppercase tracking-widest block font-bold">
                MAN &amp; MACHINE FITNESS GYM
              </span>
              <h3 className="text-sm font-bold uppercase text-[#F5F5F5] mt-1">OFFICIAL FEE RECEIPT</h3>
              <p className="text-[10px] text-[#A3A3A3] font-mono">Tx ID: {receiptModal.transactionId}</p>
            </div>

            <div className="space-y-2 text-xs bg-[#181818] p-4 rounded-xl border border-[#222222]">
              <div className="flex justify-between">
                <span className="text-[#A3A3A3]">Athlete Name:</span>
                <span className="font-bold text-[#F5F5F5]">{receiptModal.userId?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A3A3A3]">Contact:</span>
                <span className="font-mono text-[#F5F5F5]">{receiptModal.userId?.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A3A3A3]">Hub Location:</span>
                <span className="text-[#E58A32] font-semibold">{receiptModal.branchId?.city} Branch</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A3A3A3]">Purpose:</span>
                <span className="text-[#F5F5F5]">{receiptModal.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A3A3A3]">Payment Mode:</span>
                <span className="font-mono text-[#F5F5F5]">{receiptModal.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A3A3A3]">Date of Settlement:</span>
                <span className="font-mono text-[#F5F5F5]">{new Date(receiptModal.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#292929] text-base">
                <span className="font-bold text-[#F5F5F5]">Total Paid:</span>
                <span className="font-bold text-[#E58A32]">₹{receiptModal.amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setReceiptModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#222222] text-[#A3A3A3]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] text-black"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
