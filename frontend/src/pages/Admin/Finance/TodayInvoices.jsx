import React, { useState, useEffect } from 'react';
import { Search, Eye, Printer, CreditCard, Calendar } from 'lucide-react';
import financeService from '../../../services/financeService.js';
import { useAdmin } from '../../../components/Admin/AdminLayout.jsx';
import {
  formatINR,
  formatISTDateTime,
  InvoiceStatusBadge,
  ExportButtons,
  EmptyFinanceState,
  InvoiceDetailModal,
  RecordPaymentModal,
  ReceiptModal,
  getInvoicePrintHtml,
  printDocumentHtml,
} from '../../../components/Finance/FinanceShared.jsx';

export default function TodayInvoices() {
  const { branches, selectedBranch } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [config, setConfig] = useState(null);

  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState(selectedBranch || 'ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');

  const [viewInvoiceId, setViewInvoiceId] = useState(null);
  const [payInvoice, setPayInvoice] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null);

  useEffect(() => {
    setBranchFilter(selectedBranch || 'ALL');
  }, [selectedBranch]);

  const loadToday = async () => {
    setLoading(true);
    try {
      const [todayRes, cfgRes] = await Promise.all([
        financeService.getTodayInvoices({
          branchId: branchFilter,
          status: statusFilter,
          paymentMethod: methodFilter,
          search,
        }),
        financeService.getConfig(),
      ]);
      setStats(todayRes.stats);
      setInvoices(todayRes.invoices || []);
      setConfig(cfgRes.config);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadToday();
  }, [branchFilter, statusFilter, methodFilter]);

  const exportRows = invoices.map((inv) => ({
    InvoiceNo: inv.invoiceNumber,
    DateTimeIST: formatISTDateTime(inv.invoiceDate),
    Member: inv.clientId?.name || 'Member',
    Branch: inv.branchId?.city || '',
    Description: inv.description,
    GrossAmount: inv.totalAmount,
    Paid: inv.paidAmount,
    Balance: inv.balanceAmount,
    Method: inv.paymentMethod,
    Status: inv.status,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase text-[#EB3E2E] font-bold mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Timezone: Asia/Kolkata • Date: {stats?.date || 'Today'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
            TODAY&apos;S INVOICES
          </h2>
        </div>

        <ExportButtons
          onCSV={() => financeService.exportToCSV(exportRows, `today_invoices_${stats?.date || 'ist'}.csv`)}
          onExcel={() => financeService.exportToExcel(exportRows, `today_invoices_${stats?.date || 'ist'}.xls`, "Today's Invoices")}
          onPrint={() => window.print()}
        />
      </div>

      {/* Today KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Invoices', value: stats?.totalInvoices ?? 0 },
          { label: 'Paid Invoices', value: stats?.paidInvoices ?? 0, tone: 'text-emerald-400' },
          { label: 'Pending Invoices', value: stats?.pendingInvoices ?? 0, tone: 'text-amber-400' },
          { label: "Today's Gross", value: formatINR(stats?.grossAmount) },
          { label: "Today's Collected", value: formatINR(stats?.collectedAmount), tone: 'text-emerald-400' },
          { label: "Today's Outstanding", value: formatINR(stats?.outstandingAmount), tone: 'text-[#EB3E2E]' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-[#181818] border border-[#303030] rounded-2xl p-4">
            <span className="text-[10px] font-mono uppercase text-[#B8B8B8] block">{kpi.label}</span>
            <span className={`text-lg sm:text-xl font-bold mt-1 block ${kpi.tone || 'text-[#F5F5F5]'}`} style={{ fontFamily: "'Oswald', sans-serif" }}>
              {kpi.value}
            </span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          loadToday();
        }}
        className="bg-[#181818] border border-[#303030] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
      >
        <div className="relative lg:col-span-2">
          <Search className="w-3.5 h-3.5 text-[#858585] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search invoice # or member..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#111111] border border-[#303030] rounded-xl text-xs text-[#F5F5F5]"
          />
        </div>
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]">
          <option value="ALL">All Branches</option>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>{b.city}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]">
          <option value="ALL">All Statuses</option>
          <option value="PAID">PAID</option>
          <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
          <option value="PENDING">PENDING</option>
        </select>
        <div className="flex gap-2">
          <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]">
            <option value="ALL">All Methods</option>
            {(config?.paymentMethods || []).map((m) => (
              <option key={m.code} value={m.code}>{m.label}</option>
            ))}
          </select>
          <button type="submit" className="px-3 py-2 rounded-xl bg-[#202020] border border-[#303030] text-xs font-bold uppercase text-[#F5F5F5] cursor-pointer">
            Go
          </button>
        </div>
      </form>

      {loading ? (
        <div className="h-44 rounded-2xl bg-[#181818] border border-[#303030] animate-pulse" />
      ) : invoices.length === 0 ? (
        <EmptyFinanceState title="No invoices generated today (IST)." subtitle="Invoices recorded today under Asia/Kolkata timezone appear here automatically." />
      ) : (
        <>
          <div className="hidden lg:block bg-[#181818] border border-[#303030] rounded-2xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#111111] text-[10px] font-mono uppercase text-[#B8B8B8] border-b border-[#303030]">
                <tr>
                  <th className="px-4 py-3">Invoice No.</th>
                  <th className="px-3 py-3">Time (IST)</th>
                  <th className="px-3 py-3">Member</th>
                  <th className="px-3 py-3">Branch</th>
                  <th className="px-3 py-3">Description</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3 text-right">Paid</th>
                  <th className="px-3 py-3 text-right">Balance</th>
                  <th className="px-3 py-3">Method</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252525]">
                {invoices.map((inv) => (
                  <tr key={inv._id}>
                    <td className="px-4 py-3 font-mono font-bold text-[#F5F5F5]">{inv.invoiceNumber}</td>
                    <td className="px-3 py-3 text-[#B8B8B8]">{formatISTDateTime(inv.invoiceDate)}</td>
                    <td className="px-3 py-3 font-semibold text-[#F5F5F5]">{inv.clientId?.name || 'Member'}</td>
                    <td className="px-3 py-3 text-[#B8B8B8]">{inv.branchId?.city}</td>
                    <td className="px-3 py-3 text-[#B8B8B8] max-w-[180px] truncate">{inv.description}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatINR(inv.totalAmount)}</td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-400">{formatINR(inv.paidAmount)}</td>
                    <td className="px-3 py-3 text-right font-mono text-[#EB3E2E]">{formatINR(inv.balanceAmount)}</td>
                    <td className="px-3 py-3 font-mono">{inv.paymentMethod}</td>
                    <td className="px-3 py-3"><InvoiceStatusBadge status={inv.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button type="button" onClick={() => setViewInvoiceId(inv._id)} className="p-1.5 rounded-lg bg-[#202020] border border-[#303030] cursor-pointer"><Eye className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => printDocumentHtml(getInvoicePrintHtml(inv))} className="p-1.5 rounded-lg bg-[#202020] border border-[#303030] cursor-pointer"><Printer className="w-3.5 h-3.5" /></button>
                        {inv.balanceAmount > 0 && !['CANCELLED', 'REFUNDED', 'PAID'].includes(inv.status) && (
                          <button type="button" onClick={() => setPayInvoice(inv)} className="p-1.5 rounded-lg bg-[#EB3E2E] text-white cursor-pointer"><CreditCard className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-3">
            {invoices.map((inv) => (
              <div key={inv._id} className="bg-[#181818] border border-[#303030] rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-mono font-bold text-[#EB3E2E]">{inv.invoiceNumber}</p>
                    <p className="font-bold text-[#F5F5F5]">{inv.clientId?.name}</p>
                    <p className="text-[11px] text-[#B8B8B8]">{inv.branchId?.city} • {formatISTDateTime(inv.invoiceDate)}</p>
                  </div>
                  <InvoiceStatusBadge status={inv.status} />
                </div>
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#111111] border border-[#303030]">
                  <div><span className="text-[10px] text-[#858585] block">Total</span>{formatINR(inv.totalAmount)}</div>
                  <div><span className="text-[10px] text-[#858585] block">Paid</span><span className="text-emerald-400">{formatINR(inv.paidAmount)}</span></div>
                  <div><span className="text-[10px] text-[#858585] block">Balance</span><span className="text-[#EB3E2E]">{formatINR(inv.balanceAmount)}</span></div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setViewInvoiceId(inv._id)} className="px-3 py-1.5 rounded-lg bg-[#202020] font-bold uppercase text-[10px] cursor-pointer">View</button>
                  {inv.balanceAmount > 0 && !['CANCELLED', 'REFUNDED', 'PAID'].includes(inv.status) && (
                    <button type="button" onClick={() => setPayInvoice(inv)} className="px-3 py-1.5 rounded-lg bg-[#EB3E2E] text-white font-bold uppercase text-[10px] cursor-pointer">Pay</button>
                  )}
                </div>
              </div>
            ))}
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
        onRefresh={loadToday}
      />
      <RecordPaymentModal
        invoice={payInvoice}
        paymentMethods={config?.paymentMethods || []}
        onClose={() => setPayInvoice(null)}
        onSuccess={(res) => {
          setPayInvoice(null);
          if (res?.receipt) setActiveReceipt(res.receipt);
          loadToday();
        }}
      />
      <ReceiptModal receipt={activeReceipt} onClose={() => setActiveReceipt(null)} />
    </div>
  );
}
