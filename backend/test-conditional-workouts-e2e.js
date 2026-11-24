/**
 * test-conditional-workouts-e2e.js
 * --------------------------------
 * Comprehensive End-to-End Test Suite for Conditional Workouts and Trainer Assignment.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const User = require('./src/models/User');
const ClientProfile = require('./src/models/ClientProfile');
const TrainerProfile = require('./src/models/TrainerProfile');
const WorkoutPlan = require('./src/models/WorkoutPlan');
const Branch = require('./src/models/Branch');
const { resolveClientTrainer } = require('./src/utils/trainerAssignment');
const { getMemberDetails } = require('./src/services/authService');
const {
  getDashboardSummary,
  getClientWorkouts,
  getWorkoutById,
  logWorkoutSession,
  getWorkoutSessions,
  getTrainer,
} = require('./src/controllers/clientController');

// Mock Express response helper
function createMockRes() {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
  };
  return res;
}

async function runTests() {
  console.log('====================================================');
  console.log('🏋️ MAN & MACHINE — CONDITIONAL WORKOUTS E2E TEST');
  console.log('====================================================\n');

  await connectDB();

  let testPassed = 0;
  let testFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      testPassed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      testFailed++;
    }
  }

  try {
    // 1. Locate test client and active trainer
    const clientUser = await User.findOne({ role: 'CLIENT', status: 'ACTIVE' });
    if (!clientUser) throw new Error('No active CLIENT found in database.');

    const clientProfile = await ClientProfile.findOne({ userId: clientUser._id });
    if (!clientProfile) throw new Error(`No ClientProfile found for user ${clientUser._id}`);

    let trainerUser = await User.findOne({ role: 'TRAINER', status: 'ACTIVE' });
    if (!trainerUser) {
      console.log('No active TRAINER found. Creating permanent certified coach "Karthik Raja"...');
      const branch = await Branch.findOne();
      trainerUser = await User.create({
        name: 'Karthik Raja (Coach)',
        email: 'karthik.coach@manandmachine.com',
        phone: '9840011223',
        password: '$2a$10$hashedpasswordplaceholderforauth',
        role: 'TRAINER',
        status: 'ACTIVE',
        branchId: branch ? branch._id : clientProfile.branchId,
      });
      await TrainerProfile.create({
        userId: trainerUser._id,
        branchId: trainerUser.branchId,
        specialization: 'Biomechanical Hypertrophy & Powerlifting',
        experienceYears: 6,
        bio: 'Specializes in structural posture, progressive overload protocols, and competition preparation.',
        contactPhone: '+91 98400 11223',
        contactEmail: 'karthik.coach@manandmachine.com',
      });
      console.log(`✓ Created Certified Coach: ${trainerUser.name} (${trainerUser.email})`);
    }

    const originalTrainerId = clientProfile.trainerId;
    console.log(`Target Test Client: ${clientUser.name} (${clientUser.email})`);
    console.log(`Target Active Trainer: ${trainerUser.name} (${trainerUser.email})`);
    console.log(`Initial clientProfile.trainerId: ${originalTrainerId || 'none'}\n`);

    // ========================================================
    // PHASE 1: SELF-TRAINED CLIENT (trainerId = null)
    // ========================================================
    console.log('--- PHASE 1: Testing Self-Trained Client (trainerId = null) ---');
    clientProfile.trainerId = null;
    await clientProfile.save();

    // Test 1.1: resolveClientTrainer returns trainerAssigned: false, trainer: null
    const resolvedTrainer1 = await resolveClientTrainer(clientProfile);
    assert(resolvedTrainer1.trainerAssigned === false, 'resolveClientTrainer returns trainerAssigned === false for self-trained client');
    assert(resolvedTrainer1.trainer === null, 'resolveClientTrainer returns trainer === null for self-trained client');

    // Test 1.2: authService.getMemberDetails returns trainerAssigned: false
    const memberDetails1 = await getMemberDetails(clientUser._id);
    assert(memberDetails1.trainerAssigned === false, 'getMemberDetails returns trainerAssigned === false');

    // Test 1.3: GET /client/workouts returns 403 Forbidden
    const reqWorkouts = { user: { _id: clientUser._id, role: 'CLIENT' } };
    const resWorkouts = createMockRes();
    await getClientWorkouts(reqWorkouts, resWorkouts);
    assert(resWorkouts.statusCode === 403, 'getClientWorkouts returns HTTP 403');
    assert(resWorkouts.data.trainerAssigned === false, 'getClientWorkouts returns trainerAssigned: false');
    assert(
      resWorkouts.data.message === 'My Workouts is available when you have an assigned trainer.',
      'getClientWorkouts returns exact forbidden message'
    );

    // Test 1.4: GET /client/workouts/:id returns 403 Forbidden
    const fakePlanId = new mongoose.Types.ObjectId();
    const reqWorkoutById = { user: { _id: clientUser._id, role: 'CLIENT' }, params: { id: fakePlanId.toString() } };
    const resWorkoutById = createMockRes();
    await getWorkoutById(reqWorkoutById, resWorkoutById);
    assert(resWorkoutById.statusCode === 403, 'getWorkoutById returns HTTP 403 for self-trained client');

    // Test 1.5: POST /client/workouts/:id/sessions returns 403 Forbidden
    const reqLogSession = { user: { _id: clientUser._id, role: 'CLIENT' }, params: { id: fakePlanId.toString() }, body: {} };
    const resLogSession = createMockRes();
    await logWorkoutSession(reqLogSession, resLogSession);
    assert(resLogSession.statusCode === 403, 'logWorkoutSession returns HTTP 403 for self-trained client');

    // Test 1.6: GET /client/workout-sessions returns 403 Forbidden
    const reqSessions = { user: { _id: clientUser._id, role: 'CLIENT' } };
    const resSessions = createMockRes();
    await getWorkoutSessions(reqSessions, resSessions);
    assert(resSessions.statusCode === 403, 'getWorkoutSessions returns HTTP 403 for self-trained client');

    // Test 1.7: GET /client/trainer returns { success: true, assigned: false, trainer: null }
    const reqTrainer = { user: { _id: clientUser._id, role: 'CLIENT' } };
    const resTrainer = createMockRes();
    await getTrainer(reqTrainer, resTrainer);
    assert(resTrainer.statusCode === 200, 'getTrainer returns HTTP 200');
    assert(resTrainer.data.assigned === false, 'getTrainer returns assigned === false');
    assert(resTrainer.data.trainer === null, 'getTrainer returns trainer === null');

    // Test 1.8: GET /client/dashboard returns trainerAssigned: false, todaysWorkout: null, trainer: null
    const reqDashboard = { user: { _id: clientUser._id, role: 'CLIENT' } };
    const resDashboard = createMockRes();
    await getDashboardSummary(reqDashboard, resDashboard);
    assert(resDashboard.statusCode === 200, 'getDashboardSummary returns HTTP 200');
    assert(resDashboard.data.trainerAssigned === false, 'getDashboardSummary returns trainerAssigned === false');
    assert(resDashboard.data.todaysWorkout === null, 'getDashboardSummary returns todaysWorkout === null');
    assert(resDashboard.data.trainer === null, 'getDashboardSummary returns trainer === null');
    console.log();

    // ========================================================
    // PHASE 2: TRAINER-ASSIGNED CLIENT (trainerId = active trainer)
    // ========================================================
    console.log('--- PHASE 2: Testing Trainer-Assigned Client ---');
    clientProfile.trainerId = trainerUser._id;
    await clientProfile.save();

    // Test 2.1: resolveClientTrainer returns trainer document
    const resolvedTrainer2 = await resolveClientTrainer(clientProfile);
    assert(resolvedTrainer2.trainerAssigned === true, 'resolveClientTrainer returns trainerAssigned === true');
    assert(resolvedTrainer2.trainer.id.toString() === trainerUser._id.toString(), 'resolved trainer matches assigned trainer ID');

    // Test 2.2: authService.getMemberDetails returns trainerAssigned: true
    const memberDetails2 = await getMemberDetails(clientUser._id);
    assert(memberDetails2.trainerAssigned === true, 'getMemberDetails returns trainerAssigned === true');
    assert(memberDetails2.clientProfile.trainerName === trainerUser.name, 'clientProfile includes trainerName');

    // Ensure a test workout plan exists for this client assigned by this trainer
    let testPlan = await WorkoutPlan.findOne({ assignedTo: clientUser._id, createdBy: trainerUser._id });
    if (!testPlan) {
      testPlan = await WorkoutPlan.create({
        title: 'Hypertrophy Foundation Split',
        description: 'Structured compound progression program.',
        goal: 'Hypertrophy',
        level: 'INTERMEDIATE',
        assignedTo: clientUser._id,
        createdBy: trainerUser._id,
        branchId: clientProfile.branchId,
        isActive: true,
        schedule: [
          { day: 'Monday', focus: 'Chest & Triceps', isRestDay: false },
          { day: 'Tuesday', focus: 'Back & Biceps', isRestDay: false },
          { day: 'Wednesday', focus: 'Rest Day', isRestDay: true },
        ],
        exercises: [
          { name: 'Barbell Bench Press', sets: 4, reps: '8-10', restSeconds: 90 },
          { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', restSeconds: 60 },
        ],
      });
    }

    // Test 2.3: GET /client/workouts returns 200 OK with workout plans
    const resWorkoutsAssigned = createMockRes();
    await getClientWorkouts(reqWorkouts, resWorkoutsAssigned);
    assert(resWorkoutsAssigned.statusCode === 200, 'getClientWorkouts returns HTTP 200 when trainer assigned');
    assert(resWorkoutsAssigned.data.plans.length > 0, 'getClientWorkouts returns assigned workout plans');

    // Test 2.4: GET /client/workouts/:id returns 200 OK for own plan
    const reqOwnPlan = { user: { _id: clientUser._id, role: 'CLIENT' }, params: { id: testPlan._id.toString() } };
    const resOwnPlan = createMockRes();
    await getWorkoutById(reqOwnPlan, resOwnPlan);
    assert(resOwnPlan.statusCode === 200, 'getWorkoutById returns HTTP 200 for client assigned plan');
    assert(resOwnPlan.data.plan.title === testPlan.title, 'getWorkoutById returns correct plan payload');

    // Test 2.5: GET /client/trainer returns { success: true, assigned: true, trainer: { ... } }
    const resTrainerAssigned = createMockRes();
    await getTrainer(reqTrainer, resTrainerAssigned);
    assert(resTrainerAssigned.statusCode === 200, 'getTrainer returns HTTP 200');
    assert(resTrainerAssigned.data.assigned === true, 'getTrainer returns assigned === true');
    assert(resTrainerAssigned.data.trainer.name === trainerUser.name, 'getTrainer returns trainer details');

    // Test 2.6: GET /client/dashboard returns trainerAssigned: true with trainer details
    const resDashboardAssigned = createMockRes();
    await getDashboardSummary(reqDashboard, resDashboardAssigned);
    assert(resDashboardAssigned.statusCode === 200, 'getDashboardSummary returns HTTP 200');
    assert(resDashboardAssigned.data.trainerAssigned === true, 'getDashboardSummary returns trainerAssigned === true');
    assert(resDashboardAssigned.data.trainer.name === trainerUser.name, 'getDashboardSummary includes trainer details');
    console.log();

    // ========================================================
    // PHASE 3: INACTIVE TRAINER INTEGRITY CHECK
    // ========================================================
    console.log('--- PHASE 3: Testing Inactive Trainer Integrity ---');
    trainerUser.status = 'INACTIVE';
    await trainerUser.save();

    const resolvedInactiveTrainer = await resolveClientTrainer(clientProfile);
    assert(resolvedInactiveTrainer.trainerAssigned === false, 'resolveClientTrainer rejects INACTIVE trainer and returns trainerAssigned: false');

    const resWorkoutsInactive = createMockRes();
    await getClientWorkouts(reqWorkouts, resWorkoutsInactive);
    assert(resWorkoutsInactive.statusCode === 403, 'getClientWorkouts returns HTTP 403 when trainer is INACTIVE');

    // Restore trainer status
    trainerUser.status = 'ACTIVE';
    await trainerUser.save();
    console.log();

    // ========================================================
    // PHASE 4: CROSS-CLIENT SECURITY CHECK
    // ========================================================
    console.log('--- PHASE 4: Testing Cross-Client Security ---');
    const otherClient = await User.findOne({ role: 'CLIENT', _id: { $ne: clientUser._id } });
    if (otherClient) {
      const otherProfile = await ClientProfile.findOne({ userId: otherClient._id });
      if (otherProfile) {
        otherProfile.trainerId = trainerUser._id;
        await otherProfile.save();

        const reqCrossClient = { user: { _id: otherClient._id, role: 'CLIENT' }, params: { id: testPlan._id.toString() } };
        const resCrossClient = createMockRes();
        await getWorkoutById(reqCrossClient, resCrossClient);
        assert(resCrossClient.statusCode === 404, 'Cross-client workout plan access prevented with HTTP 404 Not Found');
      }
    } else {
      console.log('  ⚠️ Skipping cross-client check: only one client in DB');
    }
    console.log();

    // ========================================================
    // RESTORE INITIAL CLIENT STATE
    // ========================================================
    clientProfile.trainerId = originalTrainerId;
    await clientProfile.save();
    console.log(`Restored clientProfile.trainerId to: ${originalTrainerId || 'none'}`);

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${testPassed} PASSED, ${testFailed} FAILED`);
    console.log('====================================================');

    process.exit(testFailed === 0 ? 0 : 1);
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  }
}

runTests();
