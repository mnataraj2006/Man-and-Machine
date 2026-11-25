import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  MoreVertical,
  Eye,
  Printer,
  Download,
  CreditCard,
  Ban,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import financeService from '../../../services/financeService.js';
import adminService from '../../../services/adminService.js';
import { useAdmin } from '../../../components/Admin/AdminLayout.jsx';
import {
  formatINR,
  formatISTDate,
  InvoiceStatusBadge,
  ExportButtons,
  EmptyFinanceState,
  InvoiceDetailModal,
  RecordPaymentModal,
  ReceiptModal,
  CreateInvoiceModal,
  getInvoicePrintHtml,
  printDocumentHtml,
  downloadDocumentHtml,
} from '../../../components/Finance/FinanceShared.jsx';

export default function AllInvoices() {
  const { branches, selectedBranch } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [totals, setTotals] = useState({ totalAmount: 0, paidAmount: 0, balanceAmount: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState(selectedBranch || 'ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Shared Metadata & Modals
  const [config, setConfig] = useState(null);
  const [clients, setClients] = useState([]);
  const [viewInvoiceId, setViewInvoiceId] = useState(null);
  const [payInvoice, setPayInvoice] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    setBranchFilter(selectedBranch || 'ALL');
  }, [selectedBranch]);

  useEffect(() => {
    Promise.all([financeService.getConfig(), adminService.getClients({ limit: 200 })])
      .then(([cfgRes, clRes]) => {
        setConfig(cfgRes.config);
        setClients(clRes.clients || []);
      })
      .catch(() => {});
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await financeService.getInvoices({
        page,
        limit: 20,
        search,
        branchId: branchFilter,
        status: statusFilter,
        paymentMethod: methodFilter,
        startDate,
        endDate,
      });
      setInvoices(res.invoices || []);
      setTotals(res.totals || { totalAmount: 0, paidAmount: 0, balanceAmount: 0 });
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, branchFilter, statusFilter, methodFilter, startDate, endDate]);

  const handleCancelInvoice = async (inv) => {
    setOpenMenuId(null);
    const reason = window.prompt(`Cancel invoice ${inv.invoiceNumber}? Provide audit reason:`, 'Cancelled by admin');
    if (reason === null) return;
    try {
      await financeService.cancelInvoice(inv._id, reason);
      fetchInvoices();
    } catch (err) {
      alert(err.message || 'Failed to cancel invoice');
    }
  };

  const buildExportRows = async () => {
    const res = await financeService.getInvoices({
      page: 1,
      limit: 200,
      search,
      branchId: branchFilter,
      status: statusFilter,
      paymentMethod: methodFilter,
      startDate,
      endDate,
    });
    return (res.invoices || []).map((inv) => ({
      InvoiceNo: inv.invoiceNumber,
      DateIST: formatISTDate(inv.invoiceDate),
      Member: inv.clientId?.name || 'Member',
      Branch: inv.branchId?.city || '',
      Description: inv.description,
      Amount: inv.totalAmount,
      PaidAmount: inv.paidAmount,
      Balance: inv.balanceAmount,
      PaymentMethod: inv.paymentMethod,
      Status: inv.status,
      CreatedBy: inv.createdBy?.name || 'System',
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
            ALL INVOICES
          </h2>
          <p className="text-xs text-[#B8B8B8]">
            Sequential branch-aware billing ledger • Billed: {formatINR(totals.totalAmount)} • Paid: {formatINR(totals.paidAmount)} • Balance: {formatINR(totals.balanceAmount)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons
            onCSV={async () => financeService.exportToCSV(await buildExportRows(), `invoices_${Date.now()}.csv`)}
            onExcel={async () => financeService.exportToExcel(await buildExportRows(), `invoices_${Date.now()}.xls`, 'Invoices')}
          />
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          fetchInvoices();
        }}
        className="bg-[#181818] border border-[#303030] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3"
      >
        <div className="relative lg:col-span-2">
          <Search className="w-3.5 h-3.5 text-[#858585] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search invoice #, member, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#111111] border border-[#303030] rounded-xl text-xs text-[#F5F5F5]"
          />
        </div>
        <select
          value={branchFilter}
          onChange={(e) => {
            setBranchFilter(e.target.value);
            setPage(1);
          }}
          className="bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
        >
          <option value="ALL">All Branches</option>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>
              {b.city}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
        >
          <option value="ALL">All Statuses</option>
          <option value="PAID">PAID</option>
          <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
          <option value="PENDING">PENDING</option>
          <option value="REFUNDED">REFUNDED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
        <select
          value={methodFilter}
          onChange={(e) => {
            setMethodFilter(e.target.value);
            setPage(1);
          }}
          className="bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
        >
          <option value="ALL">All Methods</option>
          {(config?.paymentMethods || []).map((m) => (
            <option key={m.code} value={m.code}>
              {m.label}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="date"
            aria-label="Start date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#111111] border border-[#303030] rounded-xl px-2 py-2 text-xs text-[#F5F5F5]"
          />
          <button
            type="submit"
            className="px-3 py-2 rounded-xl bg-[#202020] text-xs font-bold uppercase text-[#F5F5F5] border border-[#303030] cursor-pointer shrink-0"
          >
            Go
          </button>
        </div>
      </form>

      {loading ? (
        <div className="h-56 rounded-2xl bg-[#181818] border border-[#303030] animate-pulse" />
      ) : invoices.length === 0 ? (
        <EmptyFinanceState />
      ) : (
        <>
          {/* Desktop Table (>= 1024px) */}
          <div className="hidden lg:block bg-[#181818] border border-[#303030] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#111111] text-[10px] font-mono uppercase text-[#B8B8B8] border-b border-[#303030]">
                  <tr>
                    <th className="px-4 py-3">Invoice No.</th>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Member</th>
                    <th className="px-3 py-3">Branch</th>
                    <th className="px-3 py-3">Description</th>
                    <th className="px-3 py-3 text-right">Amount</th>
                    <th className="px-3 py-3 text-right">Paid</th>
                    <th className="px-3 py-3 text-right">Balance</th>
                    <th className="px-3 py-3">Method</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Created By</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252525]">
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-[#202020]/50">
                      <td className="px-4 py-3 font-mono font-bold text-[#F5F5F5] whitespace-nowrap">{inv.invoiceNumber}</td>
                      <td className="px-3 py-3 text-[#B8B8B8] whitespace-nowrap">{formatISTDate(inv.invoiceDate)}</td>
                      <td className="px-3 py-3 font-semibold text-[#F5F5F5]">{inv.clientId?.name || 'Member'}</td>
                      <td className="px-3 py-3 text-[#B8B8B8]">{inv.branchId?.city || '—'}</td>
                      <td className="px-3 py-3 text-[#B8B8B8] max-w-[180px] truncate" title={inv.description}>{inv.description}</td>
                      <td className="px-3 py-3 text-right font-mono text-[#F5F5F5]">{formatINR(inv.totalAmount)}</td>
                      <td className="px-3 py-3 text-right font-mono text-emerald-400">{formatINR(inv.paidAmount)}</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-[#EB3E2E]">{formatINR(inv.balanceAmount)}</td>
                      <td className="px-3 py-3 font-mono text-[11px] text-[#B8B8B8]">{inv.paymentMethod}</td>
                      <td className="px-3 py-3"><InvoiceStatusBadge status={inv.status} /></td>
                      <td className="px-3 py-3 text-[#B8B8B8]">{inv.createdBy?.name || 'System'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button type="button" onClick={() => setViewInvoiceId(inv._id)} title="View" className="p-1.5 rounded-lg bg-[#202020] text-[#F5F5F5] border border-[#303030] cursor-pointer">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => printDocumentHtml(getInvoicePrintHtml(inv))} title="Print" className="p-1.5 rounded-lg bg-[#202020] text-[#B8B8B8] border border-[#303030] cursor-pointer">
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => downloadDocumentHtml(getInvoicePrintHtml(inv), `${inv.invoiceNumber}.html`)} title="Download" className="p-1.5 rounded-lg bg-[#202020] text-[#B8B8B8] border border-[#303030] cursor-pointer">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {inv.balanceAmount > 0 && !['CANCELLED', 'REFUNDED', 'PAID'].includes(inv.status) && (
                            <button type="button" onClick={() => setPayInvoice(inv)} title="Record Payment" className="p-1.5 rounded-lg bg-[#EB3E2E] text-white cursor-pointer">
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {inv.paidAmount === 0 && inv.status !== 'CANCELLED' && (
                            <button type="button" onClick={() => handleCancelInvoice(inv)} title="Cancel" className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 cursor-pointer">
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile & Tablet Cards (< 1024px) */}
          <div className="lg:hidden space-y-3">
            {invoices.map((inv) => (
              <div key={inv._id} className="bg-[#181818] border border-[#303030] rounded-2xl p-4 space-y-3 relative">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs font-bold text-[#EB3E2E]">{inv.invoiceNumber}</p>
                    <p className="text-sm font-bold text-[#F5F5F5]">{inv.clientId?.name || 'Member'}</p>
                    <p className="text-[11px] text-[#B8B8B8]">{inv.branchId?.city} • {formatISTDate(inv.invoiceDate)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <InvoiceStatusBadge status={inv.status} />
                    <button
                      type="button"
                      onClick={() => setOpenMenuId(openMenuId === inv._id ? null : inv._id)}
                      aria-label="Invoice actions"
                      className="p-1.5 rounded-lg bg-[#202020] border border-[#303030] text-[#F5F5F5] cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#B8B8B8] line-clamp-2">{inv.description}</p>

                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#111111] border border-[#303030] text-xs">
                  <div>
                    <span className="text-[10px] font-mono text-[#858585] block">Amount</span>
                    <span className="font-mono font-bold text-[#F5F5F5]">{formatINR(inv.totalAmount)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-[#858585] block">Paid</span>
                    <span className="font-mono font-bold text-emerald-400">{formatINR(inv.paidAmount)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-[#858585] block">Balance</span>
                    <span className="font-mono font-bold text-[#EB3E2E]">{formatINR(inv.balanceAmount)}</span>
                  </div>
                </div>

                {openMenuId === inv._id && (
                  <div className="absolute right-4 top-12 z-20 w-44 rounded-xl bg-[#111111] border border-[#303030] shadow-xl py-1 text-xs">
                    <button type="button" onClick={() => { setOpenMenuId(null); setViewInvoiceId(inv._id); }} className="w-full text-left px-3 py-2 hover:bg-[#202020] text-[#F5F5F5] cursor-pointer">
                      View Details
                    </button>
                    {inv.balanceAmount > 0 && !['CANCELLED', 'REFUNDED', 'PAID'].includes(inv.status) && (
                      <button type="button" onClick={() => { setOpenMenuId(null); setPayInvoice(inv); }} className="w-full text-left px-3 py-2 hover:bg-[#202020] text-[#EB3E2E] font-bold cursor-pointer">
                        Record Payment
                      </button>
                    )}
                    <button type="button" onClick={() => { setOpenMenuId(null); printDocumentHtml(getInvoicePrintHtml(inv)); }} className="w-full text-left px-3 py-2 hover:bg-[#202020] text-[#F5F5F5] cursor-pointer">
                      Print
                    </button>
                    <button type="button" onClick={() => { setOpenMenuId(null); downloadDocumentHtml(getInvoicePrintHtml(inv), `${inv.invoiceNumber}.html`); }} className="w-full text-left px-3 py-2 hover:bg-[#202020] text-[#F5F5F5] cursor-pointer">
                      Download
                    </button>
                    {inv.paidAmount === 0 && inv.status !== 'CANCELLED' && (
                      <button type="button" onClick={() => handleCancelInvoice(inv)} className="w-full text-left px-3 py-2 hover:bg-[#202020] text-rose-400 cursor-pointer">
                        Cancel Invoice
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-[#B8B8B8]">
            <span>Showing {invoices.length} of {totalCount} invoices</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-lg bg-[#181818] border border-[#303030] disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono">Page {page} / {totalPages}</span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-2 rounded-lg bg-[#181818] border border-[#303030] disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
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
        onRefresh={fetchInvoices}
      />

      <RecordPaymentModal
        invoice={payInvoice}
        paymentMethods={config?.paymentMethods || []}
        onClose={() => setPayInvoice(null)}
        onSuccess={(res) => {
          setPayInvoice(null);
          if (res?.receipt) setActiveReceipt(res.receipt);
          fetchInvoices();
        }}
      />

      <ReceiptModal receipt={activeReceipt} onClose={() => setActiveReceipt(null)} />

      {showCreateModal && (
        <CreateInvoiceModal
          branches={branches}
          clients={clients}
          config={config}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchInvoices();
          }}
        />
      )}
    </div>
  );
}
