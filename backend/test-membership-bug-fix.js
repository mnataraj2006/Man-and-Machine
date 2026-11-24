const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5000/api';

const request = async ({ method = 'GET', path, token, body }) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
};

async function runTests() {
  console.log('========================================================');
  console.log('🏋️ MAN & MACHINE — MEMBERSHIP STATUS INTEGRATION TEST');
  console.log('========================================================\n');

  // 1. Admin Login
  console.log('1. Logging in as HQ Admin...');
  const adminLogin = await request({
    method: 'POST',
    path: '/auth/login',
    body: {
      email: 'admin@manandmachine.com',
      password: 'Password@123',
    },
  });

  if (!adminLogin.ok) {
    throw new Error(`Admin login failed: ${adminLogin.data?.message}`);
  }
  const adminToken = adminLogin.data.token;
  console.log('   ✓ Admin login successful');

  // 2. Fetch Branches to get a valid branchId
  const branchesRes = await request({ method: 'GET', path: '/branches' });
  const branchId = branchesRes.data.branches[0]._id;
  console.log(`   ✓ Selected branch: ${branchesRes.data.branches[0].city} (${branchId})`);

  // ========================================================
  // SCENARIO 1: Brand New Client (No Membership Purchased)
  // ========================================================
  console.log('\n2. [SCENARIO 1] Testing Brand New Client with NO membership...');
  const testEmail = `newclient_${Date.now()}@test.com`;
  const registerRes = await request({
    method: 'POST',
    path: '/auth/register',
    body: {
      name: 'Test Client Zero',
      email: testEmail,
      phone: '9876543210',
      password: 'Password123',
      branchId,
      fitnessGoal: 'General Fitness',
      experienceLevel: 'Beginner',
    },
  });

  if (!registerRes.ok) {
    throw new Error(`Client registration failed: ${registerRes.data?.message}`);
  }
  const clientToken = registerRes.data.token;
  const clientId = registerRes.data.user.id;
  console.log(`   ✓ Registered client: ${testEmail} (ID: ${clientId})`);

  // Check Client Dashboard Summary API
  console.log('   -> Checking Client Dashboard API...');
  const dashRes = await request({
    method: 'GET',
    path: '/client/dashboard',
    token: clientToken,
  });
  console.log(`      hasActiveMembership: ${dashRes.data?.hasActiveMembership}`);
  console.log(`      membership: ${JSON.stringify(dashRes.data?.membership)}`);
  console.log(`      stats.membershipStatus: ${dashRes.data?.stats?.membershipStatus}`);

  if (dashRes.data?.hasActiveMembership !== false) {
    throw new Error('FAILED: hasActiveMembership must be false for new client');
  }
  if (dashRes.data?.membership !== null) {
    throw new Error('FAILED: membership must be null for new client');
  }
  if (dashRes.data?.stats?.membershipStatus !== 'NOT_ENROLLED') {
    throw new Error('FAILED: stats.membershipStatus must be NOT_ENROLLED');
  }
  console.log('   ✓ Client Dashboard Summary correctly reflects NO ACTIVE MEMBERSHIP');

  // Check Client Membership API
  console.log('   -> Checking Client Membership API...');
  const clientMemRes = await request({
    method: 'GET',
    path: '/client/membership',
    token: clientToken,
  });
  console.log(`      hasMembership: ${clientMemRes.data?.hasMembership}`);
  console.log(`      hasActiveMembership: ${clientMemRes.data?.hasActiveMembership}`);
  console.log(`      membership: ${JSON.stringify(clientMemRes.data?.membership)}`);
  console.log(`      current: ${JSON.stringify(clientMemRes.data?.current)}`);

  if (clientMemRes.data?.hasMembership !== false) {
    throw new Error('FAILED: hasMembership must be false');
  }
  if (clientMemRes.data?.hasActiveMembership !== false) {
    throw new Error('FAILED: hasActiveMembership must be false');
  }
  if (clientMemRes.data?.membership !== null || clientMemRes.data?.current !== null) {
    throw new Error('FAILED: membership and current must be null');
  }
  console.log('   ✓ Client Membership API correctly returns null membership');

  // Check Admin Client List API
  console.log('   -> Checking Admin Clients List API for this client...');
  const adminClientsRes = await request({
    method: 'GET',
    path: `/admin/clients?search=${encodeURIComponent(testEmail)}`,
    token: adminToken,
  });
  const clientInAdminList = adminClientsRes.data?.clients?.find((c) => c.email === testEmail);
  console.log(`      Admin client list membership: ${JSON.stringify(clientInAdminList?.membership)}`);
  console.log(`      hasActiveMembership: ${clientInAdminList?.hasActiveMembership}`);

  if (clientInAdminList?.membership !== null) {
    throw new Error('FAILED: Admin client list membership must be null for un-enrolled client');
  }
  if (clientInAdminList?.hasActiveMembership !== false) {
    throw new Error('FAILED: Admin client hasActiveMembership must be false');
  }
  console.log('   ✓ Admin Client List correctly shows null membership');

  // Check Admin Client Details API
  console.log('   -> Checking Admin Client Details API...');
  const adminDetailsRes = await request({
    method: 'GET',
    path: `/admin/clients/${clientId}`,
    token: adminToken,
  });
  console.log(`      activeMembership: ${JSON.stringify(adminDetailsRes.data?.activeMembership)}`);
  console.log(`      memberships count: ${adminDetailsRes.data?.memberships?.length}`);

  if (adminDetailsRes.data?.activeMembership !== null) {
    throw new Error('FAILED: Admin activeMembership must be null');
  }
  if (adminDetailsRes.data?.memberships?.length !== 0) {
    throw new Error('FAILED: memberships array must be empty');
  }
  console.log('   ✓ Admin Client Details correctly shows null activeMembership');

  // ========================================================
  // SCENARIO 2: Calling renewal-request when no membership exists
  // ========================================================
  console.log('\n3. [SCENARIO 2] Testing renewal-request on un-enrolled client...');
  const renewalRes = await request({
    method: 'POST',
    path: '/client/membership/renewal-request',
    token: clientToken,
  });
  console.log(`   -> Status: ${renewalRes.status}, Message: "${renewalRes.data?.message}"`);
  if (renewalRes.status !== 400) {
    throw new Error('FAILED: renewal-request must return 400 for client with no membership');
  }
  console.log('   ✓ renewal-request correctly rejected without creating dummy membership');

  // ========================================================
  // SCENARIO 3: Admin Manually Assigns a Membership
  // ========================================================
  console.log('\n4. [SCENARIO 3] Admin assigns a Membership Plan to the client...');
  const plansRes = await request({ method: 'GET', path: '/admin/membership-plans', token: adminToken });
  const activePlan = plansRes.data?.plans?.find((p) => p.isActive);
  if (!activePlan) throw new Error('No active membership plans found in database');

  console.log(`   -> Assigning plan: "${activePlan.name}" (ID: ${activePlan._id})`);
  const assignRes = await request({
    method: 'POST',
    path: '/admin/memberships',
    token: adminToken,
    body: {
      userId: clientId,
      branchId,
      planId: activePlan._id,
      startDate: new Date().toISOString(),
    },
  });

  if (!assignRes.ok) {
    throw new Error(`Admin assign membership failed: ${assignRes.data?.message}`);
  }
  console.log(`   ✓ Membership assigned successfully (ID: ${assignRes.data?.membership?._id})`);

  // Verify that Admin Client Details now shows the assigned membership as ACTIVE
  const adminDetailsAfterAssign = await request({
    method: 'GET',
    path: `/admin/clients/${clientId}`,
    token: adminToken,
  });
  console.log(`   -> Active membership in Admin: "${adminDetailsAfterAssign.data?.activeMembership?.planName}", Status: ${adminDetailsAfterAssign.data?.activeMembership?.status}`);
  if (adminDetailsAfterAssign.data?.activeMembership?.status !== 'ACTIVE') {
    throw new Error('FAILED: Status must be ACTIVE after assignment');
  }
  if (adminDetailsAfterAssign.data?.activeMembership?.planName !== activePlan.name) {
    throw new Error('FAILED: Plan name must match assigned plan');
  }
  console.log('   ✓ Admin Client Details correctly reflects ACTIVE membership pass');

  // Verify that Client Dashboard now shows the active membership
  const clientDashAfterAssign = await request({
    method: 'GET',
    path: '/client/dashboard',
    token: clientToken,
  });
  console.log(`   -> Client Dashboard hasActiveMembership: ${clientDashAfterAssign.data?.hasActiveMembership}`);
  console.log(`   -> Client Dashboard planName: ${clientDashAfterAssign.data?.membership?.planName}`);
  if (clientDashAfterAssign.data?.hasActiveMembership !== true) {
    throw new Error('FAILED: hasActiveMembership must be true');
  }
  console.log('   ✓ Client Dashboard correctly reflects ACTIVE membership pass');

  // ========================================================
  // SCENARIO 4: Check Existing Client Nataraj M
  // ========================================================
  console.log('\n5. [SCENARIO 4] Verifying existing client Nataraj M...');
  const natarajSearch = await request({
    method: 'GET',
    path: '/admin/clients?search=mnataraj2108@gmail.com',
    token: adminToken,
  });
  const natarajClient = natarajSearch.data?.clients?.[0];
  if (natarajClient) {
    console.log(`   -> Nataraj in Admin list:`);
    console.log(`      hasActiveMembership: ${natarajClient.hasActiveMembership}`);
    console.log(`      membership: ${JSON.stringify(natarajClient.membership)}`);
    if (natarajClient.hasActiveMembership !== false || natarajClient.membership !== null) {
      throw new Error('FAILED: Nataraj must have hasActiveMembership=false and membership=null');
    }
    console.log('   ✓ Nataraj M has NO ACTIVE MEMBERSHIP and NO dummy renewal pass');
  }

  // Clean up temporary test client
  await mongoose.connect(process.env.MONGODB_URI);
  await mongoose.connection.db.collection('users').deleteOne({ _id: new mongoose.Types.ObjectId(clientId) });
  await mongoose.connection.db.collection('clientprofiles').deleteOne({ userId: new mongoose.Types.ObjectId(clientId) });
  await mongoose.connection.db.collection('memberships').deleteMany({ userId: new mongoose.Types.ObjectId(clientId) });
  console.log('\n✓ Cleaned up temporary test client');

  console.log('\n========================================================');
  console.log('🎉 ALL MEMBERSHIP STATUS INTEGRATION TESTS PASSED 100%!');
  console.log('========================================================');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ Test Error:', err);
  process.exit(1);
});
