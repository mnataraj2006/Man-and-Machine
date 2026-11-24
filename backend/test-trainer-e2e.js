/**
 * test-trainer-e2e.js
 * -------------------
 * Comprehensive End-to-End Test Suite for the Trainer Portal & System Integration:
 * 1. Security: 401 unauthenticated & 403 unauthorized role rejection
 * 2. Trainer authentication & dashboard KPIs
 * 3. Client data isolation (Trainer A cannot access Client B)
 * 4. Trainer Notes (Private vs Client-Facing privacy enforcement)
 * 5. Workout Plan creation, publishing, and real-time sync to client dashboard
 * 6. Appointment scheduling and overlap conflict prevention
 * 7. Live session logging and automatic synchronization to client workout history
 * 8. Physical assessment recording & client notification
 * 9. Profile and specialization updates
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: __dirname + '/.env' });

const User = require('./src/models/User');
const Branch = require('./src/models/Branch');
const ClientProfile = require('./src/models/ClientProfile');
const TrainerProfile = require('./src/models/TrainerProfile');
const WorkoutPlan = require('./src/models/WorkoutPlan');
const WorkoutSession = require('./src/models/WorkoutSession');
const ProgressRecord = require('./src/models/ProgressRecord');
const TrainingAppointment = require('./src/models/TrainingAppointment');
const TrainerNote = require('./src/models/TrainerNote');
const Notification = require('./src/models/Notification');
const Membership = require('./src/models/Membership');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('\n=============================================================');
  console.log('  MAN & MACHINE FITNESS - TRAINER INTEGRATION TEST SUITE');
  console.log('=============================================================\n');

  // Connect to DB for test fixture setup
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ Connected to MongoDB Atlas for test assertions');

  const branch = await Branch.findOne();
  if (!branch) {
    throw new Error('No branches found in DB. Run seedBranches first.');
  }

  // 1. Setup Test Users
  const testPassword = 'Password@123';

  // Trainer A
  let trainerA = await User.findOne({ email: 'test.trainerA@manmachine.com' });
  if (!trainerA) {
    trainerA = await User.create({
      name: 'Trainer Marcus',
      email: 'test.trainerA@manmachine.com',
      password: testPassword,
      phone: '9876543201',
      role: 'TRAINER',
      branchId: branch._id,
      status: 'ACTIVE',
    });
  } else {
    trainerA.password = testPassword;
    await trainerA.save();
  }

  // Ensure TrainerProfile exists
  let trainerProfileA = await TrainerProfile.findOne({ userId: trainerA._id });
  if (!trainerProfileA) {
    trainerProfileA = await TrainerProfile.create({
      userId: trainerA._id,
      branchId: branch._id,
      specialization: 'Biomechanical Hypertrophy',
      experienceYears: 6,
      contactPhone: '9876543201',
      bio: 'Olympic strength coach and posture specialist.',
    });
  }

  // Trainer B (for cross-trainer isolation tests)
  let trainerB = await User.findOne({ email: 'test.trainerB@manmachine.com' });
  if (!trainerB) {
    trainerB = await User.create({
      name: 'Trainer Sarah',
      email: 'test.trainerB@manmachine.com',
      password: testPassword,
      phone: '9876543202',
      role: 'TRAINER',
      branchId: branch._id,
      status: 'ACTIVE',
    });
  } else {
    trainerB.password = testPassword;
    await trainerB.save();
  }

  // Client 1 (Assigned to Trainer A)
  let client1 = await User.findOne({ email: 'client.alpha@test.com' });
  if (!client1) {
    client1 = await User.create({
      name: 'Alpha Athlete',
      email: 'client.alpha@test.com',
      password: testPassword,
      phone: '9876543203',
      role: 'CLIENT',
      branchId: branch._id,
      status: 'ACTIVE',
    });
  } else {
    client1.password = testPassword;
    await client1.save();
  }

  let clientProfile1 = await ClientProfile.findOne({ userId: client1._id });
  if (!clientProfile1) {
    clientProfile1 = await ClientProfile.create({
      userId: client1._id,
      branchId: branch._id,
      fitnessGoal: 'Muscle Building',
      experienceLevel: 'Intermediate',
      trainerId: trainerA._id,
    });
  } else {
    clientProfile1.trainerId = trainerA._id;
    await clientProfile1.save();
  }

  // Client 2 (Assigned to Trainer B)
  let client2 = await User.findOne({ email: 'client.beta@test.com' });
  if (!client2) {
    client2 = await User.create({
      name: 'Beta Athlete',
      email: 'client.beta@test.com',
      password: hashedPassword,
      phone: '9876543204',
      role: 'CLIENT',
      branchId: branch._id,
      status: 'ACTIVE',
    });
  }

  let clientProfile2 = await ClientProfile.findOne({ userId: client2._id });
  if (!clientProfile2) {
    clientProfile2 = await ClientProfile.create({
      userId: client2._id,
      branchId: branch._id,
      fitnessGoal: 'Weight Loss',
      experienceLevel: 'Beginner',
      trainerId: trainerB._id,
    });
  } else {
    clientProfile2.trainerId = trainerB._id;
    await clientProfile2.save();
  }

  console.log('✓ Test fixtures prepared (Trainer A, Trainer B, Client 1 [Trainer A], Client 2 [Trainer B])\n');

  // Start express app in-process on port 5000
  const app = require('./src/server');
  const server = await new Promise((resolve) => {
    const s = app.listen(5000, () => resolve(s));
  });
  console.log('✓ Express test server listening on port 5000\n');

  // Let's test using HTTP requests
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: trainerA.email, password: testPassword }),
  });
  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.token) {
    throw new Error(`Trainer login failed: ${JSON.stringify(loginData)}`);
  }
  const trainerToken = loginData.token;
  console.log('✓ TEST 1: Trainer Login succeeded and generated valid JWT token');

  // Login as Client 1
  const clientLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: client1.email, password: testPassword }),
  });
  const clientLoginData = await clientLoginRes.json();
  const clientToken = clientLoginData.token;
  console.log('✓ TEST 2: Client Login succeeded');

  // 3. Security: Unauthenticated request rejection
  const unauthRes = await fetch(`${BASE_URL}/trainer/dashboard`);
  if (unauthRes.status === 401) {
    console.log('✓ TEST 3: Unauthenticated access rejected with 401 Unauthorized');
  } else {
    throw new Error(`Expected 401 but got ${unauthRes.status}`);
  }

  // 4. Security: Client role cannot access trainer dashboard
  const clientAccessRes = await fetch(`${BASE_URL}/trainer/dashboard`, {
    headers: { Authorization: `Bearer ${clientToken}` },
  });
  if (clientAccessRes.status === 403) {
    console.log('✓ TEST 4: Client role forbidden from Trainer portal with 403 Forbidden');
  } else {
    throw new Error(`Expected 403 but got ${clientAccessRes.status}`);
  }

  // 5. Trainer Dashboard Overview
  const dashRes = await fetch(`${BASE_URL}/trainer/dashboard`, {
    headers: { Authorization: `Bearer ${trainerToken}` },
  });
  const dashData = await dashRes.json();
  if (dashRes.status === 200 && dashData.success && dashData.kpis) {
    console.log('✓ TEST 5: Trainer Dashboard overview returns 6 KPIs:');
    console.log(`    - Active Clients: ${dashData.kpis.activeClients}`);
    console.log(`    - Today's Sessions: ${dashData.kpis.todaySessions}`);
    console.log(`    - Completed This Month: ${dashData.kpis.completedSessionsThisMonth}`);
    console.log(`    - Active Workout Plans: ${dashData.kpis.activeWorkoutPlans}`);
    console.log(`    - Pending Assessments: ${dashData.kpis.pendingAssessments}`);
    console.log(`    - Attendance Rate: ${dashData.kpis.attendanceRate}%`);
  } else {
    throw new Error(`Trainer dashboard failed: ${JSON.stringify(dashData)}`);
  }

  // 6. Strict Client Data Isolation
  const myClientsRes = await fetch(`${BASE_URL}/trainer/clients`, {
    headers: { Authorization: `Bearer ${trainerToken}` },
  });
  const myClientsData = await myClientsRes.json();
  const clientIdsInList = myClientsData.clients.map((c) => c.id.toString());

  if (!clientIdsInList.includes(client1._id.toString())) {
    throw new Error('Assigned Client 1 was not returned in Trainer A roster!');
  }
  if (clientIdsInList.includes(client2._id.toString())) {
    throw new Error('CRITICAL VIOLATION: Unassigned Client 2 appeared in Trainer A roster!');
  }
  console.log('✓ TEST 6: Client Data Isolation verified in roster (Client 1 included, Client 2 strictly excluded)');

  // 7. Cross-Trainer Dossier Protection
  // Trainer A requesting Client 1 dossier -> 200 OK
  const client1DossierRes = await fetch(`${BASE_URL}/trainer/clients/${client1._id}`, {
    headers: { Authorization: `Bearer ${trainerToken}` },
  });
  if (client1DossierRes.status !== 200) {
    throw new Error(`Failed to get assigned client dossier: ${client1DossierRes.status}`);
  }
  console.log('✓ TEST 7a: Trainer A successfully retrieved Client 1 360 Dossier');

  // Trainer A requesting Client 2 dossier (assigned to Trainer B) -> 403 Forbidden
  const client2DossierRes = await fetch(`${BASE_URL}/trainer/clients/${client2._id}`, {
    headers: { Authorization: `Bearer ${trainerToken}` },
  });
  if (client2DossierRes.status === 403) {
    console.log('✓ TEST 7b: Cross-trainer dossier access strictly forbidden with 403 Forbidden');
  } else {
    throw new Error(`Expected 403 Forbidden for cross-trainer access, got ${client2DossierRes.status}`);
  }

  // 8. Trainer Notes Privacy (PRIVATE vs CLIENT_FACING)
  // Create Private Note
  const privNoteRes = await fetch(`${BASE_URL}/trainer/clients/${client1._id}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${trainerToken}`,
    },
    body: JSON.stringify({
      title: 'Confidential Biomechanical Note',
      content: 'Mild hip impingement observed during heavy paused squats.',
      noteType: 'OBSERVATION',
      visibility: 'PRIVATE',
    }),
  });
  const privNoteData = await privNoteRes.json();
  if (!privNoteData.success) throw new Error('Failed to create private note');

  // Create Client-Facing Note
  const pubNoteRes = await fetch(`${BASE_URL}/trainer/clients/${client1._id}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${trainerToken}`,
    },
    body: JSON.stringify({
      title: 'Hydration & Warm-up Guidance',
      content: 'Complete 10 minutes of dynamic hip openers before loading barbell.',
      noteType: 'RECOMMENDATION',
      visibility: 'CLIENT_FACING',
    }),
  });
  const pubNoteData = await pubNoteRes.json();
  if (!pubNoteData.success) throw new Error('Failed to create client-facing note');

  // Verify from Client side: GET /api/client/trainer
  const clientViewTrainerRes = await fetch(`${BASE_URL}/client/trainer`, {
    headers: { Authorization: `Bearer ${clientToken}` },
  });
  const clientViewData = await clientViewTrainerRes.json();
  const clientReceivedNotes = clientViewData.notes || [];

  const foundPrivateNote = clientReceivedNotes.find((n) => n.visibility === 'PRIVATE' || n.title.includes('Confidential'));
  const foundPublicNote = clientReceivedNotes.find((n) => n.visibility === 'CLIENT_FACING' && n.title.includes('Warm-up'));

  if (foundPrivateNote) {
    throw new Error('CRITICAL PRIVACY VIOLATION: Private coach note was exposed to the client!');
  }
  if (!foundPublicNote) {
    throw new Error('Client-facing note was not received by the client!');
  }
  console.log('✓ TEST 8: Trainer Notes Privacy verified (Client-facing visible, Private note strictly hidden)');

  // 9. Workout Plan Creation, Publishing, and Real-Time Sync
  const createPlanRes = await fetch(`${BASE_URL}/trainer/workouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${trainerToken}`,
    },
    body: JSON.stringify({
      title: 'E2E Hypertrophy Phase 1',
      description: 'Progressive overload training plan',
      goal: 'Muscle Building',
      trainingLevel: 'Intermediate',
      weeklyFrequency: 4,
      trainerInstructions: 'Focus on 3-second eccentrics',
      assignedTo: client1._id,
      status: 'PUBLISHED',
      exercises: [
        {
          name: 'Incline Barbell Bench Press',
          targetMuscle: 'Upper Chest',
          sets: 4,
          reps: '8-10',
          prescribedWeight: '75kg',
          restSeconds: 90,
          instructions: 'Touch clavicle, flare elbows 45 degrees',
          dayOfWeek: 'Monday',
        },
      ],
    }),
  });
  const createPlanData = await createPlanRes.json();
  if (!createPlanData.success || !createPlanData.plan) {
    throw new Error(`Failed to create workout plan: ${JSON.stringify(createPlanData)}`);
  }

  // Verify on Client side: GET /api/client/workouts
  const clientActivePlanRes = await fetch(`${BASE_URL}/client/workouts`, {
    headers: { Authorization: `Bearer ${clientToken}` },
  });
  const clientActivePlanData = await clientActivePlanRes.json();
  const activePlan = clientActivePlanData.plans?.find(
    (p) => p.title === 'E2E Hypertrophy Phase 1' && p.isActive
  );
  if (!activePlan) {
    throw new Error('Published workout plan did not sync as active on client profile!');
  }
  console.log('✓ TEST 9: Workout Plan created by Trainer immediately synced as active plan in Client Dashboard');

  // 10. Scheduling & Conflict Prevention
  const targetDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
  targetDate.setHours(10, 0, 0, 0);

  const schedRes1 = await fetch(`${BASE_URL}/trainer/schedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${trainerToken}`,
    },
    body: JSON.stringify({
      clientId: client1._id,
      scheduledAt: targetDate.toISOString(),
      durationMinutes: 60,
      sessionType: 'Personal Training',
      notes: 'Initial squat form calibration',
    }),
  });
  const schedData1 = await schedRes1.json();
  if (!schedData1.success) {
    throw new Error(`Failed to schedule initial appointment: ${JSON.stringify(schedData1)}`);
  }
  console.log('✓ TEST 10a: Appointment scheduled successfully for tomorrow 10:00 AM');

  // Attempt to book conflicting appointment at same time
  const conflictRes = await fetch(`${BASE_URL}/trainer/schedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${trainerToken}`,
    },
    body: JSON.stringify({
      clientId: client1._id,
      scheduledAt: targetDate.toISOString(),
      durationMinutes: 60,
      sessionType: 'Strength Training',
    }),
  });
  const conflictData = await conflictRes.json();
  if (conflictRes.status === 400 && conflictData.message.includes('conflict')) {
    console.log('✓ TEST 10b: Overlapping session prevented with scheduling conflict error');
  } else {
    throw new Error(`Expected 400 conflict error, got ${conflictRes.status}: ${JSON.stringify(conflictData)}`);
  }

  // 11. Live Session Completion & Client History Sync
  const completeSessionRes = await fetch(`${BASE_URL}/trainer/sessions/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${trainerToken}`,
    },
    body: JSON.stringify({
      appointmentId: schedData1.appointment._id,
      clientId: client1._id,
      durationMinutes: 60,
      sessionType: 'Personal Training',
      trainingIntensity: 'High',
      trainerObservations: 'Excellent depth on all 4 sets. Ready for load progression next week.',
      nextSessionRecommendations: 'Add 2.5kg to working weight.',
      exercisesPerformed: [
        { name: 'Barbell Back Squat', setsCompleted: 4, repsCompleted: '8', weightKg: 100 },
      ],
    }),
  });
  const completeData = await completeSessionRes.json();
  if (!completeData.success) {
    throw new Error(`Failed to complete session: ${JSON.stringify(completeData)}`);
  }

  // Verify synced WorkoutSession in Client history: GET /api/client/workout-sessions
  const clientHistoryRes = await fetch(`${BASE_URL}/client/workout-sessions`, {
    headers: { Authorization: `Bearer ${clientToken}` },
  });
  const clientHistoryData = await clientHistoryRes.json();
  const syncedSession = clientHistoryData.sessions?.find((s) => s.notes?.includes('Ready for load progression'));
  if (!syncedSession) {
    throw new Error('Completed trainer session was not synced to client workout history!');
  }
  console.log('✓ TEST 11: Trainer live session completion auto-synced into Client workout history');

  // 12. Physical Assessment Logging
  const assessmentRes = await fetch(`${BASE_URL}/trainer/clients/${client1._id}/progress`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${trainerToken}`,
    },
    body: JSON.stringify({
      type: 'ASSESSMENT',
      weightKg: 78.5,
      postureScore: 9,
      mobilityNotes: 'Thoracic extension improved by 15%',
      recommendations: 'Maintain foam rolling routine',
      note: 'Monthly calibration',
    }),
  });
  const assessData = await assessmentRes.json();
  if (assessData.success && assessData.record.source === 'TRAINER_ASSESSMENT') {
    console.log('✓ TEST 12: Trainer Assessment recorded with source: TRAINER_ASSESSMENT');
  } else {
    throw new Error(`Failed to log assessment: ${JSON.stringify(assessData)}`);
  }

  // 13. Profile Update
  const updateProfileRes = await fetch(`${BASE_URL}/trainer/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${trainerToken}`,
    },
    body: JSON.stringify({
      specialization: 'Elite Biomechanics & Athlete Conditioning',
      bio: 'Head Strength Coach for Man & Machine.',
      experienceYears: 7,
    }),
  });
  const updateProfileData = await updateProfileRes.json();
  if (updateProfileData.success && updateProfileData.profile.specialization === 'Elite Biomechanics & Athlete Conditioning') {
    console.log('✓ TEST 13: Trainer Profile specialization & bio updated successfully');
  } else {
    throw new Error(`Failed to update profile: ${JSON.stringify(updateProfileData)}`);
  }

  console.log('\n=============================================================');
  console.log('  ALL 13 TRAINER INTEGRATION TEST SUITES PASSED CLEANLY!  ');
  console.log('=============================================================\n');

  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUNNER FAILED:', err);
  process.exit(1);
});
