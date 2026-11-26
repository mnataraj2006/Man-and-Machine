import React from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { getChartTheme } from '../../utils/chartTheme.js';

const PALETTE = ['#F03B2E', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6'];

export function EmptyChartState() {
  return (
    <div className="h-44 flex items-center justify-center text-xs text-[#858585] italic border border-dashed border-[#303030] rounded-xl">
      No data available for the selected period.
    </div>
  );
}

/**
 * Area / Line Chart for daily trends (revenue, attendance, registrations, etc.)
 */
export function TrendAreaChart({ title, data = [], valuePrefix = '' }) {
  const { resolvedTheme } = useTheme();
  const theme = getChartTheme(resolvedTheme);

  if (!data || data.length === 0) {
    return (
      <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 space-y-3">
        <h4 className="text-xs font-mono uppercase tracking-wider text-[#B8B8B8] font-bold">{title}</h4>
        <EmptyChartState />
      </div>
    );
  }

  const width = 520;
  const height = 160;
  const padX = 16;
  const padY = 16;
  const maxVal = Math.max(...data.map((d) => Number(d.value) || 0), 1);
  const stepX = data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = data.length === 1 ? width / 2 : padX + i * stepX;
    const y = height - padY - ((Number(d.value) || 0) / maxVal) * (height - padY * 2);
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height - padY} L ${points[0].x.toFixed(1)} ${height - padY} Z`
      : '';

  const totalVal = data.reduce((s, d) => s + (Number(d.value) || 0), 0);

  return (
    <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-mono uppercase tracking-wider text-[#B8B8B8] font-bold">{title}</h4>
        <span className="text-xs font-mono font-bold text-[#F03B2E]">
          Total: {valuePrefix}
          {totalVal.toLocaleString('en-IN')}
        </span>
      </div>

      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44">
          <defs>
            <linearGradient id={`grad-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F03B2E" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#F03B2E" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke={theme.grid} strokeWidth="1" />
          <line x1={padX} y1={height / 2} x2={width - padX} y2={height / 2} stroke={theme.grid} strokeDasharray="3 3" strokeWidth="1" />

          {areaPath && <path d={areaPath} fill={`url(#grad-${title.replace(/\s+/g, '')})`} />}
          {points.length > 1 && <path d={linePath} fill="none" stroke="#F03B2E" strokeWidth="2.5" strokeLinejoin="round" />}

          {points.map((p, idx) => (
            <g key={idx}>
              <circle cx={p.x} cy={p.y} r="3.5" fill="#F03B2E" stroke="#181818" strokeWidth="1.5">
                <title>{`${p.label}: ${valuePrefix}${Number(p.value).toLocaleString('en-IN')}`}</title>
              </circle>
            </g>
          ))}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-[#858585]">
        <span>{data[0]?.label}</span>
        {data.length > 2 && <span>{data[Math.floor(data.length / 2)]?.label}</span>}
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/**
 * Bar Chart for branch comparison, trainer workload, etc.
 */
export function ComparisonBarChart({ title, data = [], valuePrefix = '' }) {
  const { resolvedTheme } = useTheme();
  const theme = getChartTheme(resolvedTheme);

  if (!data || data.length === 0) {
    return (
      <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 space-y-3">
        <h4 className="text-xs font-mono uppercase tracking-wider text-[#B8B8B8] font-bold">{title}</h4>
        <EmptyChartState />
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => Number(d.value) || 0), 1);

  return (
    <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 space-y-3">
      <h4 className="text-xs font-mono uppercase tracking-wider text-[#B8B8B8] font-bold">{title}</h4>
      <div className="space-y-2.5">
        {data.map((item, idx) => {
          const val = Number(item.value) || 0;
          const pct = Math.max(2, Math.round((val / maxVal) * 100));
          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#F5F5F5] truncate pr-2">{item.label}</span>
                <span className="font-mono font-bold text-[#F03B2E] shrink-0">
                  {valuePrefix}
                  {val.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: theme.track }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: theme.barGradient }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Donut / Pie Chart for status, payment method, expense category, lead source distributions
 */
export function DistributionDonutChart({ title, data = [], valuePrefix = '' }) {
  const total = (data || []).reduce((s, d) => s + (Number(d.value) || 0), 0);

  if (!data || data.length === 0 || total === 0) {
    return (
      <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 space-y-3">
        <h4 className="text-xs font-mono uppercase tracking-wider text-[#B8B8B8] font-bold">{title}</h4>
        <EmptyChartState />
      </div>
    );
  }

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 space-y-3">
      <h4 className="text-xs font-mono uppercase tracking-wider text-[#B8B8B8] font-bold">{title}</h4>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <svg viewBox="0 0 140 140" className="w-32 h-32 shrink-0 -rotate-90">
          {data.map((item, idx) => {
            const val = Number(item.value) || 0;
            const dash = (val / total) * circumference;
            const currentOffset = offset;
            offset += dash;
            return (
              <circle
                key={idx}
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke={PALETTE[idx % PALETTE.length]}
                strokeWidth="18"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-currentOffset}
              >
                <title>{`${item.label}: ${valuePrefix}${val.toLocaleString('en-IN')}`}</title>
              </circle>
            );
          })}
        </svg>

        <div className="flex-1 w-full space-y-1.5 max-h-40 overflow-y-auto">
          {data.map((item, idx) => {
            const val = Number(item.value) || 0;
            const pct = Math.round((val / total) * 100);
            return (
              <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                  />
                  <span className="text-[#F5F5F5] truncate">{item.label}</span>
                </div>
                <span className="font-mono text-[#B8B8B8] shrink-0">
                  {valuePrefix}
                  {val.toLocaleString('en-IN')} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
