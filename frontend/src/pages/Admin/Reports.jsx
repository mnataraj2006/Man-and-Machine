import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  CreditCard,
  CalendarCheck,
  TrendingUp,
  Receipt,
  ArrowDownRight,
  Dumbbell,
  UserPlus,
  Building2,
  ArrowLeft,
  Download,
  FileSpreadsheet,
  Printer,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import reportService from '../../services/reportService.js';
import adminService from '../../services/adminService.js';
import { useAdmin } from '../../components/Admin/AdminLayout.jsx';
import {
  TrendAreaChart,
  ComparisonBarChart,
  DistributionDonutChart,
} from '../../components/Admin/ReportCharts.jsx';

const CATEGORIES = [
  { key: 'members', label: 'Member Reports', desc: 'Registrations, active/inactive, branch & trainer breakdown', icon: Users },
  { key: 'memberships', label: 'Membership Reports', desc: 'Active, expiring soon, plan distribution & renewals', icon: CreditCard },
  { key: 'attendance', label: 'Attendance Reports', desc: 'Daily trends, check-ins, percentage & low attendance', icon: CalendarCheck },
  { key: 'revenue', label: 'Revenue Reports', desc: 'Gross, collected, pending, refunds & net revenue', icon: TrendingUp },
  { key: 'payments', label: 'Payment Reports', desc: 'Payment methods, paid/partial/pending & balances', icon: Receipt },
  { key: 'expenses', label: 'Expense Reports', desc: 'Category breakdown, daily/monthly & vendor spend', icon: ArrowDownRight },
  { key: 'trainers', label: 'Trainer Reports', desc: 'Assigned clients, sessions completed & workload', icon: Dumbbell },
  { key: 'leads', label: 'Lead Reports', desc: 'Enquiries, follow-ups, sources & conversion rate', icon: UserPlus },
  { key: 'branches', label: 'Branch Reports', desc: 'Kovilpatti, Karur & Sivakasi side-by-side comparison', icon: Building2 },
];

const DATE_PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'this_week', label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'this_year', label: 'This Year' },
  { key: 'custom', label: 'Custom Range' },
];

const fmtMoney = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—');
const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) : '—');

