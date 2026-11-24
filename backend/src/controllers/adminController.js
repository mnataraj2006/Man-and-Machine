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

// Helper to construct branch query filter
const getBranchFilter = (branchId) => {
  if (!branchId || branchId === 'ALL' || branchId === 'all') return {};
  if (mongoose.Types.ObjectId.isValid(branchId)) return { branchId };
  return {};
};

// Helper for date range filter
const getDateRangeFilter = (range, startDate, endDate, dateField = 'createdAt') => {
  const now = new Date();
  let filter = {};

  if (range === 'today') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    filter[dateField] = { $gte: startOfToday };
  } else if (range === '7days') {
    const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    filter[dateField] = { $gte: past7 };
  } else if (range === '30days') {
    const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    filter[dateField] = { $gte: past30 };
  } else if (range === 'thisMonth') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    filter[dateField] = { $gte: startOfMonth };
  } else if (range === 'lastMonth') {
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
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

    // 1. Total Clients
    const clientQuery = { role: 'CLIENT', ...branchFilter };
    const totalClients = await User.countDocuments(clientQuery);

    // 2. Active Memberships
    const activeMembers = await Membership.countDocuments({
      ...branchFilter,
      status: 'ACTIVE',
      expiryDate: { $gte: now },
    });

    // 3. Expired Memberships
    const expiredMemberships = await Membership.countDocuments({
      ...branchFilter,
      $or: [{ status: 'EXPIRED' }, { expiryDate: { $lt: now } }],
    });

    // 4. Total Trainers
    const trainerQuery = { role: 'TRAINER', ...branchFilter };
    const totalTrainers = await User.countDocuments(trainerQuery);

    // 5. Today's Attendance
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayAttendance = await Attendance.countDocuments({
      ...branchFilter,
      date: { $gte: startOfToday },
    });

    // 6. Monthly Revenue (Confirmed PAID only)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

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

    // 7. Pending Payments
    const pendingPaymentsCount = await Payment.countDocuments({
      ...branchFilter,
      status: 'PENDING',
    });
    const pendingPaymentsList = await Payment.find({
      ...branchFilter,
      status: 'PENDING',
    });
    const pendingPaymentsTotal = pendingPaymentsList.reduce((acc, p) => acc + (p.amount || 0), 0);

    // 8. New Enquiries
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
        activeMembers,
        expiredMemberships,
        totalTrainers,
        todayAttendance,
        monthlyRevenue,
        prevMonthlyRevenue,
        pendingPayments: pendingPaymentsCount,
        pendingPaymentsTotal,
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
    const { search, branchId, membershipStatus, accountStatus, page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = req.query;

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

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const sortOrder = order === 'asc' ? 1 : -1;

    const clients = await User.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('branchId', 'name city');

    const total = await User.countDocuments(query);
    const now = new Date();

    // Attach active membership & profile info to each client
    const clientList = await Promise.all(
      clients.map(async (c) => {
        const profile = await ClientProfile.findOne({ userId: c._id }).populate('trainerId', 'name email phone');
        const membership = await Membership.findOne({ userId: c._id }).sort({ createdAt: -1 });

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
          trainer: profile?.trainerId || null,
          membership: membership
            ? {
                planName: membership.planName,
                status: membership.status,
                expiryDate: membership.expiryDate,
                isExpired: new Date(membership.expiryDate) < now,
              }
            : null,
        };
      })
    );

    // Filter by membershipStatus in-memory if requested
    let filteredList = clientList;
    if (membershipStatus && membershipStatus !== 'ALL') {
      filteredList = clientList.filter((c) => {
        if (membershipStatus === 'NO_MEMBERSHIP') return !c.membership;
        return c.membership && c.membership.status === membershipStatus;
      });
    }

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      clients: filteredList,
    });
  } catch (err) {
    next(err);
  }
};

const getClientDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const client = await User.findOne({ _id: id, role: 'CLIENT' }).populate('branchId');
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const profile = await ClientProfile.findOne({ userId: id }).populate('trainerId', 'name email phone');
    const memberships = await Membership.find({ userId: id }).sort({ createdAt: -1 }).populate('branchId', 'city name');
    const payments = await Payment.find({ userId: id }).sort({ date: -1 }).populate('branchId', 'city');
    const attendances = await Attendance.find({ userId: id }).sort({ date: -1 }).limit(30).populate('branchId', 'city');
    const workouts = await WorkoutPlan.find({ assignedTo: id }).sort({ createdAt: -1 });
    const workoutSessions = await WorkoutSession.find({ userId: id }).sort({ date: -1 }).limit(10);
    const progressRecords = await ProgressRecord.find({ userId: id }).sort({ date: -1 }).limit(20);

    const now = new Date();
    const activeMembership = memberships.find((m) => m.status === 'ACTIVE' && new Date(m.expiryDate) >= now) || memberships[0] || null;

    res.status(200).json({
      success: true,
      client: {
        id: client._id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        status: client.status,
        branch: client.branchId,
        createdAt: client.createdAt,
      },
      profile: profile || null,
      activeMembership,
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
    const {
      name,
      email,
      phone,
      password,
      branchId,
      fitnessGoal,
      experienceLevel,
      trainerId,
      membershipPlanName,
      durationMonths = 1,
      membershipAmount = 0,
      startDate,
    } = req.body;

    if (!name || !email || !phone || !password || !branchId) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, password, and branch are required.',
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists' });
    }

    // 1. Create User
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password,
      branchId,
      role: 'CLIENT',
      status: 'ACTIVE',
    });

    // 2. Create Client Profile
    await ClientProfile.create({
      userId: user._id,
      branchId,
      fitnessGoal: fitnessGoal || 'General Fitness',
      experienceLevel: experienceLevel || 'Beginner',
      trainerId: trainerId && mongoose.Types.ObjectId.isValid(trainerId) ? trainerId : null,
      joiningDate: startDate ? new Date(startDate) : new Date(),
    });

    // 3. Optional Initial Membership
    let membership = null;
    if (membershipPlanName) {
      const sDate = startDate ? new Date(startDate) : new Date();
      const expDate = new Date(sDate);
      expDate.setMonth(expDate.getMonth() + parseInt(durationMonths, 10));

      membership = await Membership.create({
        userId: user._id,
        branchId,
        planName: membershipPlanName.trim(),
        durationMonths: parseInt(durationMonths, 10),
        amount: Number(membershipAmount) || 0,
        startDate: sDate,
        expiryDate: expDate,
        status: 'ACTIVE',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      client: user.toSafeObject(),
      membership,
    });
  } catch (err) {
    next(err);
  }
};

const updateClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, email, branchId, fitnessGoal, experienceLevel } = req.body;

    const user = await User.findOne({ _id: id, role: 'CLIENT' });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (branchId && mongoose.Types.ObjectId.isValid(branchId)) user.branchId = branchId;
    await user.save();

    let profile = await ClientProfile.findOne({ userId: id });
    if (profile) {
      if (fitnessGoal) profile.fitnessGoal = fitnessGoal;
      if (experienceLevel) profile.experienceLevel = experienceLevel;
      if (branchId && mongoose.Types.ObjectId.isValid(branchId)) profile.branchId = branchId;
      await profile.save();
    }

    res.status(200).json({ success: true, message: 'Client updated successfully', client: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
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

    const oldTrainerId = profile.trainerId;
    profile.trainerId = trainerId && mongoose.Types.ObjectId.isValid(trainerId) ? trainerId : null;
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
    const { branchId, search } = req.query;
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

    const trainers = await User.find(query).sort({ createdAt: -1 }).populate('branchId', 'name city');

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
          branch: t.branchId,
          specialization: prof?.specialization || 'Strength & Conditioning',
          experienceYears: prof?.experienceYears || 3,
          bio: prof?.bio || '',
          assignedClientCount: clientCount,
          assignedWorkoutsCount,
          createdAt: t.createdAt,
        };
      })
    );

    res.status(200).json({ success: true, count: trainersWithProfiles.length, trainers: trainersWithProfiles });
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
        branch: trainer.branchId,
        specialization: profile?.specialization || 'Strength Training',
        experienceYears: profile?.experienceYears || 3,
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
    const { name, email, phone, password, branchId, specialization, experienceYears, bio } = req.body;

    if (!name || !email || !phone || !password || !branchId) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, password, and branch are required.',
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists' });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password,
      branchId,
      role: 'TRAINER',
      status: 'ACTIVE',
    });

    await TrainerProfile.create({
      userId: user._id,
      branchId,
      specialization: specialization || 'Strength & Conditioning',
      experienceYears: Number(experienceYears) || 3,
      bio: bio || '',
      contactPhone: phone,
      contactEmail: email,
      activeClientsCount: 0,
    });

    res.status(201).json({ success: true, message: 'Trainer created successfully', trainer: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

const updateTrainer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, branchId, specialization, experienceYears, bio, status } = req.body;

    const user = await User.findOne({ _id: id, role: 'TRAINER' });
    if (!user) return res.status(404).json({ success: false, message: 'Trainer not found' });

    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();
    if (status) user.status = status;
    if (branchId && mongoose.Types.ObjectId.isValid(branchId)) user.branchId = branchId;
    await user.save();

    let prof = await TrainerProfile.findOne({ userId: id });
    if (prof) {
      if (specialization) prof.specialization = specialization;
      if (experienceYears !== undefined) prof.experienceYears = Number(experienceYears);
      if (bio !== undefined) prof.bio = bio;
      if (branchId && mongoose.Types.ObjectId.isValid(branchId)) prof.branchId = branchId;
      await prof.save();
    }

    res.status(200).json({ success: true, message: 'Trainer updated successfully' });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 5. MEMBERSHIP MANAGEMENT
// ==========================================

const getMembershipPlans = async (req, res, next) => {
  try {
    let plans = await MembershipPlan.find().sort({ displayOrder: 1, durationMonths: 1 });

    // Seed default plans if none exist
    if (plans.length === 0) {
      const defaultPlans = [
        { name: '1 Month Kickstart', code: 'MM-1M', durationMonths: 1, price: 2000, description: 'Single month full gym access with cardio and steam bath.', features: ['Full gym access', 'Steam bath included', 'Locker access', 'Trainer guidance'] },
        { name: '3 Months Quarter Pro', code: 'MM-3M', durationMonths: 3, price: 5000, description: 'Quarterly training program with body assessment.', features: ['Full gym access', 'Steam bath included', 'Free diet consultation', 'Quarterly fitness test'] },
        { name: '6 Months Half-Year Elite', code: 'MM-6M', durationMonths: 6, price: 9000, description: 'Dedicated transformation period with progress reviews.', features: ['All 3 branch access', 'Dedicated steam bath priority', 'Personalized nutrition chart', 'Strength progression tracking'] },
        { name: '12 Months Annual Champion', code: 'MM-12M', durationMonths: 12, price: 16000, description: 'Ultimate year-round athletic performance program.', features: ['All branches access', 'Free guest passes (2/month)', 'Personal coach onboarding', 'Full locker privilege', 'Complimentary shaker & tee'] },
      ];
      plans = await MembershipPlan.insertMany(defaultPlans);
    }

    res.status(200).json({ success: true, count: plans.length, plans });
  } catch (err) {
    next(err);
  }
};

const createMembershipPlan = async (req, res, next) => {
  try {
    const { name, code, durationMonths, price, description, features, branchId } = req.body;

    if (!name || !durationMonths || price === undefined) {
      return res.status(400).json({ success: false, message: 'Plan name, duration, and price are required' });
    }

    const plan = await MembershipPlan.create({
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : `MM-${durationMonths}M`,
      durationMonths: Number(durationMonths),
      price: Number(price),
      description: description ? description.trim() : '',
      features: Array.isArray(features) ? features : (features ? [features] : []),
      branchId: branchId && mongoose.Types.ObjectId.isValid(branchId) ? branchId : null,
      isActive: true,
    });

    res.status(201).json({ success: true, message: 'Plan created successfully', plan });
  } catch (err) {
    next(err);
  }
};

const updateMembershipPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, durationMonths, price, description, features, isActive } = req.body;

    const plan = await MembershipPlan.findById(id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    if (name) plan.name = name.trim();
    if (code) plan.code = code.trim().toUpperCase();
    if (durationMonths) plan.durationMonths = Number(durationMonths);
    if (price !== undefined) plan.price = Number(price);
    if (description !== undefined) plan.description = description.trim();
    if (features !== undefined) plan.features = Array.isArray(features) ? features : [features];
    if (isActive !== undefined) plan.isActive = Boolean(isActive);

    await plan.save();
    res.status(200).json({ success: true, message: 'Plan updated successfully', plan });
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
    const { userId, branchId, planName, durationMonths, amount, startDate } = req.body;

    if (!userId || !planName || !durationMonths) {
      return res.status(400).json({ success: false, message: 'User ID, plan name, and duration are required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Client not found' });

    const sDate = startDate ? new Date(startDate) : new Date();
    const expDate = new Date(sDate);
    expDate.setMonth(expDate.getMonth() + Number(durationMonths));

    const membership = await Membership.create({
      userId,
      branchId: branchId || user.branchId,
      planName: planName.trim(),
      durationMonths: Number(durationMonths),
      amount: Number(amount) || 0,
      startDate: sDate,
      expiryDate: expDate,
      status: 'ACTIVE',
    });

    res.status(201).json({ success: true, message: 'Membership assigned successfully', membership });
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

    const payment = await Payment.create({
      userId,
      branchId: branchId || user.branchId,
      transactionId: txId,
      amount: Number(amount),
      description: description.trim(),
      paymentMethod,
      status: 'PAID',
      date: date ? new Date(date) : new Date(),
    });

    res.status(201).json({
      success: true,
      message: 'Offline payment recorded successfully',
      payment,
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

    payment.status = status;
    await payment.save();

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
  updateClient,
  updateClientStatus,
  assignTrainer,
  changeClientBranch,
  resetClientPassword,
  getTrainers,
  getTrainerDetails,
  createTrainer,
  updateTrainer,
  getMembershipPlans,
  createMembershipPlan,
  updateMembershipPlan,
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
