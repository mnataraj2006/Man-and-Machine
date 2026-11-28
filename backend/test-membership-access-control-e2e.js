const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('./src/server');
const Branch = require('./src/models/Branch');
const ClientProfile = require('./src/models/ClientProfile');
const Membership = require('./src/models/Membership');
const BiometricDevice = require('./src/models/BiometricDevice');
const BiometricEnrollment = require('./src/models/BiometricEnrollment');
const BiometricUserMapping = require('./src/models/BiometricUserMapping');
const Attendance = require('./src/models/Attendance');
const membershipEligibilityService = require('./src/services/membershipEligibilityService');
const biometricEnrollmentService = require('./src/services/biometricEnrollmentService');

const postText = (server, path, body) =>
  new Promise((resolve, reject) => {
    const addr = server.address();
    const payload = Buffer.from(String(body), 'utf8');
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: addr.port,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Content-Length': payload.length,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

(async () => {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));

  let passed = 0;
  const check = (name, fn) =>
    Promise.resolve()
      .then(fn)
      .then(() => {
        passed += 1;
        console.log(`PASS [${passed}]: ${name}`);
      });

  try {
    const branchA = await Branch.create({
      name: 'Man & Machine Kovilpatti',
      city: 'Kovilpatti',
      code: 'KVP',
      address: 'Kovilpatti',
      phone: '9000000010',
      isActive: true,
    });
    const branchB = await Branch.create({
      name: 'Man & Machine Karur',
      city: 'Karur',
      code: 'KRR',
      address: 'Karur',
      phone: '9000000011',
      isActive: true,
    });

    const deviceA = await BiometricDevice.create({
      deviceId: 1,
      deviceName: 'KVP Main Entrance',
      model: 'eSSL X2008',
      serialNumber: 'TDBD242100623',
      branchId: branchA._id,
      isActive: true,
      status: 'ONLINE',
    });

    const client = await ClientProfile.create({
      clientId: 'MM000001',
      name: 'Nataraj',
      phone: '9876543210',
      branchId: branchA._id,
      status: 'ACTIVE',
    });

    const enrollment = await BiometricEnrollment.create({
      clientProfileId: client._id,
      branchId: branchA._id,
      assignedDeviceId: deviceA._id,
      biometricUserId: '1001',
      consentStatus: 'GRANTED',
      status: 'ENROLLED',
      faceEnrollmentStatus: 'ENROLLED',
      accessState: 'ALLOWED',
    });

    await BiometricUserMapping.create({
      biometricUserId: '1001',
      subjectType: 'CLIENT',
      clientProfileId: client._id,
      deviceId: deviceA._id,
      branchId: branchA._id,
      status: 'ACTIVE',
    });

    const activeMembership = await Membership.create({
      clientProfileId: client._id,
      branchId: branchA._id,
      planName: 'Monthly Pro',
      status: 'ACTIVE',
      startDate: new Date(Date.now() - 86400000),
      expiryDate: new Date(Date.now() + 10 * 86400000),
    });

    await check('1. Active member receives ALLOWED access with faceAuthStatus=SUCCESS', async () => {
      const res = await postText(server, '/iclock/cdata?SN=TDBD242100623&table=ATTLOG', '1001\t2026-11-28 09:00:00\t0\t15\t0\t0\n');
      assert.strictEqual(res.status, 200);
      const att = await Attendance.findOne({ clientProfileId: client._id }).sort({ createdAt: -1 }).lean();
      assert.strictEqual(att.faceAuthStatus, 'SUCCESS');
      assert.strictEqual(att.accessDecision, 'ALLOWED');
      assert.strictEqual(att.attendanceStatus, 'SUCCESS');
      assert.strictEqual(att.accessDenialReason, '');
    });

    await check('2. Expired member (even before scheduler runs) is DENIED with MEMBERSHIP_EXPIRED & preserves face enrollment', async () => {
      await Membership.updateOne({ _id: activeMembership._id }, { $set: { expiryDate: new Date(Date.now() - 3600000) } });
      const res = await postText(server, '/iclock/cdata?SN=TDBD242100623&table=ATTLOG', '1001\t2026-11-28 09:05:00\t0\t15\t0\t0\n');
      assert.strictEqual(res.status, 200);
      const att = await Attendance.findOne({ clientProfileId: client._id }).sort({ createdAt: -1 }).lean();
      assert.strictEqual(att.faceAuthStatus, 'SUCCESS');
      assert.strictEqual(att.accessDecision, 'DENIED');
      assert.strictEqual(att.accessDenialReason, 'MEMBERSHIP_EXPIRED');
      assert.strictEqual(att.attendanceStatus, 'FLAGGED_EXPIRED');

      const sweep = await membershipEligibilityService.runMembershipExpirySweep();
      assert.strictEqual(sweep.expiredCount, 1);
      const refreshedMembership = await Membership.findById(activeMembership._id).lean();
      assert.strictEqual(refreshedMembership.status, 'EXPIRED');

      const refreshedEnroll = await BiometricEnrollment.findById(enrollment._id).lean();
      assert.strictEqual(refreshedEnroll.accessState, 'DENIED');
      assert.strictEqual(refreshedEnroll.accessDenialReason, 'MEMBERSHIP_EXPIRED');
      assert.strictEqual(refreshedEnroll.status, 'ENROLLED');
      assert.strictEqual(refreshedEnroll.faceEnrollmentStatus, 'ENROLLED');
      assert.strictEqual(refreshedEnroll.biometricUserId, '1001');
    });

    await check('3. Suspended / Paused member is DENIED (MEMBERSHIP_SUSPENDED)', async () => {
      const m2 = await Membership.create({
        clientProfileId: client._id,
        branchId: branchA._id,
        planName: 'Monthly Pro',
        status: 'PAUSED',
        startDate: new Date(Date.now() - 86400000),
        expiryDate: new Date(Date.now() + 10 * 86400000),
      });
      const res = await postText(server, '/iclock/cdata?SN=TDBD242100623&table=ATTLOG', '1001\t2026-11-28 09:10:00\t0\t15\t0\t0\n');
      assert.strictEqual(res.status, 200);
      const att = await Attendance.findOne({ clientProfileId: client._id }).sort({ createdAt: -1 }).lean();
      assert.strictEqual(att.accessDecision, 'DENIED');
      assert.strictEqual(att.accessDenialReason, 'MEMBERSHIP_SUSPENDED');
      await Membership.deleteOne({ _id: m2._id });
    });

    await check('4. Cancelled member is DENIED (MEMBERSHIP_CANCELLED)', async () => {
      const m3 = await Membership.create({
        clientProfileId: client._id,
        branchId: branchA._id,
        planName: 'Monthly Pro',
        status: 'CANCELLED',
        startDate: new Date(Date.now() - 86400000),
        expiryDate: new Date(Date.now() + 10 * 86400000),
      });
      const res = await postText(server, '/iclock/cdata?SN=TDBD242100623&table=ATTLOG', '1001\t2026-11-28 09:15:00\t0\t15\t0\t0\n');
      assert.strictEqual(res.status, 200);
      const att = await Attendance.findOne({ clientProfileId: client._id }).sort({ createdAt: -1 }).lean();
      assert.strictEqual(att.accessDecision, 'DENIED');
      assert.strictEqual(att.accessDenialReason, 'MEMBERSHIP_CANCELLED');
      await Membership.deleteOne({ _id: m3._id });
    });

    await check('5. Unpaid (PENDING_PAYMENT) membership is DENIED (PAYMENT_PENDING)', async () => {
      const m4 = await Membership.create({
        clientProfileId: client._id,
        branchId: branchA._id,
        planName: 'Monthly Pro',
        status: 'PENDING_PAYMENT',
        startDate: new Date(Date.now() - 86400000),
        expiryDate: new Date(Date.now() + 10 * 86400000),
      });
      const res = await postText(server, '/iclock/cdata?SN=TDBD242100623&table=ATTLOG', '1001\t2026-11-28 09:20:00\t0\t15\t0\t0\n');
      assert.strictEqual(res.status, 200);
      const att = await Attendance.findOne({ clientProfileId: client._id }).sort({ createdAt: -1 }).lean();
      assert.strictEqual(att.accessDecision, 'DENIED');
      assert.strictEqual(att.accessDenialReason, 'PAYMENT_PENDING');
      await Membership.deleteOne({ _id: m4._id });
    });

    await check('6. Renewal / new active membership restores access, reuses PIN 1001 & face enrollment, no duplicates', async () => {
      await Membership.create({
        clientProfileId: client._id,
        branchId: branchA._id,
        planName: 'Quarterly Pro',
        status: 'ACTIVE',
        startDate: new Date(Date.now() - 86400000),
        expiryDate: new Date(Date.now() + 90 * 86400000),
      });
      const init1 = await biometricEnrollmentService.autoInitiateBiometricEnrollment({
        clientProfileId: client._id,
        branchId: branchA._id,
        consentAgreed: true,
      });
      const init2 = await biometricEnrollmentService.autoInitiateBiometricEnrollment({
        clientProfileId: client._id,
        branchId: branchA._id,
        consentAgreed: true,
      });
      assert.strictEqual(init1.idempotentReused, true);
      assert.strictEqual(init2.idempotentReused, true);
      assert.strictEqual(await BiometricEnrollment.countDocuments({ clientProfileId: client._id }), 1);
      assert.strictEqual(await BiometricUserMapping.countDocuments({ clientProfileId: client._id }), 1);

      const refreshedEnroll = await BiometricEnrollment.findById(enrollment._id).lean();
      assert.strictEqual(refreshedEnroll.accessState, 'ALLOWED');
      assert.strictEqual(refreshedEnroll.accessDenialReason, '');
      assert.strictEqual(refreshedEnroll.biometricUserId, '1001');
      assert.strictEqual(refreshedEnroll.faceEnrollmentStatus, 'ENROLLED');

      const res = await postText(server, '/iclock/cdata?SN=TDBD242100623&table=ATTLOG', '1001\t2026-11-28 09:25:00\t0\t15\t0\t0\n');
      assert.strictEqual(res.status, 200);
      const att = await Attendance.findOne({ clientProfileId: client._id }).sort({ createdAt: -1 }).lean();
      assert.strictEqual(att.accessDecision, 'ALLOWED');
      assert.strictEqual(att.attendanceStatus, 'SUCCESS');
    });

    await check('7. Branch mismatch is DENIED (BRANCH_MISMATCH) & attendance history remains intact', async () => {
      const branchCheck = await membershipEligibilityService.evaluateClientMembershipEligibility(client, { branchId: branchB._id });
      assert.strictEqual(branchCheck.eligible, false);
      assert.strictEqual(branchCheck.reason, 'BRANCH_MISMATCH');
      assert.strictEqual(await Attendance.countDocuments({ clientProfileId: client._id }), 6);
    });

    console.log(`\nALL ${passed} MEMBERSHIP ACCESS CONTROL E2E CHECKS PASSED!`);
  } finally {
    server.close();
    await mongoose.disconnect();
    await mongod.stop();
  }
})().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