export default function Reports({ initialCategory = null, onNavigate }) {
  const { branches, selectedBranch } = useAdmin();

  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [preset, setPreset] = useState('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [branchId, setBranchId] = useState(selectedBranch || 'ALL');
  const [status, setStatus] = useState('ALL');
  const [membershipStatus, setMembershipStatus] = useState('ALL');
  const [trainerId, setTrainerId] = useState('ALL');
  const [planId, setPlanId] = useState('ALL');
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Auxiliary dropdown lists
  const [trainers, setTrainers] = useState([]);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    setActiveCategory(initialCategory);
    setPage(1);
    setStatus('ALL');
    setMembershipStatus('ALL');
    setTrainerId('ALL');
    setPlanId('ALL');
    setPaymentMethod('ALL');
    setCategoryFilter('ALL');
    setSourceFilter('ALL');
  }, [initialCategory]);

  useEffect(() => {
    setBranchId(selectedBranch || 'ALL');
    setPage(1);
  }, [selectedBranch]);

  useEffect(() => {
    Promise.all([
      adminService.getTrainers().catch(() => ({ trainers: [] })),
      adminService.getMembershipPlans().catch(() => ({ plans: [] })),
    ]).then(([tRes, pRes]) => {
      setTrainers(tRes.trainers || []);
      setPlans(pRes.plans || []);
    });
  }, []);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await reportService.getSummary({ branchId });
      setSummary(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setSummaryLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const fetchCategoryReport = useCallback(async () => {
    if (!activeCategory) return;
    setReportLoading(true);
    setError(null);
    const params = {
      preset,
      ...(preset === 'custom' && customFrom ? { from: customFrom } : {}),
      ...(preset === 'custom' && customTo ? { to: customTo } : {}),
      branchId,
      status,
      membershipStatus,
      trainerId,
      planId,
      paymentMethod,
      category: categoryFilter,
      source: sourceFilter,
      page,
      limit: 20,
    };

    try {
      const loaders = {
        members: reportService.getMembersReport,
        memberships: reportService.getMembershipsReport,
        attendance: reportService.getAttendanceReport,
        revenue: reportService.getRevenueReport,
        payments: reportService.getPaymentsReport,
        expenses: reportService.getExpensesReport,
        trainers: reportService.getTrainersReport,
        leads: reportService.getLeadsReport,
        branches: reportService.getBranchesReport,
      };
      const fn = loaders[activeCategory];
      if (fn) {
        const res = await fn.call(reportService, params);
        setReportData(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to load report');
    } finally {
      setReportLoading(false);
    }
  }, [
    activeCategory,
    preset,
    customFrom,
    customTo,
    branchId,
    status,
    membershipStatus,
    trainerId,
    planId,
    paymentMethod,
    categoryFilter,
    sourceFilter,
    page,
  ]);

  useEffect(() => {
    if (activeCategory) fetchCategoryReport();
  }, [activeCategory, fetchCategoryReport]);

  const selectCategory = (catKey) => {
    if (onNavigate) {
      onNavigate(catKey ? `/admin/reports/${catKey}` : '/admin/reports');
    } else {
      setActiveCategory(catKey);
    }
  };

  // Build KPIs, Charts, and Table Columns per category
  const getCategoryMeta = () => {
    if (!reportData || !activeCategory) return { kpis: [], columns: [], charts: [] };
    const k = reportData.kpis || {};
    const c = reportData.charts || {};

    switch (activeCategory) {
      case 'members':
        return {
          kpis: [
            { label: 'Total Clients', value: k.totalClients ?? 0 },
            { label: 'Active Accounts', value: k.activeClients ?? 0 },
            { label: 'New Registrations', value: k.newRegistrations ?? 0 },
            { label: 'Active Membership', value: k.withActiveMembership ?? 0 },
            { label: 'Expired Membership', value: k.withExpiredMembership ?? 0 },
            { label: 'Without Membership', value: k.withoutMembership ?? 0 },
          ],
          charts: [
            <TrendAreaChart key="t" title="Registration Trend" data={c.registrationTrend} />,
            <ComparisonBarChart key="b" title="Branch-wise Clients" data={c.branchBreakdown} />,
          ],
          columns: [
            { key: 'name', label: 'Client' },
            { key: 'phone', label: 'Phone' },
            { key: 'branch', label: 'Branch' },
            { key: 'membershipStatus', label: 'Membership' },
            { key: 'planName', label: 'Plan' },
            { key: 'trainer', label: 'Trainer' },
            { key: 'accountStatus', label: 'Account' },
            { key: 'joinedAt', label: 'Joined', accessor: (r) => fmtDate(r.joinedAt) },
          ],
        };
      case 'memberships':
        return {
          kpis: [
            { label: 'Total Memberships', value: k.totalMemberships ?? 0 },
            { label: 'Active', value: k.activeMemberships ?? 0 },
            { label: 'Expiring (7d)', value: k.expiringSoon ?? 0 },
            { label: 'Expired', value: k.expiredMemberships ?? 0 },
            { label: 'Pending Payment', value: k.pendingMemberships ?? 0 },
            { label: 'New / Renewed', value: `${k.newInPeriod ?? 0} / ${k.renewedInPeriod ?? 0}` },
          ],
          charts: [
            <DistributionDonutChart key="p" title="Plan Distribution" data={c.planDistribution} />,
            <ComparisonBarChart key="b" title="Branch-wise Memberships" data={c.branchBreakdown} />,
            <TrendAreaChart key="e" title="Expiry Trend" data={c.expiryTrend} />,
          ],
          columns: [
            { key: 'clientName', label: 'Client' },
            { key: 'branch', label: 'Branch' },
            { key: 'planName', label: 'Plan' },
            { key: 'status', label: 'Status' },
            { key: 'startDate', label: 'Start', accessor: (r) => fmtDate(r.startDate) },
            { key: 'expiryDate', label: 'Expiry', accessor: (r) => fmtDate(r.expiryDate) },
            { key: 'finalAmount', label: 'Amount', accessor: (r) => fmtMoney(r.finalAmount) },
          ],
        };
      case 'attendance':
        return {
          kpis: [
            { label: 'Period Attendance', value: k.totalAttendance ?? 0 },
            { label: "Today's Check-ins", value: k.todaysAttendance ?? 0 },
            { label: 'Monthly Total', value: k.monthlyAttendance ?? 0 },
            { label: 'Unique Attendees', value: k.uniqueAttendees ?? 0 },
            { label: 'Attendance %', value: `${k.attendancePercentage ?? 0}%` },
            { label: 'Low Attendance Members', value: k.lowAttendanceCount ?? 0 },
          ],
          charts: [
            <TrendAreaChart key="d" title="Daily Attendance Trend" data={c.dailyTrend} />,
            <ComparisonBarChart key="b" title="Branch-wise Attendance" data={c.branchBreakdown} />,
          ],
          columns: [
            { key: 'clientName', label: 'Member' },
            { key: 'phone', label: 'Phone' },
            { key: 'branch', label: 'Branch' },
            { key: 'date', label: 'Date', accessor: (r) => fmtDate(r.date) },
            { key: 'checkInTime', label: 'Check-In', accessor: (r) => fmtTime(r.checkInTime) },
            { key: 'checkOutTime', label: 'Check-Out', accessor: (r) => (r.checkOutTime ? fmtTime(r.checkOutTime) : '—') },
            { key: 'method', label: 'Method' },
          ],
        };
      case 'revenue':
        return {
          kpis: [
            { label: 'Gross Revenue', value: fmtMoney(k.grossRevenue) },
            { label: 'Collected Revenue', value: fmtMoney(k.collectedRevenue) },
            { label: 'Pending Balance', value: fmtMoney(k.pendingBalance) },
            { label: 'Refunds', value: fmtMoney(k.refunds) },
            { label: 'Expenses', value: fmtMoney(k.totalExpenses) },
            { label: 'Net Revenue', value: fmtMoney(k.netRevenue) },
          ],
          charts: [
            <TrendAreaChart key="r" title="Daily Revenue Trend" data={c.revenueTrend} valuePrefix="₹" />,
            <ComparisonBarChart key="b" title="Branch-wise Revenue" data={c.branchBreakdown} valuePrefix="₹" />,
            <DistributionDonutChart key="p" title="Revenue by Plan" data={c.revenueByPlan} valuePrefix="₹" />,
          ],
          columns: [
            { key: 'invoiceNumber', label: 'Invoice #' },
            { key: 'clientName', label: 'Client' },
            { key: 'branch', label: 'Branch' },
            { key: 'category', label: 'Category' },
            { key: 'totalAmount', label: 'Total', accessor: (r) => fmtMoney(r.totalAmount) },
            { key: 'paidAmount', label: 'Paid', accessor: (r) => fmtMoney(r.paidAmount) },
            { key: 'balanceAmount', label: 'Balance', accessor: (r) => fmtMoney(r.balanceAmount) },
            { key: 'status', label: 'Status' },
            { key: 'invoiceDate', label: 'Date', accessor: (r) => fmtDate(r.invoiceDate) },
          ],
        };
      case 'payments':
        return {
          kpis: [
            { label: 'Total Payments', value: k.totalPayments ?? 0 },
            { label: 'Paid Amount', value: fmtMoney(k.paidAmount) },
            { label: 'Partially Paid Inv', value: k.partiallyPaidInvoices ?? 0 },
            { label: 'Pending Count', value: k.pendingCount ?? 0 },
            { label: 'Refunded', value: fmtMoney(k.refundedAmount) },
            { label: 'Outstanding Balance', value: fmtMoney(k.outstandingBalances) },
          ],
          charts: [
            <DistributionDonutChart key="m" title="Payment Method Breakdown" data={c.paymentMethodBreakdown} valuePrefix="₹" />,
            <TrendAreaChart key="t" title="Payment Collection Trend" data={c.paymentTrend} valuePrefix="₹" />,
          ],
          columns: [
            { key: 'transactionId', label: 'Transaction ID' },
            { key: 'invoiceNumber', label: 'Invoice #' },
            { key: 'clientName', label: 'Client' },
            { key: 'branch', label: 'Branch' },
            { key: 'paymentMethod', label: 'Method' },
            { key: 'amount', label: 'Amount', accessor: (r) => fmtMoney(r.amount) },
            { key: 'status', label: 'Status' },
            { key: 'date', label: 'Date', accessor: (r) => fmtDate(r.date) },
          ],
        };
      case 'expenses':
        return {
          kpis: [
            { label: 'Period Expenses', value: fmtMoney(k.totalExpenses) },
            { label: 'Daily Expenses', value: fmtMoney(k.dailyExpenses) },
            { label: 'Monthly Expenses', value: fmtMoney(k.monthlyExpenses) },
            { label: 'Entries', value: k.expenseCount ?? 0 },
            { label: 'Top Category', value: k.topCategory || 'None' },
          ],
          charts: [
            <DistributionDonutChart key="c" title="Expense Category Breakdown" data={c.categoryBreakdown} valuePrefix="₹" />,
            <TrendAreaChart key="t" title="Expense Trend" data={c.expenseTrend} valuePrefix="₹" />,
            <ComparisonBarChart key="b" title="Branch-wise Expenses" data={c.branchBreakdown} valuePrefix="₹" />,
            <ComparisonBarChart key="v" title="Vendor-wise Expenses" data={c.vendorBreakdown} valuePrefix="₹" />,
          ],
          columns: [
            { key: 'expenseNumber', label: 'Expense #' },
            { key: 'category', label: 'Category' },
            { key: 'description', label: 'Description' },
            { key: 'vendor', label: 'Vendor' },
            { key: 'branch', label: 'Branch' },
            { key: 'paymentMethod', label: 'Method' },
            { key: 'amount', label: 'Amount', accessor: (r) => fmtMoney(r.amount) },
            { key: 'expenseDate', label: 'Date', accessor: (r) => fmtDate(r.expenseDate) },
          ],
        };
      case 'trainers':
        return {
          kpis: [
            { label: 'Total Trainers', value: k.totalTrainers ?? 0 },
            { label: 'Active Trainers', value: k.activeTrainers ?? 0 },
            { label: 'Assigned Clients', value: k.totalAssignedClients ?? 0 },
            { label: 'Sessions Completed', value: k.sessionsCompleted ?? 0 },
            { label: 'Sessions Scheduled', value: k.sessionsScheduled ?? 0 },
          ],
          charts: [
            <ComparisonBarChart key="w" title="Trainer Workload (Sessions)" data={c.workloadComparison} />,
            <DistributionDonutChart key="b" title="Branch Distribution" data={c.branchDistribution} />,
          ],
          columns: [
            { key: 'name', label: 'Trainer' },
            { key: 'branch', label: 'Branch' },
            { key: 'specialization', label: 'Specialization' },
            { key: 'status', label: 'Status' },
            { key: 'assignedClients', label: 'Clients' },
            { key: 'sessionsCompleted', label: 'Completed' },
            { key: 'sessionsScheduled', label: 'Scheduled' },
          ],
        };
      case 'leads':
        return {
          kpis: [
            { label: 'Total Leads', value: k.totalLeads ?? 0 },
            { label: 'New', value: k.newLeads ?? 0 },
            { label: 'Contacted', value: k.contactedLeads ?? 0 },
            { label: 'Follow-ups', value: k.followUps ?? 0 },
            { label: 'Converted', value: k.convertedLeads ?? 0 },
            { label: 'Conversion Rate', value: `${k.conversionRate ?? 0}%` },
          ],
          charts: [
            <DistributionDonutChart key="s" title="Lead Source Distribution" data={c.sourceDistribution} />,
            <ComparisonBarChart key="b" title="Branch-wise Leads" data={c.branchBreakdown} />,
            <TrendAreaChart key="t" title="Lead Conversion Trend" data={c.conversionTrend} />,
          ],
          columns: [
            { key: 'name', label: 'Lead Name' },
            { key: 'phone', label: 'Phone' },
            { key: 'branch', label: 'Branch' },
            { key: 'source', label: 'Source' },
            { key: 'status', label: 'Status' },
            { key: 'followUpDate', label: 'Follow-Up', accessor: (r) => fmtDate(r.followUpDate) },
            { key: 'createdAt', label: 'Created', accessor: (r) => fmtDate(r.createdAt) },
          ],
        };
      case 'branches':
        return {
          kpis: [
            { label: 'Active Branches', value: k.totalBranches ?? 0 },
            { label: 'Total Clients', value: k.totalClients ?? 0 },
            { label: 'Active Memberships', value: k.totalActiveMemberships ?? 0 },
            { label: 'Total Revenue', value: fmtMoney(k.totalRevenue) },
            { label: 'Total Expenses', value: fmtMoney(k.totalExpenses) },
            { label: 'Net Revenue', value: fmtMoney(k.totalNetRevenue) },
          ],
          charts: [
            <ComparisonBarChart key="r" title="Branch Revenue Comparison" data={c.revenueComparison} valuePrefix="₹" />,
            <ComparisonBarChart key="m" title="Active Memberships by Branch" data={c.membershipComparison} />,
            <ComparisonBarChart key="a" title="Attendance by Branch" data={c.attendanceComparison} />,
          ],
          columns: [
            { key: 'branch', label: 'Branch' },
            { key: 'totalClients', label: 'Clients' },
            { key: 'activeMemberships', label: 'Active Passes' },
            { key: 'newRegistrations', label: 'New Reg' },
            { key: 'attendance', label: 'Attendance' },
            { key: 'revenue', label: 'Revenue', accessor: (r) => fmtMoney(r.revenue) },
            { key: 'pendingBalance', label: 'Pending', accessor: (r) => fmtMoney(r.pendingBalance) },
            { key: 'expenses', label: 'Expenses', accessor: (r) => fmtMoney(r.expenses) },
            { key: 'netRevenue', label: 'Net Revenue', accessor: (r) => fmtMoney(r.netRevenue) },
            { key: 'trainers', label: 'Trainers' },
            { key: 'leads', label: 'Leads' },
            { key: 'leadConversionRate', label: 'Lead Conv %', accessor: (r) => `${r.leadConversionRate}%` },
          ],
        };
      default:
        return { kpis: [], columns: [], charts: [] };
    }
  };

  const meta = getCategoryMeta();
  const rows = reportData?.table?.rows || [];
  const catInfo = CATEGORIES.find((c) => c.key === activeCategory);

  const handleExport = (type) => {
    const title = catInfo?.label || 'Report';
    const rangeSub = reportData?.dateRange ? `${reportData.dateRange.from} to ${reportData.dateRange.to}` : '';
    const fileBase = `mm_${activeCategory}_${Date.now()}`;
    if (type === 'csv') reportService.exportCSV(rows, meta.columns, `${fileBase}.csv`);
    if (type === 'excel') reportService.exportExcel(rows, meta.columns, title, `${fileBase}.xls`);
    if (type === 'pdf') reportService.exportPDF(rows, meta.columns, title, rangeSub, meta.kpis);
  };

  const FilterControls = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
      <select
        aria-label="Date preset"
        value={preset}
        onChange={(e) => {
          setPreset(e.target.value);
          setPage(1);
        }}
        className="w-full min-h-[44px] px-3 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
      >
        {DATE_PRESETS.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>

      {preset === 'custom' && (
        <>
          <input
            type="date"
            aria-label="From date"
            value={customFrom}
            onChange={(e) => {
              setCustomFrom(e.target.value);
              setPage(1);
            }}
            className="w-full min-h-[44px] px-3 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] font-mono"
          />
          <input
            type="date"
            aria-label="To date"
            value={customTo}
            onChange={(e) => {
              setCustomTo(e.target.value);
              setPage(1);
            }}
            className="w-full min-h-[44px] px-3 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] font-mono"
          />
        </>
      )}

      <select
        aria-label="Branch filter"
        value={branchId}
        onChange={(e) => {
          setBranchId(e.target.value);
          setPage(1);
        }}
        className="w-full min-h-[44px] px-3 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
      >
        <option value="ALL">All Branches</option>
        {branches.map((b) => (
          <option key={b._id} value={b._id}>
            {b.city} Branch
          </option>
        ))}
      </select>

      {['members', 'memberships', 'payments', 'trainers', 'leads'].includes(activeCategory) && (
        <select
          aria-label="Status filter"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="w-full min-h-[44px] px-3 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
        >
          <option value="ALL">All Statuses</option>
          {activeCategory === 'members' && (
            <>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="NOT_CREATED">Walk-in (No Login)</option>
            </>
          )}
          {activeCategory === 'memberships' && (
            <>
              <option value="ACTIVE">Active</option>
              <option value="PENDING_PAYMENT">Pending Payment</option>
              <option value="EXPIRED">Expired</option>
              <option value="FROZEN">Frozen</option>
              <option value="CANCELLED">Cancelled</option>
            </>
          )}
          {activeCategory === 'payments' && (
            <>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="REFUNDED">Refunded</option>
              <option value="FAILED">Failed</option>
            </>
          )}
          {activeCategory === 'trainers' && (
            <>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </>
          )}
          {activeCategory === 'leads' && (
            <>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="VISIT_SCHEDULED">Visit Scheduled</option>
              <option value="CONVERTED">Converted</option>
              <option value="LOST">Lost</option>
            </>
          )}
        </select>
      )}

      {activeCategory === 'members' && (
        <select
          aria-label="Membership status filter"
          value={membershipStatus}
          onChange={(e) => {
            setMembershipStatus(e.target.value);
            setPage(1);
          }}
          className="w-full min-h-[44px] px-3 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5]"
        >
          <option value="ALL">All Memberships</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expired</option>
          <option value="PENDING_PAYMENT">Pending Payment</option>
          <option value="NO_MEMBERSHIP">No Membership</option>
        </select>
      )}

      {['members', 'attendance', 'trainers'].includes(activeCategory) && (
        <select
          aria-label="Trainer filter"
          value={trainerId}
          onChange={(e) => {
            setTrainerId(e.target.value);
            setPage(1);
          }}
          className="w-full min-h-[44px] px-3 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5]"
        >
          <option value="ALL">All Trainers</option>
          {trainers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      )}

      {['memberships', 'revenue'].includes(activeCategory) && (
        <select
          aria-label="Plan filter"
          value={planId}
          onChange={(e) => {
            setPlanId(e.target.value);
            setPage(1);
          }}
          className="w-full min-h-[44px] px-3 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5]"
        >
          <option value="ALL">All Membership Plans</option>
          {plans.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      {['payments', 'expenses'].includes(activeCategory) && (
        <select
          aria-label="Payment method filter"
          value={paymentMethod}
          onChange={(e) => {
            setPaymentMethod(e.target.value);
            setPage(1);
          }}
          className="w-full min-h-[44px] px-3 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5]"
        >
          <option value="ALL">All Payment Methods</option>
          <option value="CASH">Cash</option>
          <option value="UPI">UPI</option>
          <option value="CARD">Card</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="ONLINE">Online</option>
          <option value="OTHER">Other</option>
        </select>
      )}

      {activeCategory === 'leads' && (
        <select
          aria-label="Lead source filter"
          value={sourceFilter}
          onChange={(e) => {
            setSourceFilter(e.target.value);
            setPage(1);
          }}
          className="w-full min-h-[44px] px-3 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5]"
        >
          <option value="ALL">All Lead Sources</option>
          <option value="WALK_IN">Walk-in</option>
          <option value="WEBSITE">Website</option>
          <option value="INSTAGRAM">Instagram</option>
          <option value="GOOGLE">Google</option>
          <option value="FRIEND_REFERRAL">Friend Referral</option>
          <option value="OTHER">Other</option>
        </select>
      )}
    </div>
  );

  // ── DASHBOARD VIEW (/admin/reports) ──
  if (!activeCategory) {
    const summaryCards = [
      { label: 'Total Members', value: summary?.totalMembers ?? 0 },
      { label: 'Active Memberships', value: summary?.activeMemberships ?? 0 },
      { label: "Today's Attendance", value: summary?.todaysAttendance ?? 0 },
      { label: 'Monthly Revenue', value: fmtMoney(summary?.monthlyRevenue) },
      { label: 'Pending Balance', value: fmtMoney(summary?.pendingBalance) },
      { label: 'Monthly Expenses', value: fmtMoney(summary?.monthlyExpenses) },
      { label: 'Net Revenue', value: fmtMoney(summary?.netRevenue) },
      { label: 'New Leads', value: summary?.newLeads ?? 0 },
    ];

    return (
      <div className="space-y-6 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="mm-page-title text-2xl sm:text-3xl">REPORTS &amp; ANALYTICS</h2>
            <p className="text-xs sm:text-sm text-[#B8B8B8] mt-1">
              Real-time operational, financial, and branch intelligence (Asia/Kolkata).
            </p>
          </div>
        </div>

        {/* 8 Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {summaryCards.map((c, idx) => (
            <div key={idx} className="bg-[#181818] border border-[#303030] rounded-2xl p-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#858585] block">
                {c.label}
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-[#F5F5F5] mt-1 block">
                {summaryLoading ? '—' : c.value}
              </span>
            </div>
          ))}
        </div>

        {/* 9 Report Category Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => selectCategory(cat.key)}
                className="text-left bg-[#181818] hover:bg-[#202020] border border-[#303030] hover:border-[#F03B2E] rounded-2xl p-5 transition-all cursor-pointer flex items-start gap-4 group"
              >
                <div className="w-11 h-11 rounded-xl bg-[#F03B2E]/10 border border-[#F03B2E]/30 flex items-center justify-center text-[#F03B2E] shrink-0 group-hover:bg-[#F03B2E] group-hover:text-white transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-base font-bold uppercase text-[#F5F5F5]">
                    {cat.label}
                  </h3>
                  <p className="text-xs text-[#B8B8B8] mt-1 leading-relaxed">{cat.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── CATEGORY REPORT VIEW (/admin/reports/:category) ──
  return (
    <div className="space-y-5 min-w-0">
      {/* Header & Exports */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => selectCategory(null)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#202020] hover:bg-[#303030] border border-[#303030] text-[#F5F5F5] cursor-pointer shrink-0"
            aria-label="Back to Reports"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h2 className="mm-page-title text-xl sm:text-2xl truncate">{catInfo?.label}</h2>
            <p className="text-xs text-[#B8B8B8] font-mono">
              {reportData?.dateRange ? `${reportData.dateRange.from} → ${reportData.dateRange.to} (IST)` : 'Loading period...'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className="lg:hidden min-h-[44px] px-3.5 py-2 rounded-xl bg-[#202020] border border-[#303030] text-xs font-bold uppercase text-[#F5F5F5] inline-flex items-center gap-2 cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#F03B2E]" />
            <span>Filters</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase text-[#F5F5F5] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#F03B2E]" />
            <span>CSV</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('excel')}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase text-[#F5F5F5] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#F03B2E] hover:bg-[#FF493B] text-xs font-bold uppercase text-white inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Category Quick Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => selectCategory(c.key)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase whitespace-nowrap border cursor-pointer transition-colors ${
              c.key === activeCategory
                ? 'bg-[#F03B2E] text-white border-[#F03B2E]'
                : 'bg-[#181818] text-[#B8B8B8] border-[#303030] hover:text-white'
            }`}
          >
            {c.label.replace(' Reports', '')}
          </button>
        ))}
      </div>

      {/* Desktop Filter Bar */}
      <div className="hidden lg:block bg-[#111111] border border-[#303030] rounded-2xl p-4">
        <FilterControls />
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFilterOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end lg:hidden"
          onClick={() => setMobileFilterOpen(false)}
        >
          <div
            className="w-full bg-[#181818] border-t border-[#303030] rounded-t-2xl p-5 space-y-4 max-h-[85dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase text-[#F03B2E]">Report Filters</span>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-[#202020] text-[#F5F5F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <FilterControls />
            <button
              type="button"
              onClick={() => setMobileFilterOpen(false)}
              className="w-full min-h-[44px] rounded-xl bg-[#F03B2E] text-white text-xs font-bold uppercase"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-[#F03B2E]/10 border border-[#F03B2E]/40 rounded-2xl p-4 flex items-center gap-3 text-xs text-[#FF493B]">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {reportLoading ? (
        <div className="bg-[#181818] border border-[#303030] rounded-2xl py-16 text-center text-xs text-[#B8B8B8]">
          Generating report from MongoDB...
        </div>
      ) : (
        <>
          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {meta.kpis.map((k, idx) => (
              <div key={idx} className="bg-[#181818] border border-[#303030] rounded-2xl p-3.5">
                <span className="text-[10px] font-mono uppercase text-[#858585] block truncate">{k.label}</span>
                <span className="text-lg font-bold font-mono text-[#F5F5F5] mt-1 block">{k.value}</span>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{meta.charts}</div>

          {/* Detailed Table */}
          <div className="bg-[#181818] border border-[#303030] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#303030] bg-[#111111] flex items-center justify-between">
              <span className="text-xs font-mono uppercase font-bold text-[#B8B8B8] inline-flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#F03B2E]" />
                Detailed Records ({reportData?.table?.total ?? 0})
              </span>
            </div>

            {rows.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#858585] italic">
                No data available for the selected period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#303030] bg-[#111111] text-[10px] font-mono uppercase text-[#B8B8B8]">
                      {meta.columns.map((col) => (
                        <th key={col.key} className="py-3 px-3.5 font-semibold whitespace-nowrap">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252525]">
                    {rows.map((row, rIdx) => (
                      <tr key={row.id || rIdx} className="hover:bg-[#202020] transition-colors">
                        {meta.columns.map((col) => (
                          <td key={col.key} className="py-2.5 px-3.5 text-[#F5F5F5] whitespace-nowrap">
                            {typeof col.accessor === 'function' ? col.accessor(row) : row[col.key] ?? '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {(reportData?.table?.totalPages || 1) > 1 && (
              <div className="px-4 py-3 border-t border-[#303030] flex items-center justify-between text-xs text-[#B8B8B8]">
                <span>
                  Page {reportData.table.page} of {reportData.table.totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-[#202020] border border-[#303030] disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={page >= reportData.table.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-[#202020] border border-[#303030] disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
