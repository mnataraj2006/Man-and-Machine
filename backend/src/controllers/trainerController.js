const User = require('../models/User');
const ClientProfile = require('../models/ClientProfile');
const TrainerProfile = require('../models/TrainerProfile');
const Membership = require('../models/Membership');
const Attendance = require('../models/Attendance');
const WorkoutPlan = require('../models/WorkoutPlan');
const WorkoutSession = require('../models/WorkoutSession');
const ProgressRecord = require('../models/ProgressRecord');
const Notification = require('../models/Notification');
const TrainingAppointment = require('../models/TrainingAppointment');
const TrainerNote = require('../models/TrainerNote');
const Exercise = require('../models/Exercise');
const Branch = require('../models/Branch');
const TrainerBooking = require('../models/TrainerBooking');
const bcrypt = require('bcryptjs');

/**
 * Helper to verify that a client is assigned to this trainer
 * Returns true if assigned or if user is ADMIN; throws/returns false otherwise
 */
const verifyClientAssigned = async (trainerId, clientId, userRole = 'TRAINER') => {
  if (userRole === 'ADMIN') return true;
  const clientProfile = await ClientProfile.findOne({ userId: clientId });
  if (!clientProfile || !clientProfile.trainerId) return false;
  return clientProfile.trainerId.toString() === trainerId.toString();
};

/**
 * @route   GET /api/trainer/dashboard
 * @desc    Trainer overview: 6 KPIs, today's schedule, assigned clients, recent completions
 * @access  Private (TRAINER, ADMIN)
 */
