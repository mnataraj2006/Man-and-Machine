const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ClientProfile = require('../models/ClientProfile');
const TrainerProfile = require('../models/TrainerProfile');
const Branch = require('../models/Branch');
const Membership = require('../models/Membership');
const MembershipPlan = require('../models/MembershipPlan');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const WorkoutPlan = require('../models/WorkoutPlan');
const WorkoutSession = require('../models/WorkoutSession');
const ProgressRecord = require('../models/ProgressRecord');
const Notification = require('../models/Notification');
const Enquiry = require('../models/Enquiry');
const Exercise = require('../models/Exercise');
const TrainerBooking = require('../models/TrainerBooking');
const TrainingAppointment = require('../models/TrainingAppointment');
const financeService = require('../services/financeService');
const notificationService = require('../services/notificationService');
const { generateSecureToken, hashToken, getFrontendBaseUrl } = require('../utils/tokenUtils');
const { sendTrainerInvitation, sendPasswordResetEmail } = require('../utils/emailService');
const { normalizeIndianPhone } = require('../utils/phone');

// Helper to construct branch query filter
const getBranchFilter = (branchId) => {
  if (!branchId || branchId === 'ALL' || branchId === 'all') return {};
  if (mongoose.Types.ObjectId.isValid(branchId)) return { branchId };
  return {};
};

// Asia/Kolkata (IST: UTC+5:30) Date Boundary Helpers
const getKolkataDateParts = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.format(date); // YYYY-MM-DD
  const [year, month, day] = parts.split('-').map(Number);
  return { year, month, day, dateStr: parts };
};

const getKolkataStartOfToday = () => {
  const { dateStr } = getKolkataDateParts();
  return new Date(`${dateStr}T00:00:00+05:30`);
};

const getKolkataStartOfMonth = (offsetMonths = 0) => {
  const { year, month } = getKolkataDateParts();
  let targetMonth = month - offsetMonths;
  let targetYear = year;
  while (targetMonth < 1) {
    targetMonth += 12;
    targetYear -= 1;
  }
  const mStr = String(targetMonth).padStart(2, '0');
  return new Date(`${targetYear}-${mStr}-01T00:00:00+05:30`);
};

const getKolkataEndOfMonth = (offsetMonths = 0) => {
  const { year, month } = getKolkataDateParts();
  let nextMonth = month - offsetMonths + 1;
  let nextYear = year;
  while (nextMonth < 1) {
    nextMonth += 12;
    nextYear -= 1;
  }
  while (nextMonth > 12) {
    nextMonth -= 12;
    nextYear += 1;
  }
  const mStr = String(nextMonth).padStart(2, '0');
  const nextStart = new Date(`${nextYear}-${mStr}-01T00:00:00+05:30`);
  return new Date(nextStart.getTime() - 1);
};

// Helper for date range filter
const getDateRangeFilter = (range, startDate, endDate, dateField = 'createdAt') => {
  const now = new Date();
  let filter = {};

  if (range === 'today') {
    const startOfToday = getKolkataStartOfToday();
    filter[dateField] = { $gte: startOfToday };
  } else if (range === '7days') {
    const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    filter[dateField] = { $gte: past7 };
  } else if (range === '30days') {
    const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    filter[dateField] = { $gte: past30 };
  } else if (range === 'thisMonth') {
    const startOfMonth = getKolkataStartOfMonth(0);
    filter[dateField] = { $gte: startOfMonth };
  } else if (range === 'lastMonth') {
    const startOfLastMonth = getKolkataStartOfMonth(1);
    const endOfLastMonth = getKolkataEndOfMonth(1);
    filter[dateField] = { $gte: startOfLastMonth, $lte: endOfLastMonth };
  } else if (range === 'custom' && (startDate || endDate)) {
    filter[dateField] = {};
    if (startDate) filter[dateField].$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter[dateField].$lte = end;
    }
  }

  return filter;
};

// ==========================================
// 1. DASHBOARD & KPIS
// ==========================================

