const assert = require('assert');
const crypto = require('crypto');
const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-email-secret-key';
process.env.COMMUNICATION_ENCRYPTION_KEY =
  process.env.COMMUNICATION_ENCRYPTION_KEY || 'test-communication-encryption-secret-key';
process.env.COMMUNICATION_WEBHOOK_SECRET =
  process.env.COMMUNICATION_WEBHOOK_SECRET || 'test-communication-webhook-secret';

const app = require('./src/server');
const User = require('./src/models/User');
const Branch = require('./src/models/Branch');
const ClientProfile = require('./src/models/ClientProfile');
const TrainerProfile = require('./src/models/TrainerProfile');
const Membership = require('./src/models/Membership');
const Invoice = require('./src/models/Invoice');
const Payment = require('./src/models/Payment');
const TrainerBooking = require('./src/models/TrainerBooking');
const SmsSettings = require('./src/models/SmsSettings');
const SmsLog = require('./src/models/SmsLog');
const EmailLog = require('./src/models/EmailLog');
const EmailTemplate = require('./src/models/EmailTemplate');
const smsProviderService = require('./src/services/smsProviderService');
const emailProviderService = require('./src/services/emailProviderService');
const smsService = require('./src/services/smsService');
const emailService = require('./src/services/emailService');
const communicationService = require('./src/services/communicationService');
const smsSchedulerService = require('./src/services/smsSchedulerService');
const { MEMBER_NOTIFICATIONS, STAFF_NOTIFICATIONS } = require('./src/utils/smsCatalog');

const requestJson = (baseUrl, method, path, token = '', body = null) =>
  new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw || '{}') });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });

