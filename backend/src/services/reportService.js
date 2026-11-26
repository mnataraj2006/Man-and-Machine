const mongoose = require('mongoose');
const User = require('../models/User');
const ClientProfile = require('../models/ClientProfile');
const Membership = require('../models/Membership');
const MembershipPlan = require('../models/MembershipPlan');
const Attendance = require('../models/Attendance');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const TrainerProfile = require('../models/TrainerProfile');
const TrainerBooking = require('../models/TrainerBooking');
const TrainingAppointment = require('../models/TrainingAppointment');
const Enquiry = require('../models/Enquiry');
const Branch = require('../models/Branch');
const {
  IST_TIMEZONE,
  getKolkataParts,
  getKolkataDayRange,
  addKolkataDays,
  getKolkataMonthRange,
  getKolkataYearRange,
} = require('./financeService');

const roundMoney = (val) => Math.round((Number(val) || 0) * 100) / 100;

/**
 * Resolves date range in Asia/Kolkata from preset or explicit from/to query params.
 */
const resolveReportDateRange = ({ preset = 'this_month', from, to } = {}) => {
  const todayStr = getKolkataParts().dateStr;
  const nowParts = getKolkataParts();

  if (from || to) {
    const startStr = (from || todayStr).slice(0, 10);
    const endStr = (to || todayStr).slice(0, 10);
    return {
      preset: 'custom',
      startDateStr: startStr,
      endDateStr: endStr,
      start: new Date(`${startStr}T00:00:00+05:30`),
      end: new Date(`${endStr}T23:59:59.999+05:30`),
    };
  }

  switch (preset) {
    case 'today': {
      const r = getKolkataDayRange(todayStr);
      return { preset, startDateStr: todayStr, endDateStr: todayStr, start: r.start, end: r.end };
    }
    case 'yesterday': {
      const yStr = addKolkataDays(todayStr, -1);
      const r = getKolkataDayRange(yStr);
      return { preset, startDateStr: yStr, endDateStr: yStr, start: r.start, end: r.end };
    }
    case 'this_week': {
      // Monday to today in IST
      const d = new Date(`${todayStr}T12:00:00+05:30`);
      const dayOfWeek = d.getUTCDay(); // 0=Sun, 1=Mon
      const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const startStr = addKolkataDays(todayStr, diffToMon);
      return {
        preset,
        startDateStr: startStr,
        endDateStr: todayStr,
        start: new Date(`${startStr}T00:00:00+05:30`),
        end: new Date(`${todayStr}T23:59:59.999+05:30`),
      };
    }
    case 'last_month': {
      const prevMonth = nowParts.month === 1 ? 12 : nowParts.month - 1;
      const prevYear = nowParts.month === 1 ? nowParts.year - 1 : nowParts.year;
      const r = getKolkataMonthRange(prevYear, prevMonth);
      return {
        preset,
        startDateStr: getKolkataParts(r.start).dateStr,
        endDateStr: getKolkataParts(r.end).dateStr,
        start: r.start,
        end: r.end,
      };
    }
    case 'this_year': {
      const r = getKolkataYearRange(nowParts.year);
      return {
        preset,
        startDateStr: `${nowParts.year}-01-01`,
        endDateStr: `${nowParts.year}-12-31`,
        start: r.start,
        end: r.end,
      };
    }
    case 'this_month':
    default: {
      const r = getKolkataMonthRange(nowParts.year, nowParts.month);
      return {
        preset: 'this_month',
        startDateStr: getKolkataParts(r.start).dateStr,
        endDateStr: getKolkataParts(r.end).dateStr,
        start: r.start,
        end: r.end,
      };
    }
  }
};