const getDashboardOverview = async (req, res, next) => {
  try {
    const { branchId, range } = req.query;
    const branchFilter = getBranchFilter(branchId);
    const now = new Date();

    // 1. Total Clients & Active Clients (role CLIENT only, excludes ADMIN and TRAINER)
    const clientQuery = { role: 'CLIENT', ...branchFilter };
    const totalClients = await User.countDocuments(clientQuery);
    const activeClients = await User.countDocuments({ ...clientQuery, status: 'ACTIVE' });

    // 2. Active Memberships (Distinct active client members)
    const activeMemberUserIds = await Membership.distinct('userId', {
      ...branchFilter,
      status: 'ACTIVE',
      startDate: { $lte: now },
      expiryDate: { $gte: now },
    });
    const activeMembers = activeMemberUserIds.length;

    // 3. Expired Memberships (Distinct clients whose memberships expired without an active pass)
    const activeUserSet = new Set(activeMemberUserIds.map((id) => id.toString()));
    const expiredUserIds = await Membership.distinct('userId', {
      ...branchFilter,
      $or: [{ status: 'EXPIRED' }, { expiryDate: { $lt: now } }],
    });
    const expiredMemberships = expiredUserIds.filter((id) => !activeUserSet.has(id.toString())).length;

    // 4. Total Trainers & Active Trainers (role TRAINER only)
    const trainerQuery = { role: 'TRAINER', ...branchFilter };
    const totalTrainers = await User.countDocuments(trainerQuery);
    const activeTrainers = await User.countDocuments({ ...trainerQuery, status: 'ACTIVE' });

    // 5. Total Branches
    const totalBranches = await Branch.countDocuments({ isActive: true });

    // 6. Today's Attendance (Asia/Kolkata IST)
    const startOfToday = getKolkataStartOfToday();
    const todayAttendance = await Attendance.countDocuments({
      ...branchFilter,
      date: { $gte: startOfToday },
    });

    // 7. Monthly Revenue (Confirmed PAID only) (Asia/Kolkata IST)
    const startOfMonth = getKolkataStartOfMonth(0);
    const startOfPrevMonth = getKolkataStartOfMonth(1);
    const endOfPrevMonth = getKolkataEndOfMonth(1);

    const monthlyPayments = await Payment.find({
      ...branchFilter,
      status: 'PAID',
      date: { $gte: startOfMonth },
    });
    const monthlyRevenue = monthlyPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

    const prevMonthlyPayments = await Payment.find({
      ...branchFilter,
      status: 'PAID',
      date: { $gte: startOfPrevMonth, $lte: endOfPrevMonth },
    });
    const prevMonthlyRevenue = prevMonthlyPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

    // 8. Finance Summary Integration (Invoices, Pending Balance, Expenses, Net Revenue)
    const financeSummary = await financeService.computeFinanceSummary({ branchId });
    const pendingPaymentsCount = financeSummary.pendingInvoicesCount;
    const pendingPaymentsTotal = financeSummary.pendingBalance;

    // 9. New Enquiries
    const newEnquiries = await Enquiry.countDocuments({
      ...branchFilter,
      status: 'NEW',
    });

    // --- Analytics Charts Data ---

    // A. Monthly Revenue Chart (Last 6 Months)
    const revenueChart = [];
    for (let i = 5; i >= 0; i--) {
      const dStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthPayments = await Payment.find({
        ...branchFilter,
        status: 'PAID',
        date: { $gte: dStart, $lte: dEnd },
      });
      const rev = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      revenueChart.push({
        month: dStart.toLocaleString('default', { month: 'short' }),
        year: dStart.getFullYear(),
        revenue: rev,
      });
    }

    // B. Monthly Client Registrations (Last 6 Months)
    const registrationsChart = [];
    for (let i = 5; i >= 0; i--) {
      const dStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const count = await User.countDocuments({
        role: 'CLIENT',
        ...branchFilter,
        createdAt: { $gte: dStart, $lte: dEnd },
      });
      registrationsChart.push({
        month: dStart.toLocaleString('default', { month: 'short' }),
        year: dStart.getFullYear(),
        count,
      });
    }

    // C. Daily Attendance Overview (Last 7 Days)
    const dailyAttendanceChart = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59);
      const count = await Attendance.countDocuments({
        ...branchFilter,
        date: { $gte: dayStart, $lte: dayEnd },
      });
      dailyAttendanceChart.push({
        day: dayStart.toLocaleDateString('default', { weekday: 'short' }),
        date: dayStart.toISOString().slice(0, 10),
        count,
      });
    }

    // D. Branch-wise Active Memberships
    const branches = await Branch.find({ isActive: true });
    const branchComparison = await Promise.all(
      branches.map(async (b) => {
        const activeCount = await Membership.countDocuments({
          branchId: b._id,
          status: 'ACTIVE',
          expiryDate: { $gte: now },
        });
        const clientCount = await User.countDocuments({ role: 'CLIENT', branchId: b._id });
        const branchRev = (
          await Payment.find({ branchId: b._id, status: 'PAID', date: { $gte: startOfMonth } })
        ).reduce((acc, p) => acc + (p.amount || 0), 0);
        return {
          branchId: b._id,
          city: b.city,
          name: b.name,
          activeCount,
          clientCount,
          monthlyRevenue: branchRev,
        };
      })
    );

    // E. Membership Status Distribution
    const membershipStatuses = ['ACTIVE', 'EXPIRED', 'PENDING', 'PAUSED', 'CANCELLED'];
    const membershipDistribution = await Promise.all(
      membershipStatuses.map(async (st) => {
        const count = await Membership.countDocuments({ ...branchFilter, status: st });
        return { status: st, count };
      })
    );

    // F. Payment Status Distribution
    const paymentStatuses = ['PAID', 'PENDING', 'FAILED', 'REFUNDED'];
    const paymentDistribution = await Promise.all(
      paymentStatuses.map(async (st) => {
        const list = await Payment.find({ ...branchFilter, status: st });
        const total = list.reduce((acc, p) => acc + (p.amount || 0), 0);
        return { status: st, count: list.length, amount: total };
      })
    );

    // --- Recent Activity Feed ---
    const recentUsers = await User.find({ role: 'CLIENT', ...branchFilter })
      .sort({ createdAt: -1 })
      .limit(4)
      .populate('branchId', 'city');

    const recentTrainers = await User.find({ role: 'TRAINER', ...branchFilter })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('branchId', 'city');

    const recentPayments = await Payment.find(branchFilter)
      .sort({ date: -1 })
      .limit(4)
      .populate('userId', 'name email')
      .populate('branchId', 'city');

    const recentAttendances = await Attendance.find(branchFilter)
      .sort({ date: -1 })
      .limit(4)
      .populate('userId', 'name')
      .populate('branchId', 'city');

    const activities = [
      ...recentUsers.map((u) => ({
        id: u._id,
        type: 'NEW_CLIENT',
        title: 'New Client Registered',
        description: `${u.name} registered at ${u.branchId?.city || 'HQ'} branch`,
        timestamp: u.createdAt,
      })),
      ...recentTrainers.map((t) => ({
        id: t._id,
        type: 'TRAINER_ADDED',
        title: 'Trainer Onboarded',
        description: `${t.name} joined as Trainer at ${t.branchId?.city || 'HQ'} branch`,
        timestamp: t.createdAt,
      })),
      ...recentPayments.map((p) => ({
        id: p._id,
        type: 'PAYMENT',
        title: `Payment Received (₹${p.amount})`,
        description: `${p.userId?.name || 'Client'} - ${p.description} (${p.paymentMethod})`,
        timestamp: p.date,
      })),
      ...recentAttendances.map((a) => ({
        id: a._id,
        type: 'ATTENDANCE',
        title: 'Check-in Recorded',
        description: `${a.userId?.name || 'Athlete'} entered ${a.branchId?.city || 'gym'}`,
        timestamp: a.checkInTime || a.date,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    // --- Alerts and Reminders ---
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiringIn7Days = await Membership.find({
      ...branchFilter,
      status: 'ACTIVE',
      expiryDate: { $gte: now, $lte: in7Days },
    })
      .populate('userId', 'name phone email')
      .populate('branchId', 'city');

    const expiringIn30Days = await Membership.find({
      ...branchFilter,
      status: 'ACTIVE',
      expiryDate: { $gte: in7Days, $lte: in30Days },
    })
      .populate('userId', 'name phone email')
      .populate('branchId', 'city');

    const expiredList = await Membership.find({
      ...branchFilter,
      $or: [{ status: 'EXPIRED' }, { expiryDate: { $lt: now } }],
    })
      .sort({ expiryDate: -1 })
      .limit(6)
      .populate('userId', 'name phone email')
      .populate('branchId', 'city');

    const pendingPaymentsAlerts = await Payment.find({
      ...branchFilter,
      status: 'PENDING',
    })
      .sort({ date: -1 })
      .limit(6)
      .populate('userId', 'name phone email')
      .populate('branchId', 'city');

    const newEnquiriesAlerts = await Enquiry.find({
      ...branchFilter,
      status: 'NEW',
    })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('branchId', 'city');

    res.status(200).json({
      success: true,
      kpis: {
        totalClients,
        activeClients,
        totalTrainers,
        activeTrainers,
        totalBranches,
        todayAttendance,
        activeMemberships: activeMembers,
        activeMembers,
        expiredMemberships,
        monthlyRevenue: financeSummary.thisMonthCollection,
        prevMonthlyRevenue,
        pendingPayments: pendingPaymentsCount,
        pendingPaymentsTotal,
        monthlyExpenses: financeSummary.monthExpenses,
        netRevenue: financeSummary.monthNetRevenue,
        todayCollection: financeSummary.todayCollection,
        newEnquiries,
      },
      charts: {
        revenueChart,
        registrationsChart,
        dailyAttendanceChart,
        branchComparison,
        membershipDistribution,
        paymentDistribution,
      },
      activities,
      alerts: {
        expiringIn7Days,
        expiringIn30Days,
        expiredMemberships: expiredList,
        pendingPayments: pendingPaymentsAlerts,
        newEnquiries: newEnquiriesAlerts,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 2. BRANCH MANAGEMENT
// ==========================================

const getBranches = async (req, res, next) => {
  try {
    const branches = await Branch.find().sort({ createdAt: 1 });
    const now = new Date();

    const branchesWithStats = await Promise.all(
      branches.map(async (b) => {
        const clientCount = await User.countDocuments({ role: 'CLIENT', branchId: b._id });
        const trainerCount = await User.countDocuments({ role: 'TRAINER', branchId: b._id });
        const activeMemberships = await Membership.countDocuments({
          branchId: b._id,
          status: 'ACTIVE',
          expiryDate: { $gte: now },
        });
        const payments = await Payment.find({ branchId: b._id, status: 'PAID' });
        const totalRevenue = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
        const todayAttendance = await Attendance.countDocuments({
          branchId: b._id,
          date: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
        });

        return {
          ...b.toObject(),
          stats: {
            clientCount,
            trainerCount,
            activeMemberships,
            totalRevenue,
            todayAttendance,
          },
        };
      })
    );

    res.status(200).json({
      success: true,
      branches: branchesWithStats,
    });
  } catch (err) {
    next(err);
  }
};

const createBranch = async (req, res, next) => {
  try {
    const { name, city, code, address, phone, email, openingHours, facilities } = req.body;

    if (!name || !city) {
      return res.status(400).json({ success: false, message: 'Branch name and city are required' });
    }

    const existing = await Branch.findOne({ city: { $regex: new RegExp(`^${city}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ success: false, message: `Branch in ${city} already exists` });
    }

    const branch = await Branch.create({
      name: name.trim(),
      city: city.trim(),
      code: code ? code.trim().toUpperCase() : city.slice(0, 3).toUpperCase(),
      address: address ? address.trim() : '',
      phone: phone ? phone.trim() : '',
      email: email ? email.trim() : '',
      openingHours: openingHours ? openingHours.trim() : 'Mon-Sat: 5:30 AM - 9:30 PM',
      facilities: Array.isArray(facilities) ? facilities : ['Fully Air-Conditioned Gym', 'Steam Bath', 'Clean Atmosphere', 'Bike Parking'],
      isActive: true,
    });

    res.status(201).json({ success: true, message: 'Branch created successfully', branch });
  } catch (err) {
    next(err);
  }
};

const updateBranch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, city, code, address, phone, email, openingHours, facilities, isActive } = req.body;

    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    if (name) branch.name = name.trim();
    if (city) branch.city = city.trim();
    if (code !== undefined) branch.code = code.trim().toUpperCase();
    if (address !== undefined) branch.address = address.trim();
    if (phone !== undefined) branch.phone = phone.trim();
    if (email !== undefined) branch.email = email.trim();
    if (openingHours !== undefined) branch.openingHours = openingHours.trim();
    if (facilities !== undefined) branch.facilities = Array.isArray(facilities) ? facilities : [facilities];
    if (isActive !== undefined) branch.isActive = Boolean(isActive);

    await branch.save();
    res.status(200).json({ success: true, message: 'Branch updated successfully', branch });
  } catch (err) {
    next(err);
  }
};

const toggleBranchStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    branch.isActive = !branch.isActive;
    await branch.save();

    res.status(200).json({
      success: true,
      message: `Branch status set to ${branch.isActive ? 'Active' : 'Inactive'}`,
      branch,
    });
  } catch (err) {
    next(err);
  }
};

const getBranchDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    const now = new Date();
    const clients = await User.find({ role: 'CLIENT', branchId: id }).sort({ createdAt: -1 }).limit(10);
    const trainers = await User.find({ role: 'TRAINER', branchId: id }).populate('branchId');
    const recentPayments = await Payment.find({ branchId: id }).sort({ date: -1 }).limit(10).populate('userId', 'name');
    const recentAttendance = await Attendance.find({ branchId: id }).sort({ date: -1 }).limit(10).populate('userId', 'name');

    const totalClients = await User.countDocuments({ role: 'CLIENT', branchId: id });
    const totalTrainers = trainers.length;
    const activeMembers = await Membership.countDocuments({ branchId: id, status: 'ACTIVE', expiryDate: { $gte: now } });
    const totalPayments = await Payment.find({ branchId: id, status: 'PAID' });
    const totalRevenue = totalPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

    res.status(200).json({
      success: true,
      branch,
      stats: {
        totalClients,
        totalTrainers,
        activeMembers,
        totalRevenue,
      },
      clients,
      trainers,
      recentPayments,
      recentAttendance,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 3. CLIENT MANAGEMENT
// ==========================================

const getClients = async (req, res, next) => {
  try {
    const {
      search,
      branchId,
      membershipStatus,
      accountStatus,
      trainerId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const query = { role: 'CLIENT' };

    if (branchId && branchId !== 'ALL' && mongoose.Types.ObjectId.isValid(branchId)) {
      query.branchId = branchId;
    }

    if (accountStatus && accountStatus !== 'ALL') {
      query.status = accountStatus;
    }

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } },
      ];
    }

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
    const sortOrder = order === 'asc' ? 1 : -1;
    const hasPostFilter =
      (membershipStatus && membershipStatus !== 'ALL') ||
      (trainerId && trainerId !== 'ALL');

    let clientsQuery = User.find(query)
      .sort({ [sortBy]: sortOrder })
      .populate('branchId', 'name city');

    const totalUnfiltered = await User.countDocuments(query);
    if (!hasPostFilter) {
      clientsQuery = clientsQuery
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit);
    }

    const clients = await clientsQuery;
    const now = new Date();

    // Attach active membership & profile info to each client
    const clientList = await Promise.all(
      clients.map(async (c) => {
        const profile = await ClientProfile.findOne({ userId: c._id }).populate('trainerId', 'name email phone status');

        // Genuinely ACTIVE membership check
        const activeMembership = await Membership.findOne({
          userId: c._id,
          status: 'ACTIVE',
          startDate: { $lte: now },
          expiryDate: { $gte: now },
        }).sort({ expiryDate: -1 });

        // Latest historical membership if no active membership exists
        const latestMembership = !activeMembership
          ? await Membership.findOne({ userId: c._id }).sort({ createdAt: -1 })
          : null;

        let membershipPayload = null;
        if (activeMembership) {
          membershipPayload = {
            id: activeMembership._id,
            planName: activeMembership.planName,
            status: 'ACTIVE',
            startDate: activeMembership.startDate,
            expiryDate: activeMembership.expiryDate,
            isExpired: false,
          };
        } else if (latestMembership) {
          const isCancelled = latestMembership.status === 'CANCELLED';
          const isPending = latestMembership.status === 'PENDING' || latestMembership.status === 'PENDING_PAYMENT';
          const isExpired =
            !isCancelled &&
            !isPending &&
            (latestMembership.status === 'EXPIRED' || new Date(latestMembership.expiryDate) < now);
          membershipPayload = {
            id: latestMembership._id,
            planName: latestMembership.planName,
            status: isExpired ? 'EXPIRED' : latestMembership.status,
            startDate: latestMembership.startDate,
            expiryDate: latestMembership.expiryDate,
            isExpired,
          };
        }

        const assignedTrainer =
          profile?.trainerId && profile.trainerId.status === 'ACTIVE'
            ? {
                _id: profile.trainerId._id,
                name: profile.trainerId.name,
                email: profile.trainerId.email,
                phone: profile.trainerId.phone,
              }
            : null;

        return {
          id: c._id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          status: c.status,
          branch: c.branchId,
          createdAt: c.createdAt,
          fitnessGoal: profile?.fitnessGoal || 'General Fitness',
          experienceLevel: profile?.experienceLevel || 'Beginner',
          trainer: assignedTrainer,
          hasActiveMembership: Boolean(activeMembership),
          membership: membershipPayload,
        };
      })
    );

    // Profile-only walk-ins have no User document but must remain first-class admin clients.
    const walkInQuery = { userId: null, ...getBranchFilter(branchId) };
    if (search?.trim()) {
      const term = search.trim();
      walkInQuery.$or = [{ name: { $regex: term, $options: 'i' } }, { phone: { $regex: term, $options: 'i' } }, { email: { $regex: term, $options: 'i' } }];
    }
    if (accountStatus && accountStatus !== 'ALL' && accountStatus !== 'NOT_CREATED') walkInQuery._id = null;
    const walkInProfiles = await ClientProfile.find(walkInQuery).populate('branchId', 'name city').populate('trainerId', 'name email phone status').sort({ createdAt: -1 });
    for (const profile of walkInProfiles) {
      const active = await Membership.findOne({ clientProfileId: profile._id, status: 'ACTIVE', startDate: { $lte: now }, expiryDate: { $gte: now } }).sort({ expiryDate: -1 });
      const latest = active || await Membership.findOne({ clientProfileId: profile._id }).sort({ createdAt: -1 });
      clientList.push({ id: profile._id, profileId: profile._id, name: profile.name, email: profile.email, phone: profile.phone, status: 'NOT_CREATED', accountAccessStatus: 'NOT_CREATED', branch: profile.branchId, createdAt: profile.joiningDate || profile.createdAt, fitnessGoal: profile.fitnessGoal, experienceLevel: profile.experienceLevel, trainer: profile.trainerId?.status === 'ACTIVE' ? profile.trainerId : null, membership: latest ? { id: latest._id, planName: latest.planName, status: latest.status, startDate: latest.startDate, expiryDate: latest.expiryDate, isExpired: latest.status === 'EXPIRED' || new Date(latest.expiryDate) < now } : null });
    }

    let filteredList = clientList;
    if (membershipStatus && membershipStatus !== 'ALL') {
      filteredList = filteredList.filter((c) => {
        if (membershipStatus === 'NO_MEMBERSHIP') return !c.membership;
        if (membershipStatus === 'PENDING') {
          return c.membership && (c.membership.status === 'PENDING' || c.membership.status === 'PENDING_PAYMENT');
        }
        return c.membership && c.membership.status === membershipStatus;
      });
    }

    if (trainerId && trainerId !== 'ALL') {
      if (trainerId === 'UNASSIGNED') {
        filteredList = filteredList.filter((c) => !c.trainer);
      } else if (mongoose.Types.ObjectId.isValid(trainerId)) {
        filteredList = filteredList.filter((c) => String(c.trainer?._id || '') === String(trainerId));
      }
    }

    const total = hasPostFilter ? filteredList.length : totalUnfiltered;
    const totalPages = Math.max(1, Math.ceil(total / parsedLimit));
    const pagedClients = hasPostFilter
      ? filteredList.slice((parsedPage - 1) * parsedLimit, parsedPage * parsedLimit)
      : filteredList;

    res.status(200).json({
      success: true,
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages,
      clients: pagedClients,
    });
  } catch (err) {
    next(err);
  }
};

const getClientDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    let profileOnly = null;
    let client = await User.findOne({ _id: id, role: 'CLIENT' }).populate('branchId');
    if (!client) profileOnly = await ClientProfile.findOne({ _id: id, userId: null }).populate('branchId').populate('trainerId', 'name email phone');
    if (!client && !profileOnly) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const profile = profileOnly || await ClientProfile.findOne({ userId: id }).populate('trainerId', 'name email phone');
    const identityQuery = client ? { userId: client._id } : { clientProfileId: profile._id };
    const memberships = await Membership.find(identityQuery).sort({ createdAt: -1 }).populate('branchId', 'city name');
    const payments = await Payment.find(identityQuery).sort({ date: -1 }).populate('branchId', 'city');
    const attendances = client ? await Attendance.find({ userId: id }).sort({ date: -1 }).limit(30).populate('branchId', 'city') : [];
    const workouts = client ? await WorkoutPlan.find({ assignedTo: id }).sort({ createdAt: -1 }) : [];
    const workoutSessions = client ? await WorkoutSession.find({ userId: id }).sort({ date: -1 }).limit(10) : [];
    const progressRecords = client ? await ProgressRecord.find({ userId: id }).sort({ date: -1 }).limit(20) : [];

    const now = new Date();
    // Strictly ACTIVE membership only - never fall back to expired or pending memberships
    const activeMembership = memberships.find(
      (m) => m.status === 'ACTIVE' && new Date(m.startDate) <= now && new Date(m.expiryDate) >= now
    ) || null;
    const latestMembership = !activeMembership ? memberships[0] || null : null;

    res.status(200).json({
      success: true,
      client: {
        id: client?._id || profile._id,
        name: client?.name || profile.name,
        email: client?.email || profile.email,
        phone: client?.phone || profile.phone,
        status: client?.status || 'NOT_CREATED',
        accountAccessStatus: profile?.accountAccessStatus || 'ACTIVE',
        branch: client?.branchId || profile.branchId,
        createdAt: client?.createdAt || profile.joiningDate,
        whatsappOptIn: Boolean(client?.whatsappOptIn),
        whatsappOptInAt: client?.whatsappOptInAt,
      },
      profile: profile || null,
      activeMembership,
      latestMembership,
      memberships,
      payments,
      attendances,
      workouts,
      workoutSessions,
      progressRecords,
    });
  } catch (err) {
    next(err);
  }
};

const createClient = async (req, res, next) => {
  try {
    const { name, email = '', phone = '', branchId, createLoginAccess = false, fitnessGoal, experienceLevel, trainerId, registrationDate, gender, dateOfBirth, address, emergencyContact, notes } = req.body;
    if (!name?.trim() || !branchId || !mongoose.Types.ObjectId.isValid(branchId)) return res.status(400).json({ success: false, message: 'Full name and a valid branch are required.' });
    const normalizedPhone = phone ? normalizeIndianPhone(phone) : null;
    if (phone && !normalizedPhone) return res.status(400).json({ success: false, message: 'Enter a valid Indian phone number or leave it blank.' });
    const cleanEmail = email ? String(email).trim().toLowerCase() : '';
    const duplicate = await ClientProfile.findOne({ $or: [...(normalizedPhone ? [{ phone: normalizedPhone }] : []), ...(cleanEmail ? [{ email: cleanEmail }] : [])] }).populate('userId', 'name email phone');
    if (duplicate) return res.status(409).json({ success: false, message: 'A matching client profile already exists. Verify the existing client before registering again.', existingClient: { id: duplicate._id, name: duplicate.name || duplicate.userId?.name, phone: duplicate.phone || duplicate.userId?.phone, email: duplicate.email || duplicate.userId?.email } });
    if (createLoginAccess && !cleanEmail) return res.status(400).json({ success: false, message: 'A valid email is required to create login access and send a secure invitation.' });
    let user = null;
    if (createLoginAccess) {
      if (await User.findOne({ email: cleanEmail })) return res.status(409).json({ success: false, message: 'This email is already linked to an account.' });
      const rawToken = generateSecureToken();
      user = await User.create({ name: name.trim(), email: cleanEmail, phone: normalizedPhone || '', branchId, role: 'CLIENT', status: 'PENDING_ACTIVATION', activationTokenHash: hashToken(rawToken), activationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), activationSentAt: new Date() });
    }
    const profile = await ClientProfile.create({ userId: user?._id || null, name: name.trim(), email: cleanEmail, phone: normalizedPhone || '', branchId, gender, dateOfBirth: dateOfBirth || null, address, emergencyContact, notes, fitnessGoal: fitnessGoal || 'General Fitness', experienceLevel: experienceLevel || 'Beginner', trainerId: trainerId && mongoose.Types.ObjectId.isValid(trainerId) ? trainerId : null, joiningDate: registrationDate ? new Date(registrationDate) : new Date(), registrationSource: 'ADMIN_REGISTERED', accountAccessStatus: user ? 'INVITATION_PENDING' : 'NOT_CREATED' });
    res.status(201).json({ success: true, message: user ? 'Client profile created. Account invitation is pending.' : 'Walk-in client profile created without login access.', client: { id: profile._id, profileId: profile._id, userId: user?._id || null, name: profile.name, email: profile.email, phone: profile.phone, accountAccessStatus: profile.accountAccessStatus } });
  } catch (err) {
    next(err);
  }
};

const updateClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, email, branchId, fitnessGoal, experienceLevel, whatsappOptIn } = req.body;

    const user = await User.findOne({ _id: id, role: 'CLIENT' });
    const walkInProfile = user ? null : await ClientProfile.findOne({ _id: id, userId: null });
    if (!user && !walkInProfile) return res.status(404).json({ success: false, message: 'Client not found' });

    if (user && name) user.name = name.trim();
    if (user && phone) user.phone = phone.trim();
    if (user && email) user.email = email.toLowerCase().trim();
    if (user && branchId && mongoose.Types.ObjectId.isValid(branchId)) user.branchId = branchId;
    if (user && typeof whatsappOptIn === 'boolean') {
      user.whatsappOptIn = whatsappOptIn;
      user.whatsappOptInAt = whatsappOptIn ? new Date() : user.whatsappOptInAt;
      user.whatsappOptOutAt = whatsappOptIn ? null : new Date();
    }
    if (user) await user.save();

    let profile = walkInProfile || await ClientProfile.findOne({ userId: id });
    if (profile) {
      if (name) profile.name = name.trim();
      if (phone) profile.phone = phone.trim();
      if (email) profile.email = email.toLowerCase().trim();
      if (fitnessGoal) profile.fitnessGoal = fitnessGoal;
      if (experienceLevel) profile.experienceLevel = experienceLevel;
      if (branchId && mongoose.Types.ObjectId.isValid(branchId)) profile.branchId = branchId;
      await profile.save();
    }

    res.status(200).json({ success: true, message: 'Client updated successfully', client: user ? user.toSafeObject() : { id: profile._id, name: profile.name, email: profile.email, phone: profile.phone, status: 'NOT_CREATED' } });
  } catch (err) {
    next(err);
  }
};

const createClientLoginAccess = async (req, res, next) => {
  try {
    const profile = await ClientProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Client profile not found.' });
    if (profile.userId) return res.status(409).json({ success: false, message: 'Login access already exists for this client.' });
    if (!profile.email) return res.status(400).json({ success: false, message: 'A valid email is required for the current secure activation method.' });
    if (await User.findOne({ email: profile.email })) return res.status(409).json({ success: false, message: 'This email is already linked to an account.' });
    const rawToken = generateSecureToken();
    const user = await User.create({ name: profile.name, email: profile.email, phone: profile.phone || '', branchId: profile.branchId, role: 'CLIENT', status: 'PENDING_ACTIVATION', activationTokenHash: hashToken(rawToken), activationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), activationSentAt: new Date() });
    profile.userId = user._id; profile.accountAccessStatus = 'INVITATION_PENDING'; await profile.save();
    const activationUrl = `${getFrontendBaseUrl()}/activate-account/${rawToken}`;
    res.status(201).json({ success: true, message: 'Login access created. Share the secure, single-use activation link through an approved channel.', accountAccessStatus: profile.accountAccessStatus, manualActivationUrl: activationUrl });
  } catch (err) { next(err); }
};

const updateClientStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.status = status;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Account status updated to ${status}`,
      client: user.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

const assignTrainer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { trainerId } = req.body;

    const profile = await ClientProfile.findOne({ userId: id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Client profile not found' });
    }

    let nextTrainerId = null;
    if (trainerId) {
      if (!mongoose.Types.ObjectId.isValid(trainerId)) {
        return res.status(400).json({ success: false, message: 'Invalid trainer ID provided.' });
      }
      const activeTrainer = await User.findOne({ _id: trainerId, role: 'TRAINER', status: 'ACTIVE' });
      if (!activeTrainer) {
        return res.status(400).json({
          success: false,
          message: 'Selected trainer must have an ACTIVE account before assignment.',
        });
      }
      nextTrainerId = activeTrainer._id;
    }

    const oldTrainerId = profile.trainerId;
    profile.trainerId = nextTrainerId;
    if (nextTrainerId) {
      profile.trainingPreference = 'PERSONAL_TRAINER';
    } else {
      profile.trainingPreference = 'SELF_TRAINED';
    }
    await profile.save();

    // Update active clients counts on trainers
    if (oldTrainerId) {
      const countOld = await ClientProfile.countDocuments({ trainerId: oldTrainerId });
      await TrainerProfile.updateOne({ userId: oldTrainerId }, { activeClientsCount: countOld });
    }
    if (profile.trainerId) {
      const countNew = await ClientProfile.countDocuments({ trainerId: profile.trainerId });
      await TrainerProfile.updateOne({ userId: profile.trainerId }, { activeClientsCount: countNew });
    }

    res.status(200).json({
      success: true,
      message: profile.trainerId ? 'Trainer assigned successfully' : 'Trainer unassigned successfully',
      trainerId: profile.trainerId,
    });
  } catch (err) {
    next(err);
  }
};

const changeClientBranch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { branchId } = req.body;

    if (!branchId || !mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ success: false, message: 'Valid branch ID is required' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'Client not found' });

    user.branchId = branchId;
    await user.save();

    await ClientProfile.updateOne({ userId: id }, { branchId });

    res.status(200).json({ success: true, message: 'Client branch changed successfully' });
  } catch (err) {
    next(err);
  }
};

const resetClientPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.password = newPassword; // Handled by pre-save hash
    await user.save();

    res.status(200).json({ success: true, message: `Password reset successfully for ${user.name}` });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 4. TRAINER MANAGEMENT
// ==========================================

const getTrainers = async (req, res, next) => {
  try {
    const { branchId, search, page, limit } = req.query;
    const query = { role: 'TRAINER' };

    if (branchId && branchId !== 'ALL' && mongoose.Types.ObjectId.isValid(branchId)) {
      query.branchId = branchId;
    }

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
        { phone: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(query);
    const hasPagination = page !== undefined || limit !== undefined;
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

    let trainerQuery = User.find(query).sort({ createdAt: -1 }).populate('branchId', 'name city');
    if (hasPagination) {
      trainerQuery = trainerQuery.skip((parsedPage - 1) * parsedLimit).limit(parsedLimit);
    }

    const trainers = await trainerQuery;

    const trainersWithProfiles = await Promise.all(
      trainers.map(async (t) => {
        const prof = await TrainerProfile.findOne({ userId: t._id });
        const clientCount = await ClientProfile.countDocuments({ trainerId: t._id });
        const assignedWorkoutsCount = await WorkoutPlan.countDocuments({ trainerId: t._id });

        return {
          id: t._id,
          name: t.name,
          email: t.email,
          phone: t.phone,
          status: t.status,
          invitationStatus: typeof t.getInvitationStatus === 'function' ? t.getInvitationStatus() : t.status,
          activationSentAt: t.activationSentAt,
          activationUsedAt: t.activationUsedAt,
          branch: t.branchId,
          specialization: prof?.specialization || 'Strength & Conditioning',
          experienceYears: prof?.experienceYears ?? 3,
          qualification: prof?.qualification || '',
          profileImage: prof?.profileImage || '',
          employmentStatus: prof?.employmentStatus || 'FULL_TIME',
          bio: prof?.bio || '',
          assignedClientCount: clientCount,
          assignedWorkoutsCount,
          createdAt: t.createdAt,
        };
      })
    );

    const totalPages = hasPagination ? Math.max(1, Math.ceil(total / parsedLimit)) : 1;

    res.status(200).json({
      success: true,
      count: trainersWithProfiles.length,
      total,
      trainers: trainersWithProfiles,
      pagination: {
        total,
        page: hasPagination ? parsedPage : 1,
        limit: hasPagination ? parsedLimit : total || trainersWithProfiles.length,
        totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getTrainerDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const trainer = await User.findOne({ _id: id, role: 'TRAINER' }).populate('branchId');
    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer not found' });
    }

    const profile = await TrainerProfile.findOne({ userId: id });
    const assignedClientsProfiles = await ClientProfile.find({ trainerId: id }).populate('userId', 'name email phone status branchId');
    const workoutPlans = await WorkoutPlan.find({ trainerId: id }).populate('assignedTo', 'name email');

    res.status(200).json({
      success: true,
      trainer: {
        id: trainer._id,
        name: trainer.name,
        email: trainer.email,
        phone: trainer.phone,
        status: trainer.status,
        invitationStatus: typeof trainer.getInvitationStatus === 'function' ? trainer.getInvitationStatus() : trainer.status,
        activationSentAt: trainer.activationSentAt,
        activationUsedAt: trainer.activationUsedAt,
        createdAt: trainer.createdAt,
        branch: trainer.branchId,
        specialization: profile?.specialization || 'Strength Training',
        experienceYears: profile?.experienceYears ?? 3,
        qualification: profile?.qualification || '',
        profileImage: profile?.profileImage || '',
        employmentStatus: profile?.employmentStatus || 'FULL_TIME',
        bio: profile?.bio || '',
      },
      assignedClients: assignedClientsProfiles.map((cp) => cp.userId).filter(Boolean),
      workoutPlans,
    });
  } catch (err) {
    next(err);
  }
};

const createTrainer = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      branchId,
      specialization,
      experienceYears,
      qualification,
      profileImage,
      employmentStatus,
      bio,
    } = req.body;

    if (!name || !name.trim() || name.trim().length < 2 || name.trim().length > 80) {
      return res.status(400).json({
        success: false,
        message: 'Full name must be between 2 and 80 characters.',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    const rawDigits = String(phone || '').replace(/\D/g, '');
    let normalizedTenDigits = null;
    if (rawDigits.length === 10 && /^[6-9]\d{9}$/.test(rawDigits)) {
      normalizedTenDigits = rawDigits;
    } else if (rawDigits.length === 11 && rawDigits.startsWith('0') && /^0[6-9]\d{9}$/.test(rawDigits)) {
      normalizedTenDigits = rawDigits.slice(1);
    } else if (rawDigits.length === 12 && rawDigits.startsWith('91') && /^91[6-9]\d{9}$/.test(rawDigits)) {
      normalizedTenDigits = rawDigits.slice(2);
    } else if (rawDigits.length === 14 && rawDigits.startsWith('0091') && /^0091[6-9]\d{9}$/.test(rawDigits)) {
      normalizedTenDigits = rawDigits.slice(4);
    }

    if (!phone || !normalizedTenDigits) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9 (e.g. 9876543210 or +91 9876543210).',
      });
    }
    const formattedPhone = `+91 ${normalizedTenDigits.slice(0, 5)} ${normalizedTenDigits.slice(5)}`;

    if (!branchId || !mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid gym branch.',
      });
    }

    const branch = await Branch.findOne({ _id: branchId, isActive: true });
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Selected branch was not found or is inactive.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // Generate cryptographically secure 24-hour single-use activation token
    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: formattedPhone,
      branchId: branch._id,
      role: 'TRAINER',
      status: 'PENDING_ACTIVATION',
      activationTokenHash: tokenHash,
      activationTokenExpiresAt: expiresAt,
      activationSentAt: new Date(),
    });

    const allowedEmpStatuses = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE'];
    const normalizedEmpStatus = allowedEmpStatuses.includes(employmentStatus) ? employmentStatus : 'FULL_TIME';

    try {
      const existingProfile = await TrainerProfile.findOne({ userId: user._id });
      if (!existingProfile) {
        await TrainerProfile.create({
          userId: user._id,
          branchId: branch._id,
          specialization: specialization?.trim() || 'Strength & Conditioning',
          experienceYears: Number(experienceYears) >= 0 ? Number(experienceYears) : 3,
          qualification: qualification?.trim() || '',
          profileImage: profileImage?.trim() || '',
          employmentStatus: normalizedEmpStatus,
          bio: bio?.trim() || '',
          contactPhone: formattedPhone,
          contactEmail: normalizedEmail,
          activeClientsCount: 0,
        });
      }
    } catch (profErr) {
      await User.findByIdAndDelete(user._id);
      throw profErr;
    }

    const activationUrl = `${getFrontendBaseUrl()}/activate-account/${rawToken}`;
    const emailResult = await sendTrainerInvitation({
      to: user.email,
      trainerName: user.name,
      branchName: `${branch.city} Branch`,
      activationUrl,
      expiresInHours: 24,
    });

    res.status(201).json({
      success: true,
      message: emailResult.delivered
        ? 'Trainer account created and activation invitation emailed.'
        : 'Trainer account created (Pending Activation). Email delivery is not configured — share the manual activation link.',
      trainer: user.toSafeObject(),
      emailConfigured: emailResult.configured,
      emailDelivered: emailResult.delivered,
      emailNotice: emailResult.reason || null,
      manualActivationUrl: emailResult.delivered ? undefined : activationUrl,
    });
  } catch (err) {
    next(err);
  }
};

const updateTrainer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      phone,
      branchId,
      specialization,
      experienceYears,
      qualification,
      profileImage,
      employmentStatus,
      bio,
      status,
    } = req.body;

    const user = await User.findOne({ _id: id, role: 'TRAINER' });
    if (!user) return res.status(404).json({ success: false, message: 'Trainer not found' });

    if (name && name.trim()) user.name = name.trim();
    if (phone && phone.trim()) user.phone = phone.trim();

    if (status !== undefined) {
      const allowedStatuses = ['PENDING_ACTIVATION', 'ACTIVE', 'SUSPENDED', 'INACTIVE'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid trainer status provided.' });
      }
      if (status === 'ACTIVE' && !user.password) {
        return res.status(400).json({
          success: false,
          message: 'Trainer has not completed password setup yet and cannot be activated manually before activation.',
        });
      }
      if (status === 'SUSPENDED' || status === 'INACTIVE') {
        user.tokenVersion = (user.tokenVersion || 0) + 1;
      }
      user.status = status;
    }

    if (branchId && mongoose.Types.ObjectId.isValid(branchId)) user.branchId = branchId;
    await user.save();

    let prof = await TrainerProfile.findOne({ userId: id });
    if (prof) {
      if (specialization !== undefined) prof.specialization = specialization.trim();
      if (experienceYears !== undefined) prof.experienceYears = Number(experienceYears);
      if (qualification !== undefined) prof.qualification = qualification.trim();
      if (profileImage !== undefined) prof.profileImage = profileImage.trim();
      if (employmentStatus && ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE'].includes(employmentStatus)) {
        prof.employmentStatus = employmentStatus;
      }
      if (bio !== undefined) prof.bio = bio.trim();
      if (branchId && mongoose.Types.ObjectId.isValid(branchId)) prof.branchId = branchId;
      if (req.body.isAvailable !== undefined) prof.isAvailable = req.body.isAvailable;
      if (req.body.acceptingClients !== undefined) prof.acceptingClients = req.body.acceptingClients;
      if (req.body.pricing) prof.pricing = { ...prof.pricing, ...req.body.pricing };
      if (req.body.availability) prof.availability = { ...prof.availability, ...req.body.availability };
      await prof.save();
    }

    res.status(200).json({ success: true, message: 'Trainer updated successfully', trainer: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

const updateTrainerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['ACTIVE', 'SUSPENDED', 'INACTIVE'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be ACTIVE, SUSPENDED, or INACTIVE.',
      });
    }

    const user = await User.findOne({ _id: id, role: 'TRAINER' });
    if (!user) return res.status(404).json({ success: false, message: 'Trainer not found' });

    if (status === 'ACTIVE' && !user.password) {
      return res.status(400).json({
        success: false,
        message: 'Cannot activate before the trainer completes their account activation link.',
      });
    }

    user.status = status;
    if (status === 'SUSPENDED' || status === 'INACTIVE') {
      user.tokenVersion = (user.tokenVersion || 0) + 1; // Revoke active tokens immediately
    }
    await user.save();

    res.status(200).json({
      success: true,
      message: `Trainer status updated to ${status}.`,
      trainer: user.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

const deleteTrainer = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid trainer ID.' });
    }

    const user = await User.findOne({ _id: id, role: 'TRAINER' });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Trainer not found.' });
    }

    await Promise.all([
      ClientProfile.updateMany(
        { trainerId: id },
        { $set: { trainerId: null, trainingPreference: 'SELF_TRAINED' } }
      ),
      Membership.updateMany({ trainerId: id }, { $set: { trainerId: null } }),
      TrainerProfile.deleteMany({ userId: id }),
      TrainingAppointment.deleteMany({ trainerId: id, status: 'SCHEDULED' }),
      TrainerBooking.deleteMany({ trainerId: id, bookingStatus: 'PENDING_PAYMENT' }),
      Notification.deleteMany({ userId: id }),
    ]);

    await User.deleteOne({ _id: id, role: 'TRAINER' });

    res.status(200).json({
      success: true,
      message: 'Trainer account deleted permanently.',
    });
  } catch (err) {
    next(err);
  }
};

const resendTrainerInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ _id: id, role: 'TRAINER' }).populate('branchId', 'name city');
    if (!user) return res.status(404).json({ success: false, message: 'Trainer not found' });

    if (user.status !== 'PENDING_ACTIVATION') {
      return res.status(400).json({
        success: false,
        message: 'This trainer has already completed onboarding activation. Use Reset Password if they need access recovery.',
      });
    }

    // Generate fresh token (automatically invalidating previous activationTokenHash)
    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.activationTokenHash = tokenHash;
    user.activationTokenExpiresAt = expiresAt;
    user.activationSentAt = new Date();
    user.activationUsedAt = null;
    await user.save({ validateBeforeSave: false });

    const activationUrl = `${getFrontendBaseUrl()}/activate-account/${rawToken}`;
    const emailResult = await sendTrainerInvitation({
      to: user.email,
      trainerName: user.name,
      branchName: user.branchId?.city ? `${user.branchId.city} Branch` : 'Man & Machine',
      activationUrl,
      expiresInHours: 24,
    });

    res.status(200).json({
      success: true,
      message: emailResult.delivered
        ? 'A new activation invitation has been emailed. Any previous link is now invalid.'
        : 'New activation link generated (previous link invalidated). Email delivery is not configured.',
      emailConfigured: emailResult.configured,
      emailDelivered: emailResult.delivered,
      emailNotice: emailResult.reason || null,
      manualActivationUrl: emailResult.delivered ? undefined : activationUrl,
    });
  } catch (err) {
    next(err);
  }
};

const resetTrainerPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ _id: id, role: 'TRAINER' });
    if (!user) return res.status(404).json({ success: false, message: 'Trainer not found' });

    if (user.status === 'PENDING_ACTIVATION') {
      return res.status(400).json({
        success: false,
        message: 'Trainer has not activated their account yet. Use Resend Invitation instead.',
      });
    }

    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    user.passwordResetTokenHash = tokenHash;
    user.passwordResetTokenExpiresAt = expiresAt;
    user.passwordResetRequestedAt = new Date();
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Revoke active sessions
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${getFrontendBaseUrl()}/reset-password/${rawToken}`;
    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      userName: user.name,
      resetUrl,
      expiresInMinutes: 30,
    });

    res.status(200).json({
      success: true,
      message: emailResult.delivered
        ? 'Secure 30-minute password reset link emailed to the trainer.'
        : 'Secure 30-minute password reset link generated. Email delivery is not configured — share manually.',
      emailConfigured: emailResult.configured,
      emailDelivered: emailResult.delivered,
      emailNotice: emailResult.reason || null,
      manualResetUrl: emailResult.delivered ? undefined : resetUrl,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/admin/trainer-bookings
 * @desc    Get all client-to-trainer booking records across branches
 */
const getTrainerBookings = async (req, res, next) => {
  try {
    const { branchId, status, search } = req.query;
    const query = {};

    if (branchId && branchId !== 'ALL' && mongoose.Types.ObjectId.isValid(branchId)) {
      query.branchId = branchId;
    }
    if (status && status !== 'ALL') {
      query.bookingStatus = status;
    }

    const bookings = await TrainerBooking.find(query)
      .populate('clientId', 'name email phone avatar')
      .populate('trainerId', 'name email phone avatar')
      .populate('branchId', 'name city')
      .populate('paymentId', 'amount paymentMethod status transactionId')
      .sort({ createdAt: -1 });

    let filtered = bookings;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = bookings.filter((b) =>
        b.bookingReference?.toLowerCase().includes(q) ||
        b.clientId?.name?.toLowerCase().includes(q) ||
        b.trainerId?.name?.toLowerCase().includes(q) ||
        b.serviceTitle?.toLowerCase().includes(q)
      );
    }

    res.status(200).json({
      success: true,
      count: filtered.length,
      bookings: filtered,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/admin/trainer-bookings/:id/confirm-payment
 * @desc    Confirm payment for pending trainer booking and assign coach to client
 */
const confirmTrainerBookingPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paymentMethod = 'CASH' } = req.body;

    const booking = await TrainerBooking.findById(id)
      .populate('clientId', 'name email phone')
      .populate('trainerId', 'name email phone branchId');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Trainer booking record not found.' });
    }

    booking.paymentStatus = 'PAID';
    booking.bookingStatus = 'CONFIRMED';
    booking.paymentMethod = paymentMethod;

    // Update or create Payment record
    let payment = null;
    if (booking.paymentId) {
      payment = await Payment.findByIdAndUpdate(
        booking.paymentId,
        { status: 'PAID', paymentMethod, updatedBy: req.user ? req.user._id : null },
        { new: true }
      );
      if (payment?.invoiceId) {
        if (!payment.receiptNumber) {
          payment.receiptNumber = await financeService.generateSequentialNumber({
            kind: 'RECEIPT',
            branchId: booking.branchId,
            date: new Date(),
          });
          await payment.save();
        }
        await financeService.recalculateInvoiceFromPayments(
          payment.invoiceId,
          req.user ? req.user._id : null,
          'Trainer booking payment confirmed by Admin'
        );
      } else if (payment) {
        await financeService.createInvoiceAndOptionalPayment({
          clientId: booking.clientId._id,
          branchId: booking.branchId,
          trainerBookingId: booking._id,
          category: 'PERSONAL_TRAINING',
          description: payment.description,
          subtotal: booking.amount,
          totalAmount: booking.amount,
          paymentMethod,
          invoiceDate: new Date(),
          createdBy: req.user ? req.user._id : null,
          existingPayment: payment,
        });
      }
    } else {
      payment = await Payment.create({
        userId: booking.clientId._id,
        branchId: booking.branchId,
        transactionId: `TXN-${booking.bookingReference}`,
        description: `Coach Booking Confirmed: ${booking.trainerId.name} (${booking.serviceTitle})`,
        amount: booking.amount,
        paymentMethod,
        status: 'PAID',
        date: new Date(),
        createdBy: req.user ? req.user._id : null,
      });
      booking.paymentId = payment._id;
      await financeService.createInvoiceAndOptionalPayment({
        clientId: booking.clientId._id,
        branchId: booking.branchId,
        trainerBookingId: booking._id,
        category: 'PERSONAL_TRAINING',
        description: payment.description,
        subtotal: booking.amount,
        totalAmount: booking.amount,
        paymentMethod,
        invoiceDate: new Date(),
        createdBy: req.user ? req.user._id : null,
        existingPayment: payment,
      });
    }

    // Assign Trainer to Client Profile
    await ClientProfile.findOneAndUpdate(
      { userId: booking.clientId._id },
      { trainerId: booking.trainerId._id }
    );

    // Create or confirm TrainingAppointment
    if (!booking.appointmentId) {
      const [hStr] = (booking.startTime || '06:00').split(' ');
      let [hour] = hStr.split(':').map(Number);
      if (booking.startTime?.includes('PM') && hour !== 12) hour += 12;
      if (booking.startTime?.includes('AM') && hour === 12) hour = 0;
      const scheduledDateTime = new Date(booking.date);
      scheduledDateTime.setHours(hour, 0, 0, 0);

      const apt = await TrainingAppointment.create({
        trainerId: booking.trainerId._id,
        clientId: booking.clientId._id,
        branchId: booking.branchId,
        scheduledAt: scheduledDateTime,
        durationMinutes: booking.durationMinutes || 60,
        sessionType: 'Personal Training',
        status: 'SCHEDULED',
        notes: `Admin Confirmed Booking (${booking.serviceTitle})`,
      });
      booking.appointmentId = apt._id;
    }

    await booking.save();

    // Send notifications to client and trainer
    await Notification.create({
      userId: booking.clientId._id,
      title: 'Trainer Booking & Payment Confirmed!',
      message: `Your booking with ${booking.trainerId.name} is confirmed. Coach ${booking.trainerId.name} has been assigned to your profile. "My Workouts" is now unlocked!`,
      category: 'PAYMENTS',
    });

    await Notification.create({
      userId: booking.trainerId._id,
      title: 'New Client Assigned!',
      message: `Payment confirmed for ${booking.clientId.name}. They are now assigned to you for ${booking.serviceTitle}.`,
      category: 'TRAINER',
    });

    res.status(200).json({
      success: true,
      message: `Payment confirmed and ${booking.trainerId.name} assigned to ${booking.clientId.name}!`,
      booking,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 5. MEMBERSHIP MANAGEMENT
// ==========================================

// Helper to calculate branch final price
const calculateBranchFinalPrice = (basePrice, joiningFee = 0, discountType = 'NONE', discountValue = 0) => {
  const base = Math.max(0, Number(basePrice) || 0);
  const fee = Math.max(0, Number(joiningFee) || 0);
  const discVal = Math.max(0, Number(discountValue) || 0);

  let discountAmount = 0;
  if (discountType === 'FIXED') {
    discountAmount = Math.min(discVal, base + fee);
  } else if (discountType === 'PERCENTAGE') {
    const pct = Math.min(100, discVal);
    discountAmount = Math.round((base * pct) / 100);
  }

  const final = Math.max(0, base + fee - discountAmount);
  return {
    basePrice: base,
    joiningFee: fee,
    discountType: ['FIXED', 'PERCENTAGE'].includes(discountType) ? discountType : 'NONE',
    discountValue: discVal,
    finalPrice: final,
  };
};

const getMembershipPlans = async (req, res, next) => {
  try {
    const { search, branchId, planType, status, durationDays, page = 1, limit = 50 } = req.query;
    const andConditions = [];

    if (search && search.trim()) {
      const term = search.trim();
      andConditions.push({
        $or: [
          { name: { $regex: term, $options: 'i' } },
          { code: { $regex: term, $options: 'i' } },
          { description: { $regex: term, $options: 'i' } },
        ],
      });
    }

    if (planType && planType !== 'ALL') {
      andConditions.push({ planType });
    }

    if (status && status !== 'ALL') {
      andConditions.push({ isActive: status === 'ACTIVE' });
    }

    if (durationDays && durationDays !== 'ALL') {
      const parsedDays = parseInt(durationDays, 10);
      if (parsedDays > 0) {
        andConditions.push({ durationDays: parsedDays });
      }
    }

    if (branchId && branchId !== 'ALL' && mongoose.Types.ObjectId.isValid(branchId)) {
      andConditions.push({
        $or: [
          { branchPricing: { $elemMatch: { branchId, isAvailable: true } } },
          { branchId: branchId },
          { branchId: null },
        ],
      });
    }

    const query = andConditions.length > 0 ? { $and: andConditions } : {};

    const allPlans = await MembershipPlan.find();
    const totalPlans = allPlans.length;
    const activePlans = allPlans.filter((p) => p.isActive).length;
    const inactivePlans = totalPlans - activePlans;

    const activeBranchIds = new Set();
    allPlans
      .filter((p) => p.isActive)
      .forEach((p) => {
        if (p.branchPricing && p.branchPricing.length > 0) {
          p.branchPricing.forEach((bp) => {
            if (bp.isAvailable && bp.branchId) {
              activeBranchIds.add(bp.branchId.toString());
            }
          });
        }
      });
    const branchesCovered = activeBranchIds.size || 3;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await MembershipPlan.countDocuments(query);
    const plans = await MembershipPlan.find(query)
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('branchPricing.branchId', 'name city code');

    res.status(200).json({
      success: true,
      summary: {
        totalPlans,
        activePlans,
        inactivePlans,
        branchesCovered,
      },
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)) || 1,
      plans,
    });
  } catch (err) {
    next(err);
  }
};

const getMembershipPlanById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const plan = await MembershipPlan.findById(id).populate('branchPricing.branchId', 'name city code address phone');
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Membership plan not found.' });
    }

    const now = new Date();
    const activeMembershipsCount = await Membership.countDocuments({
      $or: [{ planId: id }, { planName: plan.name }],
      status: 'ACTIVE',
      expiryDate: { $gte: now },
    });
    const totalMembershipsCount = await Membership.countDocuments({
      $or: [{ planId: id }, { planName: plan.name }],
    });

    res.status(200).json({
      success: true,
      plan,
      activeMembershipsCount,
      totalMembershipsCount,
    });
  } catch (err) {
    next(err);
  }
};

const createMembershipPlan = async (req, res, next) => {
  try {
    const {
      name,
      code,
      description,
      planType = 'MONTHLY',
      durationDays,
      benefits,
      features,
      branchPricing,
      isActive = true,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Plan name is required.' });
    }

    const days = parseInt(durationDays, 10);
    if (!days || days < 1) {
      return res.status(400).json({ success: false, message: 'Duration must be a positive number of days.' });
    }

    if (!Array.isArray(branchPricing) || branchPricing.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one branch pricing configuration is required.' });
    }

    const hasAvailable = branchPricing.some((bp) => bp.isAvailable);
    if (!hasAvailable) {
      return res.status(400).json({ success: false, message: 'At least one branch must be enabled for this plan.' });
    }

    const processedPricing = branchPricing.map((bp) => {
      const calc = calculateBranchFinalPrice(bp.basePrice, bp.joiningFee, bp.discountType, bp.discountValue);
      return {
        branchId: bp.branchId,
        isAvailable: Boolean(bp.isAvailable),
        basePrice: calc.basePrice,
        joiningFee: calc.joiningFee,
        discountType: calc.discountType,
        discountValue: calc.discountValue,
        finalPrice: calc.finalPrice,
      };
    });

    const planCode = code ? code.trim().toUpperCase() : `MM-${days}D`;
    const benefitsList = Array.isArray(benefits) && benefits.length > 0 ? benefits : (Array.isArray(features) ? features : []);

    const plan = await MembershipPlan.create({
      name: name.trim(),
      code: planCode,
      description: description ? description.trim() : '',
      planType: ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM'].includes(planType) ? planType : 'CUSTOM',
      durationDays: days,
      durationMonths: Math.max(1, Math.round(days / 30)),
      benefits: benefitsList,
      features: benefitsList,
      branchPricing: processedPricing,
      isActive: Boolean(isActive),
      createdBy: req.user ? req.user._id : null,
      updatedBy: req.user ? req.user._id : null,
    });

    const populatedPlan = await MembershipPlan.findById(plan._id).populate('branchPricing.branchId', 'name city code');

    res.status(201).json({
      success: true,
      message: 'Membership plan created successfully',
      plan: populatedPlan,
    });
  } catch (err) {
    next(err);
  }
};

const updateMembershipPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      description,
      planType,
      durationDays,
      benefits,
      features,
      branchPricing,
      isActive,
      displayOrder,
    } = req.body;

    const plan = await MembershipPlan.findById(id);
    if (!plan) return res.status(404).json({ success: false, message: 'Membership plan not found.' });

    if (name) plan.name = name.trim();
    if (code) plan.code = code.trim().toUpperCase();
    if (description !== undefined) plan.description = description.trim();
    if (planType) plan.planType = planType;
    if (durationDays) {
      const days = parseInt(durationDays, 10);
      if (days < 1) return res.status(400).json({ success: false, message: 'Duration must be positive.' });
      plan.durationDays = days;
      plan.durationMonths = Math.max(1, Math.round(days / 30));
    }

    const benefitsList = Array.isArray(benefits) ? benefits : (Array.isArray(features) ? features : null);
    if (benefitsList) {
      plan.benefits = benefitsList;
      plan.features = benefitsList;
    }

    if (Array.isArray(branchPricing) && branchPricing.length > 0) {
      const hasAvailable = branchPricing.some((bp) => bp.isAvailable);
      if (!hasAvailable) {
        return res.status(400).json({ success: false, message: 'At least one branch must remain available.' });
      }
      plan.branchPricing = branchPricing.map((bp) => {
        const calc = calculateBranchFinalPrice(bp.basePrice, bp.joiningFee, bp.discountType, bp.discountValue);
        return {
          branchId: bp.branchId,
          isAvailable: Boolean(bp.isAvailable),
          basePrice: calc.basePrice,
          joiningFee: calc.joiningFee,
          discountType: calc.discountType,
          discountValue: calc.discountValue,
          finalPrice: calc.finalPrice,
        };
      });
    }

    if (isActive !== undefined) plan.isActive = Boolean(isActive);
    if (displayOrder !== undefined) plan.displayOrder = Number(displayOrder);
    plan.updatedBy = req.user ? req.user._id : null;

    await plan.save();

    const populatedPlan = await MembershipPlan.findById(plan._id).populate('branchPricing.branchId', 'name city code');

    res.status(200).json({
      success: true,
      message: 'Membership plan updated successfully',
      plan: populatedPlan,
    });
  } catch (err) {
    next(err);
  }
};

const toggleMembershipPlanStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const plan = await MembershipPlan.findById(id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found.' });

    if (req.body.isActive !== undefined) {
      plan.isActive = Boolean(req.body.isActive);
    } else {
      plan.isActive = !plan.isActive;
    }
    plan.updatedBy = req.user ? req.user._id : null;
    await plan.save();

    res.status(200).json({
      success: true,
      message: `Plan ${plan.isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: plan.isActive,
    });
  } catch (err) {
    next(err);
  }
};

const duplicateMembershipPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const original = await MembershipPlan.findById(id);
    if (!original) return res.status(404).json({ success: false, message: 'Plan not found.' });

    const copyName = `${original.name} (Copy)`;
    const copyCode = original.code ? `${original.code}-COPY` : 'MM-COPY';

    const clonedPlan = await MembershipPlan.create({
      name: copyName,
      code: copyCode,
      description: original.description,
      planType: original.planType,
      durationDays: original.durationDays,
      durationMonths: original.durationMonths,
      benefits: [...(original.benefits || [])],
      features: [...(original.features || [])],
      branchPricing: original.branchPricing.map((bp) => ({
        branchId: bp.branchId,
        isAvailable: bp.isAvailable,
        basePrice: bp.basePrice,
        joiningFee: bp.joiningFee,
        discountType: bp.discountType,
        discountValue: bp.discountValue,
        finalPrice: bp.finalPrice,
      })),
      isActive: true,
      createdBy: req.user ? req.user._id : null,
      updatedBy: req.user ? req.user._id : null,
    });

    const populated = await MembershipPlan.findById(clonedPlan._id).populate('branchPricing.branchId', 'name city code');

    res.status(201).json({
      success: true,
      message: 'Plan duplicated successfully',
      plan: populated,
    });
  } catch (err) {
    next(err);
  }
};

const deleteMembershipPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const plan = await MembershipPlan.findById(id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found.' });

    // Safety check: is plan referenced by any Membership?
    const hasMemberships = await Membership.exists({
      $or: [{ planId: id }, { planName: plan.name }],
    });

    if (hasMemberships) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete plan because it is currently linked to member records. Deactivate the plan instead to prevent new assignments.',
      });
    }

    const hasPayments = await Payment.exists({
      description: new RegExp(plan.name, 'i'),
    });
    if (hasPayments) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete plan because payment transactions exist for this plan. Deactivate the plan instead.',
      });
    }

    await MembershipPlan.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Membership plan deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

const getClientMemberships = async (req, res, next) => {
  try {
    const { branchId, status, expiringSoon } = req.query;
    const query = {};

    if (branchId && branchId !== 'ALL' && mongoose.Types.ObjectId.isValid(branchId)) {
      query.branchId = branchId;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    const now = new Date();
    if (expiringSoon === '7') {
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      query.expiryDate = { $gte: now, $lte: in7Days };
      query.status = 'ACTIVE';
    } else if (expiringSoon === '30') {
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      query.expiryDate = { $gte: now, $lte: in30Days };
      query.status = 'ACTIVE';
    }

    const memberships = await Membership.find(query)
      .sort({ expiryDate: 1 })
      .populate('userId', 'name email phone status')
      .populate('branchId', 'name city');

    res.status(200).json({
      success: true,
      count: memberships.length,
      memberships,
    });
  } catch (err) {
    next(err);
  }
};

const createClientMembership = async (req, res, next) => {
  try {
    const {
      userId,
      clientProfileId,
      branchId,
      planId,
      planName,
      durationDays,
      durationMonths,
      amount,
      startDate,
    } = req.body;

    if ((!userId && !clientProfileId) || (!planId && !planName)) {
      return res.status(400).json({ success: false, message: 'Client and membership plan are required.' });
    }

    const profile = clientProfileId ? await ClientProfile.findById(clientProfileId) : await ClientProfile.findOne({ userId });
    const user = userId ? await User.findById(userId) : profile?.userId ? await User.findById(profile.userId) : null;
    if (!profile && !user) return res.status(404).json({ success: false, message: 'Client not found.' });

    const targetBranchId = branchId || profile?.branchId || user?.branchId;
    if (!targetBranchId) {
      return res.status(400).json({ success: false, message: 'Client must be associated with a valid gym branch.' });
    }

    let plan = null;
    if (planId) {
      plan = await MembershipPlan.findById(planId);
    } else if (planName) {
      plan = await MembershipPlan.findOne({ name: planName });
    }

    let snapshot = {
      planId: plan ? plan._id : null,
      planName: plan ? plan.name : planName.trim(),
      branchId: targetBranchId,
      durationDays: 30,
      durationMonths: 1,
      basePrice: 0,
      joiningFee: 0,
      discountType: 'NONE',
      discountValue: 0,
      finalAmount: Number(amount) || 0,
    };

    if (plan) {
      if (!plan.isActive) {
        return res.status(400).json({ success: false, message: 'This membership plan is currently deactivated.' });
      }

      // Check branch-specific pricing
      const branchConfig = plan.branchPricing?.find(
        (bp) => bp.branchId.toString() === targetBranchId.toString()
      );

      if (branchConfig) {
        if (!branchConfig.isAvailable) {
          return res.status(400).json({
            success: false,
            message: `The plan "${plan.name}" is not available at the selected branch.`,
          });
        }
        snapshot.basePrice = branchConfig.basePrice;
        snapshot.joiningFee = branchConfig.joiningFee;
        snapshot.discountType = branchConfig.discountType;
        snapshot.discountValue = branchConfig.discountValue;
        snapshot.finalAmount = Number(amount) || branchConfig.finalPrice;
      } else {
        snapshot.basePrice = plan.price || 0;
        snapshot.finalAmount = Number(amount) || plan.price || 0;
      }

      snapshot.durationDays = plan.durationDays || (plan.durationMonths * 30) || 30;
      snapshot.durationMonths = plan.durationMonths || Math.max(1, Math.round(snapshot.durationDays / 30));
    } else {
      if (durationDays) snapshot.durationDays = Number(durationDays);
      if (durationMonths) snapshot.durationMonths = Number(durationMonths);
    }

    // Calculate expiry date using durationDays
    const sDate = startDate ? new Date(startDate) : new Date();
    const expDate = new Date(sDate.getTime() + snapshot.durationDays * 24 * 60 * 60 * 1000);

    const isDeferredPayment = req.body.paymentStatus === 'PENDING' || req.body.paymentStatus === 'PENDING_PAYMENT';
    const initialPaid =
      req.body.paidAmount !== undefined
        ? Number(req.body.paidAmount)
        : isDeferredPayment
        ? 0
        : snapshot.finalAmount;
    const allowAccessWithBalance = req.body.allowAccessWithBalance === true;
    const memStatus = snapshot.finalAmount === 0 || initialPaid >= snapshot.finalAmount || allowAccessWithBalance ? 'ACTIVE' : 'PENDING_PAYMENT';

    const membership = await Membership.create({
      userId: user?._id || null,
      clientProfileId: profile?._id || null,
      branchId: targetBranchId,
      planId: snapshot.planId,
      planName: snapshot.planName,
      status: memStatus,
      startDate: sDate,
      expiryDate: expDate,
      durationDays: snapshot.durationDays,
      durationMonths: snapshot.durationMonths,
      basePrice: snapshot.basePrice,
      joiningFee: snapshot.joiningFee,
      discountType: snapshot.discountType,
      discountValue: snapshot.discountValue,
      finalAmount: snapshot.finalAmount,
      amount: snapshot.finalAmount,
      paymentMethod: req.body.paymentMethod || 'CASH',
      assignedBy: req.user ? req.user._id : null,
    });

    let generatedInvoice = null;
    if (snapshot.finalAmount > 0) {
      let discountAmt = 0;
      if (snapshot.discountType === 'FIXED') discountAmt = snapshot.discountValue || 0;
      else if (snapshot.discountType === 'PERCENTAGE') {
        discountAmt = ((snapshot.basePrice + snapshot.joiningFee) * (snapshot.discountValue || 0)) / 100;
      }
      const finRes = await financeService.createInvoiceAndOptionalPayment({
        clientId: user?._id || null,
        clientProfileId: profile?._id || null,
        branchId: targetBranchId,
        membershipId: membership._id,
        category: 'MEMBERSHIP_PURCHASE',
        description: `Membership Assignment: ${snapshot.planName}`,
        subtotal: snapshot.basePrice || snapshot.finalAmount,
        joiningFee: snapshot.joiningFee || 0,
        discount: discountAmt,
        totalAmount: snapshot.finalAmount,
        paidAmount: Math.min(snapshot.finalAmount, Math.max(0, initialPaid)),
        paymentMethod: req.body.paymentMethod || 'CASH',
        invoiceDate: sDate,
        createdBy: req.user ? req.user._id : null,
      });
      generatedInvoice = finRes.invoice;
      if (finRes.payment) {
        membership.paymentId = finRes.payment._id;
        await membership.save();
      }
    }

    res.status(201).json({
      success: true,
      message: 'Membership assigned successfully',
      membership,
      invoice: generatedInvoice,
    });
  } catch (err) {
    next(err);
  }
};

const updateClientMembershipStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, extensionMonths, newExpiryDate } = req.body;

    const membership = await Membership.findById(id);
    if (!membership) return res.status(404).json({ success: false, message: 'Membership record not found' });

    if (action === 'RENEW') {
      const currentExpiry = new Date(membership.expiryDate);
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      const addMonths = extensionMonths ? Number(extensionMonths) : membership.durationMonths || 1;
      baseDate.setMonth(baseDate.getMonth() + addMonths);

      membership.expiryDate = baseDate;
      membership.status = 'ACTIVE';
      membership.renewalRequested = false;

      const renewAmount =
        req.body.amount !== undefined
          ? Number(req.body.amount)
          : Number(membership.finalAmount || membership.amount || 0);
      if (renewAmount > 0 && req.body.createInvoice !== false) {
        const renewPaid =
          req.body.paymentStatus === 'PENDING'
            ? 0
            : req.body.paidAmount !== undefined
            ? Number(req.body.paidAmount)
            : renewAmount;
        await financeService.createInvoiceAndOptionalPayment({
          clientId: membership.userId,
          branchId: membership.branchId,
          membershipId: membership._id,
          category: 'MEMBERSHIP_RENEWAL',
          description: `Membership Renewal: ${membership.planName}`,
          subtotal: renewAmount,
          totalAmount: renewAmount,
          paidAmount: Math.min(renewAmount, Math.max(0, renewPaid)),
          paymentMethod: req.body.paymentMethod || membership.paymentMethod || 'CASH',
          invoiceDate: new Date(),
          createdBy: req.user ? req.user._id : null,
        });
      }
    } else if (action === 'EXTEND') {
      if (newExpiryDate) {
        membership.expiryDate = new Date(newExpiryDate);
      } else if (extensionMonths) {
        const d = new Date(membership.expiryDate);
        d.setMonth(d.getMonth() + Number(extensionMonths));
        membership.expiryDate = d;
      }
      membership.status = 'ACTIVE';
    } else if (action === 'PAUSE') {
      membership.status = 'PAUSED';
    } else if (action === 'RESUME') {
      membership.status = 'ACTIVE';
    } else if (action === 'CANCEL') {
      membership.status = 'CANCELLED';
    }

    await membership.save();
    res.status(200).json({ success: true, message: `Membership action ${action} completed successfully`, membership });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 6. ATTENDANCE MANAGEMENT
