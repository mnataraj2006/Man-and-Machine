const User = require('../models/User');
const ClientProfile = require('../models/ClientProfile');
const Membership = require('../models/Membership');
const MembershipPlan = require('../models/MembershipPlan');
const Attendance = require('../models/Attendance');
const WorkoutPlan = require('../models/WorkoutPlan');
const WorkoutSession = require('../models/WorkoutSession');
const ProgressRecord = require('../models/ProgressRecord');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const TrainerProfile = require('../models/TrainerProfile');
const Branch = require('../models/Branch');
const TrainingAppointment = require('../models/TrainingAppointment');
const TrainerNote = require('../models/TrainerNote');
const TrainerBooking = require('../models/TrainerBooking');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { resolveClientTrainer } = require('../utils/trainerAssignment');

/**
 * Helper to calculate days remaining from an expiry date
 */
const getDaysRemaining = (expiryDate) => {
  if (!expiryDate) return 0;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - now;
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
};

/**
 * @route   GET /api/client/dashboard
 * @desc    Get complete client dashboard summary metrics
 * @access  Private (CLIENT)
 */
const getDashboardSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 1. Fetch Client Profile & User
    const user = await User.findById(userId)
      .select('-password')
      .populate('branchId', 'name city address phone');

    const clientProfile = await ClientProfile.findOne({ userId });
    const { trainerAssigned, trainer: activeTrainerUser } = await resolveClientTrainer(clientProfile);

    // 2. Fetch Active Membership
    const now = new Date();
    const activeMembership = await Membership.findOne({
      userId,
      status: 'ACTIVE',
      startDate: { $lte: now },
      expiryDate: { $gte: now },
    }).populate('branchId', 'name city');

    const latestMembership = !activeMembership
      ? await Membership.findOne({ userId })
          .sort({ createdAt: -1 })
          .populate('branchId', 'name city')
      : null;

    const hasActiveMembership = Boolean(activeMembership);

    // 3. Attendance Metrics
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const monthlyAttendanceCount = await Attendance.countDocuments({
      userId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    });

    // Calculate weekly attendance (Monday to Sunday of current week)
    const dayOfWeek = now.getDay(); // 0 is Sunday
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const mondayThisWeek = new Date(now);
    mondayThisWeek.setDate(now.getDate() - distanceToMonday);
    mondayThisWeek.setHours(0, 0, 0, 0);

    const sundayThisWeek = new Date(mondayThisWeek);
    sundayThisWeek.setDate(mondayThisWeek.getDate() + 6);
    sundayThisWeek.setHours(23, 59, 59, 999);

    const weekAttendances = await Attendance.find({
      userId,
      date: { $gte: mondayThisWeek, $lte: sundayThisWeek },
    });

    // 4. Completed Workout Sessions (Only if trainer assigned)
    let totalCompletedWorkouts = 0;
    let weekWorkouts = [];
    if (trainerAssigned) {
      totalCompletedWorkouts = await WorkoutSession.countDocuments({
        userId,
        status: 'COMPLETED',
      });

      weekWorkouts = await WorkoutSession.find({
        userId,
        date: { $gte: mondayThisWeek, $lte: sundayThisWeek },
        status: 'COMPLETED',
      });
    }

    // Build weekly chart data (Mon - Sun)
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const weeklyActivity = dayNames.map((name, index) => {
      const targetDate = new Date(mondayThisWeek);
      targetDate.setDate(mondayThisWeek.getDate() + index);
      const dateStr = targetDate.toISOString().slice(0, 10);

      const hasAttended = weekAttendances.some((a) => a.date.toISOString().slice(0, 10) === dateStr);
      const workoutCount = trainerAssigned
        ? weekWorkouts.filter((w) => w.date.toISOString().slice(0, 10) === dateStr).length
        : 0;

      return {
        day: name.slice(0, 3).toUpperCase(),
        fullName: name,
        date: dateStr,
        attended: hasAttended,
        workouts: workoutCount,
      };
    });

    // 5. Today's Workout from Active Plan (Only if trainer assigned)
    let todaysWorkout = null;
    if (trainerAssigned) {
      const todayName = dayNames[distanceToMonday];
      const activeWorkoutPlan = await WorkoutPlan.findOne({
        assignedTo: userId,
        isActive: true,
      }).populate('trainerId', 'name email');

      if (activeWorkoutPlan) {
        const daySchedule = activeWorkoutPlan.schedule.find((s) => s.day === todayName);
        todaysWorkout = {
          planId: activeWorkoutPlan._id,
          title: activeWorkoutPlan.title,
          day: todayName,
          focus: daySchedule ? daySchedule.focus : 'General Training',
          isRestDay: daySchedule ? daySchedule.isRestDay : false,
          trainerName: activeWorkoutPlan.trainerId ? activeWorkoutPlan.trainerId.name : null,
          exerciseCount: activeWorkoutPlan.exercises.length,
          exercises: activeWorkoutPlan.exercises.slice(0, 3), // Preview of first 3
        };
      }
    }

    // 6. Assigned Trainer Details (Only if trainer assigned)
    let trainerInfo = null;
    if (trainerAssigned && activeTrainerUser) {
      const trainerProf = await TrainerProfile.findOne({ userId: activeTrainerUser.id });
      trainerInfo = {
        id: activeTrainerUser.id,
        name: activeTrainerUser.name,
        email: activeTrainerUser.email,
        phone: activeTrainerUser.phone || trainerProf?.contactPhone || '',
        specialization: trainerProf?.specialization || 'Strength & Conditioning',
        experienceYears: trainerProf?.experienceYears || 5,
        bio: trainerProf?.bio || '',
      };
    }

    // 7. Recent Genuine Activities
    const recentAttendances = await Attendance.find({ userId })
      .sort({ date: -1 })
      .limit(3)
      .populate('branchId', 'city');

    let recentSessions = [];
    if (trainerAssigned) {
      recentSessions = await WorkoutSession.find({ userId })
        .sort({ date: -1 })
        .limit(3);
    }

    const recentNotifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(3);

    const activities = [
      ...recentAttendances.map((a) => ({
        id: a._id,
        type: 'ATTENDANCE',
        title: 'Gym Check-in Recorded',
        description: `Facility session logged at ${a.branchId?.city || 'Home'} branch`,
        timestamp: a.checkInTime || a.date,
      })),
      ...recentSessions.map((s) => ({
        id: s._id,
        type: 'WORKOUT',
        title: `Workout Completed: ${s.workoutTitle}`,
        description: `Duration: ${s.durationMinutes} mins • ${s.completedExercises.length} exercises logged`,
        timestamp: s.date,
      })),
      ...recentNotifications.map((n) => ({
        id: n._id,
        type: 'NOTIFICATION',
        title: n.title,
        description: n.message,
        timestamp: n.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);

    // 8. Streak calculation (consecutive recent check-ins)
    const allRecentDates = await Attendance.find({ userId })
      .sort({ date: -1 })
      .limit(30)
      .select('date');

    let streakDays = 0;
    if (allRecentDates.length > 0) {
      // Check if visited today or yesterday to maintain active streak
      const todayStr = now.toISOString().slice(0, 10);
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      const latestStr = allRecentDates[0].date.toISOString().slice(0, 10);
      if (latestStr === todayStr || latestStr === yesterdayStr) {
        streakDays = allRecentDates.length; // Approximate active streak count
      }
    }

    return res.status(200).json({
      success: true,
      trainerAssigned,
      client: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        branch: user.branchId,
        fitnessGoal: clientProfile?.fitnessGoal || 'General Fitness',
        experienceLevel: clientProfile?.experienceLevel || 'Beginner',
        trainerAssigned,
      },
      hasActiveMembership,
      stats: {
        attendanceThisMonth: monthlyAttendanceCount,
        completedWorkouts: totalCompletedWorkouts,
        membershipStatus: hasActiveMembership
          ? 'ACTIVE'
          : latestMembership
          ? (new Date(latestMembership.expiryDate) < now || latestMembership.status === 'EXPIRED' ? 'EXPIRED' : latestMembership.status)
          : 'NOT_ENROLLED',
        trainingStreak: streakDays,
      },
      membership: activeMembership
        ? {
            id: activeMembership._id,
            planName: activeMembership.planName,
            status: 'ACTIVE',
            startDate: activeMembership.startDate,
            expiryDate: activeMembership.expiryDate,
            daysRemaining: getDaysRemaining(activeMembership.expiryDate),
            renewalRequested: activeMembership.renewalRequested,
            trainingPreference: activeMembership.trainingPreference || 'SELF_TRAINED',
          }
        : null,
      todaysWorkout,
      weeklyActivity,
      trainer: trainerInfo,
      recentActivities: activities,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/client/profile
 * @desc    Get complete client profile details
 */
const getClientProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId)
      .select('-password')
      .populate('branchId', 'name city address phone openingHours');

    const profile = await ClientProfile.findOne({ userId });
    const { trainerAssigned, trainer } = await resolveClientTrainer(profile);

    res.status(200).json({
      success: true,
      trainerAssigned,
      user: {
        ...user.toSafeObject(),
        trainerAssigned,
      },
      profile: profile ? {
        ...profile.toObject(),
        trainerAssigned,
        trainer,
      } : null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PUT /api/client/profile
 * @desc    Update client personal info (name, phone, goals)
 */
const updateClientProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { name, phone, fitnessGoal, experienceLevel } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name && name.trim()) {
      user.name = name.trim();
    }
    if (phone && phone.trim()) {
      user.phone = phone.trim();
    }
    await user.save();

    let profile = await ClientProfile.findOne({ userId });
    if (!profile) {
      profile = new ClientProfile({
        userId,
        branchId: user.branchId,
      });
    }

    if (fitnessGoal) profile.fitnessGoal = fitnessGoal;
    if (experienceLevel) profile.experienceLevel = experienceLevel;
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: user.toSafeObject(),
      profile,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/client/workouts
 * @desc    Get client's assigned workout plans (Protected by trainer assignment)
 */
const getClientWorkouts = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const profile = await ClientProfile.findOne({ userId });
    const { trainerAssigned } = await resolveClientTrainer(profile);
    if (!trainerAssigned) {
      return res.status(403).json({
        success: false,
        trainerAssigned: false,
        message: 'My Workouts is available when you have an assigned trainer.',
      });
    }

    const plans = await WorkoutPlan.find({ assignedTo: userId })
      .sort({ createdAt: -1 })
      .populate('trainerId', 'name email');

    res.status(200).json({
      success: true,
      count: plans.length,
      plans,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/client/workouts/:id
 * @desc    Get specific workout plan details (Protected by trainer assignment & ownership)
 */
const getWorkoutById = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const profile = await ClientProfile.findOne({ userId });
    const { trainerAssigned } = await resolveClientTrainer(profile);
    if (!trainerAssigned) {
      return res.status(403).json({
        success: false,
        trainerAssigned: false,
        message: 'My Workouts is available when you have an assigned trainer.',
      });
    }

    const plan = await WorkoutPlan.findOne({
      _id: req.params.id,
      assignedTo: userId,
    }).populate('trainerId', 'name email');

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Workout plan not found or not assigned to your account.',
      });
    }

    res.status(200).json({
      success: true,
      plan,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/client/workouts/:id/sessions
 * @desc    Record completion of a workout session (Protected by trainer assignment)
 */
const logWorkoutSession = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const profile = await ClientProfile.findOne({ userId });
    const { trainerAssigned } = await resolveClientTrainer(profile);
    if (!trainerAssigned) {
      return res.status(403).json({
        success: false,
        trainerAssigned: false,
        message: 'My Workouts is available when you have an assigned trainer.',
      });
    }

    const planId = req.params.id;
    const { workoutTitle, durationMinutes, completedExercises, notes } = req.body;

    // Normalize completed exercises to support structured sets or flat representations
    const normalizedExercises = (completedExercises || []).map((ex) => {
      const exerciseName = ex.exerciseName || ex.name || 'Exercise';
      const sets = Array.isArray(ex.completedSets) && ex.completedSets.length > 0
        ? ex.completedSets
        : [
            {
              setNumber: 1,
              reps: Number(ex.reps) || 10,
              weightKg: Number(ex.weightLiftedKg || ex.weight) || 0,
              completed: true,
            },
          ];
      return {
        exerciseName,
        completedSets: sets,
      };
    });

    const session = await WorkoutSession.create({
      userId,
      workoutPlanId: planId && planId !== 'freestyle' && mongoose.Types.ObjectId.isValid(planId) ? planId : null,
      workoutTitle: workoutTitle || 'Personal Training Session',
      durationMinutes: durationMinutes || 45,
      completedExercises: normalizedExercises,
      notes: notes || '',
      status: 'COMPLETED',
      date: new Date(),
    });

    res.status(201).json({
      success: true,
      message: 'Workout session recorded successfully!',
      session,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/client/workout-sessions
 * @desc    Get history of completed workout sessions (Protected by trainer assignment)
 */
const getWorkoutSessions = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const profile = await ClientProfile.findOne({ userId });
    const { trainerAssigned } = await resolveClientTrainer(profile);
    if (!trainerAssigned) {
      return res.status(403).json({
        success: false,
        trainerAssigned: false,
        message: 'My Workouts is available when you have an assigned trainer.',
      });
    }

    const sessions = await WorkoutSession.find({ userId })
      .sort({ date: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: sessions.length,
      sessions,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/client/attendance
 * @desc    Get client attendance records, streak, and monthly calendar
 */
const getAttendance = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalThisYear = await Attendance.countDocuments({
      userId,
      date: { $gte: startOfYear },
    });

    const totalThisMonth = await Attendance.countDocuments({
      userId,
      date: { $gte: startOfMonth },
    });

    const records = await Attendance.find({ userId })
      .sort({ date: -1 })
      .limit(100)
      .populate('branchId', 'name city');

    res.status(200).json({
      success: true,
      totalThisMonth,
      totalThisYear,
      records,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/client/progress
 * @desc    Get body weight and strength progress records
 */
const getProgress = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const records = await ProgressRecord.find({ userId }).sort({ date: -1 });

    const weightRecords = records.filter((r) => r.type === 'BODY_WEIGHT');
    const strengthRecords = records.filter((r) => r.type === 'STRENGTH_PR');

    res.status(200).json({
      success: true,
      weightRecords,
      strengthRecords,
      allRecords: records,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/client/progress
 * @desc    Record new weight or strength PR entry
 */
const addProgressRecord = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { type, weightKg, exerciseName, weightLiftedKg, reps, note, date } = req.body;

    if (!type || !['BODY_WEIGHT', 'STRENGTH_PR'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Valid progress entry type is required (BODY_WEIGHT or STRENGTH_PR)',
      });
    }

    if (type === 'BODY_WEIGHT' && (!weightKg || weightKg <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Valid body weight (in kg) is required',
      });
    }

    if (type === 'STRENGTH_PR' && (!exerciseName || !weightLiftedKg)) {
      return res.status(400).json({
        success: false,
        message: 'Exercise name and weight lifted are required for strength records',
      });
    }

    const record = await ProgressRecord.create({
      userId,
      type,
      weightKg: type === 'BODY_WEIGHT' ? Number(weightKg) : null,
      exerciseName: type === 'STRENGTH_PR' ? exerciseName.trim() : '',
      weightLiftedKg: type === 'STRENGTH_PR' ? Number(weightLiftedKg) : null,
      reps: type === 'STRENGTH_PR' && reps ? Number(reps) : null,
      note: note ? note.trim() : '',
      date: date ? new Date(date) : new Date(),
    });

    res.status(201).json({
      success: true,
      message: 'Progress recorded successfully',
      record,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/client/membership
 * @desc    Get current membership and renewal options
 */
const getMembership = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    const activeMembership = await Membership.findOne({
      userId,
      status: 'ACTIVE',
      startDate: { $lte: now },
      expiryDate: { $gte: now },
    }).populate('branchId', 'name city address phone');

    const history = await Membership.find({ userId })
      .sort({ createdAt: -1 })
      .populate('branchId', 'name city');

    const hasActiveMembership = Boolean(activeMembership);
    const hasMembership = history.length > 0;

    const membershipPayload = activeMembership
      ? {
          id: activeMembership._id,
          planName: activeMembership.planName,
          status: 'ACTIVE',
          startDate: activeMembership.startDate,
          expiryDate: activeMembership.expiryDate,
          durationDays: activeMembership.durationDays || 30,
          durationMonths: activeMembership.durationMonths || 1,
          amount: activeMembership.finalAmount || activeMembership.amount || 0,
          finalAmount: activeMembership.finalAmount || activeMembership.amount || 0,
          basePrice: activeMembership.basePrice || 0,
          joiningFee: activeMembership.joiningFee || 0,
          discountValue: activeMembership.discountValue || 0,
          daysRemaining: getDaysRemaining(activeMembership.expiryDate),
          trainingPreference: activeMembership.trainingPreference || 'SELF_TRAINED',
          renewalRequested: activeMembership.renewalRequested,
          renewalRequestedAt: activeMembership.renewalRequestedAt,
          branch: activeMembership.branchId,
        }
      : null;

    res.status(200).json({
      success: true,
      hasMembership,
      hasActiveMembership,
      membership: membershipPayload,
      current: membershipPayload,
      history,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/client/membership/plans
 * @route   GET /api/membership-plans/available
 * @desc    Get active membership plans with branch-specific pricing for client
 */
const getAvailableMembershipPlans = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    let branchId = user?.branchId;
    if (!branchId) {
      const defaultBranch = (await Branch.findOne({ city: 'Kovilpatti' })) || (await Branch.findOne());
      branchId = defaultBranch ? defaultBranch._id : null;
    }

    const plans = await MembershipPlan.find({ isActive: true })
      .sort({ displayOrder: 1, createdAt: -1 })
      .populate('branchPricing.branchId', 'name city code');

    const availablePlans = [];

    for (const plan of plans) {
      // Find branch pricing for client's branch
      let branchConfig = null;
      if (branchId && plan.branchPricing && plan.branchPricing.length > 0) {
        branchConfig = plan.branchPricing.find(
          (bp) =>
            bp.branchId &&
            (bp.branchId._id?.toString() === branchId.toString() ||
              bp.branchId.toString() === branchId.toString())
        );
      }

      // If branchConfig exists and isAvailable
      if (branchConfig && branchConfig.isAvailable) {
        availablePlans.push({
          _id: plan._id,
          name: plan.name,
          code: plan.code,
          description: plan.description,
          planType: plan.planType,
          durationDays: plan.durationDays || 30,
          durationMonths: plan.durationMonths || 1,
          benefits: plan.benefits && plan.benefits.length > 0 ? plan.benefits : plan.features || [],
          basePrice: branchConfig.basePrice,
          joiningFee: branchConfig.joiningFee || 0,
          discountType: branchConfig.discountType || 'NONE',
          discountValue: branchConfig.discountValue || 0,
          finalPrice: branchConfig.finalPrice,
          branch: branchConfig.branchId,
        });
      } else if (!branchConfig && (!plan.branchPricing || plan.branchPricing.length === 0)) {
        // Fallback if no branch-specific pricing configured yet
        availablePlans.push({
          _id: plan._id,
          name: plan.name,
          code: plan.code,
          description: plan.description,
          planType: plan.planType,
          durationDays: plan.durationDays || 30,
          durationMonths: plan.durationMonths || 1,
          benefits: plan.benefits && plan.benefits.length > 0 ? plan.benefits : plan.features || [],
          basePrice: plan.price || 1500,
          joiningFee: 0,
          discountType: 'NONE',
          discountValue: 0,
          finalPrice: plan.price || 1500,
          branch: null,
        });
      }
    }

    const clientBranch = await Branch.findById(branchId).select('name city code');

    res.status(200).json({
      success: true,
      count: availablePlans.length,
      branch: clientBranch,
      plans: availablePlans,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Helper to check whether a slot is already booked for a trainer on a given date
 */
const checkSlotConflict = async (trainerId, date, startTime) => {
  const targetDate = new Date(`${date}T00:00:00.000Z`);
  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);

  // 1. Check TrainerBooking
  const existingBooking = await TrainerBooking.findOne({
    trainerId,
    date: { $gte: targetDate, $lt: nextDate },
    startTime,
    bookingStatus: { $in: ['CONFIRMED', 'PENDING_PAYMENT'] },
    paymentStatus: { $ne: 'FAILED' },
  });

  if (existingBooking) return true;

  // 2. Check TrainingAppointment
  const [hStr] = (startTime || '06:00').split(' ');
  let [hour] = hStr.split(':').map(Number);
  if (startTime?.includes('PM') && hour !== 12) hour += 12;
  if (startTime?.includes('AM') && hour === 12) hour = 0;

  const slotStart = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`);
  const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);

  const existingApt = await TrainingAppointment.findOne({
    trainerId,
    scheduledAt: { $gte: slotStart, $lt: slotEnd },
    status: 'SCHEDULED',
  });

  return Boolean(existingApt);
};

/**
 * @route   POST /api/client/membership/checkout
 * @desc    Validate plan, training preference, calculate price breakdown before payment
 */
const checkoutMembership = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { planId, trainingPreference = 'SELF_TRAINED', trainerId, date, startTime } = req.body;

    if (!planId) {
      return res.status(400).json({ success: false, message: 'Membership plan selection is required.' });
    }

    const user = await User.findById(userId);
    const plan = await MembershipPlan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ success: false, message: 'Selected membership plan is inactive or no longer available.' });
    }

    const branchId = user.branchId;
    let branchConfig = (plan.branchPricing || []).find(
      (bp) => bp.branchId?.toString() === branchId?.toString()
    );

    if (branchConfig && !branchConfig.isAvailable) {
      return res.status(400).json({
        success: false,
        message: `Plan "${plan.name}" is not currently available at your registered branch.`,
      });
    }

    const basePrice = branchConfig ? branchConfig.basePrice : plan.price || 1500;
    const joiningFee = branchConfig ? branchConfig.joiningFee || 0 : 0;
    const discountValue = branchConfig ? branchConfig.discountValue || 0 : 0;
    const planTotal = branchConfig ? branchConfig.finalPrice : basePrice;

    let trainerInfo = null;
    let trainerPrice = 0;

    if (trainingPreference === 'PERSONAL_TRAINER') {
      if (!trainerId) {
        return res.status(400).json({ success: false, message: 'Please select a coach for Personal Trainer training preference.' });
      }

      const trainerUser = await User.findOne({ _id: trainerId, role: 'TRAINER', status: 'ACTIVE' });
      if (!trainerUser) {
        return res.status(404).json({ success: false, message: 'Selected trainer is inactive or does not exist.' });
      }

      const trainerProf = await TrainerProfile.findOne({ userId: trainerId });
      trainerPrice = trainerProf?.pricing?.singleSession?.price || 500;

      trainerInfo = {
        id: trainerUser._id,
        name: trainerUser.name,
        specialization: trainerProf?.specialization || 'Strength & Conditioning',
        sessionPrice: trainerPrice,
        date: date || null,
        startTime: startTime || null,
      };

      if (date && startTime) {
        const isConflict = await checkSlotConflict(trainerId, date, startTime);
        if (isConflict) {
          return res.status(409).json({
            success: false,
            message: `The selected time slot (${startTime} on ${date}) is already booked for this trainer. Please choose another slot.`,
          });
        }
      }
    }

    const grandTotal = planTotal + trainerPrice;

    res.status(200).json({
      success: true,
      checkout: {
        plan: {
          id: plan._id,
          name: plan.name,
          durationDays: plan.durationDays || 30,
          durationMonths: plan.durationMonths || 1,
          basePrice,
          joiningFee,
          discountValue,
          finalPrice: planTotal,
        },
        trainingPreference,
        trainer: trainerInfo,
        pricing: {
          membershipPrice: basePrice,
          joiningFee,
          discount: discountValue,
          planPayable: planTotal,
          trainerFee: trainerPrice,
          grandTotal,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/client/membership/purchase
 * @desc    Purchase membership with Self-Trained or Personal Trainer preference
 */
const purchaseMembership = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      planId,
      trainingPreference = 'SELF_TRAINED',
      trainerId,
      date,
      startTime,
      paymentMethod = 'UPI',
      instantConfirm = true,
      notes = '',
    } = req.body;

    if (!planId) {
      return res.status(400).json({ success: false, message: 'Membership plan is required.' });
    }

    const clientUser = await User.findById(userId);
    let clientProfile = await ClientProfile.findOne({ userId });
    if (!clientProfile) {
      clientProfile = await ClientProfile.create({
        userId,
        branchId: clientUser.branchId,
      });
    }

    const branchId = clientUser.branchId || clientProfile.branchId;
    const plan = await MembershipPlan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ success: false, message: 'Selected plan is inactive or no longer exists.' });
    }

    // Branch pricing snapshot
    let branchConfig = (plan.branchPricing || []).find(
      (bp) => bp.branchId?.toString() === branchId?.toString()
    );

    if (branchConfig && !branchConfig.isAvailable) {
      return res.status(400).json({
        success: false,
        message: `Plan "${plan.name}" is not currently available at your branch.`,
      });
    }

    const basePrice = branchConfig ? branchConfig.basePrice : plan.price || 1500;
    const joiningFee = branchConfig ? branchConfig.joiningFee || 0 : 0;
    const discountType = branchConfig ? branchConfig.discountType || 'NONE' : 'NONE';
    const discountValue = branchConfig ? branchConfig.discountValue || 0 : 0;
    const planPayable = branchConfig ? branchConfig.finalPrice : basePrice;

    let trainerUser = null;
    let trainerProf = null;
    let trainerPrice = 0;
    let appointmentId = null;
    let bookingId = null;

    if (trainingPreference === 'PERSONAL_TRAINER') {
      if (!trainerId) {
        return res.status(400).json({ success: false, message: 'Coach selection is required for Personal Trainer track.' });
      }
      if (!date || !startTime) {
        return res.status(400).json({ success: false, message: 'Session date and time slot are required for coach booking.' });
      }

      trainerUser = await User.findOne({ _id: trainerId, role: 'TRAINER', status: 'ACTIVE' });
      if (!trainerUser) {
        return res.status(404).json({ success: false, message: 'Selected coach is unavailable or inactive.' });
      }

      trainerProf = await TrainerProfile.findOne({ userId: trainerId });
      trainerPrice = trainerProf?.pricing?.singleSession?.price || 500;

      // Anti-Double Booking Atomic Check
      const hasConflict = await checkSlotConflict(trainerId, date, startTime);
      if (hasConflict) {
        return res.status(409).json({
          success: false,
          message: `Scheduling Conflict: The ${startTime} slot is already booked for ${trainerUser.name}. Please select another slot.`,
        });
      }
    }

    const grandTotal = planPayable + trainerPrice;
    const durationDays = plan.durationDays || 30;
    const durationMonths = plan.durationMonths || Math.max(1, Math.round(durationDays / 30));
    const now = new Date();
    const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const isPaid = Boolean(instantConfirm);
    const paymentStatus = isPaid ? 'PAID' : 'PENDING';
    const membershipStatus = isPaid ? 'ACTIVE' : 'PENDING';

    // 1. Create Payment Record
    const paymentRef = `TXN-MEM-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const payment = await Payment.create({
      userId,
      branchId,
      transactionId: paymentRef,
      description: `Membership Purchase: ${plan.name} (${trainingPreference === 'PERSONAL_TRAINER' ? `With Coach ${trainerUser?.name}` : 'Self-Trained'})`,
      amount: grandTotal,
      paymentMethod: paymentMethod === 'COUNTER' ? 'CASH' : paymentMethod || 'UPI',
      status: paymentStatus,
      date: now,
    });

    // 2. Create Membership Record with Historical Snapshot
    const membership = await Membership.create({
      userId,
      branchId,
      planId: plan._id,
      planName: plan.name,
      status: membershipStatus,
      startDate: now,
      expiryDate,
      durationDays,
      durationMonths,
      basePrice,
      joiningFee,
      discountType,
      discountValue,
      finalAmount: grandTotal,
      amount: grandTotal,
      trainingPreference,
      trainerId: trainingPreference === 'PERSONAL_TRAINER' && isPaid ? trainerId : null,
      paymentMethod,
      paymentId: payment._id,
    });

    clientProfile.membershipId = membership._id.toString();

    // 3. Handle Trainer Track if selected
    if (trainingPreference === 'PERSONAL_TRAINER') {
      const bookingRef = `MM-TB-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
      const targetDate = new Date(`${date}T00:00:00.000Z`);

      // Calculate hour & end time
      const [hStr] = (startTime || '06:00').split(' ');
      let [hour] = hStr.split(':').map(Number);
      if (startTime?.includes('PM') && hour !== 12) hour += 12;
      if (startTime?.includes('AM') && hour === 12) hour = 0;
      const scheduledDateTime = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`);

      const endHour = (hour + 1) % 24;
      const end12 = endHour % 12 === 0 ? 12 : endHour % 12;
      const endAmPm = endHour < 12 ? 'AM' : 'PM';
      const endTime = `${String(end12).padStart(2, '0')}:00 ${endAmPm}`;

      if (isPaid) {
        // Confirmed Appointment
        const appointment = await TrainingAppointment.create({
          trainerId,
          clientId: userId,
          branchId,
          scheduledAt: scheduledDateTime,
          durationMinutes: 60,
          sessionType: 'Personal Training',
          status: 'SCHEDULED',
          notes: notes || `Membership Onboarding Session (${plan.name})`,
        });
        appointmentId = appointment._id;

        // Auto-assign Trainer to ClientProfile
        clientProfile.trainerId = trainerId;
        clientProfile.trainingPreference = 'PERSONAL_TRAINER';
      }

      const booking = await TrainerBooking.create({
        bookingReference: bookingRef,
        clientId: userId,
        trainerId,
        branchId,
        serviceType: 'SINGLE_SESSION',
        serviceTitle: `Session: ${trainerUser.name} (${plan.name})`,
        date: targetDate,
        startTime,
        endTime,
        durationMinutes: 60,
        amount: trainerPrice,
        paymentMethod,
        paymentStatus: isPaid ? 'PAID' : 'PENDING_PAYMENT',
        bookingStatus: isPaid ? 'CONFIRMED' : 'PENDING_PAYMENT',
        transactionId: paymentRef,
        appointmentId,
        paymentId: payment._id,
        notes: (notes || '').trim(),
      });
      bookingId = booking._id;

      // Send Coach assignment notification
      if (isPaid) {
        await Notification.create({
          userId,
          title: 'Coach Assigned & Session Booked!',
          message: `Coach ${trainerUser.name} is now your assigned trainer. Your onboarding session is set for ${date} at ${startTime}. My Workouts is now active!`,
          category: 'TRAINER',
        });
        await Notification.create({
          userId: trainerId,
          title: 'New Client Assigned!',
          message: `Athlete ${clientUser.name} has enrolled in ${plan.name} and scheduled a session with you on ${date} at ${startTime}.`,
          category: 'TRAINER',
        });
      }
    } else {
      // Self-Trained: ensure trainerId is null
      if (isPaid) {
        clientProfile.trainerId = null;
        clientProfile.trainingPreference = 'SELF_TRAINED';
        await Notification.create({
          userId,
          title: 'Membership Activated!',
          message: `Your ${plan.name} membership is active! Enjoy full access to all facility floor stations across your branch.`,
          category: 'MEMBERSHIP',
        });
      }
    }

    await clientProfile.save();

    res.status(201).json({
      success: true,
      message: isPaid
        ? 'Membership purchased and activated successfully!'
        : 'Membership request submitted. Please complete payment at branch reception.',
      membership,
      trainerAssigned: Boolean(trainingPreference === 'PERSONAL_TRAINER' && isPaid),
      paymentStatus,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/client/membership/renewal-request
 * @desc    Create a membership renewal request
 */
const requestMembershipRenewal = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let membership = await Membership.findOne({ userId }).sort({ createdAt: -1 });

    if (!membership) {
      return res.status(400).json({
        success: false,
        message: 'No existing membership record found to renew. Please purchase a membership plan.',
      });
    }

    membership.renewalRequested = true;
    membership.renewalRequestedAt = new Date();
    await membership.save();

    // Create confirmation in-app notification
    await Notification.create({
      userId,
      title: 'Renewal Request Submitted',
      message: 'Your membership renewal request has been transmitted to branch management. Our staff will confirm your renewal shortly.',
      category: 'MEMBERSHIP',
    });

    res.status(200).json({
      success: true,
      message: 'Renewal request submitted to your branch. Management will confirm your renewal.',
      membership,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/client/payments
 * @desc    Get payment ledger and transaction records
 */
const getPayments = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const payments = await Payment.find({ userId })
      .sort({ date: -1 })
      .populate('branchId', 'name city');

    const totalPaid = payments
      .filter((p) => p.status === 'PAID')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);

    res.status(200).json({
      success: true,
      totalPaid,
      count: payments.length,
      payments,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/client/trainer
 * @desc    Get assigned trainer profile and notes
 */
const getTrainer = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const profile = await ClientProfile.findOne({ userId });
    const { trainerAssigned, trainer } = await resolveClientTrainer(profile);

    if (!trainerAssigned || !trainer) {
      return res.status(200).json({
        success: true,
        assigned: false,
        hasTrainer: false,
        trainer: null,
        assignedTrainer: null,
        message: 'No active personal coach is currently assigned to your account.',
      });
    }

    const trainerUser = await User.findById(trainer.id).populate('branchId', 'name city');
    const [trainerProf, clientFacingNotes, upcomingSessions] = await Promise.all([
      TrainerProfile.findOne({ userId: trainer.id }),
      TrainerNote.find({
        clientId: userId,
        visibility: 'CLIENT_FACING',
      }).sort({ createdAt: -1 }),
      TrainingAppointment.find({
        clientId: userId,
        scheduledAt: { $gte: new Date() },
        status: 'SCHEDULED',
      }).sort({ scheduledAt: 1 }),
    ]);

    const coachPayload = {
      id: trainerUser._id,
      name: trainerUser.name,
      email: trainerUser.email,
      phone: trainerProf?.contactPhone || trainerUser.phone,
      specialization: trainerProf?.specialization || 'Strength & Conditioning',
      experienceYears: trainerProf?.experienceYears || 5,
      bio: trainerProf?.bio || '',
      branch: trainerUser.branchId,
      rating: trainerProf?.rating || 4.9,
      pricing: trainerProf?.pricing || {
        singleSession: { price: 500, enabled: true },
        package10: { price: 4500, sessionsCount: 10, enabled: true },
        monthlyPT: { price: 6000, enabled: true },
      },
    };

    res.status(200).json({
      success: true,
      assigned: true,
      hasTrainer: true,
      trainer: coachPayload,
      assignedTrainer: coachPayload,
      notes: clientFacingNotes,
      upcomingSessions,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Helper to generate available 1-hour time slots
 */
const generateTimeSlots = (startTime = '06:00', endTime = '21:00', breakPeriods = []) => {
  const slots = [];
  const [startH] = (startTime || '06:00').split(':').map(Number);
  const [endH] = (endTime || '21:00').split(':').map(Number);

  for (let h = startH; h < endH; h++) {
    const inBreak = (breakPeriods || []).some((b) => {
      const [bStart] = (b.startTime || '12:00').split(':').map(Number);
      const [bEnd] = (b.endTime || '16:00').split(':').map(Number);
      return h >= bStart && h < bEnd;
    });

    if (!inBreak) {
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      const ampm = h < 12 ? 'AM' : 'PM';
      const formatted = `${String(hour12).padStart(2, '0')}:00 ${ampm}`;
      const nextH = h + 1;
      const next12 = nextH % 12 === 0 ? 12 : nextH % 12;
      const nextAmPm = nextH < 12 ? 'AM' : 'PM';
      const endFormatted = `${String(next12).padStart(2, '0')}:00 ${nextAmPm}`;

      slots.push({
        time: formatted,
        endTime: endFormatted,
        military: `${String(h).padStart(2, '0')}:00`,
      });
    }
  }
  return slots;
};

/**
 * @route   GET /api/client/trainers
 * @desc    Browse verified, active coaches available for client bookings
 */
const getAvailableTrainers = async (req, res, next) => {
  try {
    const { branchId } = req.query;
    const clientUser = await User.findById(req.user._id);
    const clientBranchId = branchId || clientUser?.branchId;

    const query = { role: 'TRAINER', status: 'ACTIVE' };
    if (clientBranchId && clientBranchId !== 'ALL') {
      query.branchId = clientBranchId;
    }

    const trainerUsers = await User.find(query)
      .select('name email phone branchId avatar')
      .populate('branchId', 'name city address');

    const trainerIds = trainerUsers.map((u) => u._id);
    const profiles = await TrainerProfile.find({
      userId: { $in: trainerIds },
      isAvailable: { $ne: false },
      acceptingClients: { $ne: false },
    });

    const profileMap = new Map();
    profiles.forEach((p) => profileMap.set(p.userId.toString(), p));

    const result = trainerUsers.map((u) => {
      const prof = profileMap.get(u._id.toString());
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        phone: prof?.contactPhone || u.phone,
        branch: u.branchId,
        specialization: prof?.specialization || 'Strength & Conditioning',
        experienceYears: prof?.experienceYears || 5,
        bio: prof?.bio || 'Certified fitness professional dedicated to biomechanical precision and progressive overload.',
        rating: prof?.rating || 4.9,
        ratingCount: prof?.ratingCount || 18,
        activeClientsCount: prof?.activeClientsCount || 0,
        isAvailable: prof?.isAvailable !== false,
        acceptingClients: prof?.acceptingClients !== false,
        pricing: prof?.pricing || {
          singleSession: { price: 500, enabled: true },
          package10: { price: 4500, sessionsCount: 10, enabled: true },
          monthlyPT: { price: 6000, enabled: true },
        },
        availability: prof?.availability || {
          workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          startTime: '06:00',
          endTime: '21:00',
        },
      };
    });

    res.status(200).json({
      success: true,
      count: result.length,
      trainers: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/client/trainers/:trainerId
 * @desc    Get detailed public coach profile with packages and availability schedule
 */
const getTrainerPublicProfile = async (req, res, next) => {
  try {
    const { trainerId } = req.params;

    const trainerUser = await User.findOne({
      _id: trainerId,
      role: 'TRAINER',
      status: 'ACTIVE',
    }).populate('branchId', 'name city address phone');

    if (!trainerUser) {
      return res.status(404).json({
        success: false,
        message: 'Trainer profile not found or currently inactive.',
      });
    }

    const profile = await TrainerProfile.findOne({ userId: trainerId });

    res.status(200).json({
      success: true,
      trainer: {
        _id: trainerUser._id,
        name: trainerUser.name,
        email: trainerUser.email,
        phone: profile?.contactPhone || trainerUser.phone,
        branch: trainerUser.branchId,
        specialization: profile?.specialization || 'Strength & Hypertrophy Conditioning',
        experienceYears: profile?.experienceYears || 5,
        bio: profile?.bio || '',
        rating: profile?.rating || 4.9,
        ratingCount: profile?.ratingCount || 18,
        pricing: profile?.pricing || {
          singleSession: { price: 500, enabled: true },
          package10: { price: 4500, sessionsCount: 10, enabled: true },
          monthlyPT: { price: 6000, enabled: true },
        },
        availability: profile?.availability || {
          workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          startTime: '06:00',
          endTime: '21:00',
          breakPeriods: [{ startTime: '12:00', endTime: '16:00' }],
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/client/trainers/:trainerId/availability
 * @desc    Calculate real available time slots for a specific date (anti-conflict)
 */
const getTrainerAvailability = async (req, res, next) => {
  try {
    const { trainerId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'A target date (YYYY-MM-DD) is required.',
      });
    }

    const trainer = await User.findOne({ _id: trainerId, role: 'TRAINER', status: 'ACTIVE' });
    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found or inactive.',
      });
    }

    const trainerProf = await TrainerProfile.findOne({ userId: trainerId });
    const availConfig = trainerProf?.availability || {
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      startTime: '06:00',
      endTime: '21:00',
      breakPeriods: [{ startTime: '12:00', endTime: '16:00' }],
      blockedDates: [],
    };

    // Calculate day of week
    const targetDate = new Date(`${date}T00:00:00`);
    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' });

    // Verify trainer working day
    const isWorkingDay = (availConfig.workingDays || []).some(
      (d) => d.toLowerCase() === dayOfWeek.toLowerCase()
    );

    // Verify blocked date
    const isBlocked = (availConfig.blockedDates || []).some(
      (bDate) => new Date(bDate).toISOString().slice(0, 10) === date
    );

    if (!isWorkingDay || isBlocked) {
      return res.status(200).json({
        success: true,
        date,
        dayOfWeek,
        available: false,
        workingHours: 'Unavailable',
        slots: [],
        message: `Trainer is not taking sessions on ${dayOfWeek}s. Please pick another day.`,
      });
    }

    // Generate candidate slots
    const candidateSlots = generateTimeSlots(
      availConfig.startTime,
      availConfig.endTime,
      availConfig.breakPeriods
    );

    // Query booked slots from TrainerBooking AND TrainingAppointment
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const [existingBookings, existingAppointments] = await Promise.all([
      TrainerBooking.find({
        trainerId,
        date: { $gte: startOfDay, $lte: endOfDay },
        bookingStatus: { $in: ['CONFIRMED', 'PENDING_PAYMENT'] },
        paymentStatus: { $ne: 'FAILED' },
      }).select('startTime'),
      TrainingAppointment.find({
        trainerId,
        scheduledAt: { $gte: startOfDay, $lte: endOfDay },
        status: { $ne: 'CANCELLED' },
      }).select('scheduledAt'),
    ]);

    const bookedSet = new Set();
    existingBookings.forEach((b) => bookedSet.add(b.startTime));
    existingAppointments.forEach((apt) => {
      const aptStr = new Date(apt.scheduledAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      bookedSet.add(aptStr);
    });

    const evaluatedSlots = candidateSlots.map((s) => ({
      time: s.time,
      endTime: s.endTime,
      available: !bookedSet.has(s.time),
      status: bookedSet.has(s.time) ? 'Booked' : 'Available',
    }));

    res.status(200).json({
      success: true,
      date,
      dayOfWeek,
      available: true,
      workingHours: `${availConfig.startTime} - ${availConfig.endTime}`,
      totalSlots: evaluatedSlots.length,
      availableCount: evaluatedSlots.filter((s) => s.available).length,
      slots: evaluatedSlots,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/client/trainers/:trainerId/book
 * @desc    Book personal coaching session / package with conflict check & conditional assignment
 */
const bookTrainerSession = async (req, res, next) => {
  try {
    const clientId = req.user._id;
    const { trainerId } = req.params;
    const {
      serviceType = 'SINGLE_SESSION',
      date,
      startTime,
      paymentMethod = 'UPI',
      instantConfirm = false,
      notes = '',
    } = req.body;

    if (!date || !startTime) {
      return res.status(400).json({
        success: false,
        message: 'Session date and start time slot are required.',
      });
    }

    // 1. Verify Trainer
    const trainerUser = await User.findOne({
      _id: trainerId,
      role: 'TRAINER',
      status: 'ACTIVE',
    }).populate('branchId', 'name city');

    if (!trainerUser) {
      return res.status(404).json({
        success: false,
        message: 'The requested trainer is not available or inactive.',
      });
    }

    const trainerProf = await TrainerProfile.findOne({ userId: trainerId });
    if (trainerProf && trainerProf.acceptingClients === false) {
      return res.status(400).json({
        success: false,
        message: 'This coach is currently at capacity and not accepting new clients.',
      });
    }

    // 2. Conflict Validation (prevent double booking)
    const targetDate = new Date(`${date}T00:00:00.000Z`);
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const existingConflict = await TrainerBooking.findOne({
      trainerId,
      date: { $gte: startOfDay, $lte: endOfDay },
      startTime,
      bookingStatus: { $in: ['CONFIRMED', 'PENDING_PAYMENT'] },
      paymentStatus: { $ne: 'FAILED' },
    });

    if (existingConflict) {
      return res.status(409).json({
        success: false,
        message: `Scheduling Conflict: The ${startTime} slot is already booked for this trainer. Please choose another available slot.`,
      });
    }

    // 3. Resolve Pricing & Service
    let amount = 500;
    let serviceTitle = '1-on-1 Personal Coaching Session';
    let totalSessions = 1;

    if (serviceType === 'PACKAGE_10') {
      amount = trainerProf?.pricing?.package10?.price || 4500;
      serviceTitle = '10-Session Progressive Training Package';
      totalSessions = 10;
    } else if (serviceType === 'MONTHLY_PT') {
      amount = trainerProf?.pricing?.monthlyPT?.price || 6000;
      serviceTitle = 'Monthly Dedicated Coaching Program';
      totalSessions = 24;
    } else {
      amount = trainerProf?.pricing?.singleSession?.price || 500;
      serviceTitle = '1-on-1 Personal Coaching Session';
      totalSessions = 1;
    }

    // 4. Calculate End Time
    const [timeVal, ampm] = startTime.split(' ');
    let [hour] = timeVal.split(':').map(Number);
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    const endHour = (hour + 1) % 24;
    const end12 = endHour % 12 === 0 ? 12 : endHour % 12;
    const endAmPm = endHour < 12 ? 'AM' : 'PM';
    const endTime = `${String(end12).padStart(2, '0')}:00 ${endAmPm}`;

    const scheduledDateTime = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`);

    const bookingReference = `MM-TB-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    // Client Profile reference
    const clientProfile = await ClientProfile.findOne({ userId: clientId });
    const clientUser = await User.findById(clientId);
    const branchId = trainerUser.branchId?._id || clientProfile?.branchId;

    let bookingStatus = 'PENDING_PAYMENT';
    let paymentStatus = 'PENDING_PAYMENT';
    let paymentId = null;
    let appointmentId = null;

    if (instantConfirm) {
      bookingStatus = 'CONFIRMED';
      paymentStatus = 'PAID';

      // Create Payment Ledger Entry
      const payment = await Payment.create({
        userId: clientId,
        branchId,
        transactionId: `TXN-${bookingReference}`,
        description: `Coach Booking: ${trainerUser.name} (${serviceTitle})`,
        amount,
        paymentMethod: paymentMethod || 'UPI',
        status: 'PAID',
        date: new Date(),
      });
      paymentId = payment._id;

      // Schedule Training Appointment
      const appointment = await TrainingAppointment.create({
        trainerId,
        clientId,
        branchId,
        scheduledAt: scheduledDateTime,
        durationMinutes: 60,
        sessionType: 'Personal Training',
        status: 'SCHEDULED',
        notes: notes || `Booked via Client Portal (${serviceTitle})`,
      });
      appointmentId = appointment._id;

      // Assign Trainer to Client Profile
      if (clientProfile) {
        clientProfile.trainerId = trainerId;
        await clientProfile.save();
      }

      // Update Trainer client count
      if (trainerProf) {
        trainerProf.activeClientsCount = (trainerProf.activeClientsCount || 0) + 1;
        await trainerProf.save();
      }

      // Notification for Client
      await Notification.create({
        userId: clientId,
        title: 'Trainer Booking Confirmed!',
        message: `Your booking with ${trainerUser.name} for ${date} at ${startTime} has been confirmed. Coach ${trainerUser.name} is now assigned to your profile!`,
        category: 'TRAINER',
      });

      // Notification for Trainer
      await Notification.create({
        userId: trainerId,
        title: 'New Client Session Booked',
        message: `Athlete ${clientUser?.name || 'Client'} has booked a ${serviceTitle} session for ${date} at ${startTime}.`,
        category: 'TRAINER',
      });
    } else {
      // Pending workflow (Pay at reception or pending confirmation)
      bookingStatus = 'PENDING_PAYMENT';
      paymentStatus = 'PENDING_PAYMENT';

      const payment = await Payment.create({
        userId: clientId,
        branchId,
        transactionId: `TXN-PENDING-${bookingReference}`,
        description: `Trainer Booking (Pending Payment at Desk) - ${trainerUser.name}`,
        amount,
        paymentMethod: paymentMethod === 'COUNTER' ? 'CASH' : (paymentMethod || 'CASH'),
        status: 'PENDING',
        date: new Date(),
      });
      paymentId = payment._id;

      await Notification.create({
        userId: clientId,
        title: 'Booking Request Submitted',
        message: `Your session booking with ${trainerUser.name} is reserved. Please settle ₹${amount} at branch reception to activate your coach and workout splits.`,
        category: 'PAYMENTS',
      });
    }

    // Normalize serviceType
    let normalizedServiceType = 'SINGLE_SESSION';
    if (serviceType === 'PACKAGE_10' || String(serviceType).includes('10')) {
      normalizedServiceType = 'PACKAGE_10';
    } else if (serviceType === 'MONTHLY_PT' || String(serviceType).toLowerCase().includes('monthly')) {
      normalizedServiceType = 'MONTHLY_PT';
    }

    const booking = await TrainerBooking.create({
      bookingReference,
      clientId,
      trainerId,
      branchId,
      serviceType: normalizedServiceType,
      serviceTitle,
      date: targetDate,
      startTime,
      endTime,
      durationMinutes: 60,
      amount,
      paymentMethod,
      paymentStatus,
      bookingStatus,
      transactionId: `TXN-${bookingReference}`,
      totalSessions,
      sessionsRemaining: totalSessions,
      appointmentId,
      paymentId,
      notes: notes.trim(),
    });

    res.status(201).json({
      success: true,
      message: instantConfirm
        ? 'Payment confirmed and trainer successfully assigned to your profile!'
        : 'Booking reserved! Please settle payment at branch reception to confirm assignment.',
      booking,
      trainerAssigned: instantConfirm,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/client/my-trainer-bookings
 * @desc    Get client's history of trainer bookings and packages
 */
const getClientBookings = async (req, res, next) => {
  try {
    const clientId = req.user._id;
    const bookings = await TrainerBooking.find({ clientId })
      .populate('trainerId', 'name email phone avatar')
      .populate('branchId', 'name city')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/client/notifications
 * @desc    Get client notifications
 */
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { category } = req.query;

    const query = { userId };
    if (category && category !== 'ALL') {
      query.category = category;
    }

    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    res.status(200).json({
      success: true,
      unreadCount,
      count: notifications.length,
      notifications,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PUT /api/client/notifications/:id/read
 * @desc    Mark specific notification as read
 */
const markNotificationAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId },
      { isRead: true },
      { new: true }
    );

    res.status(200).json({
      success: true,
      notification: notif,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PUT /api/client/notifications/read-all
 * @desc    Mark all notifications as read
 */
const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await Notification.updateMany({ userId, isRead: false }, { isRead: true });

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PUT /api/client/settings/password
 * @desc    Change user account password
 */
const changePassword = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long.',
      });
    }

    const user = await User.findById(userId);
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password does not match.',
      });
    }

    user.password = newPassword;
    await user.save();

    // Log security notification
    await Notification.create({
      userId,
      title: 'Password Updated',
      message: 'Your account password was updated successfully. If you did not make this change, please alert management immediately.',
      category: 'MEMBERSHIP',
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardSummary,
  getClientProfile,
  updateClientProfile,
  getClientWorkouts,
  getWorkoutById,
  logWorkoutSession,
  getWorkoutSessions,
  getAttendance,
  getProgress,
  addProgressRecord,
  getMembership,
  getAvailableMembershipPlans,
  checkoutMembership,
  purchaseMembership,
  requestMembershipRenewal,
  getPayments,
  getTrainer,
  getAvailableTrainers,
  getTrainerPublicProfile,
  getTrainerAvailability,
  bookTrainerSession,
  getClientBookings,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  changePassword,
};
