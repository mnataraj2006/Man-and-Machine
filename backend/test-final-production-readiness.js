const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-final-prod-readiness-secret';
process.env.COMMUNICATION_ENCRYPTION_KEY =
  process.env.COMMUNICATION_ENCRYPTION_KEY || 'test-communication-encryption-secret-key';

const app = require('./src/server');
const User = require('./src/models/User');
const Branch = require('./src/models/Branch');
const ClientProfile = require('./src/models/ClientProfile');
const Membership = require('./src/models/Membership');
const BiometricDevice = require('./src/models/BiometricDevice');
const BiometricEnrollment = require('./src/models/BiometricEnrollment');
const BiometricConsent = require('./src/models/BiometricConsent');
const BiometricDeviceSyncJob = require('./src/models/BiometricDeviceSyncJob');
const SchedulerLock = require('./src/models/SchedulerLock');
const SmsLog = require('./src/models/SmsLog');
const EmailLog = require('./src/models/EmailLog');

const biometricEnrollmentService = require('./src/services/biometricEnrollmentService');
const biometricDeviceSyncService = require('./src/services/biometricDeviceSyncService');
const biometricDeviceService = require('./src/services/biometricDeviceService');
const smsProviderService = require('./src/services/smsProviderService');
const emailProviderService = require('./src/services/emailProviderService');
const communicationService = require('./src/services/communicationService');
const smsSchedulerService = require('./src/services/smsSchedulerService');
const { ALL_SMS_NOTIFICATIONS } = require('./src/utils/smsCatalog');

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
  await SmsLog.init();
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const sentSms = [];
  const sentEmails = [];
  smsProviderService.setProviderAdapterForTests(async (p) => {
    sentSms.push(p);
    return { ok: true, status: 'SENT', providerMessageId: `sms-t-${sentSms.length}`, providerResponse: 'OK' };
  });
  emailProviderService.setEmailProviderAdapterForTests(async (p) => {
    sentEmails.push(p);
    return { ok: true, status: 'SENT', providerMessageId: `email-t-${sentEmails.length}`, providerResponse: '250 OK' };
  });

  let passed = 0;
  const check = async (name, fn) => {
    await fn();
    passed += 1;
    console.log(`PASS [${passed}]: ${name}`);
  };

  try {
    const branch = await Branch.create({ name: 'Kovilpatti Main', city: 'Kovilpatti', code: 'KVP' });
    const adminUser = await User.create({
      name: 'Admin',
      email: 'admin@prod.test',
      phone: '9876543210',
      password: 'Password123!',
      role: 'ADMIN',
      branchId: branch._id,
    });
    const clientUser = await User.create({
      name: 'Karthik Raj',
      email: 'karthik@prod.test',
      phone: '9876501111',
      password: 'Password123!',
      role: 'CLIENT',
      branchId: branch._id,
    });
    const clientProfile = await ClientProfile.create({
      clientId: 'MM000301',
      userId: clientUser._id,
      branchId: branch._id,
      name: 'Karthik Raj',
      phone: '9876501111',
      email: 'karthik@prod.test',
    });
    await Membership.create({
      clientProfileId: clientProfile._id,
      userId: clientUser._id,
      branchId: branch._id,
      planName: 'Annual Pro',
      status: 'ACTIVE',
      startDate: new Date(Date.now() - 86400000),
      expiryDate: new Date(Date.now() + 30 * 86400000),
    });

    const adminToken = jwt.sign({ id: adminUser._id, role: 'ADMIN' }, process.env.JWT_SECRET);

    await check('1. Biometric authorization requires explicit acknowledgment & records audit without browser capture', async () => {
      let rejected = false;
      try {
        await biometricEnrollmentService.submitMobileCapture(clientUser._id, { agreed: false });
      } catch (e) {
        rejected = e.statusCode === 400;
      }
      assert(rejected, 'Must reject request when authorization is not acknowledged');

      const enr = await biometricEnrollmentService.submitMobileCapture(clientUser._id, {
        agreed: true,
        ipAddress: '127.0.0.1',
      });
      assert.strictEqual(enr.status, 'PENDING_REVIEW');
      assert.strictEqual(enr.faceEnrollmentStatus, 'PENDING');
      assert.strictEqual(enr.consentStatus, 'GRANTED');
      assert(enr.history.some((h) => h.action === 'ENROLLMENT_REQUEST_SUBMITTED' && String(h.actorUserId) === String(clientUser._id)));
      const consent = await BiometricConsent.findOne({ clientProfileId: clientProfile._id, status: 'GRANTED' }).lean();
      assert(consent && consent.consentedAt);
    });

    await check('2. ACKNOWLEDGED sync & missing device name never mark DEVICE_USER_READY or FACE_ENROLLED; OPERLOG name match promotes cleanly', async () => {
      process.env.BIOMETRIC_REMOTE_USER_SYNC = 'true';
      const device = await BiometricDevice.create({
        deviceId: 901,
        deviceName: 'KVP Terminal',
        serialNumber: 'X2008-TEST-01',
        branchId: branch._id,
        supportsRemoteEnrollment: true,
        isActive: true,
      });

      const enr = await BiometricEnrollment.findOne({ clientProfileId: clientProfile._id });
      enr.assignedDeviceId = device._id;
      enr.biometricUserId = '1050';
      enr.status = 'AWAITING_PHYSICAL_ENROLLMENT';
      await enr.save();

      // 2a. Remote adapter returns ok: true, verified: false -> ACKNOWLEDGED must NOT mark DEVICE_USER_READY
      const ackRes = await biometricDeviceSyncService.syncEnrollmentDeviceUser({
        enrollment: enr,
        device,
        clientProfile,
        adminUser,
        remoteAdapter: async () => ({ ok: true, verified: false, responseStatus: 'QUEUED' }),
      });
      assert.strictEqual(ackRes.job.status, 'ACKNOWLEDGED');
      assert.strictEqual(ackRes.enrollment.status, 'AWAITING_PHYSICAL_ENROLLMENT');
      assert.strictEqual(ackRes.enrollment.faceEnrollmentStatus, 'PENDING');

      // 2b. OPERLOG without Name must NOT promote to DEVICE_USER_READY
      await biometricDeviceService.handleAdmsOperLog('X2008-TEST-01', 'USER PIN=1050\tPri=0');
      const afterNameless = await BiometricEnrollment.findById(enr._id).lean();
      assert.strictEqual(afterNameless.status, 'AWAITING_PHYSICAL_ENROLLMENT');

      // 2c. OPERLOG with matching Name promotes ACKNOWLEDGED -> VERIFIED and DEVICE_USER_READY, still faceEnrollmentStatus: PENDING
      await biometricDeviceService.handleAdmsOperLog('X2008-TEST-01', 'USER PIN=1050\tName=Karthik Raj\tPri=0');
      const afterNamed = await BiometricEnrollment.findById(enr._id).lean();
      assert.strictEqual(afterNamed.status, 'DEVICE_USER_READY');
      assert.strictEqual(afterNamed.faceEnrollmentStatus, 'PENDING');
      delete process.env.BIOMETRIC_REMOTE_USER_SYNC;
    });

    await check('3. Distributed scheduler lock fencing token, renewal, stale-owner protection & concurrent execution', async () => {
      const lock1 = await SchedulerLock.acquireLock('TEST_FENCE_LOCK', 'instance-A', 60000);
      assert(lock1 && lock1.fencingToken === 1);

      const blocked = await SchedulerLock.acquireLock('TEST_FENCE_LOCK', 'instance-B', 60000);
      assert.strictEqual(blocked, null);

      const renewed = await SchedulerLock.renewLock('TEST_FENCE_LOCK', 'instance-A', 1, 60000);
      assert(renewed && renewed.fencingToken === 1);

      // Force expiry, then instance-B acquires with fencingToken 2
      await SchedulerLock.updateOne({ lockKey: 'TEST_FENCE_LOCK' }, { $set: { lockedUntil: new Date(0) } });
      const lock2 = await SchedulerLock.acquireLock('TEST_FENCE_LOCK', 'instance-B', 60000);
      assert(lock2 && lock2.fencingToken === 2);

      // Stale instance-A (token 1) cannot renew or release instance-B's lock
      const staleRenew = await SchedulerLock.renewLock('TEST_FENCE_LOCK', 'instance-A', 1, 60000);
      assert.strictEqual(staleRenew, null);
      await SchedulerLock.releaseLock('TEST_FENCE_LOCK', 'instance-A', 1);
      const stillHeldByB = await SchedulerLock.findOne({ lockKey: 'TEST_FENCE_LOCK' }).lean();
      assert.strictEqual(stillHeldByB.ownerId, 'instance-B');
      await SchedulerLock.releaseLock('TEST_FENCE_LOCK', 'instance-B', 2);

      // Concurrent runScheduledSmsPass calls
      const [r1, r2] = await Promise.all([
        smsSchedulerService.runScheduledSmsPass(new Date('2026-11-28T16:10:00+05:30')),
        smsSchedulerService.runScheduledSmsPass(new Date('2026-11-28T16:10:00+05:30')),
      ]);
      const skippedCount = [r1, r2].filter((r) => r.skipped).length;
      assert.strictEqual(skippedCount, 1, 'Exactly one concurrent scheduler pass should be skipped');
    });

    await check('4. Notification toggle matrix (4 states) & independent channel failure isolation', async () => {
      const matrix = [
        { sms: true, email: false, expectSms: 1, expectEmail: 0 },
        { sms: false, email: true, expectSms: 0, expectEmail: 1 },
        { sms: true, email: true, expectSms: 1, expectEmail: 1 },
        { sms: false, email: false, expectSms: 0, expectEmail: 0 },
      ];
      for (let i = 0; i < matrix.length; i += 1) {
        const m = matrix[i];
        await requestJson(baseUrl, 'PUT', '/api/admin/communications/settings', adminToken, {
          smsEnabled: true,
          emailEnabled: true,
          memberNotifications: { MEMBER_WELCOME_GREETINGS: m.sms },
          emailMemberNotifications: { MEMBER_WELCOME_GREETINGS: m.email },
        });
        const s0 = sentSms.length;
        const e0 = sentEmails.length;
        await communicationService.dispatchBothChannels({
          smsPayload: {
            notificationKey: 'MEMBER_WELCOME_GREETINGS',
            recipientPhone: clientProfile.phone,
            recipientName: clientProfile.name,
            recipientType: 'MEMBER',
            variables: { memberName: 'Karthik', memberId: 'MM000301', branchName: 'Kovilpatti' },
            eventKey: `matrix-sms-${i}`,
          },
          emailPayload: {
            notificationKey: 'MEMBER_WELCOME_GREETINGS',
            recipientEmail: clientProfile.email,
            recipientName: clientProfile.name,
            recipientType: 'MEMBER',
            variables: { memberName: 'Karthik', memberId: 'MM000301', branchName: 'Kovilpatti' },
            eventKey: `matrix-email-${i}`,
          },
        });
        assert.strictEqual(sentSms.length - s0, m.expectSms);
        assert.strictEqual(sentEmails.length - e0, m.expectEmail);
      }

      // Independent failure: SMS fails, Email still succeeds
      smsProviderService.setProviderAdapterForTests(async () => ({
        ok: false,
        code: 'PROVIDER_ERROR',
        error: 'Simulated SMS outage',
      }));
      await requestJson(baseUrl, 'PUT', '/api/admin/communications/settings', adminToken, {
        memberNotifications: { MEMBER_WELCOME_GREETINGS: true },
        emailMemberNotifications: { MEMBER_WELCOME_GREETINGS: true },
      });
      const emailBefore = sentEmails.length;
      const res = await communicationService.dispatchBothChannels({
        smsPayload: {
          notificationKey: 'MEMBER_WELCOME_GREETINGS',
          recipientPhone: clientProfile.phone,
          recipientName: clientProfile.name,
          recipientType: 'MEMBER',
          variables: { memberName: 'Karthik', memberId: 'MM000301', branchName: 'Kovilpatti' },
          eventKey: 'fail-iso-sms',
        },
        emailPayload: {
          notificationKey: 'MEMBER_WELCOME_GREETINGS',
          recipientEmail: clientProfile.email,
          recipientName: clientProfile.name,
          recipientType: 'MEMBER',
          variables: { memberName: 'Karthik', memberId: 'MM000301', branchName: 'Kovilpatti' },
          eventKey: 'fail-iso-email',
        },
      });
      assert.strictEqual(res.sms.ok, false);
      assert.strictEqual(res.email.ok, true);
      assert.strictEqual(sentEmails.length, emailBefore + 1);
    });

    await check('5. Catalog operational vs unavailable counts (38 / 7) & safe Admin-only Test SMS / Test Email', async () => {
      const supportedCount = ALL_SMS_NOTIFICATIONS.filter((n) => n.supported !== false).length;
      const unsupportedItems = ALL_SMS_NOTIFICATIONS.filter((n) => n.supported === false);
      assert.strictEqual(supportedCount, 38);
      assert.strictEqual(unsupportedItems.length, 7);

      // Even if toggled ON, unsupported notifications must never send
      const smsService = require('./src/services/smsService');
      const emailService = require('./src/services/emailService');
      const sBeforeGuard = sentSms.length;
      const eBeforeGuard = sentEmails.length;
      for (const item of unsupportedItems) {
        const sRes = await smsService.sendNotification({
          notificationKey: item.key,
          recipientPhone: clientProfile.phone,
          recipientName: clientProfile.name,
          recipientType: item.audience === 'MEMBER' ? 'MEMBER' : 'OWNER',
        });
        const eRes = await emailService.sendEmailNotification({
          notificationKey: item.key,
          recipientEmail: clientProfile.email,
          recipientName: clientProfile.name,
          recipientType: item.audience === 'MEMBER' ? 'MEMBER' : 'OWNER',
        });
        assert.strictEqual(sRes.reason, 'UNSUPPORTED_NOTIFICATION');
        assert.strictEqual(eRes.reason, 'UNSUPPORTED_NOTIFICATION');
      }
      assert.strictEqual(sentSms.length, sBeforeGuard);
      assert.strictEqual(sentEmails.length, eBeforeGuard);

      smsProviderService.setProviderAdapterForTests(async (p) => {
        sentSms.push(p);
        return { ok: true, status: 'SENT', providerMessageId: 'single-test-sms', providerResponse: 'OK' };
      });
      const sBefore = sentSms.length;
      const smsTest = await requestJson(baseUrl, 'POST', '/api/admin/communications/test', adminToken, {
        toPhone: '9876501111',
      });
      assert.strictEqual(smsTest.status, 200);
      assert.strictEqual(smsTest.body.status, 'SENT');
      assert.strictEqual(sentSms.length, sBefore + 1);

      const eBefore = sentEmails.length;
      const emailTest = await requestJson(baseUrl, 'POST', '/api/admin/communications/email/send-test', adminToken, {
        toEmail: 'karthik@prod.test',
      });
      assert.strictEqual(emailTest.status, 200);
      assert.strictEqual(emailTest.body.status, 'SENT');
      assert.strictEqual(sentEmails.length, eBefore + 1);
    });

    console.log(`\nALL ${passed} FINAL PRODUCTION-READINESS CHECKS PASSED!`);
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