// ==========================================

const getAttendanceOverview = async (req, res, next) => {
  try {
    const { branchId, date, month, year } = req.query;
    const query = {};

    if (branchId && branchId !== 'ALL' && mongoose.Types.ObjectId.isValid(branchId)) {
      query.branchId = branchId;
    }

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    query.date = { $gte: startOfDay, $lte: endOfDay };

    const records = await Attendance.find(query)
      .sort({ checkInTime: -1 })
      .populate('userId', 'name phone email')
      .populate('branchId', 'name city');

    // Monthly stats
    const selYear = year ? parseInt(year, 10) : targetDate.getFullYear();
    const selMonth = month ? parseInt(month, 10) : targetDate.getMonth();
    const monthStart = new Date(selYear, selMonth, 1);
    const monthEnd = new Date(selYear, selMonth + 1, 0, 23, 59, 59);

    const monthCount = await Attendance.countDocuments({
      ...(branchId && branchId !== 'ALL' ? { branchId } : {}),
      date: { $gte: monthStart, $lte: monthEnd },
    });

    res.status(200).json({
      success: true,
      selectedDate: startOfDay.toISOString().slice(0, 10),
      count: records.length,
      records,
      monthTotal: monthCount,
    });
  } catch (err) {
    next(err);
  }
};

