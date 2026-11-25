import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Wallet,
  Clock,
  Receipt,
  Building2,
  ArrowDownRight,
  AlertCircle,
  Bell,
  CreditCard,
  Eye,
  Calendar,
} from 'lucide-react';
import financeService from '../../../services/financeService.js';
import { useAdmin } from '../../../components/Admin/AdminLayout.jsx';
import {
  formatINR,
  formatISTDate,
  InvoiceStatusBadge,
  EmptyFinanceState,
  InvoiceDetailModal,
  RecordPaymentModal,
  ReceiptModal,
} from '../../../components/Finance/FinanceShared.jsx';

export default function FinanceSummary({ onNavigate }) {
  const { branches, selectedBranch } = useAdmin();
  const [branchFilter, setBranchFilter] = useState(selectedBranch || 'ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [config, setConfig] = useState(null);

  // Outstanding list filters
  const [outstandingSearch, setOutstandingSearch] = useState('');
  const [outstandingDueDate, setOutstandingDueDate] = useState('');
  const [outstandingMinAmount, setOutstandingMinAmount] = useState('');

  // Modals
  const [viewInvoiceId, setViewInvoiceId] = useState(null);
  const [payInvoice, setPayInvoice] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setBranchFilter(selectedBranch || 'ALL');
  }, [selectedBranch]);

  const loadSummary = async () => {
    setLoading(true);
    setError('');
    try {
      const [sumRes, cfgRes] = await Promise.all([
        financeService.getSummary({ branchId: branchFilter, startDate, endDate }),
        financeService.getConfig(),
      ]);
      setSummary(sumRes.summary);
      setConfig(cfgRes.config);
    } catch (err) {
      setError(err.message || 'Failed to load finance summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [branchFilter, startDate, endDate]);

  const handleSendReminder = async (inv) => {
    try {
      const res = await financeService.sendInvoiceReminder(inv._id);
      setNotice(res.message || `Reminder sent for ${inv.invoiceNumber}`);
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to send reminder');
    }
  };

  const filteredOutstanding = (summary?.outstandingInvoices || []).filter((inv) => {
    if (outstandingSearch.trim()) {
      const q = outstandingSearch.trim().toLowerCase();
      const nameMatch = (inv.clientId?.name || '').toLowerCase().includes(q);
      const numMatch = (inv.invoiceNumber || '').toLowerCase().includes(q);
      if (!nameMatch && !numMatch) return false;
    }
    if (outstandingDueDate && inv.dueDate) {
      const dueStr = new Date(inv.dueDate).toISOString().slice(0, 10);
      if (dueStr > outstandingDueDate) return false;
    }
    if (outstandingMinAmount && Number(inv.balanceAmount) < Number(outstandingMinAmount)) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
            FINANCE SUMMARY &amp; OVERVIEW
          </h2>
          <p className="text-xs text-[#B8B8B8]">
            Single source of truth across invoices, collections, pending balances, and expenses (IST / INR).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Branch filter"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="bg-[#181818] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
          >
            <option value="ALL">All Branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.city}
              </option>
            ))}
          </select>
          <input
            type="date"
            aria-label="Start date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-[#181818] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
          />
          <input
            type="date"
            aria-label="End date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-[#181818] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
          />
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="px-3 py-2 rounded-xl bg-[#202020] text-xs font-bold uppercase text-[#B8B8B8] border border-[#303030] cursor-pointer"
            >
              Reset Dates
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
          {notice}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-[#181818] border border-[#303030]" />
          ))}
        </div>
      ) : (
        <>
          {/* 7 Required KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => onNavigate && onNavigate('/admin/finance/invoices/today')}
              className="bg-[#181818] border border-[#303030] rounded-2xl p-5 hover:border-[#EB3E2E]/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-[#B8B8B8]">Today&apos;s Collection</span>
                <Calendar className="w-4 h-4 text-[#EB3E2E]" />
              </div>
              <p className="text-2xl font-bold text-[#F5F5F5] mt-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
                {formatINR(summary?.todayCollection)}
              </p>
              <span className="text-[11px] text-[#858585]">IST Date: {summary?.todayDate}</span>
            </div>

            <div
              onClick={() => onNavigate && onNavigate('/admin/finance/collections/monthly')}
              className="bg-[#181818] border border-[#303030] rounded-2xl p-5 hover:border-[#EB3E2E]/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-[#B8B8B8]">This Month</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-[#F5F5F5] mt-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
                {formatINR(summary?.thisMonthCollection)}
              </p>
              <span className="text-[11px] text-[#B8B8B8]">Confirmed paid this month</span>
            </div>

            <div
              onClick={() => onNavigate && onNavigate('/admin/finance/collections/monthly')}
              className="bg-[#181818] border border-[#303030] rounded-2xl p-5 hover:border-[#EB3E2E]/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-[#B8B8B8]">This Year</span>
                <Wallet className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-[#F5F5F5] mt-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
                {formatINR(summary?.thisYearCollection)}
              </p>
              <span className="text-[11px] text-[#B8B8B8]">YTD collected revenue</span>
            </div>

            <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-[#B8B8B8]">Pending Balance</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-[#EB3E2E] mt-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
                {formatINR(summary?.pendingBalance)}
              </p>
              <span className="text-[11px] text-[#B8B8B8]">
                {summary?.pendingInvoicesCount || 0} outstanding invoices
              </span>
            </div>

            <div
              onClick={() => onNavigate && onNavigate('/admin/finance/expenses')}
              className="bg-[#181818] border border-[#303030] rounded-2xl p-5 hover:border-[#EB3E2E]/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-[#B8B8B8]">Total Expenses</span>
                <ArrowDownRight className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-2xl font-bold text-[#F5F5F5] mt-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
                {formatINR(summary?.totalExpenses)}
              </p>
              <span className="text-[11px] text-[#B8B8B8]">
                This month: {formatINR(summary?.monthExpenses)}
              </span>
            </div>

            <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-[#B8B8B8]">Net Revenue</span>
                <TrendingUp className="w-4 h-4 text-[#EB3E2E]" />
              </div>
              <p className="text-2xl font-bold text-emerald-400 mt-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
                {formatINR(summary?.netRevenue)}
              </p>
              <span className="text-[11px] text-[#858585]">
                Collected ({formatINR(summary?.collectedRevenue)}) - Refunds ({formatINR(summary?.refunds)}) - Expenses
              </span>
            </div>

            <div
              onClick={() => onNavigate && onNavigate('/admin/finance/invoices')}
              className="bg-[#181818] border border-[#303030] rounded-2xl p-5 hover:border-[#EB3E2E]/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-[#B8B8B8]">Total Invoices</span>
                <Receipt className="w-4 h-4 text-[#EB3E2E]" />
              </div>
              <p className="text-2xl font-bold text-[#F5F5F5] mt-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
                {summary?.totalInvoices ?? 0}
              </p>
              <span className="text-[11px] text-[#B8B8B8]">
                Gross billed: {formatINR(summary?.grossRevenue)}
              </span>
            </div>
          </div>

          {/* Payment Method Breakdown & Branch Finance Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payment Method Breakdown */}
            <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  Collections by Payment Method
                </h3>
                <p className="text-[11px] text-[#B8B8B8]">Actual settled receipts (Cash vs UPI vs Card)</p>
              </div>
              {summary?.paymentMethodBreakdown?.length ? (
                <div className="space-y-3">
                  {summary.paymentMethodBreakdown.map((pm) => (
                    <div key={pm.code} className="p-3 rounded-xl bg-[#111111] border border-[#303030] flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#F5F5F5]">{pm.label}</span>
                        <span className="block text-[10px] font-mono text-[#858585]">
                          {pm.count} payments • Today: {formatINR(pm.todayAmount)}
                        </span>
                      </div>
                      <span className="text-sm font-mono font-bold text-[#EB3E2E]">{formatINR(pm.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#858585] py-4">No financial transactions yet.</p>
              )}
            </div>

            {/* Branch-wise Summary */}
            <div className="lg:col-span-2 bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                    Branch-Wise Finance Summary
                  </h3>
                  <p className="text-[11px] text-[#B8B8B8]">Kovilpatti, Karur &amp; Sivakasi live performance</p>
                </div>
                <Building2 className="w-4 h-4 text-[#EB3E2E]" />
              </div>

              {summary?.branchBreakdown?.length ? (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#111111] text-[10px] font-mono uppercase text-[#B8B8B8] border-y border-[#303030]">
                        <tr>
                          <th className="px-3 py-2.5">Branch</th>
                          <th className="px-3 py-2.5 text-right">Collected</th>
                          <th className="px-3 py-2.5 text-right">Expenses</th>
                          <th className="px-3 py-2.5 text-right">Outstanding</th>
                          <th className="px-3 py-2.5 text-right">Net Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#252525]">
                        {summary.branchBreakdown.map((b) => (
                          <tr key={b.branchId}>
                            <td className="px-3 py-3 font-bold text-[#F5F5F5]">{b.city}</td>
                            <td className="px-3 py-3 text-right font-mono text-emerald-400">{formatINR(b.collectedRevenue)}</td>
                            <td className="px-3 py-3 text-right font-mono text-rose-400">{formatINR(b.expenses)}</td>
                            <td className="px-3 py-3 text-right font-mono text-amber-400">{formatINR(b.outstanding)}</td>
                            <td className="px-3 py-3 text-right font-mono font-bold text-[#F5F5F5]">{formatINR(b.netRevenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden space-y-2.5">
                    {summary.branchBreakdown.map((b) => (
                      <div key={b.branchId} className="p-3.5 rounded-xl bg-[#111111] border border-[#303030] space-y-2 text-xs">
                        <div className="flex justify-between font-bold text-[#F5F5F5]">
                          <span>{b.city} Branch</span>
                          <span className="font-mono text-emerald-400">Net: {formatINR(b.netRevenue)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[11px]">
                          <div><span className="text-[#858585] block">Collected</span>{formatINR(b.collectedRevenue)}</div>
                          <div><span className="text-[#858585] block">Expenses</span>{formatINR(b.expenses)}</div>
                          <div><span className="text-[#858585] block">Pending</span>{formatINR(b.outstanding)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyFinanceState />
              )}
            </div>
          </div>

          {/* Pending Balances / Outstanding Invoices Section */}
          <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  Pending Balances &amp; Outstanding Dues ({filteredOutstanding.length})
                </h3>
                <p className="text-[11px] text-[#B8B8B8]">
                  Derived automatically from Invoice total minus settled Payments.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Member or Invoice #"
                  value={outstandingSearch}
                  onChange={(e) => setOutstandingSearch(e.target.value)}
                  className="bg-[#111111] border border-[#303030] rounded-xl px-3 py-1.5 text-xs text-[#F5F5F5]"
                />
                <input
                  type="date"
                  title="Due before date"
                  value={outstandingDueDate}
                  onChange={(e) => setOutstandingDueDate(e.target.value)}
                  className="bg-[#111111] border border-[#303030] rounded-xl px-3 py-1.5 text-xs text-[#F5F5F5]"
                />
                <input
                  type="number"
                  placeholder="Min ₹ balance"
                  value={outstandingMinAmount}
                  onChange={(e) => setOutstandingMinAmount(e.target.value)}
                  className="w-32 bg-[#111111] border border-[#303030] rounded-xl px-3 py-1.5 text-xs text-[#F5F5F5]"
                />
              </div>
            </div>

            {filteredOutstanding.length === 0 ? (
              <p className="text-xs text-[#858585] py-4 text-center">No outstanding balances matching current filters.</p>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#111111] text-[10px] font-mono uppercase text-[#B8B8B8] border-y border-[#303030]">
                      <tr>
                        <th className="px-3 py-2.5">Member</th>
                        <th className="px-3 py-2.5">Invoice</th>
                        <th className="px-3 py-2.5">Branch</th>
                        <th className="px-3 py-2.5">Due Date</th>
                        <th className="px-3 py-2.5 text-right">Total</th>
                        <th className="px-3 py-2.5 text-right">Paid</th>
                        <th className="px-3 py-2.5 text-right">Balance</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#252525]">
                      {filteredOutstanding.map((inv) => (
                        <tr key={inv._id}>
                          <td className="px-3 py-3 font-semibold text-[#F5F5F5]">{inv.clientId?.name || 'Member'}</td>
                          <td className="px-3 py-3 font-mono text-[#F5F5F5]">{inv.invoiceNumber}</td>
                          <td className="px-3 py-3 text-[#B8B8B8]">{inv.branchId?.city || '—'}</td>
                          <td className="px-3 py-3 text-[#B8B8B8]">{formatISTDate(inv.dueDate)}</td>
                          <td className="px-3 py-3 text-right font-mono">{formatINR(inv.totalAmount)}</td>
                          <td className="px-3 py-3 text-right font-mono text-emerald-400">{formatINR(inv.paidAmount)}</td>
                          <td className="px-3 py-3 text-right font-mono font-bold text-[#EB3E2E]">{formatINR(inv.balanceAmount)}</td>
                          <td className="px-3 py-3"><InvoiceStatusBadge status={inv.status} /></td>
                          <td className="px-3 py-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setViewInvoiceId(inv._id)}
                                title="View Invoice"
                                className="p-1.5 rounded-lg bg-[#202020] text-[#F5F5F5] border border-[#303030] cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setPayInvoice(inv)}
                                className="px-2.5 py-1 rounded-lg bg-[#EB3E2E] text-white text-[10px] font-bold uppercase cursor-pointer"
                              >
                                Record Payment
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendReminder(inv)}
                                title="Send Reminder"
                                className="p-1.5 rounded-lg bg-[#202020] text-amber-400 border border-[#303030] cursor-pointer"
                              >
                                <Bell className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {filteredOutstanding.map((inv) => (
                    <div key={inv._id} className="p-4 rounded-xl bg-[#111111] border border-[#303030] space-y-2.5 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-[#F5F5F5]">{inv.clientId?.name || 'Member'}</p>
                          <p className="font-mono text-[11px] text-[#858585]">{inv.invoiceNumber} • {inv.branchId?.city}</p>
                        </div>
                        <InvoiceStatusBadge status={inv.status} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                        <div><span className="text-[#858585] block">Total</span>{formatINR(inv.totalAmount)}</div>
                        <div><span className="text-[#858585] block">Paid</span><span className="text-emerald-400">{formatINR(inv.paidAmount)}</span></div>
                        <div><span className="text-[#858585] block">Balance</span><span className="font-bold text-[#EB3E2E]">{formatINR(inv.balanceAmount)}</span></div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#252525]">
                        <button type="button" onClick={() => setViewInvoiceId(inv._id)} className="px-3 py-1.5 rounded-lg bg-[#202020] text-[#F5F5F5] font-bold uppercase text-[10px] cursor-pointer">
                          View Invoice
                        </button>
                        <button type="button" onClick={() => handleSendReminder(inv)} className="px-3 py-1.5 rounded-lg bg-[#202020] text-amber-400 font-bold uppercase text-[10px] cursor-pointer">
                          Remind
                        </button>
                        <button type="button" onClick={() => setPayInvoice(inv)} className="px-3 py-1.5 rounded-lg bg-[#EB3E2E] text-white font-bold uppercase text-[10px] cursor-pointer">
                          Pay
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      <InvoiceDetailModal
        invoiceId={viewInvoiceId}
        onClose={() => setViewInvoiceId(null)}
        onRecordPayment={(inv) => {
          setViewInvoiceId(null);
          setPayInvoice(inv);
        }}
        onViewReceipt={(rcp) => setActiveReceipt(rcp)}
        onRefresh={loadSummary}
      />

      <RecordPaymentModal
        invoice={payInvoice}
        paymentMethods={config?.paymentMethods || []}
        onClose={() => setPayInvoice(null)}
        onSuccess={(res) => {
          setPayInvoice(null);
          if (res?.receipt) setActiveReceipt(res.receipt);
          loadSummary();
        }}
      />

      <ReceiptModal receipt={activeReceipt} onClose={() => setActiveReceipt(null)} />
    </div>
  );
}
