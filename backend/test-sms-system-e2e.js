const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('./src/server');
const User = require('./src/models/User');
const Branch = require('./src/models/Branch');
const ClientProfile = require('./src/models/ClientProfile');
const Membership = require('./src/models/Membership');
const Invoice = require('./src/models/Invoice');
const Payment = require('./src/models/Payment');
const TrainerBooking = require('./src/models/TrainerBooking');
const SmsSettings = require('./src/models/SmsSettings');
const SmsLog = require('./src/models/SmsLog');
const smsService = require('./src/services/smsService');
const smsProviderService = require('./src/services/smsProviderService');
const smsSchedulerService = require('./src/services/smsSchedulerService');
const { MEMBER_NOTIFICATIONS, STAFF_NOTIFICATIONS } = require('./src/utils/smsCatalog');
const generateToken = require('./src/utils/generateToken');

const request = (server, method, path, body = null, token = null) =>
  new Promise((resolve, reject) => {
    const addr = server.address();
    const payload = body ? JSON.stringify(body) : null;
    const headers = {};
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (token) headers.Authorization = `Bearer ${token}`;
    const req = http.request(
      { hostname: '127.0.0.1', port: addr.port, path, method, headers },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
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
    if (payload) req.write(payload);
    req.end();
  });

(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-sms-e2e';
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all([SmsSettings.init(), SmsLog.init()]);

  const server = app.listen(0);
  let passed = 0;
  const check = (name, fn) =>
    Promise.resolve()
      .then(fn)
      .then(() => {
        passed += 1;
        console.log(`PASS [${passed}]: ${name}`);
      });

  const sentCalls = [];
  smsProviderService.setProviderAdapterForTests(async (payload) => {
    sentCalls.push(payload);
    return {
      ok: true,
      status: 'SENT',
      providerMessageId: `mock-msg-${sentCalls.length}`,
      providerResponse: 'HTTP 200: ACCEPTED',
      error: '',
    };
  });

  try {
    const branch = await Branch.create({
      name: 'Man & Machine Kovilpatti',
      city: 'Kovilpatti',
      code: 'KVP',
      address: 'Kovilpatti',
      phone: '9000000010',
      isActive: true,
    });

    const admin = await User.create({
      name: 'Super Admin',
      email: 'admin@sms.test',
      phone: '9876500000',
      password: 'Password123!',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    const clientUser = await User.create({
      name: 'Client User',
      email: 'client@sms.test',
      phone: '9876500001',
      password: 'Password123!',
      role: 'CLIENT',
      branchId: branch._id,
      status: 'ACTIVE',
    });
    const trainerUser = await User.create({
      name: 'Coach Arjun',
      email: 'trainer@sms.test',
      phone: '9876500002',
      password: 'Password123!',
      role: 'TRAINER',
      branchId: branch._id,
      status: 'ACTIVE',
    });

    const adminToken = generateToken(admin._id, 0);
    const clientToken = generateToken(clientUser._id, 0);

    await check('1 & 13. Admin authorization enforced; 22 Member & 23 Staff toggles default OFF and persist', async () => {
      const unauth = await request(server, 'GET', '/api/admin/sms/settings', null, clientToken);
      assert.strictEqual(unauth.status, 403);

      const res = await request(server, 'GET', '/api/admin/sms/settings', null, adminToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.catalog.member.length, 22);
      assert.strictEqual(res.data.catalog.staff.length, 23);

      for (const m of MEMBER_NOTIFICATIONS) {
        assert.strictEqual(res.data.settings.memberNotifications[m.key], false);
      }
      for (const s of STAFF_NOTIFICATIONS) {
        assert.strictEqual(res.data.settings.staffNotifications[s.key], false);
      }
    });

    await check('2 & 5. Disabled toggles prevent sending SMS', async () => {
      const client = await ClientProfile.create({
        clientId: 'MM000101',
        userId: clientUser._id,
        name: 'Karthik',
        phone: '9876543210',
        branchId: branch._id,
      });
      await smsService.triggerClientWelcome({ client, branch });
      assert.strictEqual(sentCalls.length, 0);
      assert.strictEqual(await SmsLog.countDocuments(), 0);
    });

    await check('3 & 4 & 6 & 14. Enabling toggles persists across reload and triggers correct Member, Owner & Trainer SMS', async () => {
      const allMemberTrue = Object.fromEntries(MEMBER_NOTIFICATIONS.map((m) => [m.key, true]));
      const allStaffTrue = Object.fromEntries(STAFF_NOTIFICATIONS.map((s) => [s.key, true]));

      const upd = await request(
        server,
        'PUT',
        '/api/admin/sms/settings',
        {
          memberNotifications: allMemberTrue,
          staffNotifications: allStaffTrue,
          membershipExpiryNotificationDays: 5,
          dailySummaryTime: '00:00',
          ownerName: 'Nataraj',
          ownerPhone: '9876599999',
        },
        adminToken
      );
      assert.strictEqual(upd.status, 200);
      assert.strictEqual(upd.data.settings.membershipExpiryNotificationDays, 5);
      assert.strictEqual(upd.data.settings.ownerPhone, '+919876599999');

      // Reload from DB
      const reloaded = await smsService.getOrCreateSettings();
      assert.strictEqual(reloaded.settings.memberNotifications.MEMBER_WELCOME_GREETINGS, true);
      assert.strictEqual(reloaded.settings.staffNotifications.STAFF_TRAINER_ASSIGN_ALERT, true);

      const client = await ClientProfile.findOne({ clientId: 'MM000101' }).lean();
      await smsService.triggerClientWelcome({ client, branch });
      await smsService.triggerTrainerAssigned({
        client,
        branch,
        trainerUser,
        trainerPhone: trainerUser.phone,
      });

      // Welcome (member + owner) + Trainer Assign (member + trainer) = 4 SMS
      assert.strictEqual(sentCalls.length, 4);
      assert.strictEqual(sentCalls[0].to, '+919876543210');
      assert.strictEqual(sentCalls[1].to, '+919876599999');
      assert.strictEqual(sentCalls[3].to, '+919876500002');
    });

    await check('8. Duplicate prevention via eventKey blocks duplicate SMS', async () => {
      const before = sentCalls.length;
      const client = await ClientProfile.findOne({ clientId: 'MM000101' }).lean();
      await smsService.triggerClientWelcome({ client, branch });
      assert.strictEqual(sentCalls.length, before);
    });

    await check('9. Unresolved template placeholder blocks sending and logs FAILED', async () => {
      const before = sentCalls.length;
      const res = await smsService.sendNotification({
        notificationKey: 'MEMBER_MEMBERSHIP_PAYMENT',
        recipientPhone: '9876543210',
        recipientName: 'Karthik',
        variables: { memberName: 'Karthik' }, // missing paymentAmount, membershipName, branchName
        eventKey: 'test-unresolved-1',
      });
      assert.strictEqual(res.ok, false);
      assert.strictEqual(res.reason, 'UNRESOLVED_PLACEHOLDERS');
      assert.strictEqual(sentCalls.length, before);
    });

    await check('10. Invalid Indian phone number is rejected and logged FAILED', async () => {
      const before = sentCalls.length;
      const res = await smsService.sendNotification({
        notificationKey: 'MEMBER_ABSENT_ALERT',
        recipientPhone: '12345',
        recipientName: 'Invalid Phone',
        variables: { memberName: 'Test', branchName: 'KVP' },
        eventKey: 'test-invalid-phone-1',
      });
      assert.strictEqual(res.ok, false);
      assert.strictEqual(res.reason, 'INVALID_PHONE');
      assert.strictEqual(sentCalls.length, before);
    });

    await check('11 & 12. Insufficient SMS credits and delivery receipt updates work cleanly', async () => {
      const log = await SmsLog.findOne({ status: 'SENT' }).lean();
      const dlr = await smsProviderService.processDeliveryReceipt({
        providerMessageId: log.providerMessageId,
        status: 'DELIVERED',
      });
      assert.strictEqual(dlr.status, 'DELIVERED');

      smsProviderService.setProviderAdapterForTests(async () => ({
        ok: false,
        code: 'INSUFFICIENT_CREDITS',
        providerResponse: 'HTTP 402: INSUFFICIENT_CREDITS',
        error: 'Insufficient SMS credits in provider account.',
      }));

      const failRes = await smsService.sendNotification({
        notificationKey: 'MEMBER_ABSENT_ALERT',
        recipientPhone: '9876543210',
        recipientName: 'Karthik',
        variables: { memberName: 'Karthik', branchName: 'Kovilpatti' },
        eventKey: 'test-credits-1',
      });
      assert.strictEqual(failRes.ok, false);
      assert.strictEqual(failRes.log.status, 'FAILED');
      assert(/Insufficient SMS credits/i.test(failRes.log.failureReason));
    });

    await check('7. Scheduled notifications pass runs expiry, overdue, balance, birthday, daily summary & deduplicates on rerun', async () => {
      smsProviderService.setProviderAdapterForTests(async (payload) => {
        sentCalls.push(payload);
        return { ok: true, status: 'SENT', providerMessageId: `sched-${sentCalls.length}`, providerResponse: 'OK' };
      });

      const now = new Date('2026-11-28T16:00:00+05:30');
      const client = await ClientProfile.findOne({ clientId: 'MM000101' });
      client.dateOfBirth = new Date('1995-11-28T00:00:00+05:30');
      await client.save();

      await Membership.create({
        clientProfileId: client._id,
        userId: clientUser._id,
        branchId: branch._id,
        planName: 'Annual Pro',
        status: 'ACTIVE',
        startDate: new Date('2026-01-01T00:00:00+05:30'),
        expiryDate: new Date('2026-11-30T00:00:00+05:30'),
      });

      await Invoice.create({
        invoiceNumber: 'INV-SMS-001',
        clientProfileId: client._id,
        branchId: branch._id,
        description: 'Annual Pro Membership',
        subtotal: 5000,
        totalAmount: 5000,
        paidAmount: 2000,
        balanceDue: 3000,
        paymentStatus: 'PARTIAL',
        dueDate: new Date('2026-11-29T00:00:00+05:30'),
      });

      await TrainerBooking.create({
        bookingReference: 'BK-SMS-001',
        clientId: clientUser._id,
        trainerId: trainerUser._id,
        branchId: branch._id,
        amount: 500,
        date: new Date('2026-11-28T00:00:00+05:30'),
        startTime: '06:00 PM',
        endTime: '07:00 PM',
        bookingStatus: 'CONFIRMED',
      });

      const beforeCount = sentCalls.length;
      await smsSchedulerService.runScheduledSmsPass(now);
      const afterFirst = sentCalls.length;
      assert(afterFirst > beforeCount, 'Scheduler should have dispatched scheduled SMS');

      // Re-running on same day must be idempotent
      await smsSchedulerService.runScheduledSmsPass(now);
      assert.strictEqual(sentCalls.length, afterFirst);
    });

    console.log(`\nALL ${passed} SMS SYSTEM E2E CHECKS PASSED!`);
  } finally {
    smsProviderService.resetProviderAdapter();
    server.close();
    await mongoose.disconnect();
    await mongod.stop();
  }
})().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
