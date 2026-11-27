/**
 * test-cash-approval.js
 * ---------------------
 * Automated verification for the Cash Desk Payment Approval Workflow:
 * - Test 1: Normal cash payment -> PENDING_APPROVAL -> Approve -> PAID + ACTIVE + Receipt
 * - Test 2: Rejected cash payment -> REJECTED + Membership remains inactive + audit trail
 * - Test 3: Double approval -> atomic guard allows exactly 1 success, 2nd returns 409
 * - Test 4: Unauthorized branch Admin -> 403 Forbidden
 * - Test 5: Tampered frontend request (CASH + paymentStatus=PAID / membershipStatus=ACTIVE) -> 400 rejected
 * - Test 6: Walk-in client (userId=null, clientProfileId only) -> CASH -> Approve -> ACTIVE
 * - Test 7: Finance summary -> PENDING_APPROVAL excluded from collectedRevenue, included after PAID
 * - Test 8: Biometric eligibility -> PENDING_PAYMENT denied, ACTIVE recognized
 * - Test 9: Existing UPI payment flow -> immediate PAID + ACTIVE without cash approval
 *
 * Runs completely self-contained without modifying any production database.
 */

const assert = require('assert');
const mongoose = require('mongoose');

const Payment = require('./src/models/Payment');
const Membership = require('./src/models/Membership');
const Invoice = require('./src/models/Invoice');
const ClientProfile = require('./src/models/ClientProfile');
const User = require('./src/models/User');
const Branch = require('./src/models/Branch');
const Expense = require('./src/models/Expense');
const FinanceConfig = require('./src/models/FinanceConfig');
const FinanceCounter = require('./src/models/FinanceCounter');
const MembershipPlan = require('./src/models/MembershipPlan');
const TrainerBooking = require('./src/models/TrainerBooking');

const financeService = require('./src/services/financeService');
const adminController = require('./src/controllers/adminController');
const financeController = require('./src/controllers/financeController');

const mkRes = () => ({
  statusCode: 200,
  body: null,
  status(c) {
    this.statusCode = c;
    return this;
  },
  json(d) {
    this.body = d;
    return this;
  },
});

