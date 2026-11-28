const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('./src/server');
const Branch = require('./src/models/Branch');
const ClientProfile = require('./src/models/ClientProfile');
const BiometricDevice = require('./src/models/BiometricDevice');
const BiometricEnrollment = require('./src/models/BiometricEnrollment');
const BiometricUserMapping = require('./src/models/BiometricUserMapping');
const Attendance = require('./src/models/Attendance');

const postText = (server, path, body) =>
  new Promise((resolve, reject) => {
    const addr = server.address();
    const payload = String(body || '');
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: addr.port,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => resolve({ status: res.statusCode, body: raw }));
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

(async () => {
  process.env.NODE_ENV = 'test';
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all([Attendance.init(), BiometricUserMapping.init()]);

  const server = app.listen(0);
  let passed = 0;
  const check = (name, fn) =>
    Promise.resolve()
      .then(fn)
      .then(() => {
        passed += 1;
        console.log(`PASS [${passed}]: ${name}`);
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

    const device = await BiometricDevice.create({
      deviceId: 1,
      deviceName: 'KVP Terminal',
      model: 'eSSL X2008',
      serialNumber: 'TDBD242100623',
      branchId: branch._id,
      isActive: true,
      status: 'ONLINE',
    });

    const client = await ClientProfile.create({
      clientId: 'MM001001',
      name: 'Client 1001',
      phone: '9876541001',
      branchId: branch._id,
      status: 'ACTIVE',
    });

    const enrollment = await BiometricEnrollment.create({
      clientProfileId: client._id,
      branchId: branch._id,
      assignedDeviceId: device._id,
      biometricUserId: '1001',
      consentStatus: 'GRANTED',
      status: 'ENROLLED',
    });

    await BiometricUserMapping.create({
      biometricUserId: '1001',
      subjectType: 'CLIENT',
      clientProfileId: client._id,
      deviceId: device._id,
      branchId: branch._id,
      status: 'ACTIVE',
    });

    await check('1. Valid ATTLOG with table=ATTLOG creates attendance for user 1001', async () => {
      const res = await postText(
        server,
        '/iclock/cdata?SN=TDBD242100623&table=ATTLOG',
        '1001\t2026-11-28 09:00:00\t0\t15\t0\t0\n'
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body, 'OK: 1');
      const count = await Attendance.countDocuments({ clientProfileId: client._id });
      assert.strictEqual(count, 1);
    });

    await check('2. Valid ATTLOG without table parameter is safely recognized and processed', async () => {
      const res = await postText(
        server,
        '/iclock/cdata?SN=TDBD242100623',
        '1001\t2026-11-28 09:10:00\t0\t15\t0\t0\n'
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body, 'OK: 1');
      const count = await Attendance.countDocuments({ clientProfileId: client._id });
      assert.strictEqual(count, 2);
    });

    await check('3. OPERLOG (explicit or without table) does NOT create attendance', async () => {
      const r1 = await postText(
        server,
        '/iclock/cdata?SN=TDBD242100623&table=OPERLOG',
        'OPLOG 1\t1\t2026-11-28 09:15:00\t0\nUserCount=10\n'
      );
      assert.strictEqual(r1.status, 200);

      const r2 = await postText(
        server,
        '/iclock/cdata?SN=TDBD242100623',
        'USER PIN=1001\tName=Client\tPri=0\n'
      );
      assert.strictEqual(r2.status, 200);

      const count = await Attendance.countDocuments({ clientProfileId: client._id });
      assert.strictEqual(count, 2);
    });

    await check('4. Duplicate ATTLOG event does NOT create duplicate attendance', async () => {
      const res = await postText(
        server,
        '/iclock/cdata?SN=TDBD242100623&table=ATTLOG',
        '1001\t2026-11-28 09:10:00\t0\t15\t0\t0\n'
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body, 'OK: 1');
      const count = await Attendance.countDocuments({ clientProfileId: client._id });
      assert.strictEqual(count, 2);
    });

    await check('4b. Rapid camera bounce ATTLOG within 30s (2s later) does NOT create duplicate attendance', async () => {
      const res = await postText(
        server,
        '/iclock/cdata?SN=TDBD242100623&table=ATTLOG',
        '1001\t2026-11-28 09:10:02\t0\t15\t0\t0\n'
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body, 'OK: 1');
      const count = await Attendance.countDocuments({ clientProfileId: client._id });
      assert.strictEqual(count, 2);
    });

    await check('5. Consent restriction remains enforced when consent is not GRANTED', async () => {
      await BiometricEnrollment.updateOne({ _id: enrollment._id }, { $set: { consentStatus: 'WITHDRAWN' } });
      const res = await postText(
        server,
        '/iclock/cdata?SN=TDBD242100623&table=ATTLOG',
        '1001\t2026-11-28 09:20:00\t0\t15\t0\t0\n'
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body, 'OK: 0');
      const count = await Attendance.countDocuments({ clientProfileId: client._id });
      assert.strictEqual(count, 2);
    });

    await check('6. GET /iclock/getrequest.aspx updates lastSeenAt -> ONLINE; stale timeout -> OFFLINE; invalid SN -> 404', async () => {
      const biometricDeviceService = require('./src/services/biometricDeviceService');
      const staleTime = new Date(Date.now() - 10 * 60 * 1000);
      await BiometricDevice.updateOne({ _id: device._id }, { $set: { lastSeenAt: staleTime, status: 'OFFLINE' } });

      const offlineOverview = await biometricDeviceService.getDevicesOverview({});
      assert.strictEqual(offlineOverview.devices[0].effectiveStatus, 'OFFLINE');

      const addr = server.address();
      const pollRes = await new Promise((resolve, reject) => {
        http
          .get(`http://127.0.0.1:${addr.port}/iclock/getrequest.aspx?SN=TDBD242100623`, (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
          })
          .on('error', reject);
      });
      assert.strictEqual(pollRes.status, 200);
      assert.strictEqual(pollRes.body, 'OK');

      const onlineOverview = await biometricDeviceService.getDevicesOverview({});
      assert.strictEqual(onlineOverview.devices[0].effectiveStatus, 'ONLINE');
      const recordedSeenAt = new Date(onlineOverview.devices[0].lastSeenAt).getTime();
      assert(recordedSeenAt > staleTime.getTime());

      const badRes = await new Promise((resolve, reject) => {
        http
          .get(`http://127.0.0.1:${addr.port}/iclock/getrequest.aspx?SN=UNKNOWN999`, (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
          })
          .on('error', reject);
      });
      assert.strictEqual(badRes.status, 404);
      const unchanged = await BiometricDevice.findById(device._id).lean();
      assert.strictEqual(new Date(unchanged.lastSeenAt).getTime(), recordedSeenAt);
    });

    console.log(`\nALL ${passed} ADMS TABLE MISMATCH BACKEND E2E CHECKS PASSED!`);
  } finally {
    server.close();
    await mongoose.disconnect();
    await mongod.stop();
  }
})().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
