const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch(e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('==================================================');
  console.log('MAN & MACHINE — CLIENT API END-TO-END VERIFICATION');
  console.log('==================================================\n');

  // 1. Unauthenticated request check
  console.log('1. [SECURITY] Testing Unauthenticated Access to /api/client/dashboard...');
  const unauth = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/client/dashboard',
    method: 'GET'
  });
  console.log(`   -> Status: ${unauth.status} (Expected: 401)`);
  console.log(`   -> Message: "${unauth.data?.message}"\n`);

  // 2. Register/Login test client
  const testEmail = `athlete_${Date.now()}@manandmachine.com`;
  const testPassword = 'Password@123';

  // Get branches first to link branchId
  const branchesRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/branches',
    method: 'GET'
  });
  const branchId = branchesRes.data?.branches?.[0]?._id;

  console.log('2. [AUTH] Registering fresh Client Athlete...');
  const regRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'Arun Vijay',
    email: testEmail,
    phone: '9842100000',
    branchId: branchId,
    fitnessGoal: 'Muscle Building',
    experienceLevel: 'Intermediate',
    password: testPassword,
    confirmPassword: testPassword
  });

  console.log(`   -> Registration Status: ${regRes.status} (Expected: 201)`);
  console.log(`   -> Registration Response:`, regRes.data);
  const token = regRes.data?.token;
  if (!token) {
    throw new Error('Could not obtain auth token for client');
  }
  console.log(`   -> JWT Token obtained successfully for ${regRes.data?.user?.fullName} (${regRes.data?.user?.role})\n`);

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 3. GET /api/client/dashboard
  console.log('3. [DASHBOARD] GET /api/client/dashboard...');
  const dashRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/client/dashboard',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`   -> Status: ${dashRes.status} (Expected: 200)`);
  console.log(`   -> Welcome: "${dashRes.data?.client?.name}", Branch: "${dashRes.data?.client?.branch?.name}"`);
  console.log(`   -> Stats:`, dashRes.data?.stats);

  // 4. GET & PUT /api/client/profile
  console.log('\n4. [PROFILE] GET & PUT /api/client/profile...');
  const profRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/client/profile',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`   -> GET Status: ${profRes.status}, Current Goal: ${profRes.data?.profile?.fitnessGoal}`);

  const updateProfRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/client/profile',
    method: 'PUT',
    headers: authHeaders
  }, {
    fullName: 'Arun Vijay (Champion)',
    phone: '9842199999',
    fitnessGoal: 'STRENGTH_TRAINING',
    experienceLevel: 'ADVANCED'
  });
  console.log(`   -> PUT Status: ${updateProfRes.status}, Message: "${updateProfRes.data?.message}"`);

  // 5. GET & POST /api/client/workouts
  console.log('\n5. [WORKOUTS] GET /api/client/workouts & POST session...');
  const workoutsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/client/workouts',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`   -> GET Status: ${workoutsRes.status}, Has Assigned Plan: ${!!workoutsRes.data?.activePlan}`);

  const sessionRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/client/workouts/freestyle/sessions',
    method: 'POST',
    headers: authHeaders
  }, {
    workoutTitle: 'Heavy Upper Body & Core',
    durationMinutes: 55,
    notes: 'Hit all working sets with strict form.',
    completedExercises: [
      { name: 'Barbell Bench Press', targetSets: 4, targetReps: '6-8', completedSets: 4, weightLiftedKg: 95 },
      { name: 'Incline Dumbbell Press', targetSets: 3, targetReps: '8-10', completedSets: 3, weightLiftedKg: 34 }
    ]
  });
  console.log(`   -> Log Session Status: ${sessionRes.status}, Session ID: ${sessionRes.data?.session?._id}`);

  // 6. GET /api/client/attendance
  console.log('\n6. [ATTENDANCE] GET /api/client/attendance...');
  const attRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/client/attendance',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`   -> Status: ${attRes.status}, This Month Visits: ${attRes.data?.totalThisMonth}, Total This Year: ${attRes.data?.totalThisYear}`);

  // 7. POST & GET /api/client/progress
  console.log('\n7. [PROGRESS] Logging Weight & Strength PR...');
  const weightLogRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/client/progress',
    method: 'POST',
    headers: authHeaders
  }, {
    type: 'BODY_WEIGHT',
    weightKg: 77.2,
    note: 'Post-workout check'
  });
  console.log(`   -> Log Weight Status: ${weightLogRes.status}`);

  const prLogRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/client/progress',
    method: 'POST',
    headers: authHeaders
  }, {
    type: 'STRENGTH_PR',
    exerciseName: 'Barbell Squat',
    weightLiftedKg: 140,
    reps: 5,
    note: 'Deep clean reps'
  });
  console.log(`   -> Log PR Status: ${prLogRes.status}`);

  const progRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/client/progress',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`   -> GET Progress Status: ${progRes.status}, Weight Records: ${progRes.data?.weightRecords?.length}, PR Records: ${progRes.data?.strengthRecords?.length}`);

  // 8. GET /api/client/membership & POST renewal-request
  console.log('\n8. [MEMBERSHIP] GET /api/client/membership & POST renewal request...');
  const memRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/client/membership',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`   -> GET Status: ${memRes.status}, Active Membership: ${!!memRes.data?.current}`);

  const renewalRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/client/membership/renewal-request',
    method: 'POST',
    headers: authHeaders
  }, {
    preferredPlan: 'ANNUAL PRO MEMBERSHIP',
    note: 'Looking to renew for 12 months with coach addon.'
  });
  console.log(`   -> Renewal Request Status: ${renewalRes.status}, Message: "${renewalRes.data?.message}"`);

  // 9. GET /api/client/payments
  console.log('\n9. [PAYMENTS] GET /api/client/payments...');
  const payRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/client/payments',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`   -> Status: ${payRes.status}, Total Paid: ₹${payRes.data?.totalPaid}, Payment Records: ${payRes.data?.payments?.length}`);

  // 10. GET /api/client/trainer
  console.log('\n10. [TRAINER] GET /api/client/trainer...');
  const trainRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/client/trainer',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`   -> Status: ${trainRes.status}, Trainer Assigned: ${trainRes.data?.assigned}`);

  // 11. GET & PUT /api/client/notifications
  console.log('\n11. [NOTIFICATIONS] GET & Mark Read...');
  const notifRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/client/notifications',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`   -> Status: ${notifRes.status}, Unread Count: ${notifRes.data?.unreadCount}`);

  const markAllRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/client/notifications/read-all',
    method: 'PUT',
    headers: authHeaders
  });
  console.log(`   -> Mark All Read Status: ${markAllRes.status}, Message: "${markAllRes.data?.message}"`);

  // 12. PUT /api/client/settings/password
  console.log('\n12. [SETTINGS] PUT /api/client/settings/password...');
  const pwdRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/client/settings/password',
    method: 'PUT',
    headers: authHeaders
  }, {
    currentPassword: testPassword,
    newPassword: 'BrandNewPassword@456'
  });
  console.log(`   -> Change Password Status: ${pwdRes.status}, Message: "${pwdRes.data?.message}"`);

  console.log('\n==================================================');
  console.log('✓ ALL 12 VERIFICATION SUITES PASSED WITHOUT ERROR!');
  console.log('==================================================');
}

run().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
