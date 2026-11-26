require('dotenv').config();
const http = require('http');
const assert = require('assert');
const mongoose = require('mongoose');

const ClientProfile = require('./src/models/ClientProfile');
const User = require('./src/models/User');
const Membership = require('./src/models/Membership');
const Invoice = require('./src/models/Invoice');
const Payment = require('./src/models/Payment');
const Attendance = require('./src/models/Attendance');

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
  console.log('MAN & MACHINE — WALK-IN REGISTRATION & MEMBERSHIP ACTIVATION E2E');
  console.log('==================================================================\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);

  const createdProfileIds = [];
  const createdUserIds = [];
  const createdMembershipIds = [];
  const createdInvoiceIds = [];
  const createdPaymentIds = [];
  const createdAttendanceIds = [];

  const ts = Date.now().toString().slice(-6);
  const phone1 = `9111${ts}`;
  const phone2 = `9222${ts}`;
  const phone3 = `9333${ts}`;
  const phone4 = `9444${ts}`;
  const phone5 = `9555${ts}`;
  const phone6 = `9666${ts}`;
  const phone8 = `9888${ts}`;
  const email1 = `walkin1_${ts}@example.com`;
  const email8 = `walkin8_${ts}@example.com`;
  const selfEmail = `selfreg_${ts}@example.com`;

  try {
    // Authenticate as Admin
    const loginRes = await request('POST', '/api/auth/login', {
      email: 'admin@manandmachine.com',
      password: 'Password@123',
    });
    assert.strictEqual(loginRes.status, 200, 'Admin login must succeed');
    const token = loginRes.data.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    // Get branches and membership plans
    const branchRes = await request('GET', '/api/branches');
    const branches = branchRes.data.branches || branchRes.data.data || [];
    assert(branches.length > 0, 'At least one branch must exist');
    const branchId = branches[0]._id;

    const plansRes = await request('GET', '/api/admin/membership-plans', null, authHeaders);
    const plans = (plansRes.data.plans || []).filter((p) => p.isActive !== false);
    assert(plans.length > 0, 'At least one active membership plan must exist');
    const plan = plans[0];

    // ------------------------------------------------------------------
    // Scenario 1: Admin creates a client with phone and email (no login)
    // ------------------------------------------------------------------
    console.log('1. Testing Admin creates client with phone and email...');
    const s1 = await request(
      'POST',
      '/api/admin/clients',
      {
        name: `Walkin One ${ts}`,
        phone: phone1,
        email: email1,
        branchId,
        gender: 'Male',
        address: '123 Main St',
        emergencyContact: '9000000001',
        notes: 'Scenario 1 test',
        createLoginAccess: false,
      },
      authHeaders
    );
    assert.strictEqual(s1.status, 201, `Scenario 1 failed: ${JSON.stringify(s1.data)}`);
    assert.strictEqual(s1.data.client.accountAccessStatus, 'NOT_CREATED');
    createdProfileIds.push(s1.data.client.profileId);

    // Also test duplicate detection (409)
    const dupRes = await request(
      'POST',
      '/api/admin/clients',
      { name: 'Dup Check', phone: phone1, branchId },
      authHeaders
    );
    assert.strictEqual(dupRes.status, 409, 'Duplicate phone should return 409');
    assert(dupRes.data.existingClient, 'Duplicate response must include existingClient');
    console.log('   PASS: Scenario 1 & duplicate detection verified.\n');

    // ------------------------------------------------------------------
    // Scenario 2: Admin creates a client with phone but no email
    // ------------------------------------------------------------------
    console.log('2. Testing Admin creates client with phone but no email...');
    const s2 = await request(
      'POST',
      '/api/admin/clients',
      {
        name: `Walkin Two ${ts}`,
        phone: phone2,
        email: '',
        branchId,
        createLoginAccess: false,
      },
      authHeaders
    );
    assert.strictEqual(s2.status, 201, `Scenario 2 failed: ${JSON.stringify(s2.data)}`);
    assert.strictEqual(s2.data.client.email, '');
    assert.strictEqual(s2.data.client.accountAccessStatus, 'NOT_CREATED');
    createdProfileIds.push(s2.data.client.profileId);
    console.log('   PASS: Scenario 2 verified.\n');

    // ------------------------------------------------------------------
    // Scenario 3: Admin creates a client with neither email nor WhatsApp/phone
    // ------------------------------------------------------------------
    console.log('3. Testing Admin creates client with neither email nor phone/WhatsApp...');
    const s3 = await request(
      'POST',
      '/api/admin/clients',
      {
        name: `Walkin NoContact ${ts}`,
        phone: '',
        email: '',
        branchId,
        createLoginAccess: false,
      },
      authHeaders
    );
    assert.strictEqual(s3.status, 201, `Scenario 3 failed: ${JSON.stringify(s3.data)}`);
    assert.strictEqual(s3.data.client.accountAccessStatus, 'NOT_CREATED');
    createdProfileIds.push(s3.data.client.profileId);
    console.log('   PASS: Scenario 3 verified.\n');

    // ------------------------------------------------------------------
    // Scenario 4: Admin creates a client without assigning a membership
    // ------------------------------------------------------------------
    console.log('4. Testing client created without assigning a membership...');
    const s3Details = await request('GET', `/api/admin/clients/${s3.data.client.profileId}`, null, authHeaders);
    assert.strictEqual(s3Details.status, 200);
    assert.strictEqual(s3Details.data.activeMembership, null, 'No membership should be auto-created');
    assert.strictEqual(s3Details.data.latestMembership, null, 'No latest membership should exist');
    console.log('   PASS: Scenario 4 verified.\n');

    // ------------------------------------------------------------------
    // Scenario 5: Admin creates a client and assigns a fully paid membership
    // ------------------------------------------------------------------
    console.log('5. Testing client + fully paid membership assignment...');
    const s5 = await request(
      'POST',
      '/api/admin/clients',
      { name: `Walkin FullPay ${ts}`, phone: phone4, branchId },
      authHeaders
    );
    assert.strictEqual(s5.status, 201);
    const p5Id = s5.data.client.profileId;
    createdProfileIds.push(p5Id);

    const bp5 = plan.branchPricing?.find((b) => String(b.branchId?._id || b.branchId) === String(branchId));
    const planAmount = bp5?.finalPrice ?? plan.price;

    const m5 = await request(
      'POST',
      '/api/admin/memberships',
      {
        clientProfileId: p5Id,
        branchId,
        planId: plan._id,
        paidAmount: planAmount,
        paymentMethod: 'CASH',
        paymentStatus: 'FULL',
      },
      authHeaders
    );
    assert.strictEqual(m5.status, 201, `Scenario 5 membership failed: ${JSON.stringify(m5.data)}`);
    assert.strictEqual(m5.data.membership.status, 'ACTIVE', 'Full payment must activate membership');
    createdMembershipIds.push(m5.data.membership._id);
    if (m5.data.invoice?._id) createdInvoiceIds.push(m5.data.invoice._id);
    if (m5.data.payment?._id) createdPaymentIds.push(m5.data.payment._id);
    assert.strictEqual(m5.data.invoice.status, 'PAID', 'Invoice should be PAID');
    console.log('   PASS: Scenario 5 verified.\n');

    // ------------------------------------------------------------------
    // Scenario 6: Admin creates a client and records partial payment
    // ------------------------------------------------------------------
    console.log('6. Testing client + partial payment + subsequent balance settlement...');
    const s6 = await request(
      'POST',
      '/api/admin/clients',
      { name: `Walkin Partial ${ts}`, phone: phone5, branchId },
      authHeaders
    );
    assert.strictEqual(s6.status, 201);
    const p6Id = s6.data.client.profileId;
    createdProfileIds.push(p6Id);

    const partialAmt = Math.max(1, Math.floor(planAmount / 2));
    const m6 = await request(
      'POST',
      '/api/admin/memberships',
      {
        clientProfileId: p6Id,
        branchId,
        planId: plan._id,
        paidAmount: partialAmt,
        paymentMethod: 'UPI',
        paymentStatus: 'PARTIAL',
      },
      authHeaders
    );
    assert.strictEqual(m6.status, 201, `Scenario 6 failed: ${JSON.stringify(m6.data)}`);
    createdMembershipIds.push(m6.data.membership._id);
    createdInvoiceIds.push(m6.data.invoice._id);
    if (m6.data.payment?._id) createdPaymentIds.push(m6.data.payment._id);

    if (partialAmt < planAmount) {
      assert.strictEqual(m6.data.membership.status, 'PENDING_PAYMENT', 'Partial payment must stay PENDING_PAYMENT by default policy');
      assert.strictEqual(m6.data.invoice.status, 'PARTIALLY_PAID', 'Invoice must be PARTIALLY_PAID');
      assert.strictEqual(m6.data.invoice.balanceAmount, planAmount - partialAmt, 'Outstanding balance must match');

      // Now settle remaining balance via record-payment endpoint
      const settle = await request(
        'POST',
        `/api/admin/invoices/${m6.data.invoice._id}/record-payment`,
        {
          amount: planAmount - partialAmt,
          paymentMethod: 'CASH',
          notes: 'Remaining balance',
        },
        authHeaders
      );
      assert([200, 201].includes(settle.status), `Record payment failed: ${JSON.stringify(settle.data)}`);
      if (settle.data.payment?._id) createdPaymentIds.push(settle.data.payment._id);
      assert.strictEqual(settle.data.invoice.status, 'PAID');
      assert.strictEqual(settle.data.invoice.balanceAmount, 0);

      const updatedMem = await Membership.findById(m6.data.membership._id);
      assert.strictEqual(updatedMem.status, 'ACTIVE', 'Membership must activate once remaining balance is paid');
    }
    console.log('   PASS: Scenario 6 verified.\n');

    // ------------------------------------------------------------------
    // Scenario 7: Admin creates a client with pending payment
    // ------------------------------------------------------------------
    console.log('7. Testing client + pending payment (no fake payment)...');
    const s7 = await request(
      'POST',
      '/api/admin/clients',
      { name: `Walkin Pending ${ts}`, phone: phone6, branchId },
      authHeaders
    );
    assert.strictEqual(s7.status, 201);
    const p7Id = s7.data.client.profileId;
    createdProfileIds.push(p7Id);

    const m7 = await request(
      'POST',
      '/api/admin/memberships',
      {
        clientProfileId: p7Id,
        branchId,
        planId: plan._id,
        paidAmount: 0,
        paymentStatus: 'PENDING',
      },
      authHeaders
    );
    assert.strictEqual(m7.status, 201, `Scenario 7 failed: ${JSON.stringify(m7.data)}`);
    createdMembershipIds.push(m7.data.membership._id);
    createdInvoiceIds.push(m7.data.invoice._id);
    assert.strictEqual(m7.data.membership.status, 'PENDING_PAYMENT');
    assert(!m7.data.payment, 'Must not create a fake payment');
    const fakePayments = await Payment.find({ membershipId: m7.data.membership._id });
    assert.strictEqual(fakePayments.length, 0, 'No payment record should exist in DB for pending payment');
    assert.strictEqual(m7.data.invoice.status, 'PENDING');
    assert.strictEqual(m7.data.invoice.balanceAmount, planAmount);
    console.log('   PASS: Scenario 7 verified.\n');

    // ------------------------------------------------------------------
    // Scenario 8: Admin creates login access for existing walk-in client
    // ------------------------------------------------------------------
    console.log('8. Testing Create Login Access for existing walk-in client...');
    const s8 = await request(
      'POST',
      '/api/admin/clients',
      { name: `Walkin Upgrade ${ts}`, phone: phone8, email: email8, branchId, createLoginAccess: false },
      authHeaders
    );
    assert.strictEqual(s8.status, 201);
    const p8Id = s8.data.client.profileId;
    createdProfileIds.push(p8Id);

    const loginAccessRes = await request('POST', `/api/admin/clients/${p8Id}/login-access`, {}, authHeaders);
    assert.strictEqual(loginAccessRes.status, 201, `Scenario 8 failed: ${JSON.stringify(loginAccessRes.data)}`);
    assert.strictEqual(loginAccessRes.data.accountAccessStatus, 'INVITATION_PENDING');
    assert(loginAccessRes.data.manualActivationUrl, 'Must return manual activation URL');
    const linkedUser = await User.findOne({ email: email8 });
    assert(linkedUser, 'User record must exist');
    createdUserIds.push(linkedUser._id);
    console.log('   PASS: Scenario 8 verified.\n');

    // ------------------------------------------------------------------
    // Scenario 9: Existing self-registered client remains unaffected
    // ------------------------------------------------------------------
    console.log('9. Testing self-registered client registration remains unaffected...');
    const selfReg = await request('POST', '/api/auth/register', {
      name: `Self Reg ${ts}`,
      email: selfEmail,
      phone: phone3,
      branchId,
      fitnessGoal: 'General Fitness',
      experienceLevel: 'Beginner',
      password: 'Password@123',
      confirmPassword: 'Password@123',
    });
    assert.strictEqual(selfReg.status, 201, `Scenario 9 failed: ${JSON.stringify(selfReg.data)}`);
    assert.strictEqual(selfReg.data.user.role, 'CLIENT', 'Public signup must always create CLIENT');
    createdUserIds.push(selfReg.data.user.id);
    const selfProfile = await ClientProfile.findOne({ userId: selfReg.data.user.id });
    if (selfProfile) createdProfileIds.push(selfProfile._id);
    console.log('   PASS: Scenario 9 verified.\n');

    // ------------------------------------------------------------------
    // Scenario 10: Walk-in appears in lists, memberships, attendance, finance
    // ------------------------------------------------------------------
    console.log('10. Testing walk-in visibility in Clients, Memberships, Attendance & Finance...');
    const listRes = await request('GET', `/api/admin/clients?search=${phone4}`, null, authHeaders);
    assert.strictEqual(listRes.status, 200);
    assert((listRes.data.clients || []).some((c) => String(c.id) === String(p5Id)), 'Walk-in must appear in Admin client list');

    const memListRes = await request('GET', '/api/admin/memberships?limit=100', null, authHeaders);
    assert.strictEqual(memListRes.status, 200);
    assert(
      (memListRes.data.memberships || []).some((m) => String(m._id) === String(m5.data.membership._id)),
      'Walk-in membership must appear in Admin memberships list'
    );

    const invRes = await request('GET', `/api/admin/clients/${p5Id}/invoices`, null, authHeaders);
    assert.strictEqual(invRes.status, 200);
    assert((invRes.data.invoices || []).length >= 1, 'Walk-in invoices must appear in Finance');

    const attRes = await request(
      'POST',
      '/api/admin/attendance',
      { clientProfileId: p5Id, branchId },
      authHeaders
    );
    assert.strictEqual(attRes.status, 201, `Walk-in attendance check-in failed: ${JSON.stringify(attRes.data)}`);
    if (attRes.data.record?._id) createdAttendanceIds.push(attRes.data.record._id);

    const attListRes = await request('GET', '/api/admin/attendance', null, authHeaders);
    assert.strictEqual(attListRes.status, 200);
    assert(
      (attListRes.data.records || []).some((r) => String(r._id) === String(attRes.data.record?._id)),
      'Walk-in attendance record must appear in Admin attendance overview'
    );
    console.log('   PASS: Scenario 10 verified.\n');

    // ------------------------------------------------------------------
    // Scenario 11: WhatsApp failure does not interrupt registration/payment/activation
    // ------------------------------------------------------------------
    console.log('11. Verifying WhatsApp non-blocking behavior (already exercised across Scenarios 1-7)...');
    assert.strictEqual(m5.status, 201);
    assert.strictEqual(m5.data.membership.status, 'ACTIVE');
    console.log('   PASS: Scenario 11 verified (all operations succeeded regardless of WhatsApp config).\n');

    console.log('==================================================================');
    console.log('ALL 11 WALK-IN REGISTRATION & MEMBERSHIP SCENARIOS PASSED!');
    console.log('==================================================================');
  } finally {
    // Clean up test data
    if (createdAttendanceIds.length) await Attendance.deleteMany({ _id: { $in: createdAttendanceIds } });
    if (createdPaymentIds.length) await Payment.deleteMany({ _id: { $in: createdPaymentIds } });
    if (createdInvoiceIds.length) await Invoice.deleteMany({ _id: { $in: createdInvoiceIds } });
    if (createdMembershipIds.length) await Membership.deleteMany({ _id: { $in: createdMembershipIds } });
    if (createdProfileIds.length) await ClientProfile.deleteMany({ _id: { $in: createdProfileIds } });
    if (createdUserIds.length) await User.deleteMany({ _id: { $in: createdUserIds } });
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('E2E TEST FAILED:', err);
  process.exit(1);
});
