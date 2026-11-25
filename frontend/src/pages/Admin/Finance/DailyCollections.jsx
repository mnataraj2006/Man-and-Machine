import React, { useState, useEffect } from 'react';
import financeService from '../../../services/financeService.js';
import { useAdmin } from '../../../components/Admin/AdminLayout.jsx';
import { useTheme } from '../../../context/ThemeContext.jsx';
import { getChartTheme } from '../../../utils/chartTheme.js';
import { formatINR, formatISTDate, ExportButtons, EmptyFinanceState } from '../../../components/Finance/FinanceShared.jsx';

export default function DailyCollections() {
  const { branches, selectedBranch } = useAdmin();
  const { resolvedTheme } = useTheme();
  const chartTheme = getChartTheme(resolvedTheme);

  const [range, setRange] = useState('last7days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [branchFilter, setBranchFilter] = useState(selectedBranch || 'ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ daily: [], chart: [], summary: null });

  useEffect(() => {
    setBranchFilter(selectedBranch || 'ALL');
  }, [selectedBranch]);

  useEffect(() => {
    financeService.getConfig().then((r) => setConfig(r.config)).catch(() => {});
  }, []);

  const loadDaily = async () => {
    if (range === 'custom' && (!startDate || !endDate)) return;
    setLoading(true);
    try {
      const res = await financeService.getDailyCollections({
        range,
        startDate: range === 'custom' ? startDate : undefined,
        endDate: range === 'custom' ? endDate : undefined,
        branchId: branchFilter,
        paymentMethod: methodFilter,
        status: statusFilter,
      });
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDaily();
  }, [range, startDate, endDate, branchFilter, methodFilter, statusFilter]);

  const maxCollected = Math.max(...(data.chart || []).map((c) => c.collectedAmount || 0), 1);
  const hasAnyActivity = (data.daily || []).some((d) => d.collectedAmount > 0 || d.pendingAmount > 0 || d.invoicesCount > 0);

  const exportRows = (data.daily || []).map((d) => ({
    Date: d.date,
    Invoices: d.invoicesCount,
    Collected: d.collectedAmount,
    Pending: d.pendingAmount,
    Gross: d.grossAmount,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
            DAY-WISE COLLECTIONS
          </h2>
          <p className="text-xs text-[#B8B8B8]">
            Daily grouped collections &amp; pending dues in Asia/Kolkata timezone.
          </p>
        </div>

        <ExportButtons
          onCSV={() => financeService.exportToCSV(exportRows, `daily_collections_${Date.now()}.csv`)}
          onExcel={() => financeService.exportToExcel(exportRows, `daily_collections_${Date.now()}.xls`, 'Daily Collections')}
        />
      </div>

      {/* Filters */}
      <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'last7days', label: 'Last 7 Days' },
            { id: 'last30days', label: 'Last 30 Days' },
            { id: 'custom', label: 'Custom Range' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setRange(opt.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase cursor-pointer transition-colors ${
                range === opt.id
                  ? 'bg-[#EB3E2E] text-white'
                  : 'bg-[#111111] text-[#B8B8B8] border border-[#303030] hover:text-[#F5F5F5]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {range === 'custom' && (
            <>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]" />
            </>
          )}
          <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]">
            <option value="ALL">All Branches</option>
            {branches.map((b) => <option key={b._id} value={b._id}>{b.city}</option>)}
          </select>
          <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]">
            <option value="ALL">All Payment Methods</option>
            {(config?.paymentMethods || []).map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]">
            <option value="ALL">All Invoice Statuses</option>
            <option value="PAID">PAID</option>
            <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
            <option value="PENDING">PENDING</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4">
          <span className="text-[11px] font-mono uppercase text-[#B8B8B8]">Collected in Range</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1" style={{ fontFamily: "'Oswald', sans-serif" }}>
            {formatINR(data.summary?.totalCollected)}
          </p>
        </div>
        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4">
          <span className="text-[11px] font-mono uppercase text-[#B8B8B8]">Pending in Range</span>
          <p className="text-2xl font-bold text-[#EB3E2E] mt-1" style={{ fontFamily: "'Oswald', sans-serif" }}>
            {formatINR(data.summary?.totalPending)}
          </p>
        </div>
        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4">
          <span className="text-[11px] font-mono uppercase text-[#B8B8B8]">Invoices Count</span>
          <p className="text-2xl font-bold text-[#F5F5F5] mt-1" style={{ fontFamily: "'Oswald', sans-serif" }}>
            {data.summary?.totalInvoices ?? 0}
          </p>
        </div>
      </div>

      {/* Chart: Date -> Collection Amount */}
      <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
              Daily Collection Trend
            </h3>
            <p className="text-[11px] text-[#B8B8B8]">Date → Collection Amount (INR)</p>
          </div>
        </div>

        {loading ? (
          <div className="h-44 animate-pulse rounded-xl bg-[#202020]" />
        ) : !hasAnyActivity ? (
          <EmptyFinanceState title="No financial transactions yet." subtitle="Daily bars will populate automatically as payments are collected." />
        ) : (
          <div className="h-52 flex items-end gap-2 pt-8 pb-2 border-b overflow-x-auto" style={{ borderColor: chartTheme.grid }}>
            {data.chart.map((d) => {
              const pct = d.collectedAmount > 0 ? Math.max(8, (d.collectedAmount / maxCollected) * 100) : 2;
              return (
                <div key={d.date} className="flex-1 min-w-[34px] flex flex-col items-center gap-2 group relative">
                  <div
                    className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap pointer-events-none z-10"
                    style={{
                      backgroundColor: chartTheme.tooltipBg,
                      color: chartTheme.tooltipText,
                      borderColor: chartTheme.tooltipBorder,
                    }}
                  >
                    {formatINR(d.collectedAmount)}
                  </div>
                  <div className="w-full max-w-[36px] h-36 rounded-t-md flex items-end overflow-hidden" style={{ backgroundColor: chartTheme.track }}>
                    <div
                      className="w-full rounded-t-md transition-all duration-500"
                      style={{
                        height: `${pct}%`,
                        background: d.collectedAmount > 0 ? chartTheme.barGradient : chartTheme.grid,
                      }}
                    />
                  </div>
                  <span className="text-[9px] font-mono whitespace-nowrap" style={{ color: chartTheme.mutedText }}>
                    {d.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Table & Mobile Cards */}
      {hasAnyActivity && (
        <>
          <div className="hidden md:block bg-[#181818] border border-[#303030] rounded-2xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#111111] text-[10px] font-mono uppercase text-[#B8B8B8] border-b border-[#303030]">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Invoices</th>
                  <th className="px-4 py-3 text-right">Collected</th>
                  <th className="px-4 py-3 text-right">Pending</th>
                  <th className="px-4 py-3">Method Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252525]">
                {data.daily.map((d) => (
                  <tr key={d.date}>
                    <td className="px-4 py-3 font-semibold text-[#F5F5F5]">{formatISTDate(`${d.date}T12:00:00+05:30`)}</td>
                    <td className="px-4 py-3 text-right font-mono">{d.invoicesCount}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">{formatINR(d.collectedAmount)}</td>
                    <td className="px-4 py-3 text-right font-mono text-[#EB3E2E]">{formatINR(d.pendingAmount)}</td>
                    <td className="px-4 py-3 text-[11px] font-mono text-[#B8B8B8]">
                      {Object.keys(d.byMethod || {}).length
                        ? Object.entries(d.byMethod).map(([k, v]) => `${k}: ${formatINR(v)}`).join(' • ')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2.5">
            {data.daily.map((d) => (
              <div key={d.date} className="bg-[#181818] border border-[#303030] rounded-xl p-3.5 text-xs space-y-1.5">
                <div className="flex justify-between font-bold text-[#F5F5F5]">
                  <span>{formatISTDate(`${d.date}T12:00:00+05:30`)}</span>
                  <span className="font-mono text-[#B8B8B8]">{d.invoicesCount} inv</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-400 font-mono">Collected: {formatINR(d.collectedAmount)}</span>
                  <span className="text-[#EB3E2E] font-mono">Pending: {formatINR(d.pendingAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