const recordAttendance = async (req, res, next) => {
  try {
    const { userId, branchId, date, checkInTime, method = 'STAFF_CHECKIN' } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'Client ID is required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Client not found' });

    const attDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(attDate.getFullYear(), attDate.getMonth(), attDate.getDate());
    const endOfDay = new Date(attDate.getFullYear(), attDate.getMonth(), attDate.getDate(), 23, 59, 59);

    // Prevent duplicate attendance for the same day
    const duplicate = await Attendance.findOne({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `Attendance has already been recorded for ${user.name} on this date.`,
        record: duplicate,
      });
    }

    const record = await Attendance.create({
      userId,
      branchId: branchId || user.branchId,
      date: startOfDay,
      checkInTime: checkInTime ? new Date(checkInTime) : new Date(),
      method,
    });

    res.status(201).json({
      success: true,
      message: `Check-in recorded for ${user.name}`,
      record,
    });
  } catch (err) {
    next(err);
  }
};

const correctAttendanceRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { checkInTime, checkOutTime, action } = req.body;

    if (action === 'DELETE') {
      await Attendance.findByIdAndDelete(id);
      return res.status(200).json({ success: true, message: 'Attendance record deleted' });
    }

    const record = await Attendance.findById(id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

    if (checkInTime) record.checkInTime = new Date(checkInTime);
    if (checkOutTime) record.checkOutTime = new Date(checkOutTime);
    await record.save();

    res.status(200).json({ success: true, message: 'Attendance record updated successfully', record });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 7. WORKOUT MANAGEMENT
// ==========================================

const getExercises = async (req, res, next) => {
  try {
    const { search, category, muscleGroup } = req.query;
    const query = { isActive: true };

    if (category && category !== 'ALL') query.category = category;
    if (muscleGroup && muscleGroup !== 'ALL') query.muscleGroup = muscleGroup;
    if (search && search.trim()) query.name = { $regex: search.trim(), $options: 'i' };

    let exercises = await Exercise.find(query).sort({ muscleGroup: 1, name: 1 });

    // Seed default exercise library if empty
    if (exercises.length === 0 && !search && !category && !muscleGroup) {
      const defaultLibrary = [
        { name: 'Barbell Flat Bench Press', category: 'STRENGTH', muscleGroup: 'Chest', equipment: 'Barbell', instructions: 'Retract scapulae, touch mid-chest, drive up with leg drive.', difficulty: 'INTERMEDIATE', defaultSets: 4, defaultReps: '6-8' },
        { name: 'Incline Dumbbell Press', category: 'HYPERTROPHY', muscleGroup: 'Chest', equipment: 'Dumbbell', instructions: '30-degree incline, deep stretch at bottom, smooth lockout.', difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '8-10' },
        { name: 'Conventional Barbell Deadlift', category: 'STRENGTH', muscleGroup: 'Back', equipment: 'Barbell', instructions: 'Brace core, pull slack from bar, drive floor away.', difficulty: 'ADVANCED', defaultSets: 3, defaultReps: '5' },
        { name: 'Barbell Bent-Over Row', category: 'STRENGTH', muscleGroup: 'Back', equipment: 'Barbell', instructions: 'Hinge at hips, pull barbell to lower ribcage, keep spine neutral.', difficulty: 'INTERMEDIATE', defaultSets: 4, defaultReps: '8-10' },
        { name: 'Barbell Back Squat', category: 'STRENGTH', muscleGroup: 'Legs (Quads/Hamstrings)', equipment: 'Barbell', instructions: 'Break at knees and hips together, hit parallel or below, drive upward.', difficulty: 'ADVANCED', defaultSets: 4, defaultReps: '5-8' },
        { name: 'Leg Press', category: 'HYPERTROPHY', muscleGroup: 'Legs (Quads/Hamstrings)', equipment: 'Machine', instructions: 'Feet shoulder-width on platform, control eccentric, avoid knee locking.', difficulty: 'BEGINNER', defaultSets: 3, defaultReps: '10-12' },
        { name: 'Standing Overhead Barbell Press', category: 'STRENGTH', muscleGroup: 'Shoulders', equipment: 'Barbell', instructions: 'Squeeze glutes, press vertically clearing chin, lock overhead.', difficulty: 'ADVANCED', defaultSets: 4, defaultReps: '6-8' },
        { name: 'Lateral Dumbbell Raises', category: 'HYPERTROPHY', muscleGroup: 'Shoulders', equipment: 'Dumbbell', instructions: 'Slight torso lean, raise through scapular plane to shoulder height.', difficulty: 'BEGINNER', defaultSets: 4, defaultReps: '12-15' },
        { name: 'Barbell Biceps Curl', category: 'HYPERTROPHY', muscleGroup: 'Biceps', equipment: 'Barbell', instructions: 'Keep elbows tucked, curl without swinging, control eccentric descent.', difficulty: 'BEGINNER', defaultSets: 3, defaultReps: '10-12' },
        { name: 'Triceps Cable Pushdowns', category: 'HYPERTROPHY', muscleGroup: 'Triceps', equipment: 'Cable', instructions: 'Lock upper arms at sides, extend forearms downwards, squeeze at bottom.', difficulty: 'BEGINNER', defaultSets: 3, defaultReps: '12' },
        { name: 'Hanging Leg Raises', category: 'CORE', muscleGroup: 'Core/Abs', equipment: 'Bodyweight', instructions: 'Hang from pull-up bar, raise legs to 90 degrees or chest without swinging.', difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '12-15' },
      ];
      exercises = await Exercise.insertMany(defaultLibrary);
    }

    res.status(200).json({ success: true, count: exercises.length, exercises });
  } catch (err) {
    next(err);
  }
};

const createExercise = async (req, res, next) => {
  try {
    const { name, category, muscleGroup, equipment, instructions, difficulty, defaultSets, defaultReps } = req.body;

    if (!name) return res.status(400).json({ success: false, message: 'Exercise name is required' });

    const existing = await Exercise.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'An exercise with this name already exists' });
    }

    const ex = await Exercise.create({
      name: name.trim(),
      category: category || 'STRENGTH',
      muscleGroup: muscleGroup || 'Full Body',
      equipment: equipment || 'Barbell',
      instructions: instructions || '',
      difficulty: difficulty || 'INTERMEDIATE',
      defaultSets: Number(defaultSets) || 3,
      defaultReps: defaultReps || '8-12',
    });

    res.status(201).json({ success: true, message: 'Exercise added to library', exercise: ex });
  } catch (err) {
    next(err);
  }
};