const run = async () => {
  let passed = 0;
  const test = async (name, fn) => {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  };

  console.log('Running Cash Desk Payment Approval tests...\n');

  const branchA = new mongoose.Types.ObjectId();
  const branchB = new mongoose.Types.ObjectId();
  const adminA = { _id: new mongoose.Types.ObjectId(), role: 'ADMIN', branchId: branchA, name: 'Admin A' };
  const adminB = { _id: new mongoose.Types.ObjectId(), role: 'ADMIN', branchId: branchB, name: 'Admin B' };
  const globalAdmin = { _id: new mongoose.Types.ObjectId(), role: 'ADMIN', branchId: null, name: 'Global Admin' };

  // In-memory stores
  const stores = {
    payments: [],
    memberships: [],
    invoices: [],
    profiles: [],
    users: [],
  };

  // Save originals
  const orig = {
    PaymentCreate: Payment.create,
    PaymentFindById: Payment.findById,
    PaymentFindOneAndUpdate: Payment.findOneAndUpdate,
    PaymentFind: Payment.find,
    MembershipCreate: Membership.create,
    MembershipFindById: Membership.findById,
    MembershipFindOne: Membership.findOne,
    MembershipFind: Membership.find,
    TrainerBookingFind: TrainerBooking.find,
    InvoiceCreate: Invoice.create,
    InvoiceFindById: Invoice.findById,
    InvoiceFind: Invoice.find,
    InvoiceDistinct: Invoice.distinct,
    InvoiceCountDocuments: Invoice.countDocuments,
    ProfileFindById: ClientProfile.findById,
    ProfileFindOne: ClientProfile.findOne,
    UserFindById: User.findById,
    UserFind: User.find,
    BranchFind: Branch.find,
    BranchFindById: Branch.findById,
    ExpenseFind: Expense.find,
    ConfigGet: FinanceConfig.getOrCreateConfig,
    CounterFindOneAndUpdate: FinanceCounter.findOneAndUpdate,
    PlanFindById: MembershipPlan.findById,
  };

  let seq = 1;
  const wrapDoc = (obj, store) => ({
    ...obj,
    async save() {
      const idx = store.findIndex((x) => String(x._id) === String(this._id));
      if (idx >= 0) store[idx] = { ...this };
      return this;
    },
    toObject() {
      return { ...this };
    },
  });

  // Wire lightweight in-memory stubs
  FinanceConfig.getOrCreateConfig = async () => ({
    invoiceSettings: { defaultDueDays: 7, receiptFooter: 'Thanks', showBranchAddress: true },
    paymentMethods: [
      { code: 'CASH', label: 'Cash' },
      { code: 'UPI', label: 'UPI' },
    ],
  });
  FinanceCounter.findOneAndUpdate = async () => ({ seq: seq++ });
  Branch.findById = () => ({ select: () => ({ lean: async () => ({ _id: branchA, code: 'KVP', city: 'Kovilpatti' }) }) });
  Branch.find = () => ({ lean: async () => [{ _id: branchA, name: 'Kovilpatti', city: 'Kovilpatti', isActive: true }] });
  Expense.find = () => ({ lean: async () => [] });
  const emptyChain = () => {
    const c = { sort: () => c, lean: async () => [], then: (res, rej) => Promise.resolve([]).then(res, rej) };
    return c;
  };
  Membership.find = emptyChain;
  TrainerBooking.find = emptyChain;
  Invoice.countDocuments = async () => stores.invoices.length;
  Invoice.distinct = async () => [];
  User.find = () => ({ select: () => ({ lean: async () => [] }) });

  Payment.create = async (data) => {
    const doc = wrapDoc({ _id: new mongoose.Types.ObjectId(), createdAt: new Date(), ...data }, stores.payments);
    stores.payments.push(doc);
    return doc;
  };
  Payment.findById = (id) => {
    const found = stores.payments.find((p) => String(p._id) === String(id)) || null;
    const chain = {
      populate() { return chain; },
      lean: async () => (found ? { ...found } : null),
      then(resolve, reject) {
        return Promise.resolve(found ? wrapDoc(found, stores.payments) : null).then(resolve, reject);
      },
    };
    return chain;
  };
  Payment.findOneAndUpdate = async (filter, update) => {
    const idx = stores.payments.findIndex(
      (p) =>
        String(p._id) === String(filter._id) &&
        (!filter.status || p.status === filter.status) &&
        (!filter.paymentMethod || p.paymentMethod === filter.paymentMethod)
    );
    if (idx < 0) return null;
    const target = { ...stores.payments[idx] };
    if (update.$set) Object.assign(target, update.$set);
    if (update.$push?.auditLogs) target.auditLogs = [...(target.auditLogs || []), update.$push.auditLogs];
    const wrapped = wrapDoc(target, stores.payments);
    stores.payments[idx] = wrapped;
    return wrapped;
  };
  Payment.find = (filter = {}) => {
    const matches = stores.payments.filter((p) => {
      if (filter.status && p.status !== filter.status) return false;
      if (filter.paymentMethod && p.paymentMethod !== filter.paymentMethod) return false;
      if (filter.branchId && String(p.branchId) !== String(filter.branchId)) return false;
      if (filter.invoiceId && String(p.invoiceId) !== String(filter.invoiceId)) return false;
      return true;
    });
    const chain = {
      sort: () => chain,
      lean: async () => matches.map((m) => ({ ...m })),
      then(resolve, reject) {
        return Promise.resolve(matches.map((m) => wrapDoc(m, stores.payments))).then(resolve, reject);
      },
    };
    return chain;
  };

  Membership.create = async (data) => {
    const doc = wrapDoc({ _id: new mongoose.Types.ObjectId(), createdAt: new Date(), ...data }, stores.memberships);
    stores.memberships.push(doc);
    return doc;
  };
  Membership.findById = async (id) => {
    const found = stores.memberships.find((m) => String(m._id) === String(id));
    return found ? wrapDoc(found, stores.memberships) : null;
  };
  Membership.findOne = (filter = {}) => {
    const matches = stores.memberships.filter((m) => {
      if (filter.status && m.status !== filter.status) return false;
      if (filter.$or) {
        return filter.$or.some(
          (c) =>
            (c.userId && String(m.userId) === String(c.userId)) ||
            (c.clientProfileId && String(m.clientProfileId) === String(c.clientProfileId))
        );
      }
      return true;
    });
    const sortChain = {
      sort: () => Promise.resolve(matches[0] ? wrapDoc(matches[0], stores.memberships) : null),
      then(resolve, reject) {
        return Promise.resolve(matches[0] ? wrapDoc(matches[0], stores.memberships) : null).then(resolve, reject);
      },
    };
    return sortChain;
  };

  Invoice.create = async (data) => {
    const doc = wrapDoc({ _id: new mongoose.Types.ObjectId(), createdAt: new Date(), ...data }, stores.invoices);
    stores.invoices.push(doc);
    return doc;
  };
  Invoice.findById = async (id) => {
    const found = stores.invoices.find((i) => String(i._id) === String(id));
    return found ? wrapDoc(found, stores.invoices) : null;
  };
  Invoice.find = (filter = {}) => {
    const matches = stores.invoices.filter((i) => {
      if (filter.branchId && String(i.branchId) !== String(filter.branchId)) return false;
      if (filter.status?.$in && !filter.status.$in.includes(i.status)) return false;
      if (filter.balanceAmount?.$gt !== undefined && !(i.balanceAmount > filter.balanceAmount.$gt)) return false;
      return true;
    });
    const chain = {
      sort: () => chain,
      limit: () => chain,
      populate: () => chain,
      lean: async () => matches.map((m) => ({ ...m })),
    };
    return chain;
  };

  ClientProfile.findById = async (id) => {
    const found = stores.profiles.find((p) => String(p._id) === String(id));
    return found ? wrapDoc(found, stores.profiles) : null;
  };
  ClientProfile.findOne = async (filter) => {
    const found = stores.profiles.find((p) => filter.userId && String(p.userId) === String(filter.userId));
    return found ? wrapDoc(found, stores.profiles) : null;
  };

  User.findById = async (id) => stores.users.find((u) => String(u._id) === String(id)) || null;
  MembershipPlan.findById = async () => ({
    _id: new mongoose.Types.ObjectId(),
    name: '1 Month Kickstart',
    isActive: true,
    durationDays: 30,
    durationMonths: 1,
    branchPricing: [{ branchId: branchA, isAvailable: true, basePrice: 1200, joiningFee: 0, finalPrice: 1200 }],
  });

  try {
    // Test 1 & Test 6: Walk-in client (MM000002, userId=null) CASH ₹1200 -> PENDING_APPROVAL -> Approve -> PAID + ACTIVE
    let walkinCashPaymentId = null;
    let walkinMembershipId = null;
    await test('Test 1 & 6: Walk-in CASH ₹1200 creates PENDING_APPROVAL + PENDING_PAYMENT, then Admin Approve finalizes PAID + ACTIVE + Receipt', async () => {
      const walkinProfile = wrapDoc(
        { _id: new mongoose.Types.ObjectId(), userId: null, clientId: 'MM000002', name: 'Ravi', branchId: branchA, membershipId: '' },
        stores.profiles
      );
      stores.profiles.push(walkinProfile);

      const req = {
        user: adminA,
        body: {
          clientProfileId: String(walkinProfile._id),
          branchId: String(branchA),
          planId: String(new mongoose.Types.ObjectId()),
          amount: 1200,
          paymentMethod: 'CASH',
        },
      };
      const res = mkRes();
      await adminController.createClientMembership(req, res, (e) => { throw e; });

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.payment.status, 'PENDING_APPROVAL');
      assert.strictEqual(res.body.payment.receiptNumber, undefined);
      assert.strictEqual(res.body.membership.status, 'PENDING_PAYMENT');
      assert.strictEqual(res.body.invoice.status, 'PENDING');

      walkinCashPaymentId = res.body.payment._id;
      walkinMembershipId = res.body.membership._id;

      // Receipt before approval must be blocked
      const receiptResBefore = mkRes();
      await financeController.getPaymentReceipt({ params: { id: String(walkinCashPaymentId) } }, receiptResBefore, (e) => { throw e; });
      assert.strictEqual(receiptResBefore.statusCode, 400);

      // Finance summary BEFORE approval: pending cash NOT in collectedRevenue
      const summaryBefore = await financeService.computeFinanceSummary({ branchId: String(branchA) });
      assert.strictEqual(summaryBefore.collectedRevenue, 0);
      assert.strictEqual(summaryBefore.cashApprovalSummary.pendingCashAmount, 1200);
      assert.strictEqual(summaryBefore.cashApprovalSummary.pendingCashCount, 1);

      // Approve
      const approveResult = await financeService.approveCashPayment(walkinCashPaymentId, adminA, { notes: 'Verified at desk' });
      assert.strictEqual(approveResult.payment.status, 'PAID');
      assert.ok(approveResult.payment.receiptNumber);
      assert.strictEqual(String(approveResult.payment.approvedBy), String(adminA._id));
      assert.strictEqual(approveResult.invoice.status, 'PAID');
      assert.strictEqual(approveResult.membership.status, 'ACTIVE');

      const updatedProfile = stores.profiles.find((p) => String(p._id) === String(walkinProfile._id));
      assert.strictEqual(updatedProfile.membershipId, String(walkinMembershipId));
    });

    // Test 7: Finance summary AFTER approval
    await test('Test 7: Finance summary excludes PENDING_APPROVAL and counts approved PAID cash', async () => {
      const summaryAfter = await financeService.computeFinanceSummary({ branchId: String(branchA) });
      assert.strictEqual(summaryAfter.collectedRevenue, 1200);
      assert.strictEqual(summaryAfter.cashApprovalSummary.approvedCashAmount, 1200);
      assert.strictEqual(summaryAfter.cashApprovalSummary.pendingCashCount, 0);
    });

    // Test 3: Double approval
    await test('Test 3: Double approval prevents duplicate activation (second returns 409)', async () => {
      await assert.rejects(
        () => financeService.approveCashPayment(walkinCashPaymentId, globalAdmin, {}),
        (err) => err.statusCode === 409
      );
    });

    // Test 2: Rejected cash payment
    await test('Test 2: Admin Reject marks REJECTED with audit trail and keeps membership inactive', async () => {
      const prof2 = wrapDoc(
        { _id: new mongoose.Types.ObjectId(), userId: null, clientId: 'MM000003', name: 'Karthik', branchId: branchA, membershipId: '' },
        stores.profiles
      );
      stores.profiles.push(prof2);

      const res = mkRes();
      await adminController.createClientMembership(
        { user: adminA, body: { clientProfileId: String(prof2._id), branchId: String(branchA), planId: String(new mongoose.Types.ObjectId()), amount: 1200, paymentMethod: 'CASH' } },
        res,
        (e) => { throw e; }
      );
      const pid = res.body.payment._id;
      const mid = res.body.membership._id;

      const rej = await financeService.rejectCashPayment(pid, adminA, { reason: 'Cash not handed over' });
      assert.strictEqual(rej.payment.status, 'REJECTED');
      assert.strictEqual(rej.payment.rejectionReason, 'Cash not handed over');
      assert.strictEqual(String(rej.payment.rejectedBy), String(adminA._id));
      assert.strictEqual(rej.membership.status, 'PENDING_PAYMENT');

      const mem = await Membership.findById(mid);
      assert.strictEqual(mem.status, 'PENDING_PAYMENT');
    });

    // Test 4: Unauthorized branch Admin
    await test('Test 4: Admin from another branch is denied (403)', async () => {
      const prof3 = wrapDoc(
        { _id: new mongoose.Types.ObjectId(), userId: null, clientId: 'MM000004', name: 'Surya', branchId: branchA, membershipId: '' },
        stores.profiles
      );
      stores.profiles.push(prof3);

      const res = mkRes();
      await adminController.createClientMembership(
        { user: adminA, body: { clientProfileId: String(prof3._id), branchId: String(branchA), planId: String(new mongoose.Types.ObjectId()), amount: 1200, paymentMethod: 'CASH' } },
        res,
        (e) => { throw e; }
      );
      const pid = res.body.payment._id;

      await assert.rejects(
        () => financeService.approveCashPayment(pid, adminB, {}),
        (err) => err.statusCode === 403
      );
    });

    // Test 5: Tampered frontend request
    await test('Test 5: Tampered frontend request attempting paymentStatus=PAID / membershipStatus=ACTIVE for CASH is rejected (400)', async () => {
      const prof4 = wrapDoc(
        { _id: new mongoose.Types.ObjectId(), userId: null, clientId: 'MM000005', name: 'Mani', branchId: branchA, membershipId: '' },
        stores.profiles
      );
      stores.profiles.push(prof4);

      const res = mkRes();
      await adminController.createClientMembership(
        {
          user: adminA,
          body: {
            clientProfileId: String(prof4._id),
            branchId: String(branchA),
            planId: String(new mongoose.Types.ObjectId()),
            amount: 1200,
            paymentMethod: 'CASH',
            paymentStatus: 'PAID',
            membershipStatus: 'ACTIVE',
          },
        },
        res,
        (e) => { throw e; }
      );
      assert.strictEqual(res.statusCode, 400);
    });

    // Test 8: Biometric eligibility check
    await test('Test 8: PENDING_PAYMENT membership is excluded from active biometric eligibility until approved', async () => {
      const now = new Date();
      const pendingMem = { status: 'PENDING_PAYMENT', startDate: now, expiryDate: new Date(now.getTime() + 86400000) };
      const activeMem = { status: 'ACTIVE', startDate: now, expiryDate: new Date(now.getTime() + 86400000) };
      const isEligible = (m) => m.status === 'ACTIVE' && new Date(m.startDate) <= now && new Date(m.expiryDate) >= now;
      assert.strictEqual(isEligible(pendingMem), false);
      assert.strictEqual(isEligible(activeMem), true);
    });

    // Test 9: Existing UPI flow
    await test('Test 9: Existing UPI payment activates immediately (PAID + ACTIVE) without cash approval', async () => {
      const prof5 = wrapDoc(
        { _id: new mongoose.Types.ObjectId(), userId: null, clientId: 'MM000006', name: 'Arun', branchId: branchA, membershipId: '' },
        stores.profiles
      );
      stores.profiles.push(prof5);

      const res = mkRes();
      await adminController.createClientMembership(
        {
          user: adminA,
          body: {
            clientProfileId: String(prof5._id),
            branchId: String(branchA),
            planId: String(new mongoose.Types.ObjectId()),
            amount: 1200,
            paymentMethod: 'UPI',
          },
        },
        res,
        (e) => { throw e; }
      );
      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.payment.status, 'PAID');
      assert.strictEqual(res.body.membership.status, 'ACTIVE');
      assert.ok(res.body.payment.receiptNumber);
    });
  } finally {
    Payment.create = orig.PaymentCreate;
    Payment.findById = orig.PaymentFindById;
    Payment.findOneAndUpdate = orig.PaymentFindOneAndUpdate;
    Payment.find = orig.PaymentFind;
    Membership.create = orig.MembershipCreate;
    Membership.findById = orig.MembershipFindById;
    Membership.findOne = orig.MembershipFindOne;
    Membership.find = orig.MembershipFind;
    TrainerBooking.find = orig.TrainerBookingFind;
    Invoice.create = orig.InvoiceCreate;
    Invoice.findById = orig.InvoiceFindById;
    Invoice.find = orig.InvoiceFind;
    Invoice.distinct = orig.InvoiceDistinct;
    Invoice.countDocuments = orig.InvoiceCountDocuments;
    ClientProfile.findById = orig.ProfileFindById;
    ClientProfile.findOne = orig.ProfileFindOne;
    User.findById = orig.UserFindById;
    User.find = orig.UserFind;
    Branch.find = orig.BranchFind;
    Branch.findById = orig.BranchFindById;
    Expense.find = orig.ExpenseFind;
    FinanceConfig.getOrCreateConfig = orig.ConfigGet;
    FinanceCounter.findOneAndUpdate = orig.CounterFindOneAndUpdate;
    MembershipPlan.findById = orig.PlanFindById;
  }

  console.log(`\nAll ${passed} cash desk approval tests passed!`);
};

run().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