const toObjectId = (id) => {
  if (!id || id === 'ALL' || !mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
};

const resolveBranchFilter = (reqUser, requestedBranchId) => {
  // Enforce branch scope if user is not ADMIN and has a branchId
  if (reqUser && reqUser.role !== 'ADMIN' && reqUser.branchId) {
    const scopedId = reqUser.branchId._id || reqUser.branchId;
    return toObjectId(scopedId);
  }
  return toObjectId(requestedBranchId);
};

const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// ==========================================
// DASHBOARD SUMMARY (8 KPIs)
// ==========================================
const getReportsSummary = async (query, reqUser) => {
  const branchObjId = resolveBranchFilter(reqUser, query.branchId);
  const branchCond = branchObjId ? { branchId: branchObjId } : {};

  const nowParts = getKolkataParts();
  const todayRange = getKolkataDayRange(nowParts.dateStr);
  const monthRange = getKolkataMonthRange(nowParts.year, nowParts.month);

  const [
    totalMembers,
    activeMemberships,
    todaysAttendance,
    monthPaidAgg,
    monthRefundAgg,
    pendingInvoicesAgg,
    monthExpensesAgg,
    newLeads,
  ] = await Promise.all([
    ClientProfile.countDocuments(branchCond),
    Membership.countDocuments({
      ...branchCond,
      status: 'ACTIVE',
      expiryDate: { $gte: new Date() },
    }),
    Attendance.countDocuments({
      ...branchCond,
      date: { $gte: todayRange.start, $lte: todayRange.end },
    }),
    Payment.aggregate([
      {
        $match: {
          ...branchCond,
          status: 'PAID',
          date: { $gte: monthRange.start, $lte: monthRange.end },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      {
        $match: {
          ...branchCond,
          status: 'REFUNDED',
          date: { $gte: monthRange.start, $lte: monthRange.end },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Invoice.aggregate([
      {
        $match: {
          ...branchCond,
          status: { $in: ['PENDING', 'PARTIALLY_PAID'] },
          balanceAmount: { $gt: 0 },
        },
      },
      { $group: { _id: null, total: { $sum: '$balanceAmount' } } },
    ]),
    Expense.aggregate([
      {
        $match: {
          ...branchCond,
          status: 'ACTIVE',
          expenseDate: { $gte: monthRange.start, $lte: monthRange.end },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Enquiry.countDocuments({
      ...branchCond,
      status: 'NEW',
    }),
  ]);

  const monthlyRevenue = roundMoney(monthPaidAgg[0]?.total || 0);
  const monthlyRefunds = roundMoney(monthRefundAgg[0]?.total || 0);
  const pendingBalance = roundMoney(pendingInvoicesAgg[0]?.total || 0);
  const monthlyExpenses = roundMoney(monthExpensesAgg[0]?.total || 0);
  const netRevenue = roundMoney(monthlyRevenue - monthlyRefunds - monthlyExpenses);

  return {
    totalMembers,
    activeMemberships,
    todaysAttendance,
    monthlyRevenue,
    pendingBalance,
    monthlyExpenses,
    netRevenue,
    newLeads,
  };
};

// ==========================================
// 1. MEMBER REPORTS
// ==========================================
const getMemberReport = async (query, reqUser) => {
  const dateRange = resolveReportDateRange(query);
  const branchObjId = resolveBranchFilter(reqUser, query.branchId);
  const trainerObjId = toObjectId(query.trainerId);
  const { page, limit, skip } = parsePagination(query);

  const baseMatch = {};
  if (branchObjId) baseMatch.branchId = branchObjId;
  if (trainerObjId) baseMatch.trainerId = trainerObjId;

  const profiles = await ClientProfile.find(baseMatch)
    .populate('userId', 'name email phone status createdAt')
    .populate('branchId', 'name city code')
    .populate('trainerId', 'name')
    .sort({ createdAt: -1 })
    .lean();

  // Fetch latest membership per client (by userId or clientProfileId)
  const memberships = await Membership.find(branchObjId ? { branchId: branchObjId } : {})
    .sort({ expiryDate: -1 })
    .lean();

  const memByUser = new Map();
  const memByProfile = new Map();
  for (const m of memberships) {
    if (m.userId && !memByUser.has(String(m.userId))) memByUser.set(String(m.userId), m);
    if (m.clientProfileId && !memByProfile.has(String(m.clientProfileId))) {
      memByProfile.set(String(m.clientProfileId), m);
    }
  }

  const now = new Date();
  let enriched = profiles.map((p) => {
    const userObj = p.userId;
    const latestMem = (userObj && memByUser.get(String(userObj._id))) || memByProfile.get(String(p._id)) || null;
    const accountStatus = userObj ? userObj.status : p.accountAccessStatus || 'NOT_CREATED';
    const isActiveAccount = userObj ? userObj.status === 'ACTIVE' : true;
    const memStatus = !latestMem
      ? 'NO_MEMBERSHIP'
      : latestMem.status === 'ACTIVE' && new Date(latestMem.expiryDate) < now
      ? 'EXPIRED'
      : latestMem.status;

    return {
      id: p._id,
      userId: userObj?._id || null,
      name: p.name || userObj?.name || 'Unnamed',
      phone: p.phone || userObj?.phone || '',
      email: p.email || userObj?.email || '',
      branch: p.branchId?.city || p.branchId?.name || '—',
      branchId: p.branchId?._id || null,
      trainer: p.trainerId?.name || 'Unassigned',
      accountStatus,
      isActiveAccount,
      registrationSource: p.registrationSource || 'SELF_REGISTERED',
      membershipStatus: memStatus,
      planName: latestMem?.planName || 'None',
      joinedAt: p.joiningDate || p.createdAt,
    };
  });

  // Apply status & membershipStatus filters
  if (query.status && query.status !== 'ALL') {
    enriched = enriched.filter((c) => c.accountStatus === query.status);
  }
  if (query.membershipStatus && query.membershipStatus !== 'ALL') {
    enriched = enriched.filter((c) => c.membershipStatus === query.membershipStatus);
  }

  // Date-filtered new registrations
  const newRegistrationsList = enriched.filter((c) => {
    const d = new Date(c.joinedAt);
    return d >= dateRange.start && d <= dateRange.end;
  });

  // KPIs
  const totalClients = enriched.length;
  const activeClients = enriched.filter((c) => c.isActiveAccount).length;
  const inactiveClients = totalClients - activeClients;
  const newRegistrations = newRegistrationsList.length;
  const withoutMembership = enriched.filter((c) => c.membershipStatus === 'NO_MEMBERSHIP').length;
  const withActiveMembership = enriched.filter((c) => c.membershipStatus === 'ACTIVE').length;
  const withExpiredMembership = enriched.filter((c) => c.membershipStatus === 'EXPIRED').length;

  // Branch-wise client count
  const branchMap = {};
  for (const c of enriched) {
    const bName = c.branch || 'Unknown';
    branchMap[bName] = (branchMap[bName] || 0) + 1;
  }
  const branchBreakdown = Object.entries(branchMap).map(([label, count]) => ({ label, value: count }));

  // Registration trend (IST daily buckets within range)
  const trendMap = {};
  for (const c of newRegistrationsList) {
    const dStr = getKolkataParts(c.joinedAt).dateStr;
    trendMap[dStr] = (trendMap[dStr] || 0) + 1;
  }
  const registrationTrend = Object.entries(trendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ label: date, value: count }));

  const totalRows = enriched.length;
  const rows = enriched.slice(skip, skip + limit);

  return {
    dateRange: { from: dateRange.startDateStr, to: dateRange.endDateStr, preset: dateRange.preset },
    kpis: {
      totalClients,
      activeClients,
      inactiveClients,
      newRegistrations,
      withoutMembership,
      withActiveMembership,
      withExpiredMembership,
    },
    charts: {
      branchBreakdown,
      registrationTrend,
    },
    table: {
      rows,
      total: totalRows,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(totalRows / limit)),
    },
  };
};

// ==========================================
// 2. MEMBERSHIP REPORTS
// ==========================================
const getMembershipReport = async (query, reqUser) => {
  const dateRange = resolveReportDateRange(query);
  const branchObjId = resolveBranchFilter(reqUser, query.branchId);
  const planObjId = toObjectId(query.planId);
  const { page, limit, skip } = parsePagination(query);

  const matchAll = {};
  if (branchObjId) matchAll.branchId = branchObjId;
  if (planObjId) matchAll.planId = planObjId;
  if (query.status && query.status !== 'ALL') matchAll.status = query.status;

  const allMemberships = await Membership.find(matchAll)
    .populate('userId', 'name phone email')
    .populate('clientProfileId', 'name phone email')
    .populate('branchId', 'name city code')
    .sort({ createdAt: -1 })
    .lean();

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Date-filtered memberships (created or started in range)
  const periodMemberships = allMemberships.filter((m) => {
    const d = new Date(m.startDate || m.createdAt);
    return d >= dateRange.start && d <= dateRange.end;
  });

  const totalMemberships = allMemberships.length;
  const activeMemberships = allMemberships.filter(
    (m) => m.status === 'ACTIVE' && new Date(m.expiryDate) >= now
  ).length;
  const expiredMemberships = allMemberships.filter(
    (m) => m.status === 'EXPIRED' || (m.status === 'ACTIVE' && new Date(m.expiryDate) < now)
  ).length;
  const pendingMemberships = allMemberships.filter((m) =>
    ['PENDING', 'PENDING_PAYMENT'].includes(m.status)
  ).length;
  const cancelledMemberships = allMemberships.filter((m) => m.status === 'CANCELLED').length;
  const expiringSoon = allMemberships.filter(
    (m) => m.status === 'ACTIVE' && new Date(m.expiryDate) >= now && new Date(m.expiryDate) <= in7Days
  ).length;

  // Plan distribution
  const planMap = {};
  for (const m of allMemberships) {
    const pName = m.planName || 'Custom';
    planMap[pName] = (planMap[pName] || 0) + 1;
  }
  const planDistribution = Object.entries(planMap)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));

  // Branch-wise memberships
  const branchMap = {};
  for (const m of allMemberships) {
    const bName = m.branchId?.city || m.branchId?.name || 'Unknown';
    branchMap[bName] = (branchMap[bName] || 0) + 1;
  }
  const branchBreakdown = Object.entries(branchMap).map(([label, value]) => ({ label, value }));

  // New vs Renewed (from Invoices in range or renewal flag)
  const [newCount, renewalCount] = await Promise.all([
    Invoice.countDocuments({
      ...(branchObjId ? { branchId: branchObjId } : {}),
      category: 'MEMBERSHIP_PURCHASE',
      status: { $ne: 'CANCELLED' },
      invoiceDate: { $gte: dateRange.start, $lte: dateRange.end },
    }),
    Invoice.countDocuments({
      ...(branchObjId ? { branchId: branchObjId } : {}),
      category: 'MEMBERSHIP_RENEWAL',
      status: { $ne: 'CANCELLED' },
      invoiceDate: { $gte: dateRange.start, $lte: dateRange.end },
    }),
  ]);

  // Expiry trend in date range
  const expiryMap = {};
  for (const m of allMemberships) {
    if (!m.expiryDate) continue;
    const exp = new Date(m.expiryDate);
    if (exp >= dateRange.start && exp <= dateRange.end) {
      const dStr = getKolkataParts(exp).dateStr;
      expiryMap[dStr] = (expiryMap[dStr] || 0) + 1;
    }
  }
  const expiryTrend = Object.entries(expiryMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));

  const mappedRows = periodMemberships.map((m) => ({
    id: m._id,
    clientName: m.userId?.name || m.clientProfileId?.name || 'Walk-in',
    phone: m.userId?.phone || m.clientProfileId?.phone || '',
    branch: m.branchId?.city || m.branchId?.name || '—',
    planName: m.planName,
    status: m.status,
    startDate: m.startDate,
    expiryDate: m.expiryDate,
    finalAmount: m.finalAmount || m.amount || 0,
  }));

  return {
    dateRange: { from: dateRange.startDateStr, to: dateRange.endDateStr, preset: dateRange.preset },
    kpis: {
      totalMemberships,
      activeMemberships,
      expiredMemberships,
      pendingMemberships,
      cancelledMemberships,
      expiringSoon,
      newInPeriod: newCount,
      renewedInPeriod: renewalCount,
    },
    charts: {
      planDistribution,
      branchBreakdown,
      expiryTrend,
      newVsRenewed: [
        { label: 'New', value: newCount },
        { label: 'Renewed', value: renewalCount },
      ],
    },
    table: {
      rows: mappedRows.slice(skip, skip + limit),
      total: mappedRows.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(mappedRows.length / limit)),
    },
  };
};

// ==========================================
// 3. ATTENDANCE REPORTS
// ==========================================
const getAttendanceReport = async (query, reqUser) => {
  const dateRange = resolveReportDateRange(query);
  const branchObjId = resolveBranchFilter(reqUser, query.branchId);
  const clientObjId = toObjectId(query.clientId);
  const trainerObjId = toObjectId(query.trainerId);
  const { page, limit, skip } = parsePagination(query);

  const nowParts = getKolkataParts();
  const todayRange = getKolkataDayRange(nowParts.dateStr);
  const monthRange = getKolkataMonthRange(nowParts.year, nowParts.month);

  let trainerClientUserIds = null;
  let trainerClientProfileIds = null;
  if (trainerObjId) {
    const tProfiles = await ClientProfile.find({ trainerId: trainerObjId }).select('_id userId').lean();
    trainerClientProfileIds = tProfiles.map((p) => p._id);
    trainerClientUserIds = tProfiles.map((p) => p.userId).filter(Boolean);
  }

  const attMatch = {
    date: { $gte: dateRange.start, $lte: dateRange.end },
  };
  if (branchObjId) attMatch.branchId = branchObjId;
  if (clientObjId) {
    attMatch.$or = [{ userId: clientObjId }, { clientProfileId: clientObjId }];
  } else if (trainerObjId) {
    attMatch.$or = [
      { userId: { $in: trainerClientUserIds } },
      { clientProfileId: { $in: trainerClientProfileIds } },
    ];
  }

  const [periodRecords, todaysAttendance, monthlyAttendance, activeMembersCount] = await Promise.all([
    Attendance.find(attMatch)
      .populate('userId', 'name phone')
      .populate('clientProfileId', 'name phone')
      .populate('branchId', 'name city')
      .sort({ checkInTime: -1 })
      .lean(),
    Attendance.countDocuments({
      ...(branchObjId ? { branchId: branchObjId } : {}),
      date: { $gte: todayRange.start, $lte: todayRange.end },
    }),
    Attendance.countDocuments({
      ...(branchObjId ? { branchId: branchObjId } : {}),
      date: { $gte: monthRange.start, $lte: monthRange.end },
    }),
    Membership.countDocuments({
      ...(branchObjId ? { branchId: branchObjId } : {}),
      status: 'ACTIVE',
      expiryDate: { $gte: new Date() },
    }),
  ]);

  const totalAttendance = periodRecords.length;

  // Daily trend & member frequency
  const dailyMap = {};
  const branchMap = {};
  const memberFreq = new Map();

  for (const r of periodRecords) {
    const dStr = getKolkataParts(r.date).dateStr;
    dailyMap[dStr] = (dailyMap[dStr] || 0) + 1;

    const bName = r.branchId?.city || r.branchId?.name || 'Unknown';
    branchMap[bName] = (branchMap[bName] || 0) + 1;

    const key = String(r.userId?._id || r.clientProfileId?._id || r._id);
    const name = r.userId?.name || r.clientProfileId?.name || 'Walk-in';
    if (!memberFreq.has(key)) memberFreq.set(key, { id: key, name, visits: 0 });
    memberFreq.get(key).visits += 1;
  }

  const uniqueAttendees = memberFreq.size;
  const attendancePercentage =
    activeMembersCount > 0 ? Math.min(100, roundMoney((uniqueAttendees / activeMembersCount) * 100)) : 0;

  const lowAttendanceMembers = Array.from(memberFreq.values())
    .filter((m) => m.visits <= 2)
    .sort((a, b) => a.visits - b.visits)
    .slice(0, 15);

  const dailyTrend = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));

  const branchBreakdown = Object.entries(branchMap).map(([label, value]) => ({ label, value }));

  const rows = periodRecords.slice(skip, skip + limit).map((r) => ({
    id: r._id,
    clientName: r.userId?.name || r.clientProfileId?.name || 'Walk-in',
    phone: r.userId?.phone || r.clientProfileId?.phone || '',
    branch: r.branchId?.city || r.branchId?.name || '—',
    date: r.date,
    checkInTime: r.checkInTime,
    checkOutTime: r.checkOutTime,
    method: r.method,
  }));

  return {
    dateRange: { from: dateRange.startDateStr, to: dateRange.endDateStr, preset: dateRange.preset },
    kpis: {
      totalAttendance,
      todaysAttendance,
      monthlyAttendance,
      uniqueAttendees,
      attendancePercentage,
      lowAttendanceCount: lowAttendanceMembers.length,
    },
    charts: {
      dailyTrend,
      branchBreakdown,
    },
    lowAttendanceMembers,
    table: {
      rows,
      total: totalAttendance,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(totalAttendance / limit)),
    },
  };
};

// ==========================================
// 4. REVENUE REPORTS (Consistent with financeService)
// ==========================================
const getRevenueReport = async (query, reqUser) => {
  const dateRange = resolveReportDateRange(query);
  const branchObjId = resolveBranchFilter(reqUser, query.branchId);
  const planObjId = toObjectId(query.planId);
  const { page, limit, skip } = parsePagination(query);

  const branchCond = branchObjId ? { branchId: branchObjId } : {};

  const nowParts = getKolkataParts();
  const todayRange = getKolkataDayRange(nowParts.dateStr);
  const monthRange = getKolkataMonthRange(nowParts.year, nowParts.month);

  const [
    periodInvoices,
    periodPaidPayments,
    periodRefundedPayments,
    pendingInvoices,
    periodExpenses,
    dailyPaid,
    monthlyPaid,
    branches,
  ] = await Promise.all([
    Invoice.find({
      ...branchCond,
      status: { $nin: ['CANCELLED', 'REFUNDED'] },
      invoiceDate: { $gte: dateRange.start, $lte: dateRange.end },
    })
      .populate('branchId', 'name city')
      .populate('membershipId', 'planId planName')
      .populate('clientId', 'name')
      .populate('clientProfileId', 'name')
      .sort({ invoiceDate: -1 })
      .lean(),
    Payment.find({
      ...branchCond,
      status: 'PAID',
      date: { $gte: dateRange.start, $lte: dateRange.end },
    })
      .populate('branchId', 'name city')
      .lean(),
    Payment.find({
      ...branchCond,
      status: 'REFUNDED',
      date: { $gte: dateRange.start, $lte: dateRange.end },
    }).lean(),
    Invoice.find({
      ...branchCond,
      status: { $in: ['PENDING', 'PARTIALLY_PAID'] },
      balanceAmount: { $gt: 0 },
    }).lean(),
    Expense.find({
      ...branchCond,
      status: 'ACTIVE',
      expenseDate: { $gte: dateRange.start, $lte: dateRange.end },
    }).lean(),
    Payment.aggregate([
      { $match: { ...branchCond, status: 'PAID', date: { $gte: todayRange.start, $lte: todayRange.end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { ...branchCond, status: 'PAID', date: { $gte: monthRange.start, $lte: monthRange.end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Branch.find({ isActive: true }).lean(),
  ]);

  const filteredInvoices = planObjId
    ? periodInvoices.filter((inv) => String(inv.membershipId?.planId) === String(planObjId))
    : periodInvoices;

  const grossRevenue = roundMoney(filteredInvoices.reduce((s, i) => s + (i.totalAmount || 0), 0));
  const collectedRevenue = roundMoney(periodPaidPayments.reduce((s, p) => s + (p.amount || 0), 0));
  const refunds = roundMoney(periodRefundedPayments.reduce((s, p) => s + (p.amount || 0), 0));
  const pendingBalance = roundMoney(pendingInvoices.reduce((s, i) => s + (i.balanceAmount || 0), 0));
  const totalExpenses = roundMoney(periodExpenses.reduce((s, e) => s + (e.amount || 0), 0));
  const netRevenue = roundMoney(collectedRevenue - refunds - totalExpenses);

  // Daily revenue trend
  const dailyMap = {};
  const branchRevMap = {};
  for (const p of periodPaidPayments) {
    const dStr = getKolkataParts(p.date).dateStr;
    dailyMap[dStr] = roundMoney((dailyMap[dStr] || 0) + (p.amount || 0));
    const bName = p.branchId?.city || p.branchId?.name || 'Unknown';
    branchRevMap[bName] = roundMoney((branchRevMap[bName] || 0) + (p.amount || 0));
  }

  const revenueTrend = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));

  const branchBreakdown = branches
    .filter((b) => !branchObjId || String(b._id) === String(branchObjId))
    .map((b) => ({
      label: b.city || b.name,
      value: branchRevMap[b.city] || branchRevMap[b.name] || 0,
    }));

  // Revenue by membership plan (from invoices)
  const planRevMap = {};
  for (const inv of filteredInvoices) {
    const pName = inv.membershipId?.planName || inv.category || 'Other';
    planRevMap[pName] = roundMoney((planRevMap[pName] || 0) + (inv.paidAmount || 0));
  }
  const revenueByPlan = Object.entries(planRevMap)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));

  const rows = filteredInvoices.slice(skip, skip + limit).map((inv) => ({
    id: inv._id,
    invoiceNumber: inv.invoiceNumber,
    clientName: inv.clientId?.name || inv.clientProfileId?.name || 'Walk-in',
    branch: inv.branchId?.city || inv.branchId?.name || '—',
    category: inv.category,
    totalAmount: inv.totalAmount,
    paidAmount: inv.paidAmount || 0,
    balanceAmount: inv.balanceAmount || 0,
    status: inv.status,
    invoiceDate: inv.invoiceDate,
  }));

  return {
    dateRange: { from: dateRange.startDateStr, to: dateRange.endDateStr, preset: dateRange.preset },
    kpis: {
      grossRevenue,
      collectedRevenue,
      pendingBalance,
      refunds,
      totalExpenses,
      netRevenue,
      dailyRevenue: roundMoney(dailyPaid[0]?.total || 0),
      monthlyRevenue: roundMoney(monthlyPaid[0]?.total || 0),
    },
    charts: {
      revenueTrend,
      branchBreakdown,
      revenueByPlan,
    },
    table: {
      rows,
      total: filteredInvoices.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(filteredInvoices.length / limit)),
    },
  };
};

// ==========================================
// 5. PAYMENT REPORTS
// ==========================================
const getPaymentReport = async (query, reqUser) => {
  const dateRange = resolveReportDateRange(query);
  const branchObjId = resolveBranchFilter(reqUser, query.branchId);
  const clientObjId = toObjectId(query.clientId);
  const { page, limit, skip } = parsePagination(query);

  const match = {
    date: { $gte: dateRange.start, $lte: dateRange.end },
  };
  if (branchObjId) match.branchId = branchObjId;
  if (query.status && query.status !== 'ALL') match.status = query.status;
  if (query.paymentMethod && query.paymentMethod !== 'ALL') {
    match.paymentMethod = query.paymentMethod.toUpperCase();
  }
  if (clientObjId) {
    match.$or = [{ userId: clientObjId }, { clientProfileId: clientObjId }];
  }

  const [payments, partialInvoicesCount, outstandingAgg] = await Promise.all([
    Payment.find(match)
      .populate('userId', 'name phone')
      .populate('clientProfileId', 'name phone')
      .populate('branchId', 'name city')
      .populate('invoiceId', 'invoiceNumber')
      .sort({ date: -1 })
      .lean(),
    Invoice.countDocuments({
      ...(branchObjId ? { branchId: branchObjId } : {}),
      status: 'PARTIALLY_PAID',
      invoiceDate: { $gte: dateRange.start, $lte: dateRange.end },
    }),
    Invoice.aggregate([
      {
        $match: {
          ...(branchObjId ? { branchId: branchObjId } : {}),
          status: { $in: ['PENDING', 'PARTIALLY_PAID'] },
          balanceAmount: { $gt: 0 },
        },
      },
      { $group: { _id: null, total: { $sum: '$balanceAmount' }, count: { $sum: 1 } } },
    ]),
  ]);

  const paidPayments = payments.filter((p) => p.status === 'PAID');
  const pendingPayments = payments.filter((p) => p.status === 'PENDING');
  const refundedPayments = payments.filter((p) => p.status === 'REFUNDED');

  const methodMap = { CASH: 0, UPI: 0, CARD: 0, BANK_TRANSFER: 0, ONLINE: 0, OTHER: 0 };
  const dailyMap = {};

  for (const p of paidPayments) {
    const mCode = (p.paymentMethod || 'OTHER').toUpperCase();
    methodMap[mCode] = roundMoney((methodMap[mCode] || 0) + (p.amount || 0));
    const dStr = getKolkataParts(p.date).dateStr;
    dailyMap[dStr] = roundMoney((dailyMap[dStr] || 0) + (p.amount || 0));
  }

  const paymentMethodBreakdown = Object.entries(methodMap)
    .filter(([, val]) => val > 0)
    .map(([label, value]) => ({ label, value }));

  const paymentTrend = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));

  const rows = payments.slice(skip, skip + limit).map((p) => ({
    id: p._id,
    transactionId: p.transactionId,
    receiptNumber: p.receiptNumber || '—',
    invoiceNumber: p.invoiceId?.invoiceNumber || '—',
    clientName: p.userId?.name || p.clientProfileId?.name || 'Walk-in',
    branch: p.branchId?.city || p.branchId?.name || '—',
    amount: p.amount,
    paymentMethod: p.paymentMethod,
    status: p.status,
    date: p.date,
  }));

  return {
    dateRange: { from: dateRange.startDateStr, to: dateRange.endDateStr, preset: dateRange.preset },
    kpis: {
      totalPayments: payments.length,
      paidCount: paidPayments.length,
      paidAmount: roundMoney(paidPayments.reduce((s, p) => s + (p.amount || 0), 0)),
      partiallyPaidInvoices: partialInvoicesCount,
      pendingCount: pendingPayments.length,
      refundedCount: refundedPayments.length,
      refundedAmount: roundMoney(refundedPayments.reduce((s, p) => s + (p.amount || 0), 0)),
      outstandingBalances: roundMoney(outstandingAgg[0]?.total || 0),
    },
    charts: {
      paymentMethodBreakdown,
      paymentTrend,
    },
    table: {
      rows,
      total: payments.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(payments.length / limit)),
    },
  };
};

