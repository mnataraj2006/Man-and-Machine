import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Download,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import clientService from '../../services/clientService.js';

export default function Payments() {
  const [data, setData] = useState({ payments: [], totalPaid: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const res = await clientService.getPayments();
        if (isMounted) setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchPayments();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-10 bg-[#181818] rounded-xl w-64" />
        <div className="h-32 bg-[#181818] rounded-2xl" />
        <div className="h-64 bg-[#181818] rounded-2xl" />
      </div>
    );
  }

  const { payments = [], totalPaid = 0 } = data;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-mono text-[#EB3E2E] uppercase tracking-wider font-bold">
          FINANCIAL LEDGER
        </span>
        <h1
          className="uppercase font-bold tracking-tight text-[#F5F5F5]"
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)',
          }}
        >
          PAYMENTS &amp; RECEIPTS.
        </h1>
        <p className="text-xs sm:text-sm text-[#B8B8B8]">
          Official record of all verified fees and membership payments.
        </p>
      </div>

      {/* ── SUMMARY STAT CARD ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col justify-between">
          <span className="text-[10px] font-mono text-[#B8B8B8] uppercase">TOTAL RECORDED PAYMENTS</span>
          <div className="my-2">
            <span className="text-3xl font-bold text-[#EB3E2E] font-mono" style={{ fontFamily: "'Oswald', sans-serif" }}>
              ₹{totalPaid.toLocaleString()}
            </span>
          </div>
          <span className="text-[10px] text-[#B8B8B8]">Verified Receipts</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col justify-between">
          <span className="text-[10px] font-mono text-[#B8B8B8] uppercase">TRANSACTIONS COUNT</span>
          <div className="my-2">
            <span className="text-3xl font-bold text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
              {payments.length}
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold">Clean Financial Ledger</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col justify-between">
          <span className="text-[10px] font-mono text-[#B8B8B8] uppercase">PAYMENT GATEWAY</span>
          <div className="my-2">
            <span className="text-base font-bold text-[#F5F5F5] uppercase" style={{ fontFamily: "'Oswald', sans-serif" }}>
              FACILITY DESK VERIFIED
            </span>
          </div>
          <span className="text-[10px] text-[#B8B8B8]">Online payments launching soon</span>
        </div>
      </div>

      {/* ── PAYMENTS LEDGER TABLE ── */}
      <div className="p-6 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#303030] pb-3">
          <h3 className="text-base font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
            TRANSACTION HISTORY
          </h3>
          <span className="text-xs font-mono text-[#B8B8B8]">Official Invoices</span>
        </div>

        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#303030] text-[10px] font-mono text-[#B8B8B8] uppercase">
                  <th className="py-2.5 px-3">TXN REFERENCE</th>
                  <th className="py-2.5 px-3">DATE</th>
                  <th className="py-2.5 px-3">DESCRIPTION</th>
                  <th className="py-2.5 px-3">METHOD</th>
                  <th className="py-2.5 px-3">AMOUNT</th>
                  <th className="py-2.5 px-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#303030]">
                {payments.map((p) => (
                  <tr key={p._id} className="hover:bg-[#202020] transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#EB3E2E]">
                      {p.transactionId}
                    </td>
                    <td className="py-3 px-3 text-[#B8B8B8]">
                      {new Date(p.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 font-bold text-[#F5F5F5]">
                      {p.description}
                    </td>
                    <td className="py-3 px-3 text-[#B8B8B8]">
                      {p.paymentMethod}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-[#F5F5F5]">
                      ₹{p.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          p.status === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-[#B8B8B8]">
            No payment records found. Receipts will appear here upon counter check-in and membership registration.
          </div>
        )}
      </div>
    </div>
  );
}