const getWorkoutTemplates = async (req, res, next) => {
  try {
    const templates = await WorkoutPlan.find({ isTemplate: true }).sort({ createdAt: -1 });
    const assignedPlans = await WorkoutPlan.find({ isTemplate: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('assignedTo', 'name email phone')
      .populate('trainerId', 'name');

    res.status(200).json({ success: true, templates, assignedPlans });
  } catch (err) {
    next(err);
  }
};

const createWorkoutTemplate = async (req, res, next) => {
  try {
    const { title, description, goal, schedule, exercises, isTemplate = true, mode = 'TRAINER_MANAGED', assignedTo, branchId } = req.body;

    if (!title) return res.status(400).json({ success: false, message: 'Workout title is required' });

    const plan = await WorkoutPlan.create({
      title: title.trim(),
      description: description || '',
      goal: goal || 'Muscle Building',
      schedule: schedule || [],
      exercises: exercises || [],
      isTemplate: Boolean(isTemplate),
      mode,
      assignedTo: assignedTo && mongoose.Types.ObjectId.isValid(assignedTo) ? assignedTo : null,
      branchId: branchId && mongoose.Types.ObjectId.isValid(branchId) ? branchId : null,
      isActive: true,
    });

    res.status(201).json({ success: true, message: 'Workout plan created successfully', plan });
  } catch (err) {
    next(err);
  }
};

const assignWorkoutToClient = async (req, res, next) => {
  try {
    const { clientId, templateId, customTitle, exercises, schedule, mode = 'TRAINER_MANAGED' } = req.body;

    if (!clientId) return res.status(400).json({ success: false, message: 'Target client is required' });

    const client = await User.findById(clientId);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    let planData = {
      title: customTitle || 'Prescribed Training Routine',
      description: 'Custom training routine prepared by Gym Management.',
      goal: 'Muscle Building',
      schedule: schedule || [],
      exercises: exercises || [],
      mode,
    };

    if (templateId) {
      const template = await WorkoutPlan.findById(templateId);
      if (template) {
        planData.title = customTitle || template.title;
        planData.description = template.description;
        planData.goal = template.goal;
        planData.schedule = template.schedule;
        planData.exercises = template.exercises;
      }
    }

    // Deactivate previous active plans for this client
    await WorkoutPlan.updateMany({ assignedTo: clientId }, { isActive: false });

    const assignedPlan = await WorkoutPlan.create({
      ...planData,
      assignedTo: clientId,
      branchId: client.branchId,
      trainerId: req.user._id,
      isTemplate: false,
      isActive: true,
    });

    res.status(201).json({ success: true, message: `Workout routine assigned to ${client.name}`, plan: assignedPlan });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 8. PAYMENTS & FINANCE
// ==========================================

const getFinancialOverview = async (req, res, next) => {
  try {
    const { branchId } = req.query;
    const branchFilter = getBranchFilter(branchId);
    const now = new Date();

    // Today's collections
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayPayments = await Payment.find({ ...branchFilter, status: 'PAID', date: { $gte: startOfToday } });
    const todayCollections = todayPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

    // This month's collections
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthPayments = await Payment.find({ ...branchFilter, status: 'PAID', date: { $gte: startOfMonth } });
    const thisMonthCollections = thisMonthPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

    // Last month's collections
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const lastMonthPayments = await Payment.find({ ...branchFilter, status: 'PAID', date: { $gte: startOfLastMonth, $lte: endOfLastMonth } });
    const lastMonthCollections = lastMonthPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

    // Outstanding / Pending payments
    const pendingPayments = await Payment.find({ ...branchFilter, status: 'PENDING' });
    const outstandingTotal = pendingPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

    // Refunds
    const refundedPayments = await Payment.find({ ...branchFilter, status: 'REFUNDED' });
    const refundsTotal = refundedPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

    // Branch-wise revenue breakdown
    const branches = await Branch.find();
    const branchBreakdown = await Promise.all(
      branches.map(async (b) => {
        const pList = await Payment.find({ branchId: b._id, status: 'PAID', date: { $gte: startOfMonth } });
        const total = pList.reduce((acc, p) => acc + (p.amount || 0), 0);
        return { branchId: b._id, city: b.city, name: b.name, revenue: total };
      })
    );

    res.status(200).json({
      success: true,
      summary: {
        todayCollections,
        thisMonthCollections,
        lastMonthCollections,
        outstandingTotal,
        refundsTotal,
        branchBreakdown,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getPayments = async (req, res, next) => {
  try {
    const { branchId, status, search, startDate, endDate, page = 1, limit = 25 } = req.query;
    const query = {};

    if (branchId && branchId !== 'ALL' && mongoose.Types.ObjectId.isValid(branchId)) {
      query.branchId = branchId;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    if (search && search.trim()) {
      const term = search.trim();
      const matchingUsers = await User.find({ name: { $regex: term, $options: 'i' } }).select('_id');
      const userIds = matchingUsers.map((u) => u._id);

      query.$or = [
        { transactionId: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
        { userId: { $in: userIds } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const payments = await Payment.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('userId', 'name email phone')
      .populate('branchId', 'name city');

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      payments,
    });
  } catch (err) {
    next(err);
  }
};

const recordOfflinePayment = async (req, res, next) => {
  try {
    const { userId, branchId, amount, paymentMethod = 'CASH', description, date } = req.body;

    if (!userId || !amount || !description) {
      return res.status(400).json({ success: false, message: 'User ID, amount, and description are required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Client not found' });

    const txId = `MM-TXN-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const receiptNumber = await financeService.generateSequentialNumber({
      kind: 'RECEIPT',
      branchId: branchId || user.branchId,
      date: date ? new Date(date) : new Date(),
    });

    const payment = await Payment.create({
      userId,
      branchId: branchId || user.branchId,
      transactionId: txId,
      receiptNumber,
      amount: Number(amount),
      description: description.trim(),
      paymentMethod,
      status: 'PAID',
      date: date ? new Date(date) : new Date(),
      createdBy: req.user ? req.user._id : null,
    });

    const { invoice } = await financeService.createInvoiceAndOptionalPayment({
      clientId: userId,
      branchId: branchId || user.branchId,
      category: req.body.category || 'OTHER_SERVICE',
      description: description.trim(),
      subtotal: Number(amount),
      totalAmount: Number(amount),
      paymentMethod,
      invoiceDate: payment.date,
      createdBy: req.user ? req.user._id : null,
      existingPayment: payment,
    });

    // Notify after both the payment and its source-of-truth invoice have been committed.
    setImmediate(() => notificationService.queuePaymentConfirmation({
      client: user, invoice, payment, triggeredBy: req.user?._id,
    }).catch((error) => console.error('WhatsApp offline-payment notification could not be queued:', error.message)));

    res.status(201).json({
      success: true,
      message: 'Offline payment recorded successfully',
      payment,
      invoice,
    });
  } catch (err) {
    next(err);
  }
};

const updatePaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['PAID', 'PENDING', 'FAILED', 'REFUNDED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid payment status' });
    }

    const payment = await Payment.findById(id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found' });

    const oldStatus = payment.status;
    payment.status = status;
    payment.updatedBy = req.user ? req.user._id : null;
    if (status === 'REFUNDED') {
      payment.refundedAmount = payment.amount;
      payment.refundedAt = new Date();
      payment.refundedBy = req.user ? req.user._id : null;
    } else if (status === 'PAID' && !payment.receiptNumber) {
      payment.receiptNumber = await financeService.generateSequentialNumber({
        kind: 'RECEIPT',
        branchId: payment.branchId,
        date: payment.date || new Date(),
      });
    }
    payment.auditLogs.push({
      action: 'STATUS_UPDATED',
      oldStatus,
      newStatus: status,
      oldAmount: payment.amount,
      newAmount: payment.amount,
      reason: req.body.reason || `Updated by Admin`,
      userId: req.user ? req.user._id : null,
      timestamp: new Date(),
    });
    await payment.save();

    if (payment.invoiceId) {
      await financeService.recalculateInvoiceFromPayments(
        payment.invoiceId,
        req.user ? req.user._id : null,
        `Payment ${payment.transactionId} status updated to ${status}`
      );
    }

    res.status(200).json({ success: true, message: `Payment status updated to ${status}`, payment });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 9. REPORTS & ANALYTICS
// ==========================================

const getReportsData = async (req, res, next) => {
  try {
    const { reportType, branchId, startDate, endDate } = req.query;
    const branchFilter = getBranchFilter(branchId);
    const dateFilter = getDateRangeFilter('custom', startDate, endDate, 'createdAt');
    const paymentDateFilter = getDateRangeFilter('custom', startDate, endDate, 'date');

    let reportData = [];
    const now = new Date();

    switch (reportType) {
      case 'CLIENT_REGISTRATION':
        reportData = await User.find({ role: 'CLIENT', ...branchFilter, ...dateFilter })
          .sort({ createdAt: -1 })
          .populate('branchId', 'name city');
        break;

      case 'ACTIVE_MEMBERSHIP':
        reportData = await Membership.find({ ...branchFilter, status: 'ACTIVE', expiryDate: { $gte: now } })
          .sort({ expiryDate: 1 })
          .populate('userId', 'name phone email')
          .populate('branchId', 'name city');
        break;

      case 'EXPIRED_MEMBERSHIP':
        reportData = await Membership.find({ ...branchFilter, $or: [{ status: 'EXPIRED' }, { expiryDate: { $lt: now } }] })
          .sort({ expiryDate: -1 })
          .populate('userId', 'name phone email')
          .populate('branchId', 'name city');
        break;

      case 'BRANCH_PERFORMANCE':
        const allBranches = await Branch.find();
        reportData = await Promise.all(
          allBranches.map(async (b) => {
            const clients = await User.countDocuments({ role: 'CLIENT', branchId: b._id });
            const trainers = await User.countDocuments({ role: 'TRAINER', branchId: b._id });
            const active = await Membership.countDocuments({ branchId: b._id, status: 'ACTIVE', expiryDate: { $gte: now } });
            const payments = await Payment.find({ branchId: b._id, status: 'PAID' });
            const rev = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
            return { branch: b.city, name: b.name, totalClients: clients, totalTrainers: trainers, activeMemberships: active, totalRevenue: rev };
          })
        );
        break;

      case 'ATTENDANCE_REPORT':
        reportData = await Attendance.find({ ...branchFilter, ...paymentDateFilter })
          .sort({ date: -1 })
          .populate('userId', 'name phone')
          .populate('branchId', 'city');
        break;

      case 'MONTHLY_REVENUE':
      case 'PAYMENT_COLLECTION':
        reportData = await Payment.find({ ...branchFilter, ...paymentDateFilter })
          .sort({ date: -1 })
          .populate('userId', 'name phone')
          .populate('branchId', 'city');
        break;

      case 'TRAINER_PERFORMANCE':
        const trainers = await User.find({ role: 'TRAINER', ...branchFilter }).populate('branchId', 'city');
        reportData = await Promise.all(
          trainers.map(async (t) => {
            const clientCount = await ClientProfile.countDocuments({ trainerId: t._id });
            const workoutsCount = await WorkoutPlan.countDocuments({ trainerId: t._id });
            return {
              trainerName: t.name,
              branch: t.branchId?.city || 'HQ',
              email: t.email,
              phone: t.phone,
              assignedClients: clientCount,
              workoutsCreated: workoutsCount,
              status: t.status,
            };
          })
        );
        break;

      case 'CLIENT_RETENTION':
        const totalRegistered = await User.countDocuments({ role: 'CLIENT', ...branchFilter });
        const withActiveMembership = await Membership.countDocuments({ ...branchFilter, status: 'ACTIVE', expiryDate: { $gte: now } });
        const retentionRate = totalRegistered > 0 ? ((withActiveMembership / totalRegistered) * 100).toFixed(1) : 0;
        reportData = [
          { metric: 'Total Registered Clients', value: totalRegistered },
          { metric: 'Currently Active Members', value: withActiveMembership },
          { metric: 'Retention Rate', value: `${retentionRate}%` },
        ];
        break;

      default:
        reportData = [];
    }

    res.status(200).json({
      success: true,
      reportType,
      count: Array.isArray(reportData) ? reportData.length : 0,
      data: reportData,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 10. NOTIFICATIONS & ANNOUNCEMENTS
// ==========================================

const getAnnouncements = async (req, res, next) => {
  try {
    const announcements = await Notification.find({ category: 'ANNOUNCEMENT' })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('userId', 'name email');

    // Aggregate unique announcement messages
    const grouped = [];
    const seen = new Set();

    for (const a of announcements) {
      const key = `${a.title}-${a.message}`;
      if (!seen.has(key)) {
        seen.add(key);
        grouped.push({
          id: a._id,
          title: a.title,
          message: a.message,
          createdAt: a.createdAt,
        });
      }
    }

    res.status(200).json({ success: true, count: grouped.length, announcements: grouped });
  } catch (err) {
    next(err);
  }
};

const createAnnouncement = async (req, res, next) => {
  try {
    const { title, message, branchId } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    const query = { role: 'CLIENT' };
    if (branchId && branchId !== 'ALL' && mongoose.Types.ObjectId.isValid(branchId)) {
      query.branchId = branchId;
    }

    const clients = await User.find(query).select('_id');

    if (clients.length === 0) {
      return res.status(400).json({ success: false, message: 'No clients found matching the target audience.' });
    }

    const notificationsToInsert = clients.map((c) => ({
      userId: c._id,
      title: title.trim(),
      message: message.trim(),
      category: 'ANNOUNCEMENT',
      isRead: false,
    }));

    await Notification.insertMany(notificationsToInsert);

    res.status(201).json({
      success: true,
      message: `Announcement broadcast successfully to ${clients.length} athletes.`,
      recipientCount: clients.length,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 11. ENQUIRIES & LEAD MANAGEMENT
// ==========================================

const getEnquiries = async (req, res, next) => {
  try {
    const { branchId, status, search } = req.query;
    const query = {};

    if (branchId && branchId !== 'ALL' && mongoose.Types.ObjectId.isValid(branchId)) {
      query.branchId = branchId;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { phone: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const enquiries = await Enquiry.find(query)
      .sort({ createdAt: -1 })
      .populate('branchId', 'name city')
      .populate('convertedUserId', 'name email');

    res.status(200).json({ success: true, count: enquiries.length, enquiries });
  } catch (err) {
    next(err);
  }
};

const createEnquiry = async (req, res, next) => {
  try {
    const { name, phone, email, branchId, fitnessGoal, source, followUpDate, notes } = req.body;

    if (!name || !phone || !branchId) {
      return res.status(400).json({ success: false, message: 'Name, phone, and interested branch are required' });
    }

    const enquiry = await Enquiry.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.toLowerCase().trim() : '',
      branchId,
      fitnessGoal: fitnessGoal || 'General Fitness',
      source: source || 'WEBSITE',
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      notes: notes || '',
      status: 'NEW',
    });

    res.status(201).json({ success: true, message: 'Enquiry created successfully', enquiry });
  } catch (err) {
    next(err);
  }
};

const updateEnquiry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, email, branchId, fitnessGoal, status, followUpDate, notes } = req.body;

    const enquiry = await Enquiry.findById(id);
    if (!enquiry) return res.status(404).json({ success: false, message: 'Enquiry not found' });

    if (name) enquiry.name = name.trim();
    if (phone) enquiry.phone = phone.trim();
    if (email !== undefined) enquiry.email = email.toLowerCase().trim();
    if (branchId) enquiry.branchId = branchId;
    if (fitnessGoal) enquiry.fitnessGoal = fitnessGoal;
    if (status) enquiry.status = status;
    if (followUpDate !== undefined) enquiry.followUpDate = followUpDate ? new Date(followUpDate) : null;
    if (notes !== undefined) enquiry.notes = notes;

    await enquiry.save();
    res.status(200).json({ success: true, message: 'Enquiry updated successfully', enquiry });
  } catch (err) {
    next(err);
  }
};

const convertEnquiryToClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password = 'Password@123' } = req.body;

    const enquiry = await Enquiry.findById(id);
    if (!enquiry) return res.status(404).json({ success: false, message: 'Enquiry not found' });

    if (enquiry.status === 'CONVERTED' && enquiry.convertedUserId) {
      return res.status(400).json({ success: false, message: 'This enquiry has already been converted to a client.' });
    }

    const userEmail = enquiry.email || `client_${enquiry.phone.slice(-6)}@manandmachine.com`;
    const existing = await User.findOne({ email: userEmail });

    let clientUser = existing;
    if (!clientUser) {
      clientUser = await User.create({
        name: enquiry.name,
        email: userEmail,
        phone: enquiry.phone,
        password,
        branchId: enquiry.branchId,
        role: 'CLIENT',
        status: 'ACTIVE',
      });

      await ClientProfile.create({
        userId: clientUser._id,
        branchId: enquiry.branchId,
        fitnessGoal: enquiry.fitnessGoal || 'General Fitness',
        experienceLevel: 'Beginner',
      });
    }

    enquiry.status = 'CONVERTED';
    enquiry.convertedUserId = clientUser._id;
    await enquiry.save();

    res.status(200).json({
      success: true,
      message: `Enquiry converted successfully to Client Account (${clientUser.email})`,
      client: clientUser.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 12. SETTINGS
// ==========================================

const getSettings = async (req, res, next) => {
  try {
    const admin = req.user;
    const branches = await Branch.find();

    res.status(200).json({
      success: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
      },
      branchesCount: branches.length,
      system: {
        platformName: 'Man & Machine Fitness Gym Platform',
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
    });
  } catch (err) {
    next(err);
  }
};

const changeAdminPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await User.findById(req.user._id);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }

    const isMatch = await admin.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password does not match records.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long.' });
    }

    admin.password = newPassword;
    await admin.save();

    res.status(200).json({ success: true, message: 'Admin password updated successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardOverview,
  getBranches,
  createBranch,
  updateBranch,
  toggleBranchStatus,
  getBranchDetails,
  getClients,
  getClientDetails,
  createClient,
  createClientLoginAccess,
  updateClient,
  updateClientStatus,
  assignTrainer,
  changeClientBranch,
  resetClientPassword,
  getTrainers,
  getTrainerDetails,
  createTrainer,
  updateTrainer,
  updateTrainerStatus,
  deleteTrainer,
  resendTrainerInvitation,
  resetTrainerPassword,
  getTrainerBookings,
  confirmTrainerBookingPayment,
  getMembershipPlans,
  getMembershipPlanById,
  createMembershipPlan,
  updateMembershipPlan,
  toggleMembershipPlanStatus,
  duplicateMembershipPlan,
  deleteMembershipPlan,
  getClientMemberships,
  createClientMembership,
  updateClientMembershipStatus,
  getAttendanceOverview,
  recordAttendance,
  correctAttendanceRecord,
  getExercises,
  createExercise,
  getWorkoutTemplates,
  createWorkoutTemplate,
  assignWorkoutToClient,
  getFinancialOverview,
  getPayments,
  recordOfflinePayment,
  updatePaymentStatus,
  getReportsData,
  getAnnouncements,
  createAnnouncement,
  getEnquiries,
  createEnquiry,
  updateEnquiry,
  convertEnquiryToClient,
  getSettings,
  changeAdminPassword,
};
