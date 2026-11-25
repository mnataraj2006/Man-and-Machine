import React, { useState, useEffect } from 'react';
import financeService from '../../../services/financeService.js';
import { useAdmin } from '../../../components/Admin/AdminLayout.jsx';
import { useTheme } from '../../../context/ThemeContext.jsx';
import { getChartTheme } from '../../../utils/chartTheme.js';
import { formatINR, ExportButtons, EmptyFinanceState } from '../../../components/Finance/FinanceShared.jsx';

export default function MonthlyCollections() {
  const { branches, selectedBranch } = useAdmin();
  const { resolvedTheme } = useTheme();
  const chartTheme = getChartTheme(resolvedTheme);

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [branchFilter, setBranchFilter] = useState(selectedBranch || 'ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ months: [], branchComparison: [], totals: null });

  useEffect(() => {
    setBranchFilter(selectedBranch || 'ALL');
  }, [selectedBranch]);

  useEffect(() => {
    financeService.getConfig().then((r) => setConfig(r.config)).catch(() => {});
  }, []);

  const loadMonthly = async () => {
    setLoading(true);
    try {
      const res = await financeService.getMonthlyCollections({
        year,
        branchId: branchFilter,
        paymentMethod: methodFilter,
      });
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonthly();
  }, [year, branchFilter, methodFilter]);

  const maxMonthly = Math.max(...(data.months || []).map((m) => m.collected || 0), 1);
  const maxBranch = Math.max(...(data.branchComparison || []).map((b) => b.collected || 0), 1);
  const hasAnyData = (data.months || []).some((m) => m.invoicesCount > 0 || m.collected > 0);

  const exportRows = (data.months || []).map((m) => ({
    Month: `${m.month} ${year}`,
    Invoices: m.invoicesCount,
    GrossSales: m.grossSales,
    Collected: m.collected,
    Outstanding: m.outstanding,
    Refunds: m.refunds,
    NetCollection: m.netCollection,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
            MONTH-WISE COLLECTIONS ({year})
          </h2>
          <p className="text-xs text-[#B8B8B8]">
            Annual monthly revenue breakdown, refunds, outstanding balances, and branch comparison.
          </p>
        </div>

        <ExportButtons
          onCSV={() => financeService.exportToCSV(exportRows, `monthly_collections_${year}.csv`)}
          onExcel={() => financeService.exportToExcel(exportRows, `monthly_collections_${year}.xls`, `Monthly ${year}`)}
        />
      </div>

      {/* Filters */}
      <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]">
          {[currentYear, currentYear - 1, currentYear - 2, currentYear + 1].sort((a, b) => b - a).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]">
          <option value="ALL">All Branches</option>
          {branches.map((b) => <option key={b._id} value={b._id}>{b.city}</option>)}
        </select>
        <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]">
          <option value="ALL">All Payment Methods</option>
          {(config?.paymentMethods || []).map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}
        </select>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                Monthly Revenue Chart ({year})
              </h3>
              <p className="text-[11px] text-[#B8B8B8]">Confirmed collected amounts Jan – Dec</p>
            </div>
            <span className="text-xs font-mono text-[#EB3E2E]">Net: {formatINR(data.totals?.netCollection)}</span>
          </div>

          {loading ? (
            <div className="h-44 animate-pulse rounded-xl bg-[#202020]" />
          ) : !hasAnyData ? (
            <EmptyFinanceState title="No financial transactions yet." />
          ) : (
            <div className="h-52 flex items-end gap-2 pt-8 pb-2 border-b overflow-x-auto" style={{ borderColor: chartTheme.grid }}>
              {data.months.map((m) => {
                const pct = m.collected > 0 ? Math.max(8, (m.collected / maxMonthly) * 100) : 2;
                return (
                  <div key={m.monthNumber} className="flex-1 min-w-[30px] flex flex-col items-center gap-2 group relative">
                    <div
                      className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap pointer-events-none z-10"
                      style={{
                        backgroundColor: chartTheme.tooltipBg,
                        color: chartTheme.tooltipText,
                        borderColor: chartTheme.tooltipBorder,
                      }}
                    >
                      {formatINR(m.collected)}
                    </div>
                    <div className="w-full max-w-[32px] h-36 rounded-t-md flex items-end overflow-hidden" style={{ backgroundColor: chartTheme.track }}>
                      <div
                        className="w-full rounded-t-md transition-all duration-500"
                        style={{
                          height: `${pct}%`,
                          background: m.collected > 0 ? chartTheme.barGradient : chartTheme.grid,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono uppercase" style={{ color: chartTheme.mutedText }}>{m.shortMonth}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Branch Comparison */}
        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
              Branch Comparison ({year})
            </h3>
            <p className="text-[11px] text-[#B8B8B8]">Collected vs Pending across branches</p>
          </div>

          <div className="space-y-4">
            {(data.branchComparison || []).map((b) => {
              const pct = b.collected > 0 ? Math.max(6, Math.round((b.collected / maxBranch) * 100)) : 0;
              return (
                <div key={b.branchId} className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-bold text-[#F5F5F5]">
                    <span>{b.city}</span>
                    <span className="font-mono text-[#EB3E2E]">{formatINR(b.collected)}</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: chartTheme.track }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: chartTheme.accent }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#B8B8B8]">
                    <span>{b.invoicesCount} invoices</span>
                    <span>Pending: {formatINR(b.outstanding)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Monthly Table & Mobile Cards */}
      {hasAnyData && (
        <>
          <div className="hidden md:block bg-[#181818] border border-[#303030] rounded-2xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#111111] text-[10px] font-mono uppercase text-[#B8B8B8] border-b border-[#303030]">
                <tr>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-3 py-3 text-right">Invoices</th>
                  <th className="px-3 py-3 text-right">Gross Sales</th>
                  <th className="px-3 py-3 text-right">Collected</th>
                  <th className="px-3 py-3 text-right">Outstanding</th>
                  <th className="px-3 py-3 text-right">Refunds</th>
                  <th className="px-4 py-3 text-right">Net Collection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252525]">
                {data.months.map((m) => (
                  <tr key={m.monthNumber}>
                    <td className="px-4 py-3 font-bold text-[#F5F5F5]">{m.month}</td>
                    <td className="px-3 py-3 text-right font-mono">{m.invoicesCount}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatINR(m.grossSales)}</td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-400">{formatINR(m.collected)}</td>
                    <td className="px-3 py-3 text-right font-mono text-amber-400">{formatINR(m.outstanding)}</td>
                    <td className="px-3 py-3 text-right font-mono text-blue-400">{formatINR(m.refunds)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#F5F5F5]">{formatINR(m.netCollection)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2.5">
            {data.months.map((m) => (
              <div key={m.monthNumber} className="bg-[#181818] border border-[#303030] rounded-xl p-3.5 text-xs space-y-1.5">
                <div className="flex justify-between font-bold text-[#F5F5F5]">
                  <span>{m.month} {year}</span>
                  <span className="font-mono text-emerald-400">Net: {formatINR(m.netCollection)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-[#B8B8B8]">
                  <span>Inv: {m.invoicesCount}</span>
                  <span>Gross: {formatINR(m.grossSales)}</span>
                  <span>Due: {formatINR(m.outstanding)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
