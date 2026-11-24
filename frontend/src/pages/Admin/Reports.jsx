import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Filter,
  Calendar,
  Building,
  FileSpreadsheet,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import adminService from '../../services/adminService.js';
import { useAdmin } from '../../components/Admin/AdminLayout.jsx';

export default function Reports() {
  const { branches, selectedBranch } = useAdmin();
  const [reportType, setReportType] = useState('CLIENT_REGISTRATION');
  const [branchFilter, setBranchFilter] = useState(selectedBranch);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [reportResult, setReportResult] = useState([]);
  const [error, setError] = useState(null);

  const reportOptions = [
    { id: 'CLIENT_REGISTRATION', label: '1. Client Registration Report' },
    { id: 'ACTIVE_MEMBERSHIP', label: '2. Active Membership Report' },
    { id: 'EXPIRED_MEMBERSHIP', label: '3. Expired Membership Report' },
    { id: 'BRANCH_PERFORMANCE', label: '4. Branch Performance Report' },
    { id: 'ATTENDANCE_REPORT', label: '5. Daily Attendance Report' },
    { id: 'MONTHLY_REVENUE', label: '6. Monthly Revenue Report' },
    { id: 'PAYMENT_COLLECTION', label: '7. Payment Collection Report' },
    { id: 'TRAINER_PERFORMANCE', label: '8. Trainer Performance Report' },
    { id: 'CLIENT_RETENTION', label: '9. Client Retention Report' },
  ];

  useEffect(() => {
    setBranchFilter(selectedBranch);
  }, [selectedBranch]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getReportsData({
        reportType,
        branchId: branchFilter,
        startDate,
        endDate,
      });
      setReportResult(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, branchFilter, startDate, endDate]);

  const handleExportCSV = () => {
    if (!reportResult || reportResult.length === 0) {
      alert('No data to export');
      return;
    }

    const flatData = reportResult.map((item) => {
      const flat = {};
      for (const [key, val] of Object.entries(item)) {
        if (typeof val === 'object' && val !== null) {
          flat[key] = val.name || val.city || JSON.stringify(val);
        } else {
          flat[key] = val;
        }
      }
      return flat;
    });

    adminService.exportToCSV(flatData, `${reportType.toLowerCase()}_${Date.now()}.csv`);
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
            BUSINESS AUDIT &amp; ANALYTICAL REPORTS
          </h2>
          <p className="text-xs text-[#A3A3A3]">
            Generate real-time compliance audits, revenue aggregations, and performance retention logs.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          disabled={reportResult.length === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] hover:bg-[#F09A43] text-black transition-all cursor-pointer disabled:opacity-40 shadow-lg shadow-[#E58A32]/10"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Report (CSV)</span>
        </button>
      </div>

      {/* ── FILTERS & SELECTION BAR ── */}
      <div className="bg-[#141414] border border-[#292929] rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Report Selector */}
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          className="px-3.5 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs font-bold text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none cursor-pointer"
        >
          {reportOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Branch & Dates */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-3 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Hubs</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.city} Branch
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:outline-none"
              placeholder="From Date"
            />
            <span className="text-xs text-[#A3A3A3]">&rarr;</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:outline-none"
              placeholder="To Date"
            />
          </div>
        </div>
      </div>

      {/* ── REPORT OUTPUT TABLE ── */}
      <div className="bg-[#181818] border border-[#292929] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-[#141414] border-b border-[#292929] flex items-center justify-between text-xs">
          <span className="font-mono text-[#E58A32] font-bold uppercase">
            Active Dataset: {reportOptions.find((r) => r.id === reportType)?.label}
          </span>
          <span className="text-[#A3A3A3] font-mono">{reportResult.length} Rows Computed</span>
        </div>

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="py-16 text-center text-xs text-[#A3A3A3]">Generating report dataset from database...</div>
          ) : reportResult.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#A3A3A3]">No entries match the specified criteria.</div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#292929] bg-[#121212] text-[10px] font-mono uppercase text-[#A3A3A3]">
                  {Object.keys(reportResult[0]).map((key, idx) => (
                    <th key={idx} className="p-3 font-semibold">
                      {key.replace(/([A-Z])/g, ' $1').toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222]">
                {reportResult.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-[#1E1E1E]">
                    {Object.values(row).map((val, cIdx) => (
                      <td key={cIdx} className="p-3 font-mono">
                        {typeof val === 'object' && val !== null
                          ? val.name || val.city || JSON.stringify(val)
                          : val === true
                          ? 'YES'
                          : val === false
                          ? 'NO'
                          : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