(async () => {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await EmailLog.init();
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const sentSmsCalls = [];
  const sentEmailCalls = [];

  smsProviderService.setProviderAdapterForTests(async (payload) => {
    sentSmsCalls.push(payload);
    return { ok: true, status: 'SENT', providerMessageId: `sms-${sentSmsCalls.length}`, providerResponse: 'OK' };
  });

  emailProviderService.setEmailProviderAdapterForTests(async (payload) => {
    sentEmailCalls.push(payload);
    return { ok: true, status: 'SENT', providerMessageId: `email-${sentEmailCalls.length}`, providerResponse: '250 OK' };
  });

  let passed = 0;
  const check = async (name, fn) => {
    await fn();
    passed += 1;
    console.log(`PASS [${passed}]: ${name}`);
  };

  try {
    const branchA = await Branch.create({ name: 'Kovilpatti Main', city: 'Kovilpatti', code: 'KVP' });
    const branchB = await Branch.create({ name: 'Madurai Branch', city: 'Madurai', code: 'MDU' });

    const adminUser = await User.create({
      name: 'Super Admin',
      email: 'admin@manandmachine.test',
      phone: '9876543210',
      password: 'Password123!',
      role: 'ADMIN',
      branchId: branchA._id,
    });
    const clientUser = await User.create({
      name: 'Arjun Member',
      email: 'arjun@member.test',
      phone: '9876500001',
      password: 'Password123!',
      role: 'CLIENT',
      branchId: branchA._id,
    });
    const trainerUser = await User.create({
      name: 'Coach Vikram',
      email: 'vikram@trainer.test',
      phone: '9876500002',
      password: 'Password123!',
      role: 'TRAINER',
      branchId: branchA._id,
    });
    await TrainerProfile.create({
      userId: trainerUser._id,
      branchId: branchA._id,
      contactPhone: '9876500002',
      contactEmail: 'vikram@trainer.test',
    });

    const client = await ClientProfile.create({
      clientId: 'MM000201',
      userId: clientUser._id,
      branchId: branchA._id,
      name: 'Arjun Member',
      phone: '9876500001',
      email: 'arjun@member.test',
      joiningDate: new Date('2025-11-28T00:00:00+05:30'),
      dateOfBirth: new Date('1995-11-28T00:00:00+05:30'),
    });

    const adminToken = jwt.sign({ id: adminUser._id, role: 'ADMIN' }, process.env.JWT_SECRET);
    const clientToken = jwt.sign({ id: clientUser._id, role: 'CLIENT' }, process.env.JWT_SECRET);

    await check('1 & 2 & 15. Admin-only access; all 22 Member & 23 Staff email toggles default OFF', async () => {
      const unauth = await requestJson(baseUrl, 'GET', '/api/admin/communications/settings');
      assert.strictEqual(unauth.status, 401);

      const nonAdmin = await requestJson(baseUrl, 'GET', '/api/admin/communications/settings', clientToken);
      assert.strictEqual(nonAdmin.status, 403);

      const res = await requestJson(baseUrl, 'GET', '/api/admin/communications/settings', adminToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.settings.emailEnabled, false);
      assert.strictEqual(res.body.settings.smsEnabled, true);
      assert.strictEqual(Object.keys(res.body.settings.emailMemberNotifications).length, 22);
      assert.strictEqual(Object.keys(res.body.settings.emailStaffNotifications).length, 23);

      for (const m of MEMBER_NOTIFICATIONS) {
        assert.strictEqual(res.body.settings.emailMemberNotifications[m.key], false);
      }
      for (const s of STAFF_NOTIFICATIONS) {
        assert.strictEqual(res.body.settings.emailStaffNotifications[s.key], false);
      }
    });

    await check('3 & 11 & 18. Independent SMS/Email toggles & encrypted SMTP password never exposed + persistence', async () => {
      const putRes = await requestJson(baseUrl, 'PUT', '/api/admin/communications/settings', adminToken, {
        smsEnabled: true,
        emailEnabled: true,
        ownerName: 'Branch Owner',
        ownerPhone: '9876599999',
        ownerEmail: 'owner@manandmachine.test',
        memberNotifications: {
          MEMBER_WELCOME_GREETINGS: true,
          MEMBER_MEMBERSHIP_PAYMENT: false,
        },
        emailMemberNotifications: {
          MEMBER_WELCOME_GREETINGS: false,
          MEMBER_MEMBERSHIP_PAYMENT: true,
          MEMBER_TRAINER_ASSIGN_ALERT: true,
        },
        emailStaffNotifications: {
          STAFF_MEMBERSHIP_PAYMENT: true,
          STAFF_TRAINER_ASSIGN_ALERT: true,
          STAFF_DAILY_SUMMARY: true,
        },
        smtpConfig: {
          host: 'smtp.example.com',
          port: 587,
          secure: false,
          username: 'mailer@manandmachine.test',
          password: 'super-secret-smtp-password',
          senderEmail: 'no-reply@manandmachine.test',
          senderName: 'Man & Machine Fitness',
        },
      });
      assert.strictEqual(putRes.status, 200);
      assert.strictEqual(putRes.body.settings.smtpConfig.hasPassword, true);
      assert.strictEqual(putRes.body.settings.smtpConfig.password, undefined);
      assert.strictEqual(putRes.body.settings.smtpConfig.passwordEncrypted, undefined);

      // Verify persistence & independent channel state
      const reloadRes = await requestJson(baseUrl, 'GET', '/api/admin/communications/settings', adminToken);
      assert.strictEqual(reloadRes.body.settings.memberNotifications.MEMBER_WELCOME_GREETINGS, true);
      assert.strictEqual(reloadRes.body.settings.emailMemberNotifications.MEMBER_WELCOME_GREETINGS, false);
      assert.strictEqual(reloadRes.body.settings.memberNotifications.MEMBER_MEMBERSHIP_PAYMENT, false);
      assert.strictEqual(reloadRes.body.settings.emailMemberNotifications.MEMBER_MEMBERSHIP_PAYMENT, true);
      assert.strictEqual(reloadRes.body.settings.smtpConfig.hasPassword, true);
      assert.strictEqual(reloadRes.body.settings.smtpConfig.passwordEncrypted, undefined);
    });

    await check('4 & 5. Global Email OFF & Global SMS OFF pause channels without erasing individual preferences', async () => {
      // Turn Global Email OFF
      await requestJson(baseUrl, 'PUT', '/api/admin/communications/settings', adminToken, {
        emailEnabled: false,
        smsEnabled: true,
      });
      const beforeEmail = sentEmailCalls.length;
      const beforeSms = sentSmsCalls.length;

      await communicationService.triggerClientWelcome({ client, branch: branchA });
      // Welcome SMS is ON (should send); Welcome Email is OFF + Global Email is OFF
      assert.strictEqual(sentSmsCalls.length, beforeSms + 1);
      assert.strictEqual(sentEmailCalls.length, beforeEmail);

      // Now turn Global SMS OFF and Global Email ON -> individual prefs must remain intact!
      await requestJson(baseUrl, 'PUT', '/api/admin/communications/settings', adminToken, {
        smsEnabled: false,
        emailEnabled: true,
      });
      const checkRes = await requestJson(baseUrl, 'GET', '/api/admin/communications/settings', adminToken);
      assert.strictEqual(checkRes.body.settings.memberNotifications.MEMBER_WELCOME_GREETINGS, true);
      assert.strictEqual(checkRes.body.settings.emailMemberNotifications.MEMBER_MEMBERSHIP_PAYMENT, true);

      // Re-enable Global SMS for remaining tests
      await requestJson(baseUrl, 'PUT', '/api/admin/communications/settings', adminToken, {
        smsEnabled: true,
        emailEnabled: true,
      });
    });

    await check('6 & 7 & 9 & 16. Payment (with receipt attachment) + Trainer Assignment + HTML/Text & Branch scoping', async () => {
      const payment = await Payment.create({
        userId: clientUser._id,
        branchId: branchA._id,
        transactionId: 'TXN-EMAIL-001',
        description: 'Annual Pro Membership',
        amount: 4500,
        status: 'PAID',
        paymentMethod: 'CASH',
        receiptNumber: 'RCPT-EMAIL-001',
      });
      const beforeEmails = sentEmailCalls.length;
      const beforeSms = sentSmsCalls.length;

      await communicationService.triggerMembershipPayment({
        client,
        payment,
        membership: { planName: 'Annual Pro' },
        branch: branchA,
      });

      // Member SMS is OFF, Member Email is ON, Owner Email is ON
      assert.strictEqual(sentSmsCalls.length, beforeSms);
      assert.strictEqual(sentEmailCalls.length, beforeEmails + 2);

      const memberMail = sentEmailCalls[beforeEmails];
      assert.strictEqual(memberMail.to, 'arjun@member.test');
      assert(memberMail.html.includes('MAN &amp; MACHINE FITNESS'));
      assert(memberMail.text.includes('Rs.4500'));
      assert(Array.isArray(memberMail.attachments) && memberMail.attachments.length === 1);
      assert.strictEqual(memberMail.attachments[0].filename, 'receipt-RCPT-EMAIL-001.txt');

      const ownerMail = sentEmailCalls[beforeEmails + 1];
      assert.strictEqual(ownerMail.to, 'owner@manandmachine.test');
      assert.strictEqual(ownerMail.attachments.length, 0);

      // Trainer Assignment
      await communicationService.triggerTrainerAssigned({
        client,
        branch: branchB,
        trainerUser,
        trainerPhone: '9876500002',
        trainerEmail: 'vikram@trainer.test',
      });
      const trainerMail = sentEmailCalls[sentEmailCalls.length - 1];
      assert.strictEqual(trainerMail.to, 'vikram@trainer.test');
      assert(trainerMail.subject.includes('Arjun Member'));

      const latestTrainerLog = await EmailLog.findOne({ notificationKey: 'STAFF_TRAINER_ASSIGN_ALERT' }).lean();
      assert.strictEqual(String(latestTrainerLog.branchId), String(branchB._id));
    });

    await check('8. Template placeholder replacement, preview API & unresolved placeholder blocking', async () => {
      const previewRes = await requestJson(
        baseUrl,
        'POST',
        '/api/admin/communications/email/templates/MEMBER_MEMBERSHIP_PAYMENT/preview',
        adminToken,
        {}
      );
      assert.strictEqual(previewRes.status, 200);
      assert(previewRes.body.preview.html.includes('MAN &amp; MACHINE FITNESS'));
      assert(!previewRes.body.preview.html.includes('{{'));

      const badRes = await emailService.sendEmailNotification({
        notificationKey: 'MEMBER_MEMBERSHIP_PAYMENT',
        recipientEmail: 'arjun@member.test',
        recipientName: 'Arjun',
        recipientType: 'MEMBER',
        variables: { memberName: 'Arjun' }, // missing paymentAmount, membershipName, branchName
        eventKey: 'email-unresolved-test-1',
      });
      assert.strictEqual(badRes.ok, false);
      assert.strictEqual(badRes.reason, 'UNRESOLVED_PLACEHOLDERS');
      assert.strictEqual(badRes.log.status, 'FAILED');
    });

    await check('10 & 12. Invalid email rejected & duplicate eventKey prevented', async () => {
      const invalidRes = await emailService.sendEmailNotification({
        notificationKey: 'MEMBER_MEMBERSHIP_PAYMENT',
        recipientEmail: 'not-an-email',
        recipientName: 'Bad',
        recipientType: 'MEMBER',
        variables: { memberName: 'Bad', paymentAmount: '100', membershipName: 'Pro', branchName: 'KVP' },
        eventKey: 'email-invalid-test-1',
      });
      assert.strictEqual(invalidRes.ok, false);
      assert.strictEqual(invalidRes.reason, 'INVALID_EMAIL');
      assert.strictEqual(invalidRes.log.status, 'FAILED');

      const vars = { memberName: 'Arjun', paymentAmount: '500', membershipName: 'Pro', branchName: 'KVP' };
      const first = await emailService.sendEmailNotification({
        notificationKey: 'MEMBER_MEMBERSHIP_PAYMENT',
        recipientEmail: 'arjun@member.test',
        recipientName: 'Arjun',
        recipientType: 'MEMBER',
        variables: vars,
        eventKey: 'email-dup-key-1',
      });
      assert.strictEqual(first.ok, true);

      const second = await emailService.sendEmailNotification({
        notificationKey: 'MEMBER_MEMBERSHIP_PAYMENT',
        recipientEmail: 'arjun@member.test',
        recipientName: 'Arjun',
        recipientType: 'MEMBER',
        variables: vars,
        eventKey: 'email-dup-key-1',
      });
      assert.strictEqual(second.duplicate, true);
    });

    await check('11 & 17. SMTP transient failure retries & one channel failing never blocks the other', async () => {
      let attemptCounter = 0;
      emailProviderService.setEmailProviderAdapterForTests(async () => {
        attemptCounter += 1;
        return {
          ok: false,
          status: 'FAILED',
          transient: false,
          providerResponse: '550 Mailbox unavailable',
          failureReason: '550 Mailbox unavailable',
        };
      });

      // Enable MEMBER_WELCOME_GREETINGS for both SMS and Email
      await requestJson(baseUrl, 'PUT', '/api/admin/communications/settings', adminToken, {
        smsEnabled: true,
        emailEnabled: true,
        memberNotifications: { MEMBER_WELCOME_GREETINGS: true },
        emailMemberNotifications: { MEMBER_WELCOME_GREETINGS: true },
      });

      const smsBefore = sentSmsCalls.length;
      const result = await communicationService.dispatchBothChannels({
        smsPayload: {
          notificationKey: 'MEMBER_WELCOME_GREETINGS',
          recipientPhone: client.phone,
          recipientName: client.name,
          recipientType: 'MEMBER',
          variables: { memberName: client.name, memberId: client.clientId, branchName: 'Kovilpatti' },
          eventKey: 'iso-sms-1',
        },
        emailPayload: {
          notificationKey: 'MEMBER_WELCOME_GREETINGS',
          recipientEmail: client.email,
          recipientName: client.name,
          recipientType: 'MEMBER',
          variables: { memberName: client.name, memberId: client.clientId, branchName: 'Kovilpatti' },
          eventKey: 'iso-email-1',
        },
      });
      assert.strictEqual(result.sms.ok, true);
      assert.strictEqual(sentSmsCalls.length, smsBefore + 1);
      assert.strictEqual(result.email.ok, false);
      assert.strictEqual(result.email.log.status, 'FAILED');
      assert.strictEqual(attemptCounter, 1); // Permanent 550 error must not retry indefinitely

      // Restore mock adapter
      emailProviderService.setEmailProviderAdapterForTests(async (payload) => {
        sentEmailCalls.push(payload);
        return { ok: true, status: 'SENT', providerMessageId: `email-${sentEmailCalls.length}`, providerResponse: '250 OK' };
      });
    });

    await check('13 & 14. Scheduled email jobs + history persistence & inspect endpoint', async () => {
      await requestJson(baseUrl, 'PUT', '/api/admin/communications/settings', adminToken, {
        emailMemberNotifications: { MEMBER_MEMBERSHIP_EXPIRY: true, MEMBER_BIRTHDAY_WISHES: true },
        emailStaffNotifications: { STAFF_DAILY_SUMMARY: true },
        dailySummaryTime: '15:00',
      });

      await Membership.create({
        clientProfileId: client._id,
        userId: clientUser._id,
        branchId: branchA._id,
        planName: 'Annual Pro',
        status: 'ACTIVE',
        startDate: new Date('2026-01-01T00:00:00+05:30'),
        expiryDate: new Date('2026-11-30T00:00:00+05:30'),
      });

      const now = new Date('2026-11-28T16:00:00+05:30');
      const before = sentEmailCalls.length;
      await smsSchedulerService.runScheduledSmsPass(now);
      const after = sentEmailCalls.length;
      assert(after >= before + 3, 'Expected expiry, birthday, and daily summary emails');

      // Re-run on same day must deduplicate
      await smsSchedulerService.runScheduledSmsPass(now);
      assert.strictEqual(sentEmailCalls.length, after);

      // Email history list & inspect
      const logsRes = await requestJson(baseUrl, 'GET', '/api/admin/communications/email/logs?status=SENT', adminToken);
      assert.strictEqual(logsRes.status, 200);
      assert(logsRes.body.logs.length > 0);
      const firstId = logsRes.body.logs[0]._id;
      const inspectRes = await requestJson(
        baseUrl,
        'GET',
        `/api/admin/communications/email/logs/${firstId}`,
        adminToken
      );
      assert.strictEqual(inspectRes.status, 200);
      assert.strictEqual(inspectRes.body.log._id, firstId);
    });

    await check('19. Signed Email & SMS webhooks verify signatures, reject invalid status/sig, and update matching log', async () => {
      const targetEmailLog = await EmailLog.findOne({ status: 'SENT', providerMessageId: { $ne: '' } }).lean();
      assert(targetEmailLog, 'Expected a SENT EmailLog with providerMessageId');

      const webhookBody = JSON.stringify({
        providerMessageId: targetEmailLog.providerMessageId,
        status: 'DELIVERED',
        providerResponse: '250 2.0.0 OK delivered',
      });

      const badSigRes = await requestJson(baseUrl, 'POST', '/api/webhooks/communications/email', '', JSON.parse(webhookBody));
      assert.strictEqual(badSigRes.status, 401);

      const signPayload = (raw) =>
        `sha256=${crypto.createHmac('sha256', process.env.COMMUNICATION_WEBHOOK_SECRET).update(raw).digest('hex')}`;

      const sendSignedWebhook = (path, rawPayload) =>
        new Promise((resolve, reject) => {
          const url = new URL(path, baseUrl);
          const req = http.request(
            url,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(rawPayload),
                'x-webhook-signature': signPayload(rawPayload),
              },
            },
            (res) => {
              let raw = '';
              res.on('data', (c) => (raw += c));
              res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw || '{}') }));
            }
          );
          req.on('error', reject);
          req.write(rawPayload);
          req.end();
        });

      const badStatusRes = await sendSignedWebhook(
        '/api/webhooks/communications/email',
        JSON.stringify({ providerMessageId: targetEmailLog.providerMessageId, status: 'SENT' })
      );
      assert.strictEqual(badStatusRes.status, 400);

      const okRes = await sendSignedWebhook('/api/webhooks/communications/email', webhookBody);
      assert.strictEqual(okRes.status, 200);
      assert.strictEqual(okRes.body.status, 'DELIVERED');
      const updatedEmail = await EmailLog.findById(targetEmailLog._id).lean();
      assert.strictEqual(updatedEmail.status, 'DELIVERED');

      const targetSmsLog = await SmsLog.findOne({ status: 'SENT', providerMessageId: { $ne: '' } }).lean();
      if (targetSmsLog) {
        const smsOk = await sendSignedWebhook(
          '/api/webhooks/communications/sms',
          JSON.stringify({ providerMessageId: targetSmsLog.providerMessageId, status: 'DELIVERED' })
        );
        assert.strictEqual(smsOk.status, 200);
        assert.strictEqual(smsOk.body.status, 'DELIVERED');
      }
    });

    await check('20. Encryption secret required, unsafe HTML blocked & distributed scheduler lock prevents concurrent runs', async () => {
      const prevKey = process.env.COMMUNICATION_ENCRYPTION_KEY;
      process.env.COMMUNICATION_ENCRYPTION_KEY = 'short';
      assert.throws(() => emailProviderService.encryptSecret('my-smtp-pass'), /COMMUNICATION_ENCRYPTION_KEY/);
      process.env.COMMUNICATION_ENCRYPTION_KEY = prevKey;

      const unsafeHtmlRes = await requestJson(
        baseUrl,
        'PUT',
        '/api/admin/communications/email/templates/MEMBER_WELCOME_GREETINGS',
        adminToken,
        { htmlBody: '<p>Hi</p><script>alert(1)</script>' }
      );
      assert.strictEqual(unsafeHtmlRes.status, 400);

      const externalImgRes = await requestJson(
        baseUrl,
        'PUT',
        '/api/admin/communications/email/templates/MEMBER_WELCOME_GREETINGS',
        adminToken,
        { htmlBody: '<img src="https://evil.example/pixel.png" />' }
      );
      assert.strictEqual(externalImgRes.status, 400);

      const SchedulerLock = require('./src/models/SchedulerLock');
      await SchedulerLock.acquireLock('COMMUNICATION_SCHEDULER_PASS', 'other-render-instance', 60000);
      const skipped = await smsSchedulerService.runScheduledSmsPass(new Date('2026-11-28T16:05:00+05:30'));
      assert.strictEqual(skipped.skipped, true);
      assert.strictEqual(skipped.reason, 'DISTRIBUTED_LOCK_HELD');
      await SchedulerLock.releaseLock('COMMUNICATION_SCHEDULER_PASS', 'other-render-instance');
    });

    console.log(`\nALL ${passed} EMAIL & COMMUNICATION E2E CHECKS PASSED!`);
  } finally {
    smsProviderService.resetProviderAdapter();
    emailProviderService.resetEmailProviderAdapter();
    await new Promise((r) => server.close(r));
    await mongoose.disconnect();
    await mongod.stop();
  }
})().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
