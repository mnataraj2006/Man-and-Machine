const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const User = require('./src/models/User');
const Branch = require('./src/models/Branch');
const ClientProfile = require('./src/models/ClientProfile');
const TrainerProfile = require('./src/models/TrainerProfile');
const MembershipPlan = require('./src/models/MembershipPlan');
const Membership = require('./src/models/Membership');
const TrainerBooking = require('./src/models/TrainerBooking');
const TrainingAppointment = require('./src/models/TrainingAppointment');
const Payment = require('./src/models/Payment');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE E2E TEST SUITE:');
  console.log('   MEMBERSHIP PURCHASE + SELF-TRAINED / TRAINER FLOW');
  console.log('====================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ Connected to MongoDB Atlas\n');

  // Find Kovilpatti HQ Branch
  const hqBranch = (await Branch.findOne({ city: 'Kovilpatti' })) || (await Branch.findOne());
  if (!hqBranch) throw new Error('Kovilpatti HQ Branch not found');

  // Find Admin and Coach
  const adminUser = await User.findOne({ role: 'ADMIN' });
  const coachUser = await User.findOne({ email: 'karthik.coach@manandmachine.com' });
  if (!adminUser || !coachUser) throw new Error('Admin or Coach not found');

  const adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  const coachToken = jwt.sign({ id: coachUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

  // ── SCENARIO A: Self-Trained Membership Purchase Flow ──
  console.log('────────────────────────────────────────────────────');
  console.log('SCENARIO A: New Client Signup -> Buy Plan as Self-Trained');
  console.log('────────────────────────────────────────────────────');
  const selfTrainedEmail = 'test.selftrained.auto@manandmachine.com';
  await User.deleteOne({ email: selfTrainedEmail });

  // 1. Client Signup
  const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Ravi Kumar',
      email: selfTrainedEmail,
      phone: '9840099111',
      password: 'Password@123',
      branchId: hqBranch._id,
      fitnessGoal: 'Muscle Building',
      experienceLevel: 'Intermediate',
    }),
  });
  const signupData = await signupRes.json();
  console.log(`1. Signup new client -> HTTP ${signupRes.status}`);
  if (signupRes.status !== 201) throw new Error(`Signup failed: ${JSON.stringify(signupData)}`);

  const client1Token = signupData.token;
  const client1Id = signupData.user.id;

  // 2. Verify Initial State (No Membership, No Trainer)
  const initDashRes = await fetch(`${BASE_URL}/client/dashboard`, {
    headers: { Authorization: `Bearer ${client1Token}` },
  });
  const initDash = await initDashRes.json();
  console.log(`2. Dashboard check -> hasActiveMembership: ${initDash.hasActiveMembership}, trainerAssigned: ${initDash.trainerAssigned}`);
  if (initDash.hasActiveMembership !== false || initDash.trainerAssigned !== false) {
    throw new Error('Scenario A Failed: Client should start with NO active membership and NO trainer');
  }

  // Workouts endpoint should be protected (403)
  const initWorkoutsRes = await fetch(`${BASE_URL}/client/workouts`, {
    headers: { Authorization: `Bearer ${client1Token}` },
  });
  console.log(`   Workouts API access without trainer -> HTTP ${initWorkoutsRes.status} (Protected)`);
  if (initWorkoutsRes.status !== 403) throw new Error('Scenario A Failed: Workouts should be 403 when no trainer');

  // 3. View Membership Catalog
  const plansRes = await fetch(`${BASE_URL}/client/membership/plans`, {
    headers: { Authorization: `Bearer ${client1Token}` },
  });
  const plansData = await plansRes.json();
  console.log(`3. Catalog fetch -> found ${plansData.plans?.length} plans for ${plansData.branch?.name}`);
  const targetPlan = plansData.plans.find((p) => p.name === '1 Month Kickstart') || plansData.plans[0];
  console.log(`   Selected Plan: ${targetPlan.name} (Duration: ${targetPlan.durationDays}d, Price: ₹${targetPlan.finalPrice})`);

  // 4. Validate Checkout for Self-Trained
  const checkoutRes = await fetch(`${BASE_URL}/client/membership/checkout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${client1Token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      planId: targetPlan._id,
      trainingPreference: 'SELF_TRAINED',
    }),
  });
  const checkoutData = await checkoutRes.json();
  console.log(`4. Checkout validation -> HTTP ${checkoutRes.status}`);
  console.log(`   Plan Payable: ₹${checkoutData.checkout?.pricing?.planPayable}, Trainer Fee: ₹${checkoutData.checkout?.pricing?.trainerFee}, Grand Total: ₹${checkoutData.checkout?.pricing?.grandTotal}`);

  // 5. Complete Purchase (Instant Online/UPI)
  const purchaseRes = await fetch(`${BASE_URL}/client/membership/purchase`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${client1Token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      planId: targetPlan._id,
      trainingPreference: 'SELF_TRAINED',
      paymentMethod: 'UPI',
      instantConfirm: true,
    }),
  });
  const purchaseData = await purchaseRes.json();
  console.log(`5. Purchase execution -> HTTP ${purchaseRes.status}`);
  console.log(`   Membership status: ${purchaseData.membership?.status}`);
  console.log(`   Trainer assigned: ${purchaseData.trainerAssigned}`);
  if (purchaseData.membership?.status !== 'ACTIVE' || purchaseData.trainerAssigned !== false) {
    throw new Error('Scenario A Failed: Membership should be ACTIVE and trainerAssigned should be false');
  }

  // 6. Verify Dashboard After Purchase
  const activeDashRes = await fetch(`${BASE_URL}/client/dashboard`, {
    headers: { Authorization: `Bearer ${client1Token}` },
  });
  const activeDash = await activeDashRes.json();
  console.log(`6. Post-purchase Dashboard -> hasActiveMembership: ${activeDash.hasActiveMembership}, plan: ${activeDash.membership?.planName}, daysRemaining: ${activeDash.membership?.daysRemaining}`);
  if (activeDash.hasActiveMembership !== true || activeDash.trainerAssigned !== false) {
    throw new Error('Scenario A Failed: Dashboard should reflect active membership while keeping trainerAssigned false');
  }
  console.log('✅ SCENARIO A PASSED: New client purchased plan as Self-Trained; membership active, workouts hidden.\n');

  // ── SCENARIO B: Personal Trainer Membership Purchase Flow ──
  console.log('────────────────────────────────────────────────────');
  console.log('SCENARIO B: New Client Signup -> Buy Plan with Personal Trainer');
  console.log('────────────────────────────────────────────────────');
  const trainerClientEmail = 'test.coached.auto@manandmachine.com';
  await User.deleteOne({ email: trainerClientEmail });

  // 1. Client Signup
  const signup2Res = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Deepak Sharma',
      email: trainerClientEmail,
      phone: '9840099222',
      password: 'Password@123',
      branchId: hqBranch._id,
      fitnessGoal: 'Strength Training',
      experienceLevel: 'Beginner',
    }),
  });
  const signup2Data = await signup2Res.json();
  const client2Token = signup2Data.token;
  const client2Id = signup2Data.user.id;
  console.log(`1. Signup new client -> ${signup2Data.user.name} (${signup2Data.user.email})`);

  // 2. Browse Available Trainers & Check Slot
  const trainersRes = await fetch(`${BASE_URL}/client/trainers`, {
    headers: { Authorization: `Bearer ${client2Token}` },
  });
  const trainersData = await trainersRes.json();
  const selectedCoach = trainersData.trainers[0];
  console.log(`2. Coach Selected: ${selectedCoach.name} (${selectedCoach.specialization})`);

  const testBookingDate = '2026-12-05';
  const slotRes = await fetch(`${BASE_URL}/client/trainers/${selectedCoach._id}/availability?date=${testBookingDate}`, {
    headers: { Authorization: `Bearer ${client2Token}` },
  });
  const slotData = await slotRes.json();
  const chosenSlot = slotData.slots.find((s) => s.available)?.time || '09:00 AM';
  console.log(`   Selected Date: ${testBookingDate}, Time Slot: ${chosenSlot}`);

  // 3. Complete Purchase (Instant Online/UPI)
  const purchase2Res = await fetch(`${BASE_URL}/client/membership/purchase`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${client2Token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      planId: targetPlan._id,
      trainingPreference: 'PERSONAL_TRAINER',
      trainerId: selectedCoach._id,
      date: testBookingDate,
      startTime: chosenSlot,
      paymentMethod: 'UPI',
      instantConfirm: true,
      notes: 'Focus on bench press and barbell squat mechanics',
    }),
  });
  const purchase2Data = await purchase2Res.json();
  console.log(`3. Purchase with Coach -> HTTP ${purchase2Res.status}`);
  console.log(`   Membership status: ${purchase2Data.membership?.status}`);
  console.log(`   Trainer assigned: ${purchase2Data.trainerAssigned}`);
  if (purchase2Data.membership?.status !== 'ACTIVE' || purchase2Data.trainerAssigned !== true) {
    throw new Error('Scenario B Failed: Membership should be ACTIVE and trainerAssigned should be true');
  }

  // 4. Verify Workouts Access Unlocked (200 OK)
  const workoutsRes = await fetch(`${BASE_URL}/client/workouts`, {
    headers: { Authorization: `Bearer ${client2Token}` },
  });
  const workoutsData = await workoutsRes.json();
  console.log(`4. Workouts API access after coach assignment -> HTTP ${workoutsRes.status}`);
  if (workoutsRes.status !== 200 || !workoutsData.success) {
    throw new Error('Scenario B Failed: Workouts should be unlocked with HTTP 200 after coach purchase');
  }

  // 5. Verify Trainer Dashboard sees new client
  const coachClientsRes = await fetch(`${BASE_URL}/trainer/clients`, {
    headers: { Authorization: `Bearer ${coachToken}` },
  });
  const coachClientsData = await coachClientsRes.json();
  const isClientFound = coachClientsData.clients?.some((c) => c.email === trainerClientEmail);
  console.log(`5. Coach Dashboard check -> new client Deepak Sharma visible in roster: ${isClientFound}`);
  if (!isClientFound) {
    throw new Error('Scenario B Failed: Assigned client was not found in Coach client roster');
  }
  console.log('✅ SCENARIO B PASSED: Client purchased membership with coach; trainer assigned, workouts unlocked, coach sees client.\n');

  // ── SCENARIO C: Anti-Double Booking Conflict Prevention (HTTP 409) ──
  console.log('────────────────────────────────────────────────────');
  console.log('SCENARIO C: Conflict Check — Attempt Double Booking Same Slot');
  console.log('────────────────────────────────────────────────────');
  const conflictRes = await fetch(`${BASE_URL}/client/membership/purchase`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${client1Token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      planId: targetPlan._id,
      trainingPreference: 'PERSONAL_TRAINER',
      trainerId: selectedCoach._id,
      date: testBookingDate,
      startTime: chosenSlot, // EXACT SAME SLOT!
      paymentMethod: 'UPI',
      instantConfirm: true,
    }),
  });
  const conflictData = await conflictRes.json();
  console.log(`Attempt duplicate booking for ${chosenSlot} -> HTTP ${conflictRes.status}`);
  console.log(`   Response message: "${conflictData.message}"`);
  if (conflictRes.status !== 409) {
    throw new Error(`Scenario C Failed: Expected 409 Conflict, received ${conflictRes.status}`);
  }
  console.log('✅ SCENARIO C PASSED: Backend rejected double booking with HTTP 409 Conflict.\n');

  // ── SCENARIO D: Pay at Reception Desk & Admin Confirmation ──
  console.log('────────────────────────────────────────────────────');
  console.log('SCENARIO D: Pay at Reception (Pending) -> Admin Desk Confirmation');
  console.log('────────────────────────────────────────────────────');
  const receptionClientEmail = 'test.reception.auto@manandmachine.com';
  await User.deleteOne({ email: receptionClientEmail });

  // 1. Signup client
  const signup3Res = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Anand V',
      email: receptionClientEmail,
      phone: '9840099333',
      password: 'Password@123',
      branchId: hqBranch._id,
      fitnessGoal: 'General Fitness',
      experienceLevel: 'Beginner',
    }),
  });
  const signup3Data = await signup3Res.json();
  const client3Token = signup3Data.token;
  const client3Id = signup3Data.user.id;

  // 2. Select Reception Payment
  const receptionPurchaseRes = await fetch(`${BASE_URL}/client/membership/purchase`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${client3Token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      planId: targetPlan._id,
      trainingPreference: 'PERSONAL_TRAINER',
      trainerId: selectedCoach._id,
      date: testBookingDate,
      startTime: '04:00 PM',
      paymentMethod: 'CASH',
      instantConfirm: false, // Pay at reception desk!
    }),
  });
  const receptionData = await receptionPurchaseRes.json();
  console.log(`1. Reception Purchase -> HTTP ${receptionPurchaseRes.status}`);
  console.log(`   Membership status: ${receptionData.membership?.status} (should be PENDING)`);
  console.log(`   Trainer assigned: ${receptionData.trainerAssigned} (should be false)`);

  if (receptionData.membership?.status !== 'PENDING' || receptionData.trainerAssigned !== false) {
    throw new Error('Scenario D Failed: Reception purchase should be PENDING and trainer NOT yet assigned');
  }

  // Verify client trainerId in DB is still null
  const dbProfile = await ClientProfile.findOne({ userId: client3Id });
  console.log(`   DB check -> client trainerId: ${dbProfile.trainerId} (should be null)`);
  if (dbProfile.trainerId !== null) {
    throw new Error('Scenario D Failed: trainerId in DB must remain null prior to payment confirmation');
  }

  // 3. Admin confirms membership payment
  const adminMemRes = await fetch(`${BASE_URL}/admin/memberships?status=PENDING`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminMemData = await adminMemRes.json();
  console.log(`2. Admin views pending memberships -> found ${adminMemData.memberships?.length} pending`);

  // Activate membership via Admin status update
  const activateRes = await fetch(`${BASE_URL}/admin/memberships/${receptionData.membership._id}/status`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'ACTIVATE' }),
  });
  const activateData = await activateRes.json();
  console.log(`3. Admin activates membership -> HTTP ${activateRes.status}`);

  // Confirm booking payment via Admin booking confirm
  const pendingBooking = await TrainerBooking.findOne({ clientId: client3Id, bookingStatus: 'PENDING_PAYMENT' });
  if (pendingBooking) {
    const confirmBookingRes = await fetch(`${BASE_URL}/admin/trainer-bookings/${pendingBooking._id}/confirm-payment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notes: 'Cash paid at Kovilpatti reception desk' }),
    });
    console.log(`4. Admin confirms trainer booking at desk -> HTTP ${confirmBookingRes.status}`);
  }

  // Verify trainer is now assigned in DB
  const confirmedProfile = await ClientProfile.findOne({ userId: client3Id });
  console.log(`5. Post-confirmation DB check -> trainerId: ${confirmedProfile.trainerId}`);
  if (!confirmedProfile.trainerId) {
    throw new Error('Scenario D Failed: Trainer was not assigned after front desk payment confirmation');
  }
  console.log('✅ SCENARIO D PASSED: Reception payment safely held in PENDING; activated & assigned by Admin upon desk collection.\n');

  // ── CLEANUP TEST ACCOUNTS ──
  console.log('────────────────────────────────────────────────────');
  console.log('Cleaning up temporary test accounts...');
  await User.deleteMany({ email: { $in: [selfTrainedEmail, trainerClientEmail, receptionClientEmail] } });
  await ClientProfile.deleteMany({ userId: { $in: [client1Id, client2Id, client3Id] } });
  await Membership.deleteMany({ userId: { $in: [client1Id, client2Id, client3Id] } });
  await TrainerBooking.deleteMany({ clientId: { $in: [client1Id, client2Id, client3Id] } });
  await TrainingAppointment.deleteMany({ clientId: { $in: [client1Id, client2Id, client3Id] } });
  await Payment.deleteMany({ userId: { $in: [client1Id, client2Id, client3Id] } });
  console.log('✓ Cleanup complete\n');

  console.log('====================================================');
  console.log('🎉 ALL 4 SCENARIOS PASSED WITH 100% SUCCESS!');
  console.log('====================================================\n');
  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error('\n❌ E2E TEST FAILED:', err);
  process.exit(1);
});
