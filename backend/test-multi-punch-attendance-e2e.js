const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { io: ioClient } = require('../frontend/node_modules/socket.io-client');

const app = require('./src/server');
const { initSocketServer, closeSocketServer } = require('./src/services/socketService');
const User = require('./src/models/User');
const Branch = require('./src/models/Branch');
const BiometricDevice = require('./src/models/BiometricDevice');
const BiometricUserMapping = require('./src/models/BiometricUserMapping');
const Attendance = require('./src/models/Attendance');
const AttendanceNotification = require('./src/models/AttendanceNotification');
const Employee = require('./src/models/Employee');
const generateToken = require('./src/utils/generateToken');

const request = (server, method, path, body = null, token = null, isText = false) =>
  new Promise((resolve, reject) => {
    const addr = server.address();
    const payload = body ? (isText ? String(body) : JSON.stringify(body)) : null;
    const headers = {};
    if (payload) {
      headers['Content-Type'] = isText ? 'text/plain' : 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (token) headers.Authorization = `Bearer ${token}`;

    const req = http.request(
      { hostname: '127.0.0.1', port: addr.port, path, method, headers },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let parsed = raw;
          if (!isText) {
            try {
              parsed = JSON.parse(raw);
            } catch {
              // keep raw
            }
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });

(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-multipunch-e2e';
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  await Promise.all([
    Employee.init(),
    BiometricUserMapping.init(),
    Attendance.init(),
    AttendanceNotification.init(),
  ]);

  const httpServer = http.createServer(app);
  initSocketServer(httpServer, { origin: '*' });
  await new Promise((r) => httpServer.listen(0, '127.0.0.1', r));
  const port = httpServer.address().port;

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

    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@mm.test',
      phone: '9000000099',
      password: 'Password123!',
      role: 'ADMIN',
      branchId: null,
      status: 'ACTIVE',
    });
    const adminToken = generateToken(admin._id, 0);

    const device = await BiometricDevice.create({
      deviceId: 1,
      deviceName: 'eSSL X2008',
      model: 'eSSL X2008',
      serialNumber: 'X2008MULTI001',
      branchId: branch._id,
      isActive: true,
      status: 'ONLINE',
    });

    const emp1 = await Employee.create({
      employeeId: 'EMP001',
      fullName: 'Nataraj',
      phone: '9876543210',
      department: 'Operations',
      designation: 'Manager',
      branchId: branch._id,
      employmentStatus: 'ACTIVE',
      biometricUserId: '101',
      assignedDeviceId: device._id,
      biometricEnrollmentStatus: 'LINKED',
    });

    await BiometricUserMapping.create({
      biometricUserId: '101',
      subjectType: 'EMPLOYEE',
      employeeId: emp1._id,
      deviceId: device._id,
      branchId: branch._id,
      status: 'ACTIVE',
    });

    const socket = ioClient(`http://127.0.0.1:${port}`, {
      auth: { token: adminToken },
      transports: ['websocket'],
      reconnection: false,
    });
    await new Promise((resolve, reject) => {
      socket.on('connect', resolve);
      socket.on('connect_error', reject);
    });
    const socketEvents = [];
    socket.on('attendance:employee', (e) => socketEvents.push(e));

    const pushAdms = (line) =>
      request(httpServer, 'POST', `/iclock/cdata?SN=${device.serialNumber}&table=ATTLOG`, line, null, true);

    await check('1. Multiple IN/OUT punches on the same day (09:00, 12:30, 13:15, 17:30, 19:00, 20:00) are ALL accepted', async () => {
      const lines = [
        '101\t2026-11-28 09:00:00\t0\t15\t0\t0', // IN
        '101\t2026-11-28 12:30:00\t1\t15\t0\t0', // OUT
        '101\t2026-11-28 13:15:00\t0\t15\t0\t0', // IN
        '101\t2026-11-28 17:30:00\t1\t15\t0\t0', // OUT
        '101\t2026-11-28 19:00:00\t0\t15\t0\t0', // IN
        '101\t2026-11-28 20:00:00\t1\t15\t0\t0', // OUT
      ];
      for (const l of lines) {
        const res = await pushAdms(l);
        assert.strictEqual(res.status, 200);
      }
      await new Promise((r) => setTimeout(r, 250));

      const records = await Attendance.find({ employeeId: emp1._id }).sort({ checkInTime: 1 }).lean();
      assert.strictEqual(records.length, 6);
      assert.strictEqual(socketEvents.length, 6);
    });

    await check('2. Exact ADMS retransmission produces NO duplicate attendance record and NO duplicate notification', async () => {
      const retryRes = await pushAdms('101\t2026-11-28 13:15:00\t0\t15\t0\t0');
      assert.strictEqual(retryRes.status, 200);
      await new Promise((r) => setTimeout(r, 200));

      const records = await Attendance.find({ employeeId: emp1._id }).lean();
      const notifs = await AttendanceNotification.find({ employeeId: emp1._id }).lean();
      assert.strictEqual(records.length, 6);
      assert.strictEqual(notifs.length, 6);
      assert.strictEqual(socketEvents.length, 6);
    });

    await check('3. Daily attendance summary calculates 3 valid IN/OUT work sessions (8h 45m total)', async () => {
      const ovRes = await request(httpServer, 'GET', '/api/admin/attendance?date=2026-11-28', null, adminToken);
      assert.strictEqual(ovRes.status, 200);
      assert.strictEqual(ovRes.data.count, 6);
      assert.strictEqual(ovRes.data.dailySummaries.length, 1);

      const summary = ovRes.data.dailySummaries[0];
      assert.strictEqual(summary.entriesCount, 3);
      assert.strictEqual(summary.exitsCount, 3);
      assert.strictEqual(summary.sessions.length, 3);
      assert.strictEqual(summary.totalWorkedMinutes, 525); // 210 + 255 + 60 = 525 mins = 8h 45m
      assert.strictEqual(summary.formattedTotalWorked, '8h 45m');
      assert.strictEqual(summary.hasAnomalies, false);
    });

    await check('4. Manual POST /api/admin/attendance allows multiple punches per day & correction adds audit trail', async () => {
      const m1 = await request(
        httpServer,
        'POST',
        '/api/admin/attendance',
        {
          employeeId: emp1._id,
          branchId: branch._id,
          date: '2026-11-28',
          checkInTime: '2026-11-28T21:00:00+05:30',
          eventType: 'CHECK_IN',
        },
        adminToken
      );
      assert.strictEqual(m1.status, 201);

      // Consecutive CHECK_IN without CHECK_OUT triggers anomaly flag
      const m2 = await request(
        httpServer,
        'POST',
        '/api/admin/attendance',
        {
          employeeId: emp1._id,
          branchId: branch._id,
          date: '2026-11-28',
          checkInTime: '2026-11-28T21:30:00+05:30',
          eventType: 'CHECK_IN',
        },
        adminToken
      );
      assert.strictEqual(m2.status, 201);

      const ovRes = await request(httpServer, 'GET', '/api/admin/attendance?date=2026-11-28', null, adminToken);
      const summary = ovRes.data.dailySummaries[0];
      assert.strictEqual(summary.hasAnomalies, true);
      assert(summary.flags.includes('CONSECUTIVE_CHECK_IN'));
      assert(summary.flags.includes('OPEN_CHECK_IN'));

      // Admin corrects the 2nd punch direction to CHECK_OUT with audit reason
      const corrRes = await request(
        httpServer,
        'PUT',
        `/api/admin/attendance/${m2.data.record._id}`,
        { eventType: 'CHECK_OUT', reason: 'Employee actually exited at 21:30' },
        adminToken
      );
      assert.strictEqual(corrRes.status, 200);
      assert.strictEqual(corrRes.data.record.eventType, 'CHECK_OUT');
      assert.strictEqual(corrRes.data.record.correctionHistory.length, 1);
      assert.strictEqual(corrRes.data.record.correctionHistory[0].previousEventType, 'CHECK_IN');
      assert.strictEqual(corrRes.data.record.correctionHistory[0].newEventType, 'CHECK_OUT');
    });

    socket.disconnect();
    console.log(`\nALL ${passed} MULTI-PUNCH & DUPLICATE DETECTION E2E CHECKS PASSED!`);
  } finally {
    await closeSocketServer();
    httpServer.close();
    await mongoose.disconnect();
    await mongod.stop();
  }
})().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
