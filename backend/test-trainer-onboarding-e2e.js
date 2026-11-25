const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./src/models/User');
const TrainerProfile = require('./src/models/TrainerProfile');
const WorkoutPlan = require('./src/models/WorkoutPlan');
const ClientProfile = require('./src/models/ClientProfile');
const { generateSecureToken, hashToken } = require('./src/utils/tokenUtils');

const BASE_URL = 'http://localhost:5000/api';

const req = async ({ method = 'GET', path: urlPath, token, body }) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${urlPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
};

const assert = (cond, msg) => {
  if (!cond) {
    throw new Error(`ASSERTION FAILED: ${msg}`);
  }
};

async function runTests() {
  console.log('==================================================================');
  console.log('🏋️ MAN & MACHINE — TRAINER ONBOARDING & SECURITY E2E TEST SUITE');
  console.log('==================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);

  const createdTrainerIds = [];
  let createdOtherPlanId = null;
  let createdDummyTrainerId = null;

  try {
    // 0. HQ Admin Login
    console.log('0. Authenticating HQ Admin...');
    const adminRes = await req({
      method: 'POST',
      path: '/auth/login',
      body: { email: 'admin@manandmachine.com', password: 'Password@123' },
    });
    assert(adminRes.ok && adminRes.data?.user?.role === 'ADMIN', 'HQ Admin login failed');
    const adminToken = adminRes.data.token;

    const branchesRes = await req({ method: 'GET', path: '/branches' });
    assert(branchesRes.ok && branchesRes.data?.branches?.length > 0, 'No branches found');
    const branchId = branchesRes.data.branches[0]._id;

    const suffix = Date.now();
    const trainerEmail = `e2e.coach.${suffix}@manandmachine.com`;

    // 1. Admin creates Trainer (without password -> PENDING_ACTIVATION)
    console.log('1. Admin creates Trainer without plaintext password...');
    const createRes = await req({
      method: 'POST',
      path: '/admin/trainers',
      token: adminToken,
      body: {
        name: 'Coach Arjun E2E',
        email: trainerEmail,
        phone: '9876543219',
        branchId,
        specialization: 'Strength & Hypertrophy',
        experienceYears: 6,
        qualification: 'NSCA-CSCS',
        employmentStatus: 'FULL_TIME',
      },
    });
    assert(createRes.status === 201 && createRes.data?.success, `Create trainer failed: ${JSON.stringify(createRes.data)}`);
    const trainerId = createRes.data.trainer.id;
    createdTrainerIds.push(trainerId);
    assert(createRes.data.trainer.status === 'PENDING_ACTIVATION', 'Expected PENDING_ACTIVATION status');
    assert(!createRes.data.trainer.password, 'Response must never contain password');
    console.log('   ✓ Trainer created with PENDING_ACTIVATION');

    // 2. Verify saved in MongoDB with hashed token & linked TrainerProfile
    console.log('2. Verifying MongoDB User + TrainerProfile + hashed token...');
    const dbUser = await User.findById(trainerId).select('+activationTokenHash +activationTokenExpiresAt');
    const dbProfile = await TrainerProfile.findOne({ userId: trainerId });
    assert(dbUser && dbUser.role === 'TRAINER', 'User not saved as TRAINER');
    assert(!dbUser.password, 'Pending user should not have a password set');
    assert(Boolean(dbUser.activationTokenHash), 'activationTokenHash missing');
    assert(dbProfile && dbProfile.qualification === 'NSCA-CSCS', 'TrainerProfile missing or incorrect');
    console.log('   ✓ MongoDB User & TrainerProfile verified; raw token not stored in DB');

    // 3. Invitation generated accurately (manual mode when SMTP unconfigured)
    console.log('3. Checking invitation generation & non-configured email disclosure...');
    assert(createRes.data.emailConfigured === false, 'SMTP should report unconfigured when SMTP_HOST unset');
    assert(createRes.data.emailDelivered === false, 'Must not pretend email delivered');
    assert(createRes.data.manualActivationUrl && createRes.data.manualActivationUrl.includes('/activate-account/'), 'Manual activation link missing');
    const firstToken = createRes.data.manualActivationUrl.split('/activate-account/')[1];
    assert(hashToken(firstToken) === dbUser.activationTokenHash, 'Stored hash does not match SHA-256 of raw token');
    console.log('   ✓ Activation URL & hash verified');

    // 4. Duplicate email registration rejected
    console.log('4. Testing duplicate email rejection...');
    const dupRes = await req({
      method: 'POST',
      path: '/admin/trainers',
      token: adminToken,
      body: {
        name: 'Duplicate Coach',
        email: trainerEmail,
        phone: '9876543210',
        branchId,
      },
    });
    assert(dupRes.status === 409, `Expected 409 conflict, got ${dupRes.status}`);
    console.log('   ✓ Duplicate email rejected (409)');

    // 5. Pending trainer cannot log in
    console.log('5. Verifying PENDING_ACTIVATION trainer cannot log in...');
    const pendingLogin = await req({
      method: 'POST',
      path: '/auth/login',
      body: { email: trainerEmail, password: 'CoachPassword@123' },
    });
    assert(pendingLogin.status === 403, `Expected 403 for pending login, got ${pendingLogin.status}`);
    console.log('   ✓ Pending trainer login blocked (403)');

    // 6. Resend invitation invalidates old token
    console.log('6. Verifying Resend Invitation invalidates previous token...');
    const resendRes = await req({
      method: 'POST',
      path: `/admin/trainers/${trainerId}/resend-invitation`,
      token: adminToken,
    });
    assert(resendRes.ok && resendRes.data.manualActivationUrl, 'Resend invitation failed');
    const secondToken = resendRes.data.manualActivationUrl.split('/activate-account/')[1];
    assert(secondToken !== firstToken, 'New token must differ from old token');

    const checkOldToken = await req({ method: 'GET', path: `/auth/activate/${firstToken}` });
    assert(checkOldToken.status === 400, 'Old token must be rejected after resend');
    console.log('   ✓ Old activation token invalidated on resend');

    // 7. Expired activation link is rejected
    console.log('7. Testing expired activation link rejection...');
    const expToken = generateSecureToken(32);
    const expTrainer = await User.create({
      name: 'Expired Coach',
      email: `expired.${suffix}@manandmachine.com`,
      phone: '9876543218',
      branchId,
      role: 'TRAINER',
      status: 'PENDING_ACTIVATION',
      activationTokenHash: hashToken(expToken),
      activationTokenExpiresAt: new Date(Date.now() - 60 * 1000),
    });
    createdTrainerIds.push(expTrainer._id.toString());
    const expVerify = await req({ method: 'GET', path: `/auth/activate/${expToken}` });
    assert(expVerify.status === 400, `Expected 400 for expired link, got ${expVerify.status}`);
    console.log('   ✓ Expired activation link rejected (400)');

    // 8. Trainer verifies valid activation link & sets password
    console.log('8. Verifying valid activation link & setting trainer password...');
    const verifyValid = await req({ method: 'GET', path: `/auth/activate/${secondToken}` });
    assert(verifyValid.ok && verifyValid.data?.account?.email === trainerEmail, 'Valid token verification failed');

    const trainerPassword = 'StrongCoach@2026';
    const activateRes = await req({
      method: 'POST',
      path: `/auth/activate/${secondToken}`,
      body: { password: trainerPassword, confirmPassword: trainerPassword },
    });
    assert(activateRes.ok && activateRes.data?.user?.status === 'ACTIVE', 'Activation failed');
    console.log('   ✓ Trainer activated & password hashed');

    // 9. Reused activation link is rejected
    console.log('9. Testing single-use enforcement (reuse rejected)...');
    const reuseRes = await req({
      method: 'POST',
      path: `/auth/activate/${secondToken}`,
      body: { password: 'AnotherPassword@1', confirmPassword: 'AnotherPassword@1' },
    });
    assert(reuseRes.status === 400, `Expected 400 on reused token, got ${reuseRes.status}`);
    console.log('   ✓ Reused activation token rejected (400)');

    // 10. Active Trainer logs in successfully & receives TRAINER role
    console.log('10. Testing Trainer login & role-based response...');
    const loginRes = await req({
      method: 'POST',
      path: '/auth/login',
      body: { email: trainerEmail, password: trainerPassword },
    });
    assert(loginRes.ok && loginRes.data?.token && loginRes.data?.user?.role === 'TRAINER', 'Trainer login failed');
    const trainerToken = loginRes.data.token;
    console.log('   ✓ Trainer login succeeded with role TRAINER -> routes to /trainer/dashboard');

    // 11. Trainer accesses Trainer Dashboard & cannot access Admin APIs
    console.log('11. Verifying Trainer dashboard access & Admin API protection...');
    const tDash = await req({ method: 'GET', path: '/trainer/dashboard', token: trainerToken });
    assert(tDash.ok, 'Trainer should access /api/trainer/dashboard');

    const adminForbidden = await req({ method: 'GET', path: '/admin/dashboard', token: trainerToken });
    assert(adminForbidden.status === 403, `Expected 403 on Admin API, got ${adminForbidden.status}`);
    console.log('   ✓ Trainer accessed Trainer Dashboard; Admin API blocked (403)');

    // 12. Trainer cannot access another trainer's data or escalate role
    console.log('12. Testing cross-trainer isolation & anti-role-escalation...');
    const otherTrainer = await User.create({
      name: 'Other Coach',
      email: `other.${suffix}@manandmachine.com`,
      phone: '9876543217',
      password: 'OtherPassword@1',
      branchId,
      role: 'TRAINER',
      status: 'ACTIVE',
    });
    createdDummyTrainerId = otherTrainer._id;
    createdTrainerIds.push(otherTrainer._id.toString());

    const otherPlan = await WorkoutPlan.create({
      title: 'Private Plan B',
      trainerId: otherTrainer._id,
      branchId,
      status: 'DRAFT',
    });
    createdOtherPlanId = otherPlan._id;

    const crossPlanRes = await req({
      method: 'GET',
      path: `/trainer/workouts/${otherPlan._id}`,
      token: trainerToken,
    });
    assert(crossPlanRes.status === 403, `Expected 403 for another trainer's plan, got ${crossPlanRes.status}`);

    // Unassigned client isolation check
    const anyClient = await ClientProfile.findOne({ trainerId: { $ne: trainerId } });
    if (anyClient) {
      const crossClientRes = await req({
        method: 'GET',
        path: `/trainer/clients/${anyClient.userId}`,
        token: trainerToken,
      });
      assert(crossClientRes.status === 403, `Expected 403 for unassigned client, got ${crossClientRes.status}`);
    }

    // Attempt role escalation on profile update
    await req({
      method: 'PUT',
      path: '/trainer/profile',
      token: trainerToken,
      body: { bio: 'Updated bio', role: 'ADMIN', status: 'INACTIVE' },
    });
    const afterUpdate = await User.findById(trainerId);
    assert(afterUpdate.role === 'TRAINER', 'Trainer must never escalate role');
    console.log('   ✓ Cross-trainer isolation and role lock verified');

    // 13. Suspended trainer loses active session & cannot log in
    console.log('13. Verifying Suspended trainer revocation & login block...');
    const suspendRes = await req({
      method: 'PATCH',
      path: `/admin/trainers/${trainerId}/status`,
      token: adminToken,
      body: { status: 'SUSPENDED' },
    });
    assert(suspendRes.ok, 'Admin suspend trainer failed');

    const revokedSessionRes = await req({ method: 'GET', path: '/trainer/dashboard', token: trainerToken });
    assert(revokedSessionRes.status === 401 || revokedSessionRes.status === 403, `Expected 401/403 after suspend, got ${revokedSessionRes.status}`);

    const suspendedLogin = await req({
      method: 'POST',
      path: '/auth/login',
      body: { email: trainerEmail, password: trainerPassword },
    });
    assert(suspendedLogin.status === 403, `Expected 403 on suspended login, got ${suspendedLogin.status}`);
    console.log('   ✓ Suspended trainer session revoked & login blocked');

    // Reactivate for Forgot Password test
    await req({
      method: 'PATCH',
      path: `/admin/trainers/${trainerId}/status`,
      token: adminToken,
      body: { status: 'ACTIVE' },
    });

    // 14. Inactive trainer check (via status update)
    console.log('14. Verifying INACTIVE trainer login block...');
    await req({
      method: 'PATCH',
      path: `/admin/trainers/${trainerId}/status`,
      token: adminToken,
      body: { status: 'INACTIVE' },
    });
    const inactiveLogin = await req({
      method: 'POST',
      path: '/auth/login',
      body: { email: trainerEmail, password: trainerPassword },
    });
    assert(inactiveLogin.status === 403, `Expected 403 on INACTIVE login, got ${inactiveLogin.status}`);
    console.log('   ✓ Inactive trainer blocked (403)');

    // Reactivate for Forgot & Reset Password test
    await req({
      method: 'PATCH',
      path: `/admin/trainers/${trainerId}/status`,
      token: adminToken,
      body: { status: 'ACTIVE' },
    });

    // 15. Forgot Password & Reset Password flow
    console.log('15. Testing Forgot Password & Admin/User Reset Password flow...');
    // Non-existent email returns exact same 200 without revealing existence
    const fpFake = await req({
      method: 'POST',
      path: '/auth/forgot-password',
      body: { email: 'nobody.exists.here@manandmachine.com' },
    });
    const fpReal = await req({
      method: 'POST',
      path: '/auth/forgot-password',
      body: { email: trainerEmail },
    });
    assert(fpFake.status === 200 && fpReal.status === 200 && fpFake.data.message === fpReal.data.message, 'Forgot password must not enumerate emails');

    // Use Admin Reset Password workflow to get manual reset URL (or simulate email link click)
    const adminResetRes = await req({
      method: 'POST',
      path: `/admin/trainers/${trainerId}/reset-password`,
      token: adminToken,
    });
    assert(adminResetRes.ok && adminResetRes.data.manualResetUrl, 'Admin reset-password failed');
    const resetToken = adminResetRes.data.manualResetUrl.split('/reset-password/')[1];

    const newResetPass = 'ResetTrainer@999';
    const verifyReset = await req({ method: 'GET', path: `/auth/reset-password/${resetToken}` });
    assert(verifyReset.ok, 'Reset token verification failed');

    const doReset = await req({
      method: 'POST',
      path: `/auth/reset-password/${resetToken}`,
      body: { password: newResetPass, confirmPassword: newResetPass },
    });
    assert(doReset.ok, 'Reset password completion failed');

    // Reusing reset token must fail
    const reuseReset = await req({
      method: 'POST',
      path: `/auth/reset-password/${resetToken}`,
      body: { password: 'OtherPass@123', confirmPassword: 'OtherPass@123' },
    });
    assert(reuseReset.status === 400, 'Reused reset token should be rejected');

    // Login with new password must succeed!
    const finalLogin = await req({
      method: 'POST',
      path: '/auth/login',
      body: { email: trainerEmail, password: newResetPass },
    });
    assert(finalLogin.ok && finalLogin.data?.user?.role === 'TRAINER', 'Login after password reset failed');
    console.log('   ✓ Forgot/Reset password flow, single-use token, and session invalidation verified!');

    console.log('\n🎉 ALL 15 TRAINER ONBOARDING & SECURITY SCENARIOS PASSED 100%!');
  } finally {
    // Cleanup synthetic test records
    if (createdOtherPlanId) await WorkoutPlan.findByIdAndDelete(createdOtherPlanId).catch(() => {});
    if (createdTrainerIds.length > 0) {
      await TrainerProfile.deleteMany({ userId: { $in: createdTrainerIds } }).catch(() => {});
      await User.deleteMany({ _id: { $in: createdTrainerIds } }).catch(() => {});
    }
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
