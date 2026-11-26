require('dotenv').config();
const http = require('http');
const assert = require('assert');
const mongoose = require('mongoose');

const User = require('./src/models/User');
const ClientProfile = require('./src/models/ClientProfile');
const Membership = require('./src/models/Membership');
const Invoice = require('./src/models/Invoice');
const Payment = require('./src/models/Payment');

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

const parseSeq = (cid) => parseInt(cid.slice(2), 10);

async function run() {
  console.log('==================================================================');
  console.log('MAN & MACHINE — PERMANENT CLIENT ID SYSTEM E2E VERIFICATION');
  console.log('==================================================================\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);

  const createdUserIds = [];
  const createdProfileIds = [];
  const createdMembershipIds = [];
  const createdInvoiceIds = [];
  const createdPaymentIds = [];

  try {
    const adminLogin = await request('POST', '/api/auth/login', {
      email: 'admin@manandmachine.com',
      password: 'Password@123',
    });
    assert.strictEqual(adminLogin.status, 200);
    const adminHeaders = { Authorization: `Bearer ${adminLogin.data.token}` };

    const branchRes = await request('GET', '/api/branches');
    const branches = branchRes.data.branches || branchRes.data.data || [];
    assert(branches.length >= 2, 'Need at least 2 branches for transfer test');
    const branch1 = branches[0]._id;
    const branch2 = branches[1]._id;

    const plansRes = await request('GET', '/api/admin/membership-plans', null, adminHeaders);
    const plan = (plansRes.data.plans || []).find((p) => p.isActive !== false);
    assert(plan);

    const ts = Date.now().toString().slice(-6);

    // 1 & 4. Admin walk-in registration receives sequential MM ID
    console.log('1. Testing Admin walk-in registration & sequential ID...');
    const w1 = await request(
      'POST',
      '/api/admin/clients',
      { name: `CID Walkin 1 ${ts}`, phone: `9101${ts}`, branchId: branch1 },
      adminHeaders
    );
    assert.strictEqual(w1.status, 201);
    const cid1 = w1.data.client.clientId;
    assert(/^MM\d{6,}$/.test(cid1), `Invalid clientId format: ${cid1}`);
    createdProfileIds.push(w1.data.client.profileId);

    // 2 & 5. Self-registration receives next sequential MM ID
    console.log('2. Testing self-registration & sequential increment...');
    const s1 = await request('POST', '/api/auth/register', {
      name: `CID Self 1 ${ts}`,
      email: `cid_self1_${ts}@example.com`,
      phone: `9102${ts}`,
      branchId: branch1,
      password: 'Password@123',
      confirmPassword: 'Password@123',
    });
    assert.strictEqual(s1.status, 201);
    const cid2 = s1.data.user.clientId;
    assert.strictEqual(parseSeq(cid2), parseSeq(cid1) + 1, 'Self-registered clientId must be sequential');
    createdUserIds.push(s1.data.user.id);
    const s1Prof = await ClientProfile.findOne({ userId: s1.data.user.id });
    if (s1Prof) createdProfileIds.push(s1Prof._id);
    console.log(`   PASS: ${cid1} -> ${cid2}\n`);

    // 3. Simultaneous registrations produce distinct, non-duplicate IDs
    console.log('3. Testing concurrent registrations (Promise.all)...');
    const [c1, c2] = await Promise.all([
      request('POST', '/api/admin/clients', { name: `Conc 1 ${ts}`, phone: `9103${ts}`, branchId: branch1 }, adminHeaders),
      request('POST', '/api/admin/clients', { name: `Conc 2 ${ts}`, phone: `9104${ts}`, branchId: branch1 }, adminHeaders),
    ]);
    assert.strictEqual(c1.status, 201);
    assert.strictEqual(c2.status, 201);
    assert.notStrictEqual(c1.data.client.clientId, c2.data.client.clientId, 'Concurrent IDs must never collide');
    createdProfileIds.push(c1.data.client.profileId, c2.data.client.profileId);
    console.log(`   PASS: Concurrent IDs ${c1.data.client.clientId} & ${c2.data.client.clientId}\n`);

    // 6. Client ID remains unchanged after branch transfer
    console.log('4. Testing immutability across branch transfer...');
    const transferRes = await request(
      'PUT',
      `/api/admin/clients/${w1.data.client.profileId}`,
      { branchId: branch2, clientId: 'MM999999' }, // Attempted manual override must be ignored
      adminHeaders
    );
    assert.strictEqual(transferRes.status, 200);
    const afterTransfer = await request('GET', `/api/admin/clients/${w1.data.client.profileId}`, null, adminHeaders);
    assert.strictEqual(afterTransfer.data.client.clientId, cid1, 'Client ID must remain identical after branch transfer');
    console.log(`   PASS: ${cid1} unchanged after branch transfer.\n`);

    // 7. Client ID remains unchanged after membership assignment/renewal
    console.log('5. Testing immutability across membership assignment...');
    const memRes = await request(
      'POST',
      '/api/admin/memberships',
      { clientProfileId: w1.data.client.profileId, branchId: branch2, planId: plan._id, paidAmount: 0, paymentStatus: 'PENDING' },
      adminHeaders
    );
    assert.strictEqual(memRes.status, 201);
    createdMembershipIds.push(memRes.data.membership._id);
    if (memRes.data.invoice?._id) createdInvoiceIds.push(memRes.data.invoice._id);
    const afterMem = await request('GET', `/api/admin/clients/${w1.data.client.profileId}`, null, adminHeaders);
    assert.strictEqual(afterMem.data.client.clientId, cid1);
    console.log('   PASS: Client ID unchanged after membership assignment.\n');

    // 8 & 10. Search by Client ID & cross-module consistency
    console.log('6. Testing global search by Client ID & Reports visibility...');
    const searchWalkin = await request('GET', `/api/admin/clients?search=${cid1}`, null, adminHeaders);
    assert.strictEqual(searchWalkin.status, 200);
    assert(searchWalkin.data.clients.some((c) => c.clientId === cid1), 'Walk-in must be searchable by clientId');

    const searchSelf = await request('GET', `/api/admin/clients?search=${cid2}`, null, adminHeaders);
    assert.strictEqual(searchSelf.status, 200);
    assert(searchSelf.data.clients.some((c) => c.clientId === cid2), 'Self-registered client must be searchable by clientId');

    const repRes = await request('GET', '/api/reports/members', null, adminHeaders);
    assert.strictEqual(repRes.status, 200);
    assert(repRes.data.table.rows.some((r) => r.clientId === cid1), 'Reports must expose clientId');
    console.log('   PASS: Search & Reports verified.\n');

    // 9. Deleted IDs are never reused
    console.log('7. Testing deleted Client ID is never reused...');
    await ClientProfile.deleteOne({ _id: c2.data.client.profileId });
    const afterDel = await request(
      'POST',
      '/api/admin/clients',
      { name: `After Del ${ts}`, phone: `9105${ts}`, branchId: branch1 },
      adminHeaders
    );
    assert.strictEqual(afterDel.status, 201);
    createdProfileIds.push(afterDel.data.client.profileId);
    assert(
      parseSeq(afterDel.data.client.clientId) > parseSeq(c2.data.client.clientId),
      'Deleted Client ID must never be reused'
    );
    console.log(`   PASS: Deleted ${c2.data.client.clientId}, next assigned ${afterDel.data.client.clientId}.\n`);

    console.log('==================================================================');
    console.log('ALL PERMANENT CLIENT ID E2E TESTS PASSED!');
    console.log('==================================================================');
  } finally {
    if (createdPaymentIds.length) await Payment.deleteMany({ _id: { $in: createdPaymentIds } });
    if (createdInvoiceIds.length) await Invoice.deleteMany({ _id: { $in: createdInvoiceIds } });
    if (createdMembershipIds.length) await Membership.deleteMany({ _id: { $in: createdMembershipIds } });
    if (createdProfileIds.length) await ClientProfile.deleteMany({ _id: { $in: createdProfileIds } });
    if (createdUserIds.length) await User.deleteMany({ _id: { $in: createdUserIds } });
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('CLIENT ID E2E FAILED:', err);
  process.exit(1);
});
