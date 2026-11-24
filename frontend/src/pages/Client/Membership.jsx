import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building,
  AlertCircle,
} from 'lucide-react';
import clientService from '../../services/clientService.js';

export default function Membership() {
  const [data, setData] = useState({ current: null, history: [] });
  const [loading, setLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [notice, setNotice] = useState(null);

  const fetchMembership = async () => {
    try {
      setLoading(true);
      const res = await clientService.getMembership();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembership();
  }, []);

  const handleRequestRenewal = async () => {
    setIsRequesting(true);
    setNotice(null);
    try {
      const res = await clientService.requestRenewal();
      setNotice({
        type: 'success',
        message: res.message || 'Renewal request submitted to your branch management.',
      });
      fetchMembership();
    } catch (err) {
      setNotice({
        type: 'error',
        message: err.message || 'Failed to submit renewal request.',
      });
    } finally {
      setIsRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-10 bg-[#151515] rounded-xl w-64" />
        <div className="h-64 bg-[#151515] rounded-2xl" />
        <div className="h-48 bg-[#151515] rounded-2xl" />
      </div>
    );
  }

  const { current, history = [] } = data;
  const isExpiringSoon = current && current.daysRemaining <= 14 && current.status === 'ACTIVE';

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-mono text-[#E58A32] uppercase tracking-wider font-bold">
          ACCOUNT PRIVILEGES
        </span>
        <h1
          className="uppercase font-bold tracking-tight text-[#F5F5F5]"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)',
          }}
        >
          MEMBERSHIP &amp; ACCESS.
        </h1>
        <p className="text-xs sm:text-sm text-[#A3A3A3]">
          Manage your athletic membership tier, validity, and branch renewals.
        </p>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-3 ${
            notice.type === 'success'
              ? 'bg-[#151515] border-emerald-500/80 text-emerald-400'
              : 'bg-[#151515] border-red-500/80 text-red-400'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      {/* ── CURRENT MEMBERSHIP CARD ── */}
      {current ? (
        <div className="p-6 sm:p-8 rounded-2xl bg-[#151515] border border-[#292929] flex flex-col gap-6 relative overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#E58A32]/5 rounded-full blur-3xl pointer-events-none" />

          {/* Expiry Warning Alert */}
          {isExpiringSoon && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-400 text-xs flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div className="flex flex-col">
                <span className="font-bold uppercase tracking-wider">EXPIRY NOTICE</span>
                <span>
                  Your membership expires in <strong>{current.daysRemaining} days</strong>. Request a renewal to maintain seamless facility access.
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#292929] pb-6">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-[#E58A32] uppercase font-bold tracking-wider">
                CURRENT ACTIVE PLAN
              </span>
              <h2
                className="text-2xl sm:text-3xl font-bold uppercase text-[#F5F5F5]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {current.planName}
              </h2>
              <span className="text-xs text-[#A3A3A3]">
                Registered at {current.branch?.city || 'Kovilpatti'} Branch
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                  current.status === 'ACTIVE'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}
              >
                {current.status}
              </span>
            </div>
          </div>

          {/* Validity Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3.5 rounded-xl bg-[#1C1C1C] border border-[#292929] flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-[#A3A3A3] uppercase">START DATE</span>
              <span className="text-xs font-bold text-[#F5F5F5]">
                {new Date(current.startDate).toLocaleDateString()}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1C1C1C] border border-[#292929] flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-[#A3A3A3] uppercase">EXPIRY DATE</span>
              <span className="text-xs font-bold text-[#F5F5F5]">
                {new Date(current.expiryDate).toLocaleDateString()}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1C1C1C] border border-[#292929] flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-[#A3A3A3] uppercase">DAYS REMAINING</span>
              <span className="text-sm font-bold text-[#E58A32] font-mono">{current.daysRemaining} Days</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1C1C1C] border border-[#292929] flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-[#A3A3A3] uppercase">DURATION</span>
              <span className="text-xs font-bold text-[#F5F5F5]">{current.durationMonths || 12} Months</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[#292929]">
            <span className="text-xs text-[#A3A3A3]">
              Cross-facility privileges active across Kovilpatti, Karur, and Sivakasi.
            </span>

            {current.renewalRequested ? (
              <span className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
                ✓ RENEWAL REQUEST TRANSMITTED
              </span>
            ) : (
              <button
                type="button"
                onClick={handleRequestRenewal}
                disabled={isRequesting}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#E58A32] hover:bg-[#F09A43] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(229,138,50,0.25)] cursor-pointer disabled:opacity-60"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <span>REQUEST RENEWAL</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-10 rounded-2xl bg-[#151515] border border-[#292929] flex flex-col items-center justify-center text-center gap-3">
          <CreditCard className="w-10 h-10 text-[#E58A32]" />
          <h3 className="text-lg font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            NO ACTIVE MEMBERSHIP FOUND
          </h3>
          <p className="text-xs text-[#A3A3A3] max-w-md">
            Membership details will appear here once your account is updated by the gym management. You can also request a new plan enrollment.
          </p>
          <button
            type="button"
            onClick={handleRequestRenewal}
            className="mt-2 px-6 py-2.5 rounded-xl bg-[#E58A32] text-white text-xs font-bold uppercase tracking-wider"
          >
            REQUEST MEMBERSHIP ENROLLMENT
          </button>
        </div>
      )}

      {/* ── MEMBERSHIP HISTORY ── */}
      <div className="p-6 rounded-2xl bg-[#151515] border border-[#292929] flex flex-col gap-4">
        <h3 className="text-base font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          MEMBERSHIP HISTORY
        </h3>

        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#292929] text-[10px] font-mono text-[#A3A3A3] uppercase">
                  <th className="py-2.5 px-3">PLAN</th>
                  <th className="py-2.5 px-3">START</th>
                  <th className="py-2.5 px-3">EXPIRY</th>
                  <th className="py-2.5 px-3">BRANCH</th>
                  <th className="py-2.5 px-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#292929]">
                {history.map((h) => (
                  <tr key={h._id} className="hover:bg-[#1C1C1C] transition-colors">
                    <td className="py-3 px-3 font-bold text-[#F5F5F5]">{h.planName}</td>
                    <td className="py-3 px-3 text-[#A3A3A3]">{new Date(h.startDate).toLocaleDateString()}</td>
                    <td className="py-3 px-3 text-[#A3A3A3]">{new Date(h.expiryDate).toLocaleDateString()}</td>
                    <td className="py-3 px-3 text-[#F5F5F5]">{h.branchId?.city || 'Home'}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#1C1C1C] text-emerald-400 border border-emerald-500/30">
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-[#A3A3A3]">
            Previous membership renewals will be listed here.
          </div>
        )}
      </div>
    </div>
  );
}
