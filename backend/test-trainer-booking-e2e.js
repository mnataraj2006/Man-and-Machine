const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const User = require('./src/models/User');
const ClientProfile = require('./src/models/ClientProfile');
const TrainerProfile = require('./src/models/TrainerProfile');
const TrainerBooking = require('./src/models/TrainerBooking');
const TrainingAppointment = require('./src/models/TrainingAppointment');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE E2E TEST SUITE:');
  console.log('   MY TRAINER & SELF-TRAINED CLIENT SYSTEM');
  console.log('====================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ Connected to MongoDB Atlas\n');

  // 1. Setup Test Actors
  const clientUser = await User.findOne({ email: 'mnataraj2108@gmail.com' });
  if (!clientUser) throw new Error('Client user Nataraj M not found');

  const trainerUser = await User.findOne({ email: 'karthik.coach@manandmachine.com' });
  if (!trainerUser) throw new Error('Trainer Karthik Raja not found');

  const adminUser = await User.findOne({ role: 'ADMIN' });
  if (!adminUser) throw new Error('Admin user not found');

  const clientToken = jwt.sign({ id: clientUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  const adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

  let clientProfile = await ClientProfile.findOne({ userId: clientUser._id });
  if (!clientProfile) {
    clientProfile = new ClientProfile({ userId: clientUser._id, branchId: clientUser.branchId });
    await clientProfile.save();
  }

  // Ensure clean initial state (self-trained)
  clientProfile.trainerId = null;
  await clientProfile.save();

  // Clean previous test bookings
  await TrainerBooking.deleteMany({ clientId: clientUser._id });
  await TrainingAppointment.deleteMany({ clientId: clientUser._id });

  console.log(`[Actors Configured]`);
  console.log(`  Client:  ${clientUser.name} (${clientUser.email})`);
  console.log(`  Trainer: ${trainerUser.name} (${trainerUser.email})`);
  console.log(`  Admin:   ${adminUser.name} (${adminUser.email})\n`);

  // ── SCENARIO 1: Self-trained Client (trainerId = null) ──
  console.log('────────────────────────────────────────────────────');
  console.log('TEST 1: Self-Trained Client Verification (trainerId = null)');
  console.log('────────────────────────────────────────────────────');
  {
    const res = await fetch(`${BASE_URL}/client/trainer`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    const data = await res.json();
    console.log(`GET /api/client/trainer -> HTTP ${res.status}`);
    console.log(`  hasTrainer: ${data.hasTrainer}`);
    console.log(`  assignedTrainer: ${data.assignedTrainer}`);

    if (data.hasTrainer !== false || data.assignedTrainer !== null) {
      throw new Error('Test 1 Failed: hasTrainer should be false when trainerId is null');
    }

    const wRes = await fetch(`${BASE_URL}/client/workouts`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    const wData = await wRes.json();
    console.log(`GET /api/client/workouts -> HTTP ${wRes.status} (Protected: requires active trainer)`);
    console.log(`  trainerAssigned: ${wData.trainerAssigned}`);
    console.log(`  message: "${wData.message}"`);
    if (wRes.status !== 403 || wData.trainerAssigned !== false) {
      throw new Error('Test 1 Failed: workouts should be protected with 403 when no trainer assigned');
    }
    console.log('✅ TEST 1 PASSED: Self-trained client correctly identified; My Workouts is inactive & protected.\n');
  }

  // ── SCENARIO 2: Browse Trainers & Availability ──
  console.log('────────────────────────────────────────────────────');
  console.log('TEST 2: Trainer Discovery & Dynamic Availability Slots');
  console.log('────────────────────────────────────────────────────');
  const testDate = '2026-11-28';
  {
    const res = await fetch(`${BASE_URL}/client/trainers`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    const data = await res.json();
    console.log(`GET /api/client/trainers -> HTTP ${res.status}`);
    console.log(`  trainers found: ${data.trainers.length}`);
    const found = data.trainers.find((t) => t.id === trainerUser._id.toString() || t._id === trainerUser._id.toString());
    if (!found) throw new Error('Test 2 Failed: Karthik Raja not in available trainers list');
    console.log(`  Trainer ${found.name}: Pricing Single ₹${found.pricing?.singleSession}, 10-Pack ₹${found.pricing?.package10}`);

    const slotRes = await fetch(`${BASE_URL}/client/trainers/${trainerUser._id}/availability?date=${testDate}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    const slotData = await slotRes.json();
    console.log(`GET /api/client/trainers/:id/availability?date=${testDate} -> HTTP ${slotRes.status}`);
    console.log(`  Available slots: ${slotData.slots?.length}`);
    console.log(`  First 3 slots:`, slotData.slots?.slice(0, 3));
    if (!slotData.slots || slotData.slots.length === 0) {
      throw new Error('Test 2 Failed: No slots generated for working day');
    }
    console.log('✅ TEST 2 PASSED: Real trainers browsable and slots computed dynamically.\n');
  }

  // ── SCENARIO 3: Instant Booking (UPI) & Auto-Assignment ──
  console.log('────────────────────────────────────────────────────');
  console.log('TEST 3: Instant Booking (UPI) -> Assignment & Workouts Access');
  console.log('────────────────────────────────────────────────────');
  let confirmedBookingId = null;
  {
    const bookRes = await fetch(`${BASE_URL}/client/trainers/${trainerUser._id}/book`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${clientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serviceType: 'Single Session',
        date: testDate,
        startTime: '10:00',
        endTime: '11:00',
        amount: 500,
        paymentMethod: 'UPI',
        instantConfirm: true,
      }),
    });
    const bookData = await bookRes.json();
    console.log(`POST /api/client/trainers/:id/book (UPI) -> HTTP ${bookRes.status}`);
    console.log(`  Ref: ${bookData.booking?.bookingReference}`);
    console.log(`  Payment Status: ${bookData.booking?.paymentStatus}`);
    console.log(`  Booking Status: ${bookData.booking?.bookingStatus}`);
    console.log(`  Trainer Assigned: ${bookData.trainerAssigned}`);

    if (bookRes.status !== 201 || !bookData.success || bookData.booking?.bookingStatus !== 'CONFIRMED') {
      throw new Error(`Test 3 Failed: Booking not confirmed: ${JSON.stringify(bookData)}`);
    }
    confirmedBookingId = bookData.booking._id;

    // Verify client state
    const tRes = await fetch(`${BASE_URL}/client/trainer`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    const tData = await tRes.json();
    console.log(`GET /api/client/trainer -> hasTrainer: ${tData.hasTrainer}, name: ${tData.assignedTrainer?.name}`);
    if (!tData.hasTrainer || !tData.assignedTrainer) {
      throw new Error('Test 3 Failed: Client trainer is not assigned after instant booking');
    }

    const wRes = await fetch(`${BASE_URL}/client/workouts`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    const wData = await wRes.json();
    console.log(`GET /api/client/workouts -> HTTP ${wRes.status} (Unlocked: client has assigned trainer)`);
    console.log(`  plans count: ${wData.plans?.length || 0}`);
    if (wRes.status !== 200 || !wData.success) {
      throw new Error('Test 3 Failed: workouts should return HTTP 200 when trainer is assigned');
    }
    console.log('✅ TEST 3 PASSED: Instant payment auto-assigns trainer & unlocks My Workouts.\n');
  }

  // ── SCENARIO 4: Double Booking Conflict Prevention ──
  console.log('────────────────────────────────────────────────────');
  console.log('TEST 4: Anti-Double Booking Conflict Check (HTTP 409)');
  console.log('────────────────────────────────────────────────────');
  {
    const conflictRes = await fetch(`${BASE_URL}/client/trainers/${trainerUser._id}/book`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${clientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serviceType: 'Single Session',
        date: testDate,
        startTime: '10:00', // SAME TIME!
        endTime: '11:00',
        amount: 500,
        paymentMethod: 'UPI',
        instantConfirm: true,
      }),
    });
    const conflictData = await conflictRes.json();
    console.log(`Attempt duplicate booking for 10:00 -> HTTP ${conflictRes.status}`);
    console.log(`  Response message: "${conflictData.message}"`);

    if (conflictRes.status !== 409) {
      throw new Error(`Test 4 Failed: Expected 409 Conflict, got ${conflictRes.status}`);
    }
    console.log('✅ TEST 4 PASSED: System rejected duplicate booking with 409 Conflict.\n');
  }

  // ── SCENARIO 5: Pay at Reception (Pending Payment) & Admin Confirmation ──
  console.log('────────────────────────────────────────────────────');
  console.log('TEST 5: Pay at Reception (Pending) -> Admin Confirm -> Trainer Assigned');
  console.log('────────────────────────────────────────────────────');
  {
    // Unassign client first
    await ClientProfile.updateOne({ userId: clientUser._id }, { $set: { trainerId: null } });

    const receptionRes = await fetch(`${BASE_URL}/client/trainers/${trainerUser._id}/book`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${clientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serviceType: 'Single Session',
        date: testDate,
        startTime: '14:00',
        endTime: '15:00',
        amount: 500,
        paymentMethod: 'CASH',
        instantConfirm: false, // Pay at reception
      }),
    });
    const receptionData = await receptionRes.json();
    console.log(`POST /api/client/trainers/:id/book (Reception) -> HTTP ${receptionRes.status}`);
    if (receptionRes.status !== 201) {
      console.log('  reception error:', receptionData);
    }
    console.log(`  Payment Status: ${receptionData.booking?.paymentStatus}`);
    console.log(`  Booking Status: ${receptionData.booking?.bookingStatus}`);
    console.log(`  Trainer Assigned: ${receptionData.trainerAssigned}`);

    if (receptionData.booking?.paymentStatus !== 'PENDING_PAYMENT') {
      throw new Error('Test 5 Failed: Booking should be PENDING_PAYMENT');
    }

    // Verify trainer is NOT yet assigned
    const checkTrainer = await ClientProfile.findOne({ userId: clientUser._id });
    console.log(`  Client trainerId in DB: ${checkTrainer.trainerId} (should be null)`);
    if (checkTrainer.trainerId !== null) {
      throw new Error('Test 5 Failed: Trainer should NOT be assigned before reception payment');
    }

    // Admin fetches bookings
    const adminListRes = await fetch(`${BASE_URL}/admin/trainer-bookings`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminListData = await adminListRes.json();
    console.log(`GET /api/admin/trainer-bookings -> found ${adminListData.bookings?.length} bookings`);

    // Admin confirms payment
    const confirmRes = await fetch(`${BASE_URL}/admin/trainer-bookings/${receptionData.booking._id}/confirm-payment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notes: 'Cash paid at Kovilpatti front desk' }),
    });
    const confirmData = await confirmRes.json();
    console.log(`POST /api/admin/trainer-bookings/:id/confirm-payment -> HTTP ${confirmRes.status}`);
    console.log(`  Payment Status: ${confirmData.booking?.paymentStatus}`);
    console.log(`  Booking Status: ${confirmData.booking?.bookingStatus}`);

    // Verify trainer is NOW assigned
    const verifiedProfile = await ClientProfile.findOne({ userId: clientUser._id });
    console.log(`  Client trainerId in DB after Admin confirm: ${verifiedProfile.trainerId}`);
    if (verifiedProfile.trainerId?.toString() !== trainerUser._id.toString()) {
      throw new Error('Test 5 Failed: Trainer was not assigned to client after admin confirmation');
    }
    console.log('✅ TEST 5 PASSED: Pending booking confirmed by Admin, trainer successfully assigned.\n');
  }

  // ── SCENARIO 6: Clean State Reset ──
  console.log('────────────────────────────────────────────────────');
  console.log('TEST 6: Cleanup & Reset Client to Clean Self-Trained State');
  console.log('────────────────────────────────────────────────────');
  {
    await ClientProfile.updateOne({ userId: clientUser._id }, { $set: { trainerId: null } });
    await TrainerBooking.deleteMany({ clientId: clientUser._id });
    await TrainingAppointment.deleteMany({ clientId: clientUser._id });

    const finalRes = await fetch(`${BASE_URL}/client/trainer`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    const finalData = await finalRes.json();
    console.log(`Final check GET /api/client/trainer -> hasTrainer: ${finalData.hasTrainer}`);
    if (finalData.hasTrainer !== false) {
      throw new Error('Test 6 Failed: Final state is not self-trained');
    }
    console.log('✅ TEST 6 PASSED: Database cleaned up and client restored to self-trained state.\n');
  }

  console.log('====================================================');
  console.log('🎉 ALL 6 TEST SCENARIOS PASSED WITH 100% SUCCESS!');
  console.log('====================================================\n');
  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error('\n❌ E2E TEST FAILED:', err);
  process.exit(1);
});
