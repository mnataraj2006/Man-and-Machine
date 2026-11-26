import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../context/ThemeContext.jsx';
import { getChartTheme } from '../../utils/chartTheme.js';
import {
  Users,
  CreditCard,
  AlertTriangle,
  Dumbbell,
  CalendarCheck,
  TrendingUp,
  Clock,
  ClipboardList,
  Plus,
  RefreshCw,
  Building,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { useAdmin } from '../../components/Admin/AdminLayout.jsx';
import adminService from '../../services/adminService.js';
import whatsappService from '../../services/whatsappService.js';

export default function DashboardHome({ onNavigate }) {
  const { selectedBranch, branches } = useAdmin();
  const { resolvedTheme } = useTheme();
  const chartTheme = getChartTheme(resolvedTheme);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('thisMonth');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [whatsappSummary, setWhatsappSummary] = useState(null);

  // Quick Action Modal states
  const [quickAction, setQuickAction] = useState(null); // 'ADD_CLIENT' | 'ADD_TRAINER' | 'CREATE_MEMBERSHIP' | 'RECORD_PAYMENT'
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalSuccess, setModalSuccess] = useState(null);

  // Form states for quick actions
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'Password@123',
    branchId: '',
    fitnessGoal: 'General Fitness',
    experienceLevel: 'Beginner',
  });

  const [trainerForm, setTrainerForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'Password@123',
    branchId: '',
    specialization: 'Strength & Conditioning',
    experienceYears: 3,
  });

  const [membershipForm, setMembershipForm] = useState({
    userId: '',
    branchId: '',
    planId: '',
    planName: '1 Month Kickstart',
    durationDays: 30,
    durationMonths: 1,
    amount: 2000,
    isAvailable: true,
  });

  const [paymentForm, setPaymentForm] = useState({
    userId: '',
    branchId: '',
    amount: '',
    paymentMethod: 'UPI',
    description: 'Gym Membership Fee',
  });

  const [allClientsList, setAllClientsList] = useState([]);
  const [plans, setPlans] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, waRes] = await Promise.all([
        adminService.getDashboardOverview(selectedBranch, range),
        whatsappService.summary().catch(() => ({ summary: null })),
      ]);
      setData(res);
      setWhatsappSummary(waRes?.summary || null);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  // Lazy-load quick action modal dropdown data only when a modal is opened
  useEffect(() => {
    if (!quickAction) return;
    if (allClientsList.length === 0) {
      adminService
        .getClients({ limit: 50 })
        .then((clientsRes) => {
          if (clientsRes?.clients) setAllClientsList(clientsRes.clients);
        })
        .catch(() => {});
    }
    if (plans.length === 0) {
      adminService
        .getMembershipPlans()
        .then((plansRes) => {
          if (plansRes?.plans) {
            setPlans(plansRes.plans);
            if (plansRes.plans.length > 0 && !membershipForm.planId) {
              const firstP = plansRes.plans[0];
              setMembershipForm((prev) => ({
                ...prev,
                planId: firstP._id,
                planName: firstP.name,
                durationDays: firstP.durationDays || 30,
                durationMonths: firstP.durationMonths || 1,
              }));
            }
          }
        })
        .catch(() => {});
    }
  }, [quickAction]);

  useEffect(() => {
    fetchData();
  }, [selectedBranch, range]);

  // Set default branch in forms when branches change
  useEffect(() => {
    if (branches.length > 0) {
      const defaultB = selectedBranch !== 'ALL' ? selectedBranch : branches[0]._id;
      setClientForm((prev) => ({ ...prev, branchId: defaultB }));
      setTrainerForm((prev) => ({ ...prev, branchId: defaultB }));
      setMembershipForm((prev) => ({ ...prev, branchId: defaultB }));
      setPaymentForm((prev) => ({ ...prev, branchId: defaultB }));
    }
  }, [branches, selectedBranch]);

  const handleQuickClientSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    try {
      await adminService.createClient(clientForm);
      setModalSuccess('Client registered successfully!');
      setTimeout(() => {
        setQuickAction(null);
        setModalSuccess(null);
        fetchData();
      }, 1000);
    } catch (err) {
      setModalError(err.message || 'Failed to register client');
    } finally {
      setModalLoading(false);
    }
  };

  const handleQuickTrainerSubmit = async (e) => {
    e.preventDefault();
    const digits = String(trainerForm.phone || '').replace(/\D/g, '');
    const validPhone =
      (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) ||
      (digits.length === 11 && /^0[6-9]\d{9}$/.test(digits)) ||
      (digits.length === 12 && /^91[6-9]\d{9}$/.test(digits)) ||
      (digits.length === 14 && /^0091[6-9]\d{9}$/.test(digits));
    if (!validPhone) {
      setModalError('Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9 (e.g. 9876543210 or +91 9876543210).');
      return;
    }
    setModalLoading(true);
    setModalError(null);
    try {
      await adminService.createTrainer(trainerForm);
      setModalSuccess('Trainer onboarded successfully!');
      setTimeout(() => {
        setQuickAction(null);
        setModalSuccess(null);
        fetchData();
      }, 1000);
    } catch (err) {
      setModalError(err.message || 'Failed to add trainer');
    } finally {
      setModalLoading(false);
    }
  };

  const handleQuickMembershipSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    try {
      await adminService.createClientMembership(membershipForm);
      setModalSuccess('Membership assigned successfully!');
      setTimeout(() => {
        setQuickAction(null);
        setModalSuccess(null);
        fetchData();
      }, 1000);
    } catch (err) {
      setModalError(err.message || 'Failed to create membership');
    } finally {
      setModalLoading(false);
    }
  };

  const handleQuickPaymentSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    try {
      await adminService.recordOfflinePayment(paymentForm);
      setModalSuccess('Payment recorded successfully!');
      setTimeout(() => {
        setQuickAction(null);
        setModalSuccess(null);
        fetchData();
      }, 1000);
    } catch (err) {
      setModalError(err.message || 'Failed to record payment');
    } finally {
      setModalLoading(false);
    }
  };

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* ── TOP SECTION: WELCOME & QUICK ACTIONS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111111] border border-[#303030] rounded-2xl p-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase text-[#EB3E2E] tracking-wider">
              COMMAND CENTER OVERVIEW
            </span>
            <span className="text-[#303030]">•</span>
            <span className="text-xs text-[#B8B8B8] font-mono">{todayFormatted}</span>
          </div>
          <h2
            className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#F5F5F5]"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            GYM BUSINESS OVERVIEW
          </h2>
          <p className="text-xs text-[#B8B8B8]">
            Managing{' '}
            <strong className="text-[#F5F5F5]">
              {selectedBranch === 'ALL'
                ? 'All 3 Branches (Kovilpatti, Karur, Sivakasi)'
                : `${branches.find((b) => b._id === selectedBranch)?.city || ''} Branch`}
            </strong>
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate?.('/admin/clients?add=1')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#EB3E2E] hover:bg-[#FF493B] text-white transition-all cursor-pointer shadow-lg shadow-[#EB3E2E]/10"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Client</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickAction('ADD_TRAINER')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#202020] hover:bg-[#252525] text-[#F5F5F5] border border-[#303030] hover:border-[#EB3E2E] transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Trainer</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickAction('CREATE_MEMBERSHIP')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#202020] hover:bg-[#252525] text-[#F5F5F5] border border-[#303030] hover:border-[#EB3E2E] transition-all cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Membership</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickAction('RECORD_PAYMENT')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#202020] hover:bg-[#252525] text-[#F5F5F5] border border-[#303030] hover:border-[#EB3E2E] transition-all cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
            <span>Record Payment</span>
          </button>

          <button
            type="button"
            onClick={fetchData}
            className="p-2 rounded-xl bg-[#202020] hover:bg-[#252525] text-[#B8B8B8] hover:text-white border border-[#303030] cursor-pointer"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── ERROR NOTICE & RETRY ── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 text-red-400">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Dashboard Data Sync Error</p>
              <p className="text-xs text-red-300/80">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs font-bold uppercase text-red-300 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* ── TIME RANGE FILTER ── */}
      <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1">
        <span className="text-xs uppercase font-mono text-[#B8B8B8] shrink-0">Filter Analytics Period:</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {[
            { id: 'today', label: 'Today' },
            { id: '7days', label: 'Last 7 Days' },
            { id: '30days', label: 'Last 30 Days' },
            { id: 'thisMonth', label: 'This Month' },
            { id: 'lastMonth', label: 'Last Month' },
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setRange(btn.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                range === btn.id
                  ? 'bg-[#EB3E2E] text-white'
                  : 'bg-[#181818] text-[#B8B8B8] hover:text-[#F5F5F5] border border-[#303030]'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 8 KPI CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* 1. Total Clients */}
        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-[#EB3E2E]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#B8B8B8]">TOTAL CLIENTS</span>
            <div className="w-8 h-8 rounded-lg bg-[#202020] border border-[#303030] flex items-center justify-center text-[#F5F5F5]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex flex-col">
            <span
              className="text-2xl sm:text-3xl font-bold text-[#F5F5F5]"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              {data?.kpis?.totalClients ?? 0}
            </span>
            <span className="text-[11px] text-[#B8B8B8] mt-0.5">
              {data?.kpis?.activeClients !== undefined ? `${data.kpis.activeClients} Active Athletes` : 'Registered Athletes'}
            </span>
          </div>
        </div>

        {/* 2. Active Members */}
        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-[#EB3E2E]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#B8B8B8]">ACTIVE MEMBERS</span>
            <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex flex-col">
            <span
              className="text-2xl sm:text-3xl font-bold text-[#F5F5F5]"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              {data?.kpis?.activeMembers ?? 0}
            </span>
            <span className="text-[11px] text-green-400/90 mt-0.5">Valid membership pass</span>
          </div>
        </div>

        {/* 3. Expired Memberships */}
        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-[#EB3E2E]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#B8B8B8]">EXPIRED MEMBERS</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex flex-col">
            <span
              className="text-2xl sm:text-3xl font-bold text-[#F5F5F5]"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              {data?.kpis?.expiredMemberships ?? 0}
            </span>
            <span className="text-[11px] text-amber-400/90 mt-0.5">Renewal required</span>
          </div>
        </div>

        {/* 4. Total Trainers */}
        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-[#EB3E2E]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#B8B8B8]">TOTAL TRAINERS</span>
            <div className="w-8 h-8 rounded-lg bg-[#EB3E2E]/10 border border-[#EB3E2E]/30 flex items-center justify-center text-[#EB3E2E]">
              <Dumbbell className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex flex-col">
            <span
              className="text-2xl sm:text-3xl font-bold text-[#F5F5F5]"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              {data?.kpis?.totalTrainers ?? 0}
            </span>
            <span className="text-[11px] text-[#B8B8B8] mt-0.5">
              {data?.kpis?.activeTrainers !== undefined ? `${data.kpis.activeTrainers} Active Coaches` : 'Certified Strength Coaches'}
            </span>
          </div>
        </div>

        {/* 5. Today's Attendance */}
        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-[#EB3E2E]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#B8B8B8]">TODAY'S ATTENDANCE</span>
            <div className="w-8 h-8 rounded-lg bg-[#EB3E2E]/10 border border-[#EB3E2E]/20 flex items-center justify-center text-[#EB3E2E]">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex flex-col">
            <span
              className="text-2xl sm:text-3xl font-bold text-[#F5F5F5]"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              {data?.kpis?.todayAttendance ?? 0}
            </span>
            <span className="text-[11px] text-[#B8B8B8] mt-0.5">Check-ins recorded today</span>
          </div>
        </div>

        {/* 6. Monthly Revenue */}
        <div
          onClick={() => onNavigate && onNavigate('/admin/finance/collections/monthly')}
          className="bg-[#181818] border border-[#303030] rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-[#EB3E2E]/60 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#B8B8B8]">MONTHLY REVENUE</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex flex-col">
            <span
              className="text-2xl sm:text-3xl font-bold text-[#F5F5F5]"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              ₹{(data?.kpis?.monthlyRevenue ?? 0).toLocaleString()}
            </span>
            <span className="text-[11px] text-[#B8B8B8] mt-0.5">
              Prev month: ₹{(data?.kpis?.prevMonthlyRevenue ?? 0).toLocaleString()} &rarr;
            </span>
          </div>
        </div>

        {/* 7. Pending Balance (Invoices) */}
        <div
          onClick={() => onNavigate && onNavigate('/admin/finance/summary')}
          className="bg-[#181818] border border-[#303030] rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-[#EB3E2E]/60 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#B8B8B8]">PENDING BALANCE</span>
            <div className="w-8 h-8 rounded-lg bg-[#EB3E2E]/10 border border-[#EB3E2E]/30 flex items-center justify-center text-[#EB3E2E]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex flex-col">
            <span
              className="text-2xl sm:text-3xl font-bold text-[#F5F5F5]"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              ₹{(data?.kpis?.pendingPaymentsTotal ?? 0).toLocaleString()}
            </span>
            <span className="text-[11px] text-[#EB3E2E] mt-0.5">
              {data?.kpis?.pendingPayments ?? 0} outstanding invoices &rarr;
            </span>
          </div>
        </div>

        {/* 8. Monthly Expenses */}
        <div
          onClick={() => onNavigate && onNavigate('/admin/finance/expenses')}
          className="bg-[#181818] border border-[#303030] rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-[#EB3E2E]/60 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#B8B8B8]">EXPENSES (MONTH)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex flex-col">
            <span
              className="text-2xl sm:text-3xl font-bold text-[#F5F5F5]"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              ₹{(data?.kpis?.monthlyExpenses ?? 0).toLocaleString()}
            </span>
            <span className="text-[11px] text-[#B8B8B8] mt-0.5">
              View expense ledger &rarr;
            </span>
          </div>
        </div>

        {/* 9. Net Revenue (Month) */}
        <div
          onClick={() => onNavigate && onNavigate('/admin/finance/summary')}
          className="bg-[#181818] border border-[#303030] rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-[#EB3E2E]/60 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#B8B8B8]">NET REVENUE (MONTH)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex flex-col">
            <span
              className="text-2xl sm:text-3xl font-bold text-emerald-400"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              ₹{(data?.kpis?.netRevenue ?? 0).toLocaleString()}
            </span>
            <span className="text-[11px] text-[#B8B8B8] mt-0.5">
              Finance Summary &rarr;
            </span>
          </div>
        </div>

        {/* 10. Active Membership Plans */}
        <div
          onClick={() => onNavigate && onNavigate('/admin/membership-plans')}
          className="bg-[#181818] border border-[#303030] rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-[#EB3E2E]/60 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#B8B8B8]">ACTIVE PLANS</span>
            <div className="w-8 h-8 rounded-lg bg-[#EB3E2E]/10 border border-[#EB3E2E]/20 flex items-center justify-center text-[#EB3E2E]">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex flex-col">
            <span
              className="text-2xl sm:text-3xl font-bold text-[#F5F5F5]"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              {plans?.filter((p) => p.isActive).length || plans?.length || 4}
            </span>
            <span className="text-[11px] text-[#EB3E2E]/90 mt-0.5">Configured in catalog &rarr;</span>
          </div>
        </div>
      </div>

      <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-[#F03B2E]/10 border border-[#F03B2E]/30 flex items-center justify-center"><MessageCircle className="w-5 h-5 text-[#F03B2E]" /></div><div><p className="text-sm font-bold text-[#F5F5F5]">WhatsApp</p><p className="text-xs text-[#858585]">{whatsappSummary ? 'Today’s communication activity' : 'No WhatsApp messages sent yet.'}</p></div></div>
        <div className="grid grid-cols-4 gap-4 text-center text-xs"><div><b className="block text-[#F5F5F5]">{whatsappSummary?.messagesToday || 0}</b><span className="text-[#858585]">Sent</span></div><div><b className="block text-green-400">{whatsappSummary?.delivered || 0}</b><span className="text-[#858585]">Delivered</span></div><div><b className="block text-[#F5F5F5]">{whatsappSummary?.read || 0}</b><span className="text-[#858585]">Read</span></div><div><b className="block text-red-400">{whatsappSummary?.failed || 0}</b><span className="text-[#858585]">Failed</span></div></div>
        <button type="button" onClick={() => onNavigate?.('/admin/settings/whatsapp/logs')} className="text-xs font-bold uppercase text-[#F03B2E]">View Logs</button>
      </div>

      {/* ── CHARTS & ANALYTICS SECTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Monthly Revenue Trend */}
        <div className="lg:col-span-2 bg-[#181818] border border-[#303030] rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3
                className="text-sm font-bold uppercase tracking-wider text-[#F5F5F5]"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                Monthly Revenue Performance (Confirmed Paid)
              </h3>
              <p className="text-[11px] text-[#B8B8B8]">Confirmed revenue collections across past 6 months</p>
            </div>
            <span className="text-xs font-mono text-[#EB3E2E]">INR (₹)</span>
          </div>

          {/* SVG Visual Bar Chart */}
          <div className="h-48 flex items-end justify-between gap-3 pt-6 border-b pb-3" style={{ borderColor: chartTheme.grid }}>
            {data?.charts?.revenueChart?.map((item, idx) => {
              const maxRev = Math.max(...data.charts.revenueChart.map((c) => c.revenue), 10000);
              const heightPercent = Math.max((item.revenue / maxRev) * 100, 6);

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Tooltip */}
                  <div
                    className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold py-1 px-2 rounded border pointer-events-none whitespace-nowrap z-10"
                    style={{
                      backgroundColor: chartTheme.tooltipBg,
                      color: chartTheme.tooltipText,
                      borderColor: chartTheme.tooltipBorder,
                    }}
                  >
                    ₹{item.revenue.toLocaleString()}
                  </div>

                  <div
                    className="w-full max-w-[40px] rounded-t-md relative flex items-end h-36 overflow-hidden"
                    style={{ backgroundColor: chartTheme.track }}
                  >
                    <div
                      className="w-full rounded-t-md transition-all duration-500 group-hover:brightness-110"
                      style={{ height: `${heightPercent}%`, background: chartTheme.barGradient }}
                    />
                  </div>
                  <span className="text-[10px] font-mono uppercase" style={{ color: chartTheme.mutedText }}>
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Branch-wise Active Memberships */}
        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5 flex flex-col justify-between">
          <div className="mb-4">
            <h3
              className="text-sm font-bold uppercase tracking-wider text-[#F5F5F5]"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              Branch Comparison
            </h3>
            <p className="text-[11px] text-[#B8B8B8]">Active athletes across operational hubs</p>
          </div>

          <div className="space-y-4 my-auto">
            {data?.charts?.branchComparison?.map((b, idx) => {
              const totalActiveAll =
                data.charts.branchComparison.reduce((s, curr) => s + curr.activeCount, 0) || 1;
              const percent = Math.round((b.activeCount / totalActiveAll) * 100);

              return (
                <div key={idx} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#F5F5F5]">{b.city} Branch</span>
                    <span className="font-mono text-[#EB3E2E]">{b.activeCount} active</span>
                  </div>
                  <div className="w-full h-2.5 bg-[#252525] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#EB3E2E] rounded-full transition-all duration-700"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#B8B8B8]">
                    <span>Total registered: {b.clientCount}</span>
                    <span>Monthly: ₹{b.monthlyRevenue.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/admin/branches')}
            className="w-full mt-4 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#202020] hover:bg-[#303030] text-[#F5F5F5] transition-colors cursor-pointer"
          >
            <span>View Branch Specifications</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── SECONDARY VISUALIZATIONS ROW ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily Attendance (Last 7 Days) */}
        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3
                className="text-sm font-bold uppercase tracking-wider text-[#F5F5F5]"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                Daily Attendance Trend
              </h3>
              <p className="text-[11px] text-[#B8B8B8]">Gym visits recorded in the last 7 days</p>
            </div>
            <CalendarCheck className="w-4 h-4 text-[#EB3E2E]" />
          </div>

          <div className="h-32 flex items-end justify-between gap-2 pt-2">
            {data?.charts?.dailyAttendanceChart?.map((day, idx) => {
              const maxAtt = Math.max(...data.charts.dailyAttendanceChart.map((d) => d.count), 5);
              const height = Math.max((day.count / maxAtt) * 100, 8);

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full max-w-[32px] rounded-t relative flex items-end h-24 overflow-hidden"
                    style={{ backgroundColor: chartTheme.track }}
                  >
                    <div
                      className="w-full rounded-t transition-all duration-500"
                      style={{ height: `${height}%`, backgroundColor: chartTheme.accent }}
                    />
                  </div>
                  <span className="text-[9px] font-mono" style={{ color: chartTheme.mutedText }}>{day.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Membership Status Distribution */}
        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3
                className="text-sm font-bold uppercase tracking-wider text-[#F5F5F5]"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                Membership Portfolio Breakdown
              </h3>
              <p className="text-[11px] text-[#B8B8B8]">Client status ratio across database</p>
            </div>
            <CreditCard className="w-4 h-4 text-[#EB3E2E]" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data?.charts?.membershipDistribution?.map((item, idx) => (
              <div key={idx} className="bg-[#202020] border border-[#303030] rounded-xl p-3 flex flex-col">
                <span className="text-[10px] font-mono text-[#B8B8B8] uppercase">{item.status}</span>
                <span
                  className="text-lg font-bold text-[#F5F5F5] mt-1"
                  style={{ fontFamily: "'Oswald', sans-serif" }}
                >
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ALERTS & RECENT ACTIVITY DUAL GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Alerts & Action Reminders (2 cols) */}
        <div className="lg:col-span-2 bg-[#181818] border border-[#303030] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <h3
                className="text-sm font-bold uppercase tracking-wider text-[#F5F5F5]"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                Critical Action Alerts &amp; Expirations
              </h3>
            </div>
            <span className="text-xs text-[#B8B8B8] font-mono">Real-time DB Monitor</span>
          </div>

          <div className="space-y-3">
            {/* 1. Expiring in 7 Days */}
            {data?.alerts?.expiringIn7Days?.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {data.alerts.expiringIn7Days.length} Memberships Expiring in &le; 7 Days
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('/admin/memberships')}
                    className="text-[11px] font-bold text-amber-300 hover:underline cursor-pointer"
                  >
                    View All &rarr;
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  {data.alerts.expiringIn7Days.slice(0, 4).map((m, i) => (
                    <div key={i} className="text-xs bg-[#111111] p-2 rounded-lg border border-amber-500/20 flex justify-between">
                      <span className="font-semibold text-[#F5F5F5] truncate">{m.userId?.name || 'Athlete'}</span>
                      <span className="text-amber-400 font-mono text-[11px]">
                        {new Date(m.expiryDate).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Pending Payments */}
            {data?.alerts?.pendingPayments?.length > 0 && (
              <div className="p-3.5 rounded-xl bg-[#EB3E2E]/10 border border-[#EB3E2E]/30 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#EB3E2E] uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {data.alerts.pendingPayments.length} Pending Payments Awaiting Clearance
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('/admin/payments')}
                    className="text-[11px] font-bold text-[#EB3E2E] hover:underline cursor-pointer"
                  >
                    Resolve &rarr;
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  {data.alerts.pendingPayments.slice(0, 4).map((p, i) => (
                    <div key={i} className="text-xs bg-[#111111] p-2 rounded-lg border border-[#EB3E2E]/30 flex justify-between">
                      <span className="font-semibold text-[#F5F5F5] truncate">{p.userId?.name || 'Client'}</span>
                      <span className="text-[#EB3E2E] font-mono font-bold">₹{p.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Zero Alerts Clean State */}
            {(!data?.alerts?.expiringIn7Days?.length &&
              !data?.alerts?.pendingPayments?.length) && (
              <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-green-400/80" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]">
                  All Operational Records Current
                </span>
                <span className="text-[11px] text-[#B8B8B8]">
                  No urgent expirations or pending payments require attention right now.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent Activity Timeline (1 col) */}
        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-sm font-bold uppercase tracking-wider text-[#F5F5F5]"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              Recent Gym Events
            </h3>
            <span className="text-[10px] font-mono text-[#EB3E2E] uppercase">Live Feed</span>
          </div>

          <div className="space-y-3.5">
            {data?.activities?.length > 0 ? (
              data.activities.map((act) => (
                <div key={act.id} className="flex items-start gap-3 border-l-2 border-[#303030] pl-3 py-0.5">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#F5F5F5]">{act.title}</span>
                    <span className="text-[11px] text-[#B8B8B8] mt-0.5">{act.description}</span>
                    <span className="text-[9px] font-mono text-[#EB3E2E] mt-1">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                      {new Date(act.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-[#B8B8B8]">No recent events recorded.</div>
            )}
          </div>
        </div>
      </div>

      {/* ── QUICK ACTION MODALS (portaled to body so fixed positioning is always viewport-centered) ── */}
      {quickAction && createPortal(
        <>
          {/* Modal 1: Add Client */}
          {quickAction === 'ADD_CLIENT' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#303030] rounded-2xl w-full max-w-md p-6 relative">
            <h3
              className="text-lg font-bold uppercase tracking-tight text-[#F5F5F5] mb-4"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              Quick Register Athlete
            </h3>

            {modalError && <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{modalError}</div>}
            {modalSuccess && <div className="p-3 mb-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs">{modalSuccess}</div>}

            <form onSubmit={handleQuickClientSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                  placeholder="e.g. Arun Vijay"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                    placeholder="athlete@domain.com"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Phone (Optional)</label>
                  <input
                    type="text"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                    placeholder="9876543210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Assigned Branch</label>
                <select
                  value={clientForm.branchId}
                  onChange={(e) => setClientForm({ ...clientForm, branchId: e.target.value })}
                  className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                >
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.city} ({b.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Fitness Goal</label>
                  <select
                    value={clientForm.fitnessGoal}
                    onChange={(e) => setClientForm({ ...clientForm, fitnessGoal: e.target.value })}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                  >
                    <option value="Muscle Building">Muscle Building</option>
                    <option value="Weight Loss">Weight Loss</option>
                    <option value="Strength Training">Strength Training</option>
                    <option value="General Fitness">General Fitness</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Password</label>
                  <input
                    type="text"
                    value={clientForm.password}
                    onChange={(e) => setClientForm({ ...clientForm, password: e.target.value })}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setQuickAction(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#202020] hover:bg-[#303030] text-[#B8B8B8] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#EB3E2E] hover:bg-[#FF493B] text-white cursor-pointer disabled:opacity-50"
                >
                  {modalLoading ? 'Saving...' : 'Register Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add Trainer */}
      {quickAction === 'ADD_TRAINER' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#303030] rounded-2xl w-full max-w-md p-6 relative">
            <h3
              className="text-lg font-bold uppercase tracking-tight text-[#F5F5F5] mb-4"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              Onboard Coach / Trainer
            </h3>

            {modalError && <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{modalError}</div>}
            {modalSuccess && <div className="p-3 mb-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs">{modalSuccess}</div>}

            <form onSubmit={handleQuickTrainerSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Coach Name</label>
                <input
                  type="text"
                  required
                  value={trainerForm.name}
                  onChange={(e) => setTrainerForm({ ...trainerForm, name: e.target.value })}
                  className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                  placeholder="e.g. Master Trainer Vignesh"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={trainerForm.email}
                    onChange={(e) => setTrainerForm({ ...trainerForm, email: e.target.value })}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                    placeholder="coach@manandmachine.com"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Phone</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    required
                    value={trainerForm.phone}
                    onChange={(e) => setTrainerForm({ ...trainerForm, phone: e.target.value })}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                    placeholder="9842100000 or +91 98421 00000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Branch</label>
                  <select
                    value={trainerForm.branchId}
                    onChange={(e) => setTrainerForm({ ...trainerForm, branchId: e.target.value })}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                  >
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.city}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    min="1"
                    value={trainerForm.experienceYears}
                    onChange={(e) => setTrainerForm({ ...trainerForm, experienceYears: e.target.value })}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Specialization</label>
                <input
                  type="text"
                  value={trainerForm.specialization}
                  onChange={(e) => setTrainerForm({ ...trainerForm, specialization: e.target.value })}
                  className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                  placeholder="e.g. Strength & Conditioning, Powerlifting"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setQuickAction(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#202020] hover:bg-[#303030] text-[#B8B8B8] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#EB3E2E] hover:bg-[#FF493B] text-white cursor-pointer disabled:opacity-50"
                >
                  {modalLoading ? 'Creating...' : 'Onboard Trainer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Create Membership */}
      {quickAction === 'CREATE_MEMBERSHIP' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#303030] rounded-2xl w-full max-w-md p-6 relative">
            <h3
              className="text-lg font-bold uppercase tracking-tight text-[#F5F5F5] mb-4"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              Assign Client Membership
            </h3>

            {modalError && <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{modalError}</div>}
            {modalSuccess && <div className="p-3 mb-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs">{modalSuccess}</div>}

            <form onSubmit={handleQuickMembershipSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Select Athlete *</label>
                <select
                  required
                  value={membershipForm.userId}
                  onChange={(e) => {
                    const uid = e.target.value;
                    const cl = allClientsList.find((c) => (c.id || c._id) === uid);
                    const bId = cl?.branch?._id || cl?.branchId || membershipForm.branchId;
                    const curPlan = plans.find((p) => p._id === membershipForm.planId) || plans[0];
                    const bp = curPlan?.branchPricing?.find(
                      (b) => (b.branchId?._id || b.branchId || '').toString() === (bId || '').toString()
                    );
                    setMembershipForm((prev) => ({
                      ...prev,
                      userId: uid,
                      branchId: bId,
                      amount: bp?.finalPrice !== undefined ? bp.finalPrice : (curPlan?.price || 2000),
                      isAvailable: bp ? bp.isAvailable : true,
                    }));
                  }}
                  className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                >
                  <option value="">-- Choose Client --</option>
                  {allClientsList.map((c) => (
                    <option key={c.id || c._id} value={c.id || c._id}>
                      {c.name} ({c.phone || c.email}) • {c.branch?.city || 'No branch'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Branch *</label>
                  <select
                    value={membershipForm.branchId}
                    onChange={(e) => {
                      const bId = e.target.value;
                      const curPlan = plans.find((p) => p._id === membershipForm.planId) || plans[0];
                      const bp = curPlan?.branchPricing?.find(
                        (b) => (b.branchId?._id || b.branchId || '').toString() === (bId || '').toString()
                      );
                      setMembershipForm((prev) => ({
                        ...prev,
                        branchId: bId,
                        amount: bp?.finalPrice !== undefined ? bp.finalPrice : (curPlan?.price || 2000),
                        isAvailable: bp ? bp.isAvailable : true,
                      }));
                    }}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                  >
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.city}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Plan *</label>
                  <select
                    value={membershipForm.planId}
                    onChange={(e) => {
                      const pId = e.target.value;
                      const curPlan = plans.find((p) => p._id === pId);
                      const bp = curPlan?.branchPricing?.find(
                        (b) => (b.branchId?._id || b.branchId || '').toString() === (membershipForm.branchId || '').toString()
                      );
                      setMembershipForm((prev) => ({
                        ...prev,
                        planId: pId,
                        planName: curPlan?.name || '',
                        durationDays: curPlan?.durationDays || 30,
                        durationMonths: curPlan?.durationMonths || 1,
                        amount: bp?.finalPrice !== undefined ? bp.finalPrice : (curPlan?.price || 2000),
                        isAvailable: bp ? bp.isAvailable : true,
                      }));
                    }}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                  >
                    {plans.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.durationDays ? `${p.durationDays}d` : `${p.durationMonths}m`})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!membershipForm.isAvailable && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  ⚠️ This plan is marked as disabled for this branch in Membership Plans.
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Confirmed Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={membershipForm.amount}
                  onChange={(e) => setMembershipForm({ ...membershipForm, amount: e.target.value })}
                  className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setQuickAction(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#202020] hover:bg-[#303030] text-[#B8B8B8] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading || !membershipForm.isAvailable}
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#EB3E2E] hover:bg-[#FF493B] text-white cursor-pointer disabled:opacity-50"
                >
                  {modalLoading ? 'Assigning...' : 'Assign Membership'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Record Payment */}
      {quickAction === 'RECORD_PAYMENT' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#303030] rounded-2xl w-full max-w-md p-6 relative">
            <h3
              className="text-lg font-bold uppercase tracking-tight text-[#F5F5F5] mb-4"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              Record Offline Gym Payment
            </h3>

            {modalError && <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{modalError}</div>}
            {modalSuccess && <div className="p-3 mb-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs">{modalSuccess}</div>}

            <form onSubmit={handleQuickPaymentSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Select Athlete</label>
                <select
                  required
                  value={paymentForm.userId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, userId: e.target.value })}
                  className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                >
                  <option value="">-- Choose Client --</option>
                  {allClientsList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone || c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                    placeholder="e.g. 5000"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Payment Method</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                  >
                    <option value="UPI">UPI (GPay / PhonePe)</option>
                    <option value="CASH">Cash at Desk</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="NET_BANKING">Net Banking Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Payment Description</label>
                <input
                  type="text"
                  required
                  value={paymentForm.description}
                  onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                  className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                  placeholder="e.g. Quarterly Gym Membership Renewal"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setQuickAction(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#202020] hover:bg-[#303030] text-[#B8B8B8] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#EB3E2E] hover:bg-[#FF493B] text-white cursor-pointer disabled:opacity-50"
                >
                  {modalLoading ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>,
        document.body
      )}
    </div>
  );
}