const getDashboardOverview = async (req, res, next) => {
  try {
    const trainerId = req.user._id;

    // 1. Fetch Trainer User & Profile
    const trainerUser = await User.findById(trainerId).select('-password').populate('branchId', 'name city');
    const trainerProfile = await TrainerProfile.findOne({ userId: trainerId });

    // 2. Dates setup
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 3. KPI 1: Active Assigned Clients
    const assignedClientProfiles = await ClientProfile.find({ trainerId })
      .populate('userId', 'name email phone avatar status branchId')
      .populate('branchId', 'name city');

    const activeClientsCount = assignedClientProfiles.filter(
      (cp) => cp.userId && cp.userId.status !== 'INACTIVE'
    ).length;

    // 4. KPI 2: Today's Scheduled Sessions
    const todaySessions = await TrainingAppointment.find({
      trainerId,
      scheduledAt: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate('clientId', 'name email phone avatar')
      .populate('branchId', 'name city')
      .sort({ scheduledAt: 1 });

    const todaySessionsCount = todaySessions.filter((s) => s.status !== 'CANCELLED').length;

    // 5. KPI 3: Completed Sessions This Month
    const completedSessionsThisMonth = await TrainingAppointment.countDocuments({
      trainerId,
      status: 'COMPLETED',
      updatedAt: { $gte: startOfMonth, $lte: endOfMonth },
    });

    // 6. KPI 4: Active Workout Plans Created/Managed
    const activeWorkoutPlansCount = await WorkoutPlan.countDocuments({
      trainerId,
      isActive: true,
      status: 'PUBLISHED',
    });

    // 7. KPI 5: Pending Client Progress Assessments (clients with no assessment in last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const clientUserIds = assignedClientProfiles.map((cp) => cp.userId?._id).filter(Boolean);

    const recentAssessments = await ProgressRecord.find({
      userId: { $in: clientUserIds },
      date: { $gte: thirtyDaysAgo },
    }).distinct('userId');

    const pendingAssessmentsCount = Math.max(0, clientUserIds.length - recentAssessments.length);

    // 8. KPI 6: Completion & Attendance Rate
    const totalScheduledThisMonth = await TrainingAppointment.countDocuments({
      trainerId,
      scheduledAt: { $gte: startOfMonth, $lte: endOfMonth },
      status: { $in: ['COMPLETED', 'MISSED', 'SCHEDULED'] },
    });
    const attendanceRate = totalScheduledThisMonth > 0
      ? Math.round((completedSessionsThisMonth / totalScheduledThisMonth) * 100)
      : 100;

    // 9. Recent completed sessions
    const recentCompletions = await TrainingAppointment.find({
      trainerId,
      status: 'COMPLETED',
    })
      .populate('clientId', 'name email')
      .sort({ updatedAt: -1 })
      .limit(5);

    // 10. Unread notifications count
    const unreadNotificationsCount = await Notification.countDocuments({
      userId: trainerId,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      trainer: {
        id: trainerUser._id,
        name: trainerUser.name,
        email: trainerUser.email,
        phone: trainerProfile?.contactPhone || trainerUser.phone,
        specialization: trainerProfile?.specialization || 'Strength & Hypertrophy Conditioning',
        experienceYears: trainerProfile?.experienceYears || 5,
        bio: trainerProfile?.bio || '',
        branch: trainerUser.branchId,
      },
      kpis: {
        activeClients: activeClientsCount,
        todaySessions: todaySessionsCount,
        completedSessionsThisMonth,
        activeWorkoutPlans: activeWorkoutPlansCount,
        pendingAssessments: pendingAssessmentsCount,
        attendanceRate,
      },
      todaySchedule: todaySessions,
      assignedClients: assignedClientProfiles.map((cp) => ({
        id: cp.userId?._id,
        name: cp.userId?.name,
        email: cp.userId?.email,
        phone: cp.userId?.phone,
        fitnessGoal: cp.fitnessGoal,
        experienceLevel: cp.experienceLevel,
        joiningDate: cp.joiningDate,
        branch: cp.branchId,
      })),
      recentCompletions,
      unreadNotificationsCount,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/trainer/clients
 * @desc    Get all clients assigned to the logged-in trainer with search/filter
 * @access  Private (TRAINER, ADMIN)
 */
const getMyClients = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { search, goal } = req.query;

    const query = { trainerId };

    const clientProfiles = await ClientProfile.find(query)
      .populate('userId', 'name email phone avatar status branchId')
      .populate('branchId', 'name city')
      .sort({ createdAt: -1 });

    const clientUserIds = clientProfiles.map((cp) => cp.userId?._id).filter(Boolean);

    // Fetch active memberships, active workout plans, and latest session dates in parallel
    const [memberships, activePlans, lastSessions] = await Promise.all([
      Membership.find({ userId: { $in: clientUserIds } }).sort({ createdAt: -1 }),
      WorkoutPlan.find({ assignedTo: { $in: clientUserIds }, isActive: true }),
      TrainingAppointment.find({
        trainerId,
        clientId: { $in: clientUserIds },
        status: 'COMPLETED',
      }).sort({ scheduledAt: -1 }),
    ]);

    let results = clientProfiles
      .filter((cp) => cp.userId)
      .map((cp) => {
        const userIdStr = cp.userId._id.toString();
        const clientMembership = memberships.find((m) => m.userId.toString() === userIdStr);
        const activePlan = activePlans.find((p) => p.assignedTo.toString() === userIdStr);
        const lastSession = lastSessions.find((s) => s.clientId.toString() === userIdStr);

        return {
          id: cp.userId._id,
          name: cp.userId.name,
          email: cp.userId.email,
          phone: cp.userId.phone,
          status: cp.userId.status,
          branch: cp.branchId,
          fitnessGoal: cp.fitnessGoal,
          experienceLevel: cp.experienceLevel,
          joiningDate: cp.joiningDate,
          membership: clientMembership
            ? {
                planName: clientMembership.planName,
                status: clientMembership.status,
                endDate: clientMembership.endDate,
              }
            : null,
          activePlan: activePlan
            ? {
                id: activePlan._id,
                title: activePlan.title,
                goal: activePlan.goal,
                status: activePlan.status,
              }
            : null,
          lastSessionDate: lastSession ? lastSession.scheduledAt : null,
        };
      });

    // In-memory search & goal filter
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.includes(q)
      );
    }

    if (goal && goal !== 'ALL') {
      results = results.filter(
        (c) => c.fitnessGoal?.toLowerCase() === goal.toLowerCase()
      );
    }

    res.status(200).json({
      success: true,
      count: results.length,
      clients: results,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/trainer/clients/:clientId
 * @desc    Client 360 Dossier: Profile, read-only membership, workout history, progress records, trainer notes
 * @access  Private (TRAINER, ADMIN)
 */
const getClientDetails = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { clientId } = req.params;

    // Strict security check: Client must be assigned to this trainer
    const isAssigned = await verifyClientAssigned(trainerId, clientId, req.user.role);
    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to access this client\'s profile.',
      });
    }

    // Fetch complete client dossier
    const [
      clientUser,
      clientProfile,
      membership,
      activePlan,
      recentSessions,
      progressRecords,
      trainerNotes,
      upcomingAppointments,
    ] = await Promise.all([
      User.findById(clientId).select('-password').populate('branchId', 'name city address phone'),
      ClientProfile.findOne({ userId: clientId }).populate('branchId', 'name city'),
      Membership.findOne({ userId: clientId }).sort({ createdAt: -1 }),
      WorkoutPlan.findOne({ assignedTo: clientId, isActive: true }),
      WorkoutSession.find({ userId: clientId }).sort({ date: -1 }).limit(10),
      ProgressRecord.find({ userId: clientId }).sort({ date: -1 }),
      TrainerNote.find({ trainerId, clientId }).sort({ createdAt: -1 }),
      TrainingAppointment.find({
        trainerId,
        clientId,
        scheduledAt: { $gte: new Date() },
        status: 'SCHEDULED',
      }).sort({ scheduledAt: 1 }),
    ]);

    if (!clientUser) {
      return res.status(404).json({
        success: false,
        message: 'Client not found.',
      });
    }

    res.status(200).json({
      success: true,
      client: {
        id: clientUser._id,
        name: clientUser.name,
        email: clientUser.email,
        phone: clientUser.phone,
        status: clientUser.status,
        branch: clientUser.branchId,
        profile: clientProfile,
        membership: membership
          ? {
              id: membership._id,
              planName: membership.planName,
              status: membership.status,
              startDate: membership.startDate,
              endDate: membership.endDate,
              renewalRequested: membership.renewalRequested,
            }
          : null,
        activePlan,
        recentSessions,
        progressRecords,
        trainerNotes,
        upcomingAppointments,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/trainer/clients/:clientId/progress
 * @desc    Get client progress history (body weight, strength PRs, trainer assessments)
 * @access  Private (TRAINER, ADMIN)
 */
const getClientProgress = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { clientId } = req.params;

    const isAssigned = await verifyClientAssigned(trainerId, clientId, req.user.role);
    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view this client\'s progress.',
      });
    }

    const records = await ProgressRecord.find({ userId: clientId })
      .populate('recordedBy', 'name role')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: records.length,
      records,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/trainer/clients/:clientId/progress
 * @desc    Record trainer assessment or progress milestone for client
 * @access  Private (TRAINER, ADMIN)
 */
const addClientProgressAssessment = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { clientId } = req.params;
    const {
      type = 'ASSESSMENT',
      weightKg,
      exerciseName,
      weightLiftedKg,
      reps,
      postureScore,
      mobilityNotes,
      recommendations,
      metrics,
      note,
      date,
    } = req.body;

    const isAssigned = await verifyClientAssigned(trainerId, clientId, req.user.role);
    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot add assessments for unassigned clients.',
      });
    }

    const record = await ProgressRecord.create({
      userId: clientId,
      recordedBy: trainerId,
      source: 'TRAINER_ASSESSMENT',
      type: type || 'ASSESSMENT',
      weightKg: weightKg ? Number(weightKg) : null,
      exerciseName: exerciseName || '',
      weightLiftedKg: weightLiftedKg ? Number(weightLiftedKg) : null,
      reps: reps ? Number(reps) : null,
      note: note || '',
      trainerAssessment: {
        postureScore: postureScore ? Number(postureScore) : null,
        mobilityNotes: mobilityNotes || '',
        recommendations: recommendations || '',
        metrics: metrics || {},
      },
      date: date ? new Date(date) : new Date(),
    });

    // Notify client about new trainer assessment
    await Notification.create({
      userId: clientId,
      title: 'New Trainer Assessment Logged',
      message: `Your coach ${req.user.name} recorded a new physical assessment and coaching feedback for your profile.`,
      category: 'TRAINER',
    });

    res.status(201).json({
      success: true,
      message: 'Client assessment recorded successfully',
      record,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/trainer/clients/:clientId/workouts
 * @desc    Get all workout plans and history for client
 * @access  Private (TRAINER, ADMIN)
 */
const getClientWorkouts = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { clientId } = req.params;

    const isAssigned = await verifyClientAssigned(trainerId, clientId, req.user.role);
    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view this client\'s workout plans.',
      });
    }

    const plans = await WorkoutPlan.find({ assignedTo: clientId }).sort({ createdAt: -1 });
    const sessions = await WorkoutSession.find({ userId: clientId }).sort({ date: -1 }).limit(20);

    res.status(200).json({
      success: true,
      plans,
      sessions,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/trainer/clients/:clientId/attendance
 * @desc    Get gym attendance records for client
 * @access  Private (TRAINER, ADMIN)
 */
const getClientAttendance = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { clientId } = req.params;

    const isAssigned = await verifyClientAssigned(trainerId, clientId, req.user.role);
    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view this client\'s attendance.',
      });
    }

    const attendance = await Attendance.find({ userId: clientId })
      .populate('branchId', 'name city')
      .sort({ date: -1 })
      .limit(60);

    res.status(200).json({
      success: true,
      count: attendance.length,
      attendance,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/trainer/clients/:clientId/notes
 * @desc    Get trainer notes for client (both private and client-facing for trainer)
 * @access  Private (TRAINER, ADMIN)
 */
const getClientNotes = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { clientId } = req.params;

    const isAssigned = await verifyClientAssigned(trainerId, clientId, req.user.role);
    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot view notes for unassigned clients.',
      });
    }

    const notes = await TrainerNote.find({ trainerId, clientId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: notes.length,
      notes,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/trainer/clients/:clientId/notes
 * @desc    Create trainer note for client (handles PRIVATE vs CLIENT_FACING)
 * @access  Private (TRAINER, ADMIN)
 */
const createClientNote = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { clientId } = req.params;
    const { title, content, noteType = 'GENERAL', visibility = 'PRIVATE', actionRequired = false } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required for note.',
      });
    }

    const isAssigned = await verifyClientAssigned(trainerId, clientId, req.user.role);
    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot create notes for unassigned clients.',
      });
    }

    const note = await TrainerNote.create({
      trainerId,
      clientId,
      title: title.trim(),
      content: content.trim(),
      noteType,
      visibility,
      actionRequired: Boolean(actionRequired),
    });

    // If client facing, notify the client
    if (visibility === 'CLIENT_FACING') {
      await Notification.create({
        userId: clientId,
        title: `Coach Feedback: ${title}`,
        message: content,
        category: 'TRAINER',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Note saved successfully',
      note,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PUT /api/trainer/notes/:noteId
 * @desc    Update trainer note
 * @access  Private (TRAINER, ADMIN)
 */
const updateClientNote = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { noteId } = req.params;
    const { title, content, noteType, visibility, actionRequired } = req.body;

    const note = await TrainerNote.findOne({ _id: noteId, trainerId });
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found or access denied.',
      });
    }

    if (title) note.title = title.trim();
    if (content) note.content = content.trim();
    if (noteType) note.noteType = noteType;
    if (visibility) note.visibility = visibility;
    if (actionRequired !== undefined) note.actionRequired = Boolean(actionRequired);

    await note.save();

    res.status(200).json({
      success: true,
      message: 'Note updated successfully',
      note,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   DELETE /api/trainer/notes/:noteId
 * @desc    Delete trainer note
 * @access  Private (TRAINER, ADMIN)
 */
const deleteClientNote = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { noteId } = req.params;

    const note = await TrainerNote.findOneAndDelete({ _id: noteId, trainerId });
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found or access denied.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Note deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/trainer/workouts
 * @desc    Get workout plans created by or managed by this trainer
 * @access  Private (TRAINER, ADMIN)
 */
const getWorkoutPlans = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { status, goal, search } = req.query;

    const query = {
      $or: [{ trainerId }, { isTemplate: true }],
    };

    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (goal && goal !== 'ALL') {
      query.goal = goal;
    }

    let plans = await WorkoutPlan.find(query)
      .populate('assignedTo', 'name email phone avatar')
      .populate('branchId', 'name city')
      .sort({ updatedAt: -1 });

    if (search) {
      const q = search.toLowerCase();
      plans = plans.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.assignedTo?.name?.toLowerCase().includes(q)
      );
    }

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
 * @route   GET /api/trainer/workouts/:workoutId
 * @desc    Get workout plan details
 * @access  Private (TRAINER, ADMIN)
 */
const getWorkoutPlanById = async (req, res, next) => {
  try {
    const { workoutId } = req.params;

    const plan = await WorkoutPlan.findById(workoutId)
      .populate('assignedTo', 'name email phone')
      .populate('branchId', 'name city');

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Workout plan not found.',
      });
    }

    if (
      req.user.role !== 'ADMIN' &&
      plan.trainerId &&
      plan.trainerId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view workout plans assigned to your own coaching roster.',
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
 * @route   POST /api/trainer/workouts
 * @desc    Create workout plan (Draft or Published, Multi-Day Split, Exercises)
 * @access  Private (TRAINER, ADMIN)
 */
const createWorkoutPlan = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const {
      title,
      description,
      goal = 'Muscle Building',
      trainingLevel = 'Intermediate',
      weeklyFrequency = 4,
      trainerInstructions,
      assignedTo,
      schedule = [],
      exercises = [],
      status = 'PUBLISHED',
      isTemplate = false,
      startDate,
      endDate,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Workout plan title is required.',
      });
    }

    // If assigned to a client, verify client is assigned to this trainer
    if (assignedTo) {
      const isAssigned = await verifyClientAssigned(trainerId, assignedTo, req.user.role);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You cannot assign plans to unassigned clients.',
        });
      }
    }

    // If publishing directly to client, deactivate existing active plans for this client
    if (status === 'PUBLISHED' && assignedTo) {
      await WorkoutPlan.updateMany(
        { assignedTo, isActive: true },
        { isActive: false }
      );
    }

    const plan = await WorkoutPlan.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      goal,
      trainingLevel,
      weeklyFrequency: Number(weeklyFrequency) || 4,
      trainerInstructions: trainerInstructions ? trainerInstructions.trim() : '',
      trainerId,
      branchId: req.user.branchId || null,
      assignedTo: assignedTo || null,
      schedule,
      exercises,
      status,
      isTemplate: Boolean(isTemplate),
      isActive: status === 'PUBLISHED',
      mode: 'TRAINER_MANAGED',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    });

    // Notify client if published
    if (status === 'PUBLISHED' && assignedTo) {
      await Notification.create({
        userId: assignedTo,
        title: 'New Workout Plan Assigned',
        message: `Coach ${req.user.name} published a new training plan: "${title}". View your updated program in your dashboard.`,
        category: 'WORKOUT',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Workout plan created successfully',
      plan,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PUT /api/trainer/workouts/:workoutId
 * @desc    Update workout plan
 * @access  Private (TRAINER, ADMIN)
 */
const updateWorkoutPlan = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { workoutId } = req.params;
    const updateData = req.body;

    const plan = await WorkoutPlan.findById(workoutId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Workout plan not found.',
      });
    }

    // Permission check
    if (req.user.role !== 'ADMIN' && plan.trainerId && plan.trainerId.toString() !== trainerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit plans you created.',
      });
    }

    // If assignedTo is being updated, verify assignment
    if (updateData.assignedTo && updateData.assignedTo !== plan.assignedTo?.toString()) {
      const isAssigned = await verifyClientAssigned(trainerId, updateData.assignedTo, req.user.role);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Cannot assign plan to an unassigned client.',
        });
      }
    }

    // If transitioning to published for client
    if (updateData.status === 'PUBLISHED' && (updateData.assignedTo || plan.assignedTo)) {
      const targetClientId = updateData.assignedTo || plan.assignedTo;
      await WorkoutPlan.updateMany(
        { assignedTo: targetClientId, _id: { $ne: plan._id }, isActive: true },
        { isActive: false }
      );
      updateData.isActive = true;

      await Notification.create({
        userId: targetClientId,
        title: 'Workout Plan Updated',
        message: `Your coach updated your workout plan: "${updateData.title || plan.title}".`,
        category: 'WORKOUT',
      });
    }

    Object.assign(plan, updateData);
    await plan.save();

    res.status(200).json({
      success: true,
      message: 'Workout plan updated successfully',
      plan,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/trainer/workouts/:workoutId/publish
 * @desc    Publish a workout plan to assigned client
 * @access  Private (TRAINER, ADMIN)
 */
const publishWorkoutPlan = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { workoutId } = req.params;

    const plan = await WorkoutPlan.findById(workoutId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Workout plan not found.',
      });
    }

    if (!plan.assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Please assign this workout plan to a client before publishing.',
      });
    }

    // Verify client is assigned to trainer
    const isAssigned = await verifyClientAssigned(trainerId, plan.assignedTo, req.user.role);
    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'Cannot publish plan for an unassigned client.',
      });
    }

    // Deactivate previous active plans for client
    await WorkoutPlan.updateMany(
      { assignedTo: plan.assignedTo, _id: { $ne: plan._id } },
      { isActive: false }
    );

    plan.status = 'PUBLISHED';
    plan.isActive = true;
    await plan.save();

    // Send in-app notification to client
    await Notification.create({
      userId: plan.assignedTo,
      title: 'New Workout Plan Published',
      message: `Your coach ${req.user.name} has published "${plan.title}" as your active workout program.`,
      category: 'WORKOUT',
    });

    res.status(200).json({
      success: true,
      message: 'Workout plan published and activated for client.',
      plan,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/trainer/workouts/:workoutId/duplicate
 * @desc    Duplicate an existing workout plan as a new draft
 * @access  Private (TRAINER, ADMIN)
 */
const duplicateWorkoutPlan = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { workoutId } = req.params;

    const original = await WorkoutPlan.findById(workoutId);
    if (!original) {
      return res.status(404).json({
        success: false,
        message: 'Workout plan not found to duplicate.',
      });
    }

    const cloned = await WorkoutPlan.create({
      title: `${original.title} (Copy)`,
      description: original.description,
      goal: original.goal,
      trainingLevel: original.trainingLevel,
      weeklyFrequency: original.weeklyFrequency,
      trainerInstructions: original.trainerInstructions,
      trainerId,
      branchId: req.user.branchId || original.branchId,
      assignedTo: null,
      schedule: original.schedule,
      exercises: original.exercises,
      status: 'DRAFT',
      isActive: false,
      isTemplate: false,
      mode: 'TRAINER_MANAGED',
    });

    res.status(201).json({
      success: true,
      message: 'Plan duplicated as draft',
      plan: cloned,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/trainer/exercises
 * @desc    Get exercise library for workout builder
 * @access  Private (TRAINER, ADMIN)
 */
const getExercises = async (req, res, next) => {
  try {
    const exercises = await Exercise.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json({
      success: true,
      count: exercises.length,
      exercises,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/trainer/exercises
 * @desc    Add custom exercise to library
 * @access  Private (TRAINER, ADMIN)
 */
const createExercise = async (req, res, next) => {
  try {
    const { name, category, primaryMuscle, targetMuscles, instructions, equipment } = req.body;
    if (!name || !primaryMuscle) {
      return res.status(400).json({
        success: false,
        message: 'Exercise name and primary muscle are required.',
      });
    }

    const exercise = await Exercise.create({
      name: name.trim(),
      category: category || 'Strength',
      primaryMuscle,
      targetMuscles: targetMuscles || [primaryMuscle],
      instructions: instructions || '',
      equipment: equipment || 'Barbell',
      branchId: req.user.branchId || null,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Exercise added to library',
      exercise,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/trainer/schedule
 * @desc    Get trainer appointments with date range filter
 * @access  Private (TRAINER, ADMIN)
 */
const getSchedule = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { start, end } = req.query;

    const query = { trainerId };

    if (start && end) {
      query.scheduledAt = {
        $gte: new Date(start),
        $lte: new Date(end),
      };
    }

    const appointments = await TrainingAppointment.find(query)
      .populate('clientId', 'name email phone avatar')
      .populate('branchId', 'name city')
      .sort({ scheduledAt: 1 });

    res.status(200).json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/trainer/schedule
 * @desc    Schedule training session with client (includes conflict validation)
 * @access  Private (TRAINER, ADMIN)
 */
const scheduleSession = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { clientId, scheduledAt, durationMinutes = 60, sessionType = 'Personal Training', notes = '' } = req.body;

    if (!clientId || !scheduledAt) {
      return res.status(400).json({
        success: false,
        message: 'Client ID and scheduled time are required.',
      });
    }

    // 1. Verify client is assigned to this trainer
    const isAssigned = await verifyClientAssigned(trainerId, clientId, req.user.role);
    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only schedule sessions with your assigned clients.',
      });
    }

    const sessionStart = new Date(scheduledAt);
    const sessionEnd = new Date(sessionStart.getTime() + Number(durationMinutes) * 60000);

    // 2. Conflict validation: Check for overlapping appointments for this trainer
    const conflict = await TrainingAppointment.findOne({
      trainerId,
      status: 'SCHEDULED',
      scheduledAt: {
        $lt: sessionEnd,
        $gt: new Date(sessionStart.getTime() - 60 * 60000), // Within overlap window
      },
    });

    if (conflict) {
      const conflictStart = new Date(conflict.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return res.status(400).json({
        success: false,
        message: `Scheduling conflict: You already have a session booked around ${conflictStart}. Please select a different time.`,
      });
    }

    const appointment = await TrainingAppointment.create({
      trainerId,
      clientId,
      branchId: req.user.branchId || null,
      scheduledAt: sessionStart,
      durationMinutes: Number(durationMinutes) || 60,
      sessionType,
      notes: notes.trim(),
      status: 'SCHEDULED',
    });

    // Notify client
    const formattedDate = sessionStart.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    await Notification.create({
      userId: clientId,
      title: 'Training Session Scheduled',
      message: `Your coach ${req.user.name} scheduled a ${sessionType} session for ${formattedDate}.`,
      category: 'TRAINER',
    });

    res.status(201).json({
      success: true,
      message: 'Session scheduled successfully',
      appointment,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PUT /api/trainer/schedule/:appointmentId
 * @desc    Reschedule or update session details
 * @access  Private (TRAINER, ADMIN)
 */
const updateScheduleSession = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { appointmentId } = req.params;
    const { scheduledAt, durationMinutes, sessionType, notes, status } = req.body;

    const appointment = await TrainingAppointment.findOne({ _id: appointmentId, trainerId });
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found or unauthorized.',
      });
    }

    if (scheduledAt) appointment.scheduledAt = new Date(scheduledAt);
    if (durationMinutes) appointment.durationMinutes = Number(durationMinutes);
    if (sessionType) appointment.sessionType = sessionType;
    if (notes !== undefined) appointment.notes = notes.trim();
    if (status) appointment.status = status;

    await appointment.save();

    if (status === 'CANCELLED') {
      await Notification.create({
        userId: appointment.clientId,
        title: 'Training Session Cancelled',
        message: `Your session on ${new Date(appointment.scheduledAt).toLocaleDateString()} was cancelled.`,
        category: 'TRAINER',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Appointment updated successfully',
      appointment,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/trainer/schedule/:appointmentId/status
 * @desc    Update session status (SCHEDULED, COMPLETED, CANCELLED, MISSED)
 * @access  Private (TRAINER, ADMIN)
 */
const updateSessionStatus = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { appointmentId } = req.params;
    const { status } = req.body;

    if (!['SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status required (SCHEDULED, COMPLETED, CANCELLED, MISSED)',
      });
    }

    const appointment = await TrainingAppointment.findOne({ _id: appointmentId, trainerId });
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found or unauthorized.',
      });
    }

    appointment.status = status;
    await appointment.save();

    res.status(200).json({
      success: true,
      message: `Session status updated to ${status}`,
      appointment,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/trainer/sessions
 * @desc    Get session history and completed workouts
 * @access  Private (TRAINER, ADMIN)
 */
const getSessions = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { clientId, status } = req.query;

    const query = { trainerId };
    if (clientId) query.clientId = clientId;
    if (status && status !== 'ALL') query.status = status;

    const appointments = await TrainingAppointment.find(query)
      .populate('clientId', 'name email phone avatar')
      .populate('branchId', 'name city')
      .sort({ scheduledAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: appointments.length,
      sessions: appointments,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/trainer/sessions/complete
 * @desc    Live session logger & completion (syncs to client workout history)
 * @access  Private (TRAINER, ADMIN)
 */
const completeSession = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const {
      appointmentId,
      clientId,
      durationMinutes = 60,
      sessionType = 'Personal Training',
      exercisesPerformed = [],
      trainingIntensity = 'Moderate',
      trainerObservations = '',
      nextSessionRecommendations = '',
      notes = '',
    } = req.body;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required.',
      });
    }

    const isAssigned = await verifyClientAssigned(trainerId, clientId, req.user.role);
    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot complete sessions for unassigned clients.',
      });
    }

    let appointment = null;
    if (appointmentId) {
      appointment = await TrainingAppointment.findOne({ _id: appointmentId, trainerId });
      if (appointment) {
        appointment.status = 'COMPLETED';
        appointment.completedData = {
          completedAt: new Date(),
          exercisesPerformed,
          trainingIntensity,
          trainerObservations,
          nextSessionRecommendations,
        };
        await appointment.save();
      }
    } else {
      // Direct session log without previous appointment
      appointment = await TrainingAppointment.create({
        trainerId,
        clientId,
        branchId: req.user.branchId || null,
        scheduledAt: new Date(),
        durationMinutes: Number(durationMinutes) || 60,
        sessionType,
        status: 'COMPLETED',
        notes,
        completedData: {
          completedAt: new Date(),
          exercisesPerformed,
          trainingIntensity,
          trainerObservations,
          nextSessionRecommendations,
        },
      });
    }

    // Automatically create synced WorkoutSession for client history
    const completedSetsForSync = exercisesPerformed.map((ex) => ({
      exerciseName: ex.name,
      completedSets: Array.from({ length: ex.setsCompleted || 3 }, (_, i) => ({
        setNumber: i + 1,
        reps: ex.repsCompleted ? parseInt(ex.repsCompleted, 10) || 10 : 10,
        weightKg: ex.weightKg || null,
        completed: true,
      })),
    }));

    await WorkoutSession.create({
      userId: clientId,
      trainerId,
      loggedBy: 'TRAINER',
      workoutTitle: sessionType || 'Trainer Coaching Session',
      date: new Date(),
      durationMinutes: Number(durationMinutes) || 60,
      completedExercises: completedSetsForSync,
      notes: trainerObservations || notes,
      status: 'COMPLETED',
    });

    // Notify client
    await Notification.create({
      userId: clientId,
      title: 'Session Completed by Trainer',
      message: `Coach ${req.user.name} logged your completed session (${sessionType}). Check your workout history for performance notes.`,
      category: 'WORKOUT',
    });

    res.status(200).json({
      success: true,
      message: 'Training session completed and synced to client profile successfully',
      appointment,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/trainer/attendance
 * @desc    Trainer's session stats and assigned clients' facility check-in logs
 * @access  Private (TRAINER, ADMIN)
 */
const getAttendance = async (req, res, next) => {
  try {
    const trainerId = req.user._id;

    // Get assigned clients
    const clientProfiles = await ClientProfile.find({ trainerId });
    const clientUserIds = clientProfiles.map((cp) => cp.userId);

    // Fetch client check-ins at gym facility
    const clientAttendance = await Attendance.find({
      userId: { $in: clientUserIds },
    })
      .populate('userId', 'name email phone avatar')
      .populate('branchId', 'name city')
      .sort({ date: -1 })
      .limit(50);

    // Fetch trainer's completed sessions
    const trainerSessions = await TrainingAppointment.find({
      trainerId,
      status: 'COMPLETED',
    })
      .populate('clientId', 'name email phone')
      .sort({ scheduledAt: -1 })
      .limit(30);

    res.status(200).json({
      success: true,
      clientAttendance,
      trainerSessions,
      stats: {
        totalClientCheckIns: clientAttendance.length,
        completedTrainerSessions: trainerSessions.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/trainer/notifications
 * @desc    Get notifications for trainer
 * @access  Private (TRAINER, ADMIN)
 */
const getNotifications = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const notifications = await Notification.find({ userId: trainerId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/trainer/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private (TRAINER, ADMIN)
 */
const markNotificationRead = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { id } = req.params;

    const notif = await Notification.findOneAndUpdate(
      { _id: id, userId: trainerId },
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
 * @route   PATCH /api/trainer/notifications/read-all
 * @desc    Mark all trainer notifications as read
 * @access  Private (TRAINER, ADMIN)
 */
const markAllNotificationsRead = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    await Notification.updateMany({ userId: trainerId, isRead: false }, { isRead: true });

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/trainer/notifications/send-client
 * @desc    Trainer sends message / notification to one or all assigned clients
 * @access  Private (TRAINER, ADMIN)
 */
const sendClientNotification = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { targetClientId, title, message, category = 'TRAINER' } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required.',
      });
    }

    if (targetClientId && targetClientId !== 'ALL') {
      // Verify client assignment
      const isAssigned = await verifyClientAssigned(trainerId, targetClientId, req.user.role);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only message your assigned clients.',
        });
      }

      await Notification.create({
        userId: targetClientId,
        title: title.trim(),
        message: message.trim(),
        category,
      });

      return res.status(200).json({
        success: true,
        message: 'Message delivered to client successfully',
      });
    }

    // Broadcast to all assigned clients
    const clientProfiles = await ClientProfile.find({ trainerId });
    const clientUserIds = clientProfiles.map((cp) => cp.userId);

    if (clientUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'You have no assigned clients to message.',
      });
    }

    const notifDocs = clientUserIds.map((cId) => ({
      userId: cId,
      title: title.trim(),
      message: message.trim(),
      category,
    }));

    await Notification.insertMany(notifDocs);

    res.status(200).json({
      success: true,
      message: `Message broadcast to ${clientUserIds.length} assigned clients.`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/trainer/profile
 * @desc    Get trainer profile & settings
 * @access  Private (TRAINER, ADMIN)
 */
const getProfile = async (req, res, next) => {
  try {
    const trainerId = req.user._id;

    const user = await User.findById(trainerId).select('-password').populate('branchId', 'name city address phone');
    const profile = await TrainerProfile.findOne({ userId: trainerId });

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
 * @route   PUT /api/trainer/profile
 * @desc    Update trainer bio, contact, specialization
 * @access  Private (TRAINER, ADMIN)
 */
const updateProfile = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { name, bio, contactPhone, contactEmail, specialization, experienceYears } = req.body;

    // Update user name if provided
    if (name) {
      await User.findByIdAndUpdate(trainerId, { name: name.trim() });
    }

    let profile = await TrainerProfile.findOne({ userId: trainerId });
    if (!profile) {
      profile = new TrainerProfile({
        userId: trainerId,
        branchId: req.user.branchId || null,
      });
    }

    if (bio !== undefined) profile.bio = bio.trim();
    if (contactPhone !== undefined) profile.contactPhone = contactPhone.trim();
    if (contactEmail !== undefined) profile.contactEmail = contactEmail.trim();
    if (specialization !== undefined) profile.specialization = specialization.trim();
    if (experienceYears !== undefined) profile.experienceYears = Number(experienceYears);

    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      profile,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PUT /api/trainer/change-password
 * @desc    Change trainer password with current password verification
 * @access  Private (TRAINER, ADMIN)
 */
const changePassword = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
      });
    }

    const user = await User.findById(trainerId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Trainer account not found.',
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect current password.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/trainer/bookings
 * @desc    Get all bookings for this trainer
 */
const getTrainerBookings = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { status } = req.query;
    const query = { trainerId };
    if (status && status !== 'ALL') {
      query.bookingStatus = status;
    }

    const bookings = await TrainerBooking.find(query)
      .populate('clientId', 'name email phone avatar')
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
 * @route   PUT /api/trainer/availability
 * @desc    Update trainer availability schedule & working hours
 */
const updateTrainerAvailability = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { workingDays, startTime, endTime, breakPeriods, blockedDates, isAvailable, acceptingClients } = req.body;

    let profile = await TrainerProfile.findOne({ userId: trainerId });
    if (!profile) {
      profile = await TrainerProfile.create({
        userId: trainerId,
        branchId: req.user.branchId,
      });
    }

    if (!profile.availability) {
      profile.availability = {};
    }

    if (workingDays) profile.availability.workingDays = workingDays;
    if (startTime) profile.availability.startTime = startTime;
    if (endTime) profile.availability.endTime = endTime;
    if (breakPeriods) profile.availability.breakPeriods = breakPeriods;
    if (blockedDates) profile.availability.blockedDates = blockedDates;
    if (isAvailable !== undefined) profile.isAvailable = isAvailable;
    if (acceptingClients !== undefined) profile.acceptingClients = acceptingClients;

    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Availability schedule updated successfully.',
      availability: profile.availability,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardOverview,
  getMyClients,
  getClientDetails,
  getClientProgress,
  addClientProgressAssessment,
  getClientWorkouts,
  getClientAttendance,
  getClientNotes,
  createClientNote,
  updateClientNote,
  deleteClientNote,
  getWorkoutPlans,
  getWorkoutPlanById,
  createWorkoutPlan,
  updateWorkoutPlan,
  publishWorkoutPlan,
  duplicateWorkoutPlan,
  getExercises,
  createExercise,
  getSchedule,
  scheduleSession,
  updateScheduleSession,
  updateSessionStatus,
  getSessions,
  completeSession,
  getTrainerBookings,
  updateTrainerAvailability,
  getAttendance,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  sendClientNotification,
  getProfile,
  updateProfile,
  changePassword,
};
