import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Clock,
  Receipt,
  AlertCircle,
  Ban,
  RotateCcw,
  History,
} from 'lucide-react';
import financeService from '../../services/financeService.js';

export const formatINR = (amount) => {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

export const formatISTDate = (dateInput) => {
  if (!dateInput) return '—';
  return new Date(dateInput).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatISTDateTime = (dateInput) => {
  if (!dateInput) return '—';
  return new Date(dateInput).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const InvoiceStatusBadge = ({ status }) => {
  const styles = {
    PAID: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400',
    PARTIALLY_PAID: 'bg-amber-500/15 border-amber-500/35 text-amber-400',
    PENDING: 'bg-rose-500/15 border-rose-500/35 text-rose-400',
    CANCELLED: 'bg-[#252525] border-[#303030] text-[#858585]',
    REFUNDED: 'bg-blue-500/15 border-blue-500/35 text-blue-400',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${
        styles[status] || styles.PENDING
      }`}
    >
      {String(status || 'PENDING').replace('_', ' ')}
    </span>
  );
};

export const ExportButtons = ({ onCSV, onExcel, onPrint }) => (
  <div className="flex flex-wrap items-center gap-2">
    {onCSV && (
      <button
        type="button"
        onClick={onCSV}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase bg-[#181818] hover:bg-[#202020] text-[#F5F5F5] border border-[#303030] cursor-pointer transition-colors"
      >
        <Download className="w-3.5 h-3.5 text-[#EB3E2E]" />
        <span>CSV</span>
      </button>
    )}
    {onExcel && (
      <button
        type="button"
        onClick={onExcel}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase bg-[#181818] hover:bg-[#202020] text-[#F5F5F5] border border-[#303030] cursor-pointer transition-colors"
      >
        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
        <span>Excel</span>
      </button>
    )}
    {onPrint && (
      <button
        type="button"
        onClick={onPrint}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase bg-[#181818] hover:bg-[#202020] text-[#F5F5F5] border border-[#303030] cursor-pointer transition-colors"
      >
        <Printer className="w-3.5 h-3.5 text-[#B8B8B8]" />
        <span>Print</span>
      </button>
    )}
  </div>
);

export const EmptyFinanceState = ({ title = 'No financial transactions yet.', subtitle = 'Real invoices, payments, and expenses from MongoDB will appear here once recorded.' }) => (
  <div className="p-10 text-center bg-[#181818] border border-[#303030] rounded-2xl flex flex-col items-center justify-center gap-2">
    <Receipt className="w-9 h-9 text-[#858585]" />
    <p className="text-sm font-bold text-[#F5F5F5]">{title}</p>
    <p className="text-xs text-[#B8B8B8] max-w-md">{subtitle}</p>
  </div>
);

// Build clean printable HTML for an invoice or receipt
export const buildPrintableDocumentHtml = ({ title, subtitle, metaRows = [], items = [], summaryRows = [], footer = '' }) => {
  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<style>
  body { font-family: Arial, sans-serif; color: #111827; padding: 32px; max-width: 720px; margin: 0 auto; }
  .header { border-bottom: 3px solid #D92F25; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
  .brand { font-size: 20px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
  .tag { font-size: 11px; color: #D92F25; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
  .grid { width: 100%; border-collapse: collapse; margin: 16px 0; }
  .grid th, .grid td { border: 1px solid #E5E7EB; padding: 10px 12px; font-size: 13px; text-align: left; }
  .grid th { background: #F9FAFB; font-weight: 700; text-transform: uppercase; font-size: 11px; }
  .meta td { border: none; padding: 4px 8px 4px 0; font-size: 13px; }
  .right { text-align: right !important; }
  .total-row td { font-weight: 700; font-size: 14px; background: #F9FAFB; }
  .footer { margin-top: 28px; padding-top: 14px; border-top: 1px dashed #D1D5DB; font-size: 12px; color: #4B5563; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">MAN &amp; MACHINE FITNESS GYM</div>
      <div class="tag">${esc(subtitle)}</div>
    </div>
    <div style="text-align:right;font-size:12px;">${esc(title)}</div>
  </div>
  <table class="meta">
    ${metaRows
      .map(([k, v]) => `<tr><td><strong>${esc(k)}:</strong></td><td>${esc(v)}</td></tr>`)
      .join('')}
  </table>
  ${
    items.length > 0
      ? `<table class="grid">
      <thead><tr><th>Item / Description</th><th class="right">Qty</th><th class="right">Amount</th></tr></thead>
      <tbody>
        ${items
          .map(
            (i) =>
              `<tr><td>${esc(i.title)}</td><td class="right">${esc(i.quantity || 1)}</td><td class="right">${esc(
                formatINR(i.amount)
              )}</td></tr>`
          )
          .join('')}
      </tbody>
    </table>`
      : ''
  }
  <table class="grid">
    <tbody>
      ${summaryRows
        .map(
          ([label, val, bold]) =>
            `<tr class="${bold ? 'total-row' : ''}"><td>${esc(label)}</td><td class="right">${esc(val)}</td></tr>`
        )
        .join('')}
    </tbody>
  </table>
  <div class="footer">${esc(footer || 'MAN & MACHINE FITNESS GYM — Authorized Financial Document')}</div>
</body>
</html>`;
};

export const printDocumentHtml = (html) => {
  const win = window.open('', '_blank', 'width=820,height=900');
  if (!win) {
    window.print();
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
};

export const downloadDocumentHtml = (html, filename) => {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  financeService.triggerDownload(blob, filename);
};

export const getInvoicePrintHtml = (invoice) => {
  const branchLine = invoice.branchId
    ? `${invoice.branchId.city || ''} — ${invoice.branchId.name || ''}${
        invoice.branchId.address ? `, ${invoice.branchId.address}` : ''
      }${invoice.branchId.phone ? ` (Ph: ${invoice.branchId.phone})` : ''}`
    : 'N/A';

  return buildPrintableDocumentHtml({
    title: invoice.invoiceNumber,
    subtitle: 'Tax / Service Invoice',
    metaRows: [
      ['Invoice No', invoice.invoiceNumber],
      ['Date (IST)', formatISTDateTime(invoice.invoiceDate)],
      ['Due Date', formatISTDate(invoice.dueDate)],
      ['Member', `${invoice.clientId?.name || 'Member'} (${invoice.clientId?.phone || invoice.clientId?.email || ''})`],
      ['Branch', branchLine],
      ['Status', invoice.status],
      ['Payment Method', invoice.paymentMethod],
    ],
    items: invoice.items || [],
    summaryRows: [
      ['Subtotal', formatINR(invoice.subtotal), false],
      ...(invoice.joiningFee > 0 ? [['Joining Fee', formatINR(invoice.joiningFee), false]] : []),
      ...(invoice.additionalCharges > 0 ? [['Additional Charges', formatINR(invoice.additionalCharges), false]] : []),
      ...(invoice.discount > 0 ? [['Discount', `-${formatINR(invoice.discount)}`, false]] : []),
      ...(invoice.taxAmount > 0 ? [[`Tax / GST (${invoice.taxRate}%)`, formatINR(invoice.taxAmount), false]] : []),
      ['Invoice Total', formatINR(invoice.totalAmount), true],
      ['Paid Amount', formatINR(invoice.paidAmount), false],
      ['Balance Due', formatINR(invoice.balanceAmount), true],
    ],
    footer: 'MAN & MACHINE FITNESS GYM — Official System Generated Invoice',
  });
};

export const getReceiptPrintHtml = (receipt) => {
  const branchText = receipt.branch
    ? `${receipt.branch.city || ''} Branch — ${receipt.branch.name || ''}${
        receipt.showBranchAddress && receipt.branch.address ? ` | ${receipt.branch.address}` : ''
      }${receipt.branch.phone ? ` | Ph: ${receipt.branch.phone}` : ''}`
    : 'MAN & MACHINE Branch';

  return buildPrintableDocumentHtml({
    title: receipt.receiptNumber,
    subtitle: 'Official Payment Receipt',
    metaRows: [
      ['Receipt Number', receipt.receiptNumber],
      ['Invoice Number', receipt.invoiceNumber],
      ['Date (IST)', formatISTDateTime(receipt.date)],
      ['Branch', branchText],
      ['Member Name', `${receipt.member?.name || 'Member'} (${receipt.member?.phone || ''})`],
      ['Membership / Service', receipt.service],
      ['Payment Method', receipt.paymentMethod],
      ...(receipt.referenceNumber ? [['Reference No', receipt.referenceNumber]] : []),
      ['Received By', receipt.receivedBy || 'Admin Desk'],
    ],
    summaryRows: [
      ['Invoice Total', formatINR(receipt.invoiceTotal), false],
      ['Amount Paid (This Receipt)', formatINR(receipt.amountPaidNow), true],
      ['Total Paid to Date', formatINR(receipt.totalPaidToDate), false],
      ['Balance Remaining', formatINR(receipt.balanceRemaining), true],
    ],
    footer: receipt.footer || 'Thank you for training with MAN & MACHINE FITNESS GYM.',
  });
};

// ==========================================
// RECEIPT MODAL
// ==========================================
export function ReceiptModal({ receipt, onClose }) {
  if (!receipt) return null;
  const html = getReceiptPrintHtml(receipt);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-[#181818] border border-[#303030] rounded-2xl overflow-hidden shadow-2xl my-auto">
        <div className="p-5 bg-[#111111] border-b border-[#303030] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#EB3E2E]">
              MAN &amp; MACHINE FITNESS GYM
            </span>
            <h3 className="text-lg font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
              Payment Receipt • {receipt.receiptNumber}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close receipt"
            className="p-2 rounded-lg bg-[#202020] text-[#B8B8B8] hover:text-[#F5F5F5] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {receipt.branch && (
            <div className="p-3 rounded-xl bg-[#111111] border border-[#303030] space-y-0.5">
              <p className="font-bold text-[#F5F5F5]">
                {receipt.branch.city} Branch — {receipt.branch.name}
              </p>
              {receipt.showBranchAddress && receipt.branch.address && (
                <p className="text-[#B8B8B8]">{receipt.branch.address}</p>
              )}
              {receipt.branch.phone && <p className="text-[#858585] font-mono">Ph: {receipt.branch.phone}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 bg-[#202020] border border-[#303030] rounded-xl p-3.5">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#858585]">Invoice No</span>
              <p className="font-bold text-[#F5F5F5]">{receipt.invoiceNumber}</p>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#858585]">Date (IST)</span>
              <p className="font-bold text-[#F5F5F5]">{formatISTDateTime(receipt.date)}</p>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#858585]">Member</span>
              <p className="font-bold text-[#F5F5F5]">{receipt.member?.name || 'Member'}</p>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#858585]">Method</span>
              <p className="font-bold text-[#EB3E2E]">{receipt.paymentMethod}</p>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] font-mono uppercase text-[#858585]">Membership / Service</span>
              <p className="font-semibold text-[#F5F5F5]">{receipt.service}</p>
            </div>
            {receipt.referenceNumber && (
              <div className="col-span-2">
                <span className="text-[10px] font-mono uppercase text-[#858585]">Reference No</span>
                <p className="font-mono text-[#F5F5F5]">{receipt.referenceNumber}</p>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-[#111111] border border-[#303030] space-y-2">
            <div className="flex justify-between text-[#B8B8B8]">
              <span>Invoice Total</span>
              <span className="font-mono">{formatINR(receipt.invoiceTotal)}</span>
            </div>
            <div className="flex justify-between text-emerald-400 font-bold text-sm">
              <span>Amount Paid</span>
              <span className="font-mono">{formatINR(receipt.amountPaidNow)}</span>
            </div>
            <div className="flex justify-between text-[#B8B8B8]">
              <span>Cumulative Paid</span>
              <span className="font-mono">{formatINR(receipt.totalPaidToDate)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#303030] font-bold text-[#F5F5F5]">
              <span>Remaining Balance</span>
              <span className="font-mono">{formatINR(receipt.balanceRemaining)}</span>
            </div>
            <div className="text-[10px] text-[#858585] pt-1">Received By: {receipt.receivedBy || 'Admin Desk'}</div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => printDocumentHtml(html)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#202020] hover:bg-[#303030] text-xs font-bold uppercase text-[#F5F5F5] border border-[#303030] cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <button
              type="button"
              onClick={() => downloadDocumentHtml(html, `${receipt.receiptNumber || 'receipt'}.html`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-xs font-bold uppercase text-white cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// RECORD PAYMENT MODAL
// ==========================================
export function RecordPaymentModal({ invoice, paymentMethods = [], onClose, onSuccess }) {
  const [amount, setAmount] = useState(invoice?.balanceAmount || '');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (invoice) {
      setAmount(invoice.balanceAmount || '');
      const active = paymentMethods.filter((m) => m.isActive !== false);
      if (active.length > 0) setPaymentMethod(active[0].code);
    }
  }, [invoice, paymentMethods]);

  if (!invoice) return null;

  const activeMethods =
    paymentMethods.filter((m) => m.isActive !== false).length > 0
      ? paymentMethods.filter((m) => m.isActive !== false)
      : [
          { code: 'CASH', label: 'Cash' },
          { code: 'UPI', label: 'UPI' },
          { code: 'CARD', label: 'Card' },
          { code: 'BANK_TRANSFER', label: 'Bank Transfer' },
        ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const num = Number(amount);
    if (!num || num <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }
    if (num > Number(invoice.balanceAmount)) {
      setError(`Payment cannot exceed outstanding balance (${formatINR(invoice.balanceAmount)}).`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await financeService.recordInvoicePayment(invoice._id, {
        amount: num,
        paymentMethod,
        paymentDate,
        referenceNumber,
        notes,
      });
      onSuccess && onSuccess(res);
    } catch (err) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-[#181818] border border-[#303030] rounded-2xl overflow-hidden shadow-2xl my-auto">
        <div className="p-5 bg-[#111111] border-b border-[#303030] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-[#EB3E2E] font-bold">
              RECORD PARTIAL OR FULL PAYMENT
            </span>
            <h3 className="text-base font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
              {invoice.invoiceNumber}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-[#202020] text-[#B8B8B8] hover:text-[#F5F5F5] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#111111] border border-[#303030] text-center">
            <div>
              <span className="block text-[10px] font-mono text-[#858585]">INVOICE</span>
              <span className="text-xs font-bold text-[#F5F5F5]">{formatINR(invoice.totalAmount)}</span>
            </div>
            <div>
              <span className="block text-[10px] font-mono text-[#858585]">PAID</span>
              <span className="text-xs font-bold text-emerald-400">{formatINR(invoice.paidAmount)}</span>
            </div>
            <div>
              <span className="block text-[10px] font-mono text-[#858585]">BALANCE</span>
              <span className="text-xs font-bold text-[#EB3E2E]">{formatINR(invoice.balanceAmount)}</span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">
              Amount (INR ₹) *
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              max={invoice.balanceAmount}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
              >
                {activeMethods.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">
              Reference Number (UPI/Txn/Cheque)
            </label>
            <input
              type="text"
              placeholder="Optional transaction reference"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Notes</label>
            <textarea
              rows="2"
              placeholder="Optional settlement note"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#303030]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#202020] text-xs font-bold uppercase text-[#B8B8B8] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-xs font-bold uppercase text-white cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// INVOICE DETAIL MODAL
// ==========================================
export function InvoiceDetailModal({ invoiceId, onClose, onRecordPayment, onViewReceipt, onRefresh }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    if (!invoiceId) return;
    let active = true;
    setLoading(true);
    financeService
      .getInvoiceById(invoiceId)
      .then((res) => active && setData(res))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [invoiceId]);

  if (!invoiceId) return null;

  const inv = data?.invoice;
  const payments = data?.payments || [];

  const handleCancel = async () => {
    const reason = window.prompt('Enter cancellation/void reason (audit log):', 'Voided by admin');
    if (reason === null) return;
    setActionBusy(true);
    try {
      await financeService.cancelInvoice(inv._id, reason);
      onRefresh && onRefresh();
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to cancel invoice');
    } finally {
      setActionBusy(false);
    }
  };

  const handleRefund = async () => {
    const reason = window.prompt('Enter refund reason (audit log):', 'Member refund issued');
    if (reason === null) return;
    setActionBusy(true);
    try {
      await financeService.refundInvoice(inv._id, reason);
      onRefresh && onRefresh();
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to issue refund');
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#181818] border border-[#303030] rounded-2xl overflow-hidden shadow-2xl my-auto">
        <div className="p-5 bg-[#111111] border-b border-[#303030] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-[#EB3E2E] font-bold">INVOICE RECORD</span>
            <h3 className="text-lg font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
              {inv?.invoiceNumber || 'Loading...'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-[#202020] text-[#B8B8B8] hover:text-[#F5F5F5] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {loading || !inv ? (
            <div className="py-12 text-center text-xs text-[#B8B8B8]">Loading invoice details...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[#111111] border border-[#303030] text-xs">
                <div>
                  <span className="block text-[10px] font-mono text-[#858585]">MEMBER</span>
                  <span className="font-bold text-[#F5F5F5]">{inv.clientId?.name || 'Member'}</span>
                  <span className="block text-[10px] text-[#B8B8B8]">{inv.clientId?.phone || ''}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-mono text-[#858585]">BRANCH</span>
                  <span className="font-bold text-[#F5F5F5]">{inv.branchId?.city || '—'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-mono text-[#858585]">DATE (IST)</span>
                  <span className="font-semibold text-[#F5F5F5]">{formatISTDate(inv.invoiceDate)}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-mono text-[#858585]">STATUS</span>
                  <div className="mt-0.5">
                    <InvoiceStatusBadge status={inv.status} />
                  </div>
                </div>
              </div>

              {/* Line Items & Breakdown */}
              <div className="rounded-xl border border-[#303030] overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[#111111] text-[#B8B8B8] font-mono uppercase text-[10px]">
                    <tr>
                      <th className="text-left px-4 py-2.5">Description</th>
                      <th className="text-right px-4 py-2.5">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252525]">
                    {(inv.items?.length ? inv.items : [{ title: inv.description, amount: inv.subtotal }]).map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2.5 text-[#F5F5F5]">{item.title}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-[#F5F5F5]">{formatINR(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#111111] border-t border-[#303030] font-bold">
                    <tr>
                      <td className="px-4 py-2.5 text-[#F5F5F5]">Total Amount</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[#F5F5F5]">{formatINR(inv.totalAmount)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-emerald-400">Paid Amount</td>
                      <td className="px-4 py-2 text-right font-mono text-emerald-400">{formatINR(inv.paidAmount)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#EB3E2E]">Balance Due</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[#EB3E2E]">{formatINR(inv.balanceAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Linked Payments & Receipts */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]">
                  Linked Payments ({payments.length})
                </h4>
                {payments.length === 0 ? (
                  <p className="text-xs text-[#858585]">No payments recorded against this invoice yet.</p>
                ) : (
                  <div className="space-y-2">
                    {payments.map((p) => (
                      <div
                        key={p._id}
                        className="p-3 rounded-xl bg-[#111111] border border-[#303030] flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <span className="font-mono font-bold text-[#F5F5F5]">
                            {p.receiptNumber || p.transactionId}
                          </span>
                          <span className="mx-2 text-[#858585]">•</span>
                          <span className="text-[#B8B8B8]">{p.paymentMethod}</span>
                          <span className="mx-2 text-[#858585]">•</span>
                          <span className="text-[#858585]">{formatISTDateTime(p.date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-400">{formatINR(p.amount)}</span>
                          <InvoiceStatusBadge status={p.status} />
                          {p.status === 'PAID' && (
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await financeService.getPaymentReceipt(p._id);
                                onViewReceipt && onViewReceipt(res.receipt);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#202020] hover:bg-[#303030] text-[10px] font-bold uppercase text-[#F5F5F5] border border-[#303030] cursor-pointer"
                            >
                              Receipt
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Audit Trail */}
              {inv.auditLogs?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#B8B8B8] flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    <span>Audit Trail</span>
                  </h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {inv.auditLogs.map((log, i) => (
                      <div key={i} className="text-[11px] p-2 rounded-lg bg-[#111111] border border-[#252525] flex justify-between gap-2">
                        <span className="text-[#B8B8B8]">
                          <strong className="text-[#F5F5F5]">{log.action}</strong> — {log.reason}
                        </span>
                        <span className="font-mono text-[#858585] shrink-0">{formatISTDateTime(log.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap justify-between gap-2 pt-3 border-t border-[#303030]">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => printDocumentHtml(getInvoicePrintHtml(inv))}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#202020] text-xs font-bold uppercase text-[#F5F5F5] border border-[#303030] cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadDocumentHtml(getInvoicePrintHtml(inv), `${inv.invoiceNumber}.html`)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#202020] text-xs font-bold uppercase text-[#F5F5F5] border border-[#303030] cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {inv.paidAmount > 0 && inv.status !== 'REFUNDED' && inv.status !== 'CANCELLED' && (
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={handleRefund}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/15 border border-blue-500/35 text-xs font-bold uppercase text-blue-400 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Refund</span>
                    </button>
                  )}
                  {inv.paidAmount === 0 && inv.status !== 'CANCELLED' && (
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={handleCancel}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/35 text-xs font-bold uppercase text-rose-400 cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  )}
                  {inv.balanceAmount > 0 && !['CANCELLED', 'REFUNDED', 'PAID'].includes(inv.status) && (
                    <button
                      type="button"
                      onClick={() => onRecordPayment && onRecordPayment(inv)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-xs font-bold uppercase text-white cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Record Payment</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// CREATE INVOICE MODAL
// ==========================================
export function CreateInvoiceModal({ branches = [], clients = [], config = null, onClose, onCreated }) {
  const [clientId, setClientId] = useState('');
  const [branchId, setBranchId] = useState(branches[0]?._id || '');
  const [category, setCategory] = useState('MEMBERSHIP_PURCHASE');
  const [description, setDescription] = useState('');
  const [subtotal, setSubtotal] = useState('');
  const [joiningFee, setJoiningFee] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [additionalCharges, setAdditionalCharges] = useState('0');
  const [applyTax, setApplyTax] = useState(Boolean(config?.invoiceSettings?.gstEnabled));
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const activeMethods = (config?.paymentMethods || []).filter((m) => m.isActive !== false);
  const gstRate = applyTax && config?.invoiceSettings?.gstEnabled ? Number(config?.invoiceSettings?.gstRate) || 0 : 0;

  const baseSum = Math.max(
    0,
    (Number(subtotal) || 0) + (Number(joiningFee) || 0) + (Number(additionalCharges) || 0) - (Number(discount) || 0)
  );
  const taxAmt = gstRate > 0 ? Math.round(((baseSum * gstRate) / 100) * 100) / 100 : 0;
  const computedTotal = Math.round((baseSum + taxAmt) * 100) / 100;

  const handleClientChange = (id) => {
    setClientId(id);
    const c = clients.find((u) => u._id === id);
    if (c?.branchId?._id || c?.branchId) {
      setBranchId(c.branchId._id || c.branchId);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!clientId) return setError('Please select a member.');
    if (!branchId) return setError('Please select a branch.');
    if (computedTotal <= 0) return setError('Invoice total must be greater than zero.');
    const paid = paidAmount === '' ? computedTotal : Number(paidAmount);
    if (paid < 0 || paid > computedTotal) {
      return setError(`Paid amount must be between ₹0 and ${formatINR(computedTotal)}.`);
    }

    setSubmitting(true);
    try {
      const res = await financeService.createInvoice({
        clientId,
        branchId,
        category,
        description,
        subtotal: Number(subtotal) || 0,
        joiningFee: Number(joiningFee) || 0,
        discount: Number(discount) || 0,
        additionalCharges: Number(additionalCharges) || 0,
        applyTax,
        paidAmount: paid,
        paymentMethod,
        invoiceDate,
        referenceNumber,
        notes,
      });
      onCreated && onCreated(res);
    } catch (err) {
      setError(err.message || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-[#181818] border border-[#303030] rounded-2xl overflow-hidden shadow-2xl my-auto">
        <div className="p-5 bg-[#111111] border-b border-[#303030] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-[#EB3E2E] font-bold">BILLABLE TRANSACTION</span>
            <h3 className="text-lg font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
              Create New Invoice
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg bg-[#202020] text-[#B8B8B8] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Member *</label>
              <select
                required
                value={clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]"
              >
                <option value="">Select Member...</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.phone || c.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Branch *</label>
              <select
                required
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]"
              >
                <option value="">Select Branch...</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.city} — {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Service Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]"
              >
                <option value="MEMBERSHIP_PURCHASE">Membership Purchase</option>
                <option value="MEMBERSHIP_RENEWAL">Membership Renewal</option>
                <option value="JOINING_FEE">Joining Fee</option>
                <option value="PERSONAL_TRAINING">Personal Training</option>
                <option value="OTHER_SERVICE">Other Gym Service</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Invoice Date *</label>
              <input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Description *</label>
            <input
              type="text"
              required
              placeholder="e.g. 6 Months Strength Membership + PT Assessment"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-[#F5F5F5]"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Base Amount *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)}
                className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Joining Fee</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={joiningFee}
                onChange={(e) => setJoiningFee(e.target.value)}
                className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Extra Charges</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={additionalCharges}
                onChange={(e) => setAdditionalCharges(e.target.value)}
                className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Discount (-)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]"
              />
            </div>
          </div>

          {config?.invoiceSettings?.gstEnabled && (
            <label className="flex items-center gap-2 text-xs text-[#B8B8B8] cursor-pointer">
              <input
                type="checkbox"
                checked={applyTax}
                onChange={(e) => setApplyTax(e.target.checked)}
                className="accent-[#EB3E2E]"
              />
              <span>Apply configured GST ({config.invoiceSettings.gstRate}%): {formatINR(taxAmt)}</span>
            </label>
          )}

          <div className="p-3 rounded-xl bg-[#111111] border border-[#303030] flex items-center justify-between">
            <span className="font-mono uppercase text-[#B8B8B8]">Final Invoice Total</span>
            <span className="text-base font-bold font-mono text-[#F5F5F5]">{formatINR(computedTotal)}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">
                Initial Paid Amount (blank = Full, 0 = Pending)
              </label>
              <input
                type="number"
                min="0"
                max={computedTotal || undefined}
                step="0.01"
                placeholder={`Default: ${computedTotal}`}
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]"
              >
                {(activeMethods.length ? activeMethods : [{ code: 'CASH', label: 'Cash' }, { code: 'UPI', label: 'UPI' }, { code: 'CARD', label: 'Card' }]).map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Reference No</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#303030]">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-[#202020] font-bold uppercase text-[#B8B8B8] cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] font-bold uppercase text-white cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Generating...' : 'Generate Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
