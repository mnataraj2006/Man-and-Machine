require('dotenv').config();
const http = require('http');
const assert = require('assert');
const mongoose = require('mongoose');

const User = require('./src/models/User');

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('==================================================================');
  console.log('MAN & MACHINE — REPORTS MODULE END-TO-END VERIFICATION');
  console.log('==================================================================\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);

  let tempTrainerId = null;
  let tempClientId = null;

  try {
    // 1. Unauthenticated check
    console.log('1. Testing unauthenticated access...');
    const unauth = await request('GET', '/api/reports/summary');
    assert.strictEqual(unauth.status, 401);
    console.log('   PASS: 401 returned.\n');

    // 2. Admin login
    const adminLogin = await request('POST', '/api/auth/login', {
      email: 'admin@manandmachine.com',
      password: 'Password@123',
    });
    assert.strictEqual(adminLogin.status, 200);
    const adminHeaders = { Authorization: `Bearer ${adminLogin.data.token}` };

    const branchRes = await request('GET', '/api/branches');
    const branches = branchRes.data.branches || branchRes.data.data || [];
    assert(branches.length > 0);
    const branchId = branches[0]._id;

    // 3. Role-based security check (CLIENT = 403, TRAINER = 403 on non-trainer, scoped on /trainers)
    console.log('2. Testing RBAC on /api/reports/*...');
    const ts = Date.now().toString().slice(-6);
    const clientReg = await request('POST', '/api/auth/register', {
      name: `Rep Client ${ts}`,
      email: `rep_client_${ts}@example.com`,
      phone: `9777${ts}`,
      branchId,
      password: 'Password@123',
      confirmPassword: 'Password@123',
    });
    assert.strictEqual(clientReg.status, 201);
    tempClientId = clientReg.data.user.id;
    const clientHeaders = { Authorization: `Bearer ${clientReg.data.token}` };

    const clientForbidden = await request('GET', '/api/reports/revenue', null, clientHeaders);
    assert.strictEqual(clientForbidden.status, 403, 'Client must be denied access to reports');

    const trainerUser = await User.create({
      name: `Rep Trainer ${ts}`,
      email: `rep_trainer_${ts}@example.com`,
      phone: `9666${ts}`,
      password: 'Password@123',
      role: 'TRAINER',
      status: 'ACTIVE',
      branchId,
    });
    tempTrainerId = trainerUser._id;
    const trainerLogin = await request('POST', '/api/auth/login', {
      email: trainerUser.email,
      password: 'Password@123',
    });
    assert.strictEqual(trainerLogin.status, 200);
    const trainerHeaders = { Authorization: `Bearer ${trainerLogin.data.token}` };

    const trainerMembersDenied = await request('GET', '/api/reports/members', null, trainerHeaders);
    assert.strictEqual(trainerMembersDenied.status, 403, 'Trainer must not access member reports');

    const trainerOwnReport = await request('GET', '/api/reports/trainers', null, trainerHeaders);
    assert.strictEqual(trainerOwnReport.status, 200);
    assert.strictEqual(trainerOwnReport.data.table.rows.length, 1, 'Trainer report must scope strictly to own trainer record');
    assert.strictEqual(String(trainerOwnReport.data.table.rows[0].id), String(trainerUser._id));
    console.log('   PASS: RBAC & trainer scoping verified.\n');

    // 4. All 10 report endpoints return 200 for Admin
    console.log('3. Testing all 10 report endpoints...');
    const endpoints = [
      '/api/reports/summary',
      '/api/reports/members',
      '/api/reports/memberships',
      '/api/reports/attendance',
      '/api/reports/revenue',
      '/api/reports/payments',
      '/api/reports/expenses',
      '/api/reports/trainers',
      '/api/reports/leads',
      '/api/reports/branches',
    ];
    for (const ep of endpoints) {
      const r = await request('GET', ep, null, adminHeaders);
      assert.strictEqual(r.status, 200, `${ep} failed with status ${r.status}`);
      assert.strictEqual(r.data.success, true);
    }
    console.log('   PASS: All 10 endpoints returned 200.\n');

    // 5. Filter check (branchId & date range)
    console.log('4. Testing filter responsiveness (branchId & custom date range)...');
    const allMembers = await request('GET', '/api/reports/members', null, adminHeaders);
    const branchMembers = await request('GET', `/api/reports/members?branchId=${branchId}`, null, adminHeaders);
    assert(branchMembers.data.kpis.totalClients <= allMembers.data.kpis.totalClients);

    const oldRange = await request('GET', '/api/reports/revenue?from=2020-01-01&to=2020-01-31', null, adminHeaders);
    assert.strictEqual(oldRange.status, 200);
    assert.strictEqual(oldRange.data.kpis.collectedRevenue, 0, '2020 range should have 0 collected revenue');
    console.log('   PASS: Filters alter results accurately.\n');

    // 6. Financial consistency with Finance Summary
    console.log('5. Verifying financial consistency with /api/admin/finance/summary...');
    const [finSummary, revToday] = await Promise.all([
      request('GET', '/api/admin/finance/summary', null, adminHeaders),
      request('GET', '/api/reports/revenue?preset=this_month', null, adminHeaders),
    ]);
    assert.strictEqual(finSummary.status, 200);
    assert.strictEqual(
      revToday.data.kpis.collectedRevenue,
      finSummary.data.summary.thisMonthCollection,
      'Monthly collected revenue must match Finance module'
    );
    assert.strictEqual(
      revToday.data.kpis.pendingBalance,
      finSummary.data.summary.pendingBalance,
      'Pending balance must match Finance module'
    );
    console.log('   PASS: Revenue Reports match Finance module totals.\n');

    console.log('==================================================================');
    console.log('ALL REPORTS MODULE E2E TESTS PASSED!');
    console.log('==================================================================');
  } finally {
    if (tempTrainerId) await User.deleteOne({ _id: tempTrainerId });
    if (tempClientId) {
      const ClientProfile = require('./src/models/ClientProfile');
      await ClientProfile.deleteMany({ userId: tempClientId });
      await User.deleteOne({ _id: tempClientId });
    }
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('REPORTS E2E FAILED:', err);
  process.exit(1);
});