// ==========================================
// 6. EXPENSE REPORTS
// ==========================================
const getExpenseReport = async (query, reqUser) => {
  const dateRange = resolveReportDateRange(query);
  const branchObjId = resolveBranchFilter(reqUser, query.branchId);
  const { page, limit, skip } = parsePagination(query);

  const match = {
    status: 'ACTIVE',
    expenseDate: { $gte: dateRange.start, $lte: dateRange.end },
  };
  if (branchObjId) match.branchId = branchObjId;
  if (query.category && query.category !== 'ALL') match.category = query.category;
  if (query.paymentMethod && query.paymentMethod !== 'ALL') {
    match.paymentMethod = query.paymentMethod.toUpperCase();
  }

  const nowParts = getKolkataParts();
  const todayRange = getKolkataDayRange(nowParts.dateStr);
  const monthRange = getKolkataMonthRange(nowParts.year, nowParts.month);
  const branchCond = branchObjId ? { branchId: branchObjId } : {};

  const [expenses, dailyAgg, monthlyAgg] = await Promise.all([
    Expense.find(match).populate('branchId', 'name city').sort({ expenseDate: -1 }).lean(),
    Expense.aggregate([
      { $match: { ...branchCond, status: 'ACTIVE', expenseDate: { $gte: todayRange.start, $lte: todayRange.end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Expense.aggregate([
      { $match: { ...branchCond, status: 'ACTIVE', expenseDate: { $gte: monthRange.start, $lte: monthRange.end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const totalExpenses = roundMoney(expenses.reduce((s, e) => s + (e.amount || 0), 0));

  const catMap = {};
  const branchMap = {};
  const trendMap = {};
  const vendorMap = {};

  for (const e of expenses) {
    const cat = e.category || 'Uncategorized';
    catMap[cat] = roundMoney((catMap[cat] || 0) + (e.amount || 0));

    const bName = e.branchId?.city || e.branchId?.name || 'Unknown';
    branchMap[bName] = roundMoney((branchMap[bName] || 0) + (e.amount || 0));

    const dStr = getKolkataParts(e.expenseDate).dateStr;
    trendMap[dStr] = roundMoney((trendMap[dStr] || 0) + (e.amount || 0));

    if (e.vendor && e.vendor.trim()) {
      const v = e.vendor.trim();
      vendorMap[v] = roundMoney((vendorMap[v] || 0) + (e.amount || 0));
    }
  }

  const categoryBreakdown = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));

  const branchBreakdown = Object.entries(branchMap).map(([label, value]) => ({ label, value }));
  const expenseTrend = Object.entries(trendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));
  const vendorBreakdown = Object.entries(vendorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([label, value]) => ({ label, value }));

  const rows = expenses.slice(skip, skip + limit).map((e) => ({
    id: e._id,
    expenseNumber: e.expenseNumber || '—',
    category: e.category,
    description: e.description,
    vendor: e.vendor || '—',
    branch: e.branchId?.city || e.branchId?.name || '—',
    paymentMethod: e.paymentMethod,
    amount: e.amount,
    expenseDate: e.expenseDate,
  }));

  return {
    dateRange: { from: dateRange.startDateStr, to: dateRange.endDateStr, preset: dateRange.preset },
    kpis: {
      totalExpenses,
      expenseCount: expenses.length,
      dailyExpenses: roundMoney(dailyAgg[0]?.total || 0),
      monthlyExpenses: roundMoney(monthlyAgg[0]?.total || 0),
      topCategory: categoryBreakdown[0]?.label || 'None',
      topCategoryAmount: categoryBreakdown[0]?.value || 0,
    },
    charts: {
      categoryBreakdown,
      branchBreakdown,
      expenseTrend,
      vendorBreakdown,
    },
    table: {
      rows,
      total: expenses.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(expenses.length / limit)),
    },
  };
};

// ==========================================
// 7. TRAINER REPORTS
// ==========================================
const getTrainerReport = async (query, reqUser) => {
  const dateRange = resolveReportDateRange(query);
  const branchObjId = resolveBranchFilter(reqUser, query.branchId);
  const requestedTrainerId = toObjectId(query.trainerId);
  const { page, limit, skip } = parsePagination(query);

  // If a TRAINER accesses this, force scope to their own User ID
  const scopedTrainerId =
    reqUser && reqUser.role === 'TRAINER' ? reqUser._id : requestedTrainerId;

  const userMatch = { role: 'TRAINER' };
  if (branchObjId) userMatch.branchId = branchObjId;
  if (scopedTrainerId) userMatch._id = scopedTrainerId;
  if (query.status && query.status !== 'ALL') userMatch.status = query.status;

  const trainers = await User.find(userMatch)
    .select('name email phone status branchId createdAt')
    .populate('branchId', 'name city')
    .lean();

  const trainerIds = trainers.map((t) => t._id);

  const [profiles, assignedClients, bookings, appointments] = await Promise.all([
    TrainerProfile.find({ userId: { $in: trainerIds } }).lean(),
    ClientProfile.find({ trainerId: { $in: trainerIds } }).select('trainerId userId').lean(),
    TrainerBooking.find({
      trainerId: { $in: trainerIds },
      date: { $gte: dateRange.start, $lte: dateRange.end },
    }).lean(),
    TrainingAppointment.find({
      trainerId: { $in: trainerIds },
      date: { $gte: dateRange.start, $lte: dateRange.end },
    }).lean(),
  ]);

  const profileMap = new Map(profiles.map((p) => [String(p.userId), p]));

  const rowsAll = trainers.map((t) => {
    const tid = String(t._id);
    const tp = profileMap.get(tid);
    const tClients = assignedClients.filter((c) => String(c.trainerId) === tid);
    const tBookings = bookings.filter((b) => String(b.trainerId) === tid);
    const tAppts = appointments.filter((a) => String(a.trainerId) === tid);

    const sessionsCompleted =
      tBookings.filter((b) => b.bookingStatus === 'COMPLETED').length +
      tAppts.filter((a) => a.status === 'COMPLETED').length;
    const sessionsScheduled =
      tBookings.filter((b) => ['CONFIRMED', 'PENDING_PAYMENT'].includes(b.bookingStatus)).length +
      tAppts.filter((a) => ['SCHEDULED', 'RESCHEDULED'].includes(a.status)).length;

    return {
      id: t._id,
      name: t.name,
      branch: t.branchId?.city || t.branchId?.name || '—',
      status: t.status,
      specialization: tp?.specialization || 'General',
      assignedClients: tClients.length,
      sessionsCompleted,
      sessionsScheduled,
      totalWorkload: sessionsCompleted + sessionsScheduled,
    };
  });

  const activeTrainers = trainers.filter((t) => t.status === 'ACTIVE').length;
  const totalAssignedClients = rowsAll.reduce((s, r) => s + r.assignedClients, 0);
  const totalSessionsCompleted = rowsAll.reduce((s, r) => s + r.sessionsCompleted, 0);
  const totalSessionsScheduled = rowsAll.reduce((s, r) => s + r.sessionsScheduled, 0);

  const branchMap = {};
  for (const r of rowsAll) {
    branchMap[r.branch] = (branchMap[r.branch] || 0) + 1;
  }

  return {
    dateRange: { from: dateRange.startDateStr, to: dateRange.endDateStr, preset: dateRange.preset },
    kpis: {
      totalTrainers: trainers.length,
      activeTrainers,
      inactiveTrainers: trainers.length - activeTrainers,
      totalAssignedClients,
      sessionsCompleted: totalSessionsCompleted,
      sessionsScheduled: totalSessionsScheduled,
    },
    charts: {
      branchDistribution: Object.entries(branchMap).map(([label, value]) => ({ label, value })),
      workloadComparison: rowsAll
        .slice(0, 10)
        .map((r) => ({ label: r.name, value: r.totalWorkload, clients: r.assignedClients })),
    },
    table: {
      rows: rowsAll.slice(skip, skip + limit),
      total: rowsAll.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(rowsAll.length / limit)),
    },
  };
};

// ==========================================
// 8. LEAD REPORTS (Enquiry model)
// ==========================================
const getLeadReport = async (query, reqUser) => {
  const dateRange = resolveReportDateRange(query);
  const branchObjId = resolveBranchFilter(reqUser, query.branchId);
  const { page, limit, skip } = parsePagination(query);

  const match = {
    createdAt: { $gte: dateRange.start, $lte: dateRange.end },
  };
  if (branchObjId) match.branchId = branchObjId;
  if (query.status && query.status !== 'ALL') match.status = query.status;
  if (query.source && query.source !== 'ALL') match.source = query.source;

  const leads = await Enquiry.find(match)
    .populate('branchId', 'name city')
    .sort({ createdAt: -1 })
    .lean();

  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.status === 'NEW').length;
  const contactedLeads = leads.filter((l) => l.status === 'CONTACTED').length;
  const followUps = leads.filter((l) => l.status === 'VISIT_SCHEDULED' || l.followUpDate).length;
  const convertedLeads = leads.filter((l) => l.status === 'CONVERTED').length;
  const lostLeads = leads.filter((l) => l.status === 'LOST').length;
  const conversionRate = totalLeads > 0 ? roundMoney((convertedLeads / totalLeads) * 100) : 0;

  const sourceMap = {};
  const branchMap = {};
  const trendMap = {};

  for (const l of leads) {
    const src = l.source || 'OTHER';
    sourceMap[src] = (sourceMap[src] || 0) + 1;

    const bName = l.branchId?.city || l.branchId?.name || 'Unknown';
    branchMap[bName] = (branchMap[bName] || 0) + 1;

    if (l.status === 'CONVERTED') {
      const dStr = getKolkataParts(l.updatedAt || l.createdAt).dateStr;
      trendMap[dStr] = (trendMap[dStr] || 0) + 1;
    }
  }

  const rows = leads.slice(skip, skip + limit).map((l) => ({
    id: l._id,
    name: l.name,
    phone: l.phone,
    email: l.email || '—',
    branch: l.branchId?.city || l.branchId?.name || '—',
    source: l.source,
    status: l.status,
    followUpDate: l.followUpDate,
    createdAt: l.createdAt,
  }));

  return {
    dateRange: { from: dateRange.startDateStr, to: dateRange.endDateStr, preset: dateRange.preset },
    kpis: {
      totalLeads,
      newLeads,
      contactedLeads,
      followUps,
      convertedLeads,
      lostLeads,
      conversionRate,
    },
    charts: {
      sourceDistribution: Object.entries(sourceMap).map(([label, value]) => ({ label, value })),
      branchBreakdown: Object.entries(branchMap).map(([label, value]) => ({ label, value })),
      conversionTrend: Object.entries(trendMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([label, value]) => ({ label, value })),
    },
    table: {
      rows,
      total: totalLeads,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(totalLeads / limit)),
    },
  };
};

// ==========================================
// 9. BRANCH COMPARISON REPORTS
// ==========================================
const getBranchReport = async (query, reqUser) => {
  const dateRange = resolveReportDateRange(query);
  const scopedBranchId = resolveBranchFilter(reqUser, query.branchId);

  const branchQuery = { isActive: true };
  if (scopedBranchId) branchQuery._id = scopedBranchId;
  const branches = await Branch.find(branchQuery).sort({ city: 1 }).lean();

  const now = new Date();

  const branchRows = await Promise.all(
    branches.map(async (b) => {
      const bId = b._id;
      const [
        totalClients,
        activeMemberships,
        newRegistrations,
        attendance,
        paidPayments,
        refundedPayments,
        pendingInvoices,
        expenses,
        trainers,
        leads,
      ] = await Promise.all([
        ClientProfile.countDocuments({ branchId: bId }),
        Membership.countDocuments({ branchId: bId, status: 'ACTIVE', expiryDate: { $gte: now } }),
        ClientProfile.countDocuments({
          branchId: bId,
          createdAt: { $gte: dateRange.start, $lte: dateRange.end },
        }),
        Attendance.countDocuments({
          branchId: bId,
          date: { $gte: dateRange.start, $lte: dateRange.end },
        }),
        Payment.find({
          branchId: bId,
          status: 'PAID',
          date: { $gte: dateRange.start, $lte: dateRange.end },
        }).lean(),
        Payment.find({
          branchId: bId,
          status: 'REFUNDED',
          date: { $gte: dateRange.start, $lte: dateRange.end },
        }).lean(),
        Invoice.find({
          branchId: bId,
          status: { $in: ['PENDING', 'PARTIALLY_PAID'] },
          balanceAmount: { $gt: 0 },
        }).lean(),
        Expense.find({
          branchId: bId,
          status: 'ACTIVE',
          expenseDate: { $gte: dateRange.start, $lte: dateRange.end },
        }).lean(),
        User.countDocuments({ role: 'TRAINER', branchId: bId, status: 'ACTIVE' }),
        Enquiry.find({
          branchId: bId,
          createdAt: { $gte: dateRange.start, $lte: dateRange.end },
        }).lean(),
      ]);

      const revenue = roundMoney(paidPayments.reduce((s, p) => s + (p.amount || 0), 0));
      const refunds = roundMoney(refundedPayments.reduce((s, p) => s + (p.amount || 0), 0));
      const pendingBalance = roundMoney(pendingInvoices.reduce((s, i) => s + (i.balanceAmount || 0), 0));
      const expenseTotal = roundMoney(expenses.reduce((s, e) => s + (e.amount || 0), 0));
      const netRevenue = roundMoney(revenue - refunds - expenseTotal);
      const convertedLeads = leads.filter((l) => l.status === 'CONVERTED').length;
      const leadConversionRate = leads.length > 0 ? roundMoney((convertedLeads / leads.length) * 100) : 0;

      return {
        branchId: bId,
        branch: b.city || b.name,
        code: b.code || '',
        totalClients,
        activeMemberships,
        newRegistrations,
        attendance,
        revenue,
        paymentsCount: paidPayments.length,
        pendingBalance,
        expenses: expenseTotal,
        netRevenue,
        trainers,
        leads: leads.length,
        leadConversionRate,
      };
    })
  );

  return {
    dateRange: { from: dateRange.startDateStr, to: dateRange.endDateStr, preset: dateRange.preset },
    kpis: {
      totalBranches: branchRows.length,
      totalClients: branchRows.reduce((s, r) => s + r.totalClients, 0),
      totalActiveMemberships: branchRows.reduce((s, r) => s + r.activeMemberships, 0),
      totalRevenue: roundMoney(branchRows.reduce((s, r) => s + r.revenue, 0)),
      totalExpenses: roundMoney(branchRows.reduce((s, r) => s + r.expenses, 0)),
      totalNetRevenue: roundMoney(branchRows.reduce((s, r) => s + r.netRevenue, 0)),
    },
    charts: {
      revenueComparison: branchRows.map((r) => ({ label: r.branch, value: r.revenue })),
      membershipComparison: branchRows.map((r) => ({ label: r.branch, value: r.activeMemberships })),
      attendanceComparison: branchRows.map((r) => ({ label: r.branch, value: r.attendance })),
    },
    table: {
      rows: branchRows,
      total: branchRows.length,
      page: 1,
      limit: branchRows.length || 10,
      totalPages: 1,
    },
  };
};

module.exports = {
  getReportsSummary,
  getMemberReport,
  getMembershipReport,
  getAttendanceReport,
  getRevenueReport,
  getPaymentReport,
  getExpenseReport,
  getTrainerReport,
  getLeadReport,
  getBranchReport,
};
