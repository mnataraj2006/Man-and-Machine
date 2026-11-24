const User = require('../models/User');
const ClientProfile = require('../models/ClientProfile');
const Membership = require('../models/Membership');
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
const bcrypt = require('bcryptjs');

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

    const clientProfile = await ClientProfile.findOne({ userId })
      .populate('trainerId', 'name email phone');

    // 2. Fetch Active Membership
    const membership = await Membership.findOne({ userId })
      .sort({ createdAt: -1 })
      .populate('branchId', 'name city');

    // 3. Attendance Metrics
    const now = new Date();
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

    // 4. Completed Workout Sessions
    const totalCompletedWorkouts = await WorkoutSession.countDocuments({
      userId,
      status: 'COMPLETED',
    });

    const weekWorkouts = await WorkoutSession.find({
      userId,
      date: { $gte: mondayThisWeek, $lte: sundayThisWeek },
      status: 'COMPLETED',
    });

    // Build weekly chart data (Mon - Sun)
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const weeklyActivity = dayNames.map((name, index) => {
      const targetDate = new Date(mondayThisWeek);
      targetDate.setDate(mondayThisWeek.getDate() + index);
      const dateStr = targetDate.toISOString().slice(0, 10);

      const hasAttended = weekAttendances.some((a) => a.date.toISOString().slice(0, 10) === dateStr);
      const workoutCount = weekWorkouts.filter((w) => w.date.toISOString().slice(0, 10) === dateStr).length;

      return {
        day: name.slice(0, 3).toUpperCase(),
        fullName: name,
        date: dateStr,
        attended: hasAttended,
        workouts: workoutCount,
      };
    });

    // 5. Today's Workout from Active Plan
    const todayName = dayNames[distanceToMonday];
    const activeWorkoutPlan = await WorkoutPlan.findOne({
      assignedTo: userId,
      isActive: true,
    }).populate('trainerId', 'name email');

    let todaysWorkout = null;
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

    // 6. Assigned Trainer Details
    let trainerInfo = null;
    if (clientProfile?.trainerId) {
      const trainerProf = await TrainerProfile.findOne({ userId: clientProfile.trainerId._id });
      trainerInfo = {
        id: clientProfile.trainerId._id,
        name: clientProfile.trainerId.name,
        email: clientProfile.trainerId.email,
        phone: clientProfile.trainerId.phone || trainerProf?.contactPhone || '',
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

    const recentSessions = await WorkoutSession.find({ userId })
      .sort({ date: -1 })
      .limit(3);

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
      client: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        branch: user.branchId,
        fitnessGoal: clientProfile?.fitnessGoal || 'General Fitness',
        experienceLevel: clientProfile?.experienceLevel || 'Beginner',
      },
      stats: {
        attendanceThisMonth: monthlyAttendanceCount,
        completedWorkouts: totalCompletedWorkouts,
        membershipStatus: membership ? membership.status : 'INACTIVE',
        trainingStreak: streakDays,
      },
      membership: membership
        ? {
            id: membership._id,
            planName: membership.planName,
            status: membership.status,
            startDate: membership.startDate,
            expiryDate: membership.expiryDate,
            daysRemaining: getDaysRemaining(membership.expiryDate),
            renewalRequested: membership.renewalRequested,
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

    const profile = await ClientProfile.findOne({ userId })
      .populate('trainerId', 'name email phone');

    res.status(200).json({
      success: true,
      user,
      profile,
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
 * @desc    Get client's assigned workout plans
 */
const getClientWorkouts = async (req, res, next) => {
  try {
    const userId = req.user._id;
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
 * @desc    Get specific workout plan details
 */
const getWorkoutById = async (req, res, next) => {
  try {
    const userId = req.user._id;
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
 * @desc    Record completion of a workout session
 */
const logWorkoutSession = async (req, res, next) => {
  try {
    const userId = req.user._id;
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
 * @desc    Get history of completed workout sessions
 */
const getWorkoutSessions = async (req, res, next) => {
  try {
    const userId = req.user._id;
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
    const current = await Membership.findOne({ userId })
      .sort({ createdAt: -1 })
      .populate('branchId', 'name city address phone');

    const history = await Membership.find({ userId })
      .sort({ createdAt: -1 })
      .populate('branchId', 'name city');

    res.status(200).json({
      success: true,
      current: current
        ? {
            id: current._id,
            planName: current.planName,
            status: current.status,
            startDate: current.startDate,
            expiryDate: current.expiryDate,
            durationMonths: current.durationMonths,
            amount: current.amount,
            daysRemaining: getDaysRemaining(current.expiryDate),
            renewalRequested: current.renewalRequested,
            renewalRequestedAt: current.renewalRequestedAt,
            branch: current.branchId,
          }
        : null,
      history,
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
      // Create pending membership request
      membership = await Membership.create({
        userId,
        branchId: req.user.branchId || (await Branch.findOne({ city: 'Kovilpatti' }))._id,
        planName: 'Annual Athlete Elite Renewal',
        status: 'PENDING',
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        renewalRequested: true,
        renewalRequestedAt: new Date(),
      });
    } else {
      membership.renewalRequested = true;
      membership.renewalRequestedAt = new Date();
      await membership.save();
    }

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
    const profile = await ClientProfile.findOne({ userId }).populate({
      path: 'trainerId',
      select: 'name email phone branchId',
      populate: { path: 'branchId', select: 'name city' },
    });

    if (!profile || !profile.trainerId) {
      return res.status(200).json({
        success: true,
        assigned: false,
        trainer: null,
      });
    }

    const trainerUser = profile.trainerId;
    const [trainerProf, clientFacingNotes, upcomingSessions] = await Promise.all([
      TrainerProfile.findOne({ userId: trainerUser._id }),
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

    res.status(200).json({
      success: true,
      assigned: true,
      trainer: {
        id: trainerUser._id,
        name: trainerUser.name,
        email: trainerUser.email,
        phone: trainerProf?.contactPhone || trainerUser.phone,
        specialization: trainerProf?.specialization || 'Strength & Hypertrophy Conditioning',
        experienceYears: trainerProf?.experienceYears || 6,
        bio: trainerProf?.bio || 'Head Strength Coach specializing in biomechanical execution and athlete transformation.',
        branch: trainerUser.branchId,
      },
      notes: clientFacingNotes,
      upcomingSessions,
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
  requestMembershipRenewal,
  getPayments,
  getTrainer,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  changePassword,
};
