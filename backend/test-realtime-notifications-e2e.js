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
const BiometricDeviceLog = require('./src/models/BiometricDeviceLog');
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

const connectSocket = (port, token) =>
  new Promise((resolve, reject) => {
    const socket = ioClient(`http://127.0.0.1:${port}`, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      reconnection: false,
    });
    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Socket connect timeout'));
    }, 5000);
    socket.on('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      socket.disconnect();
      reject(err);
    });
  });

(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-realtime-e2e';
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

    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'super@mm.test',
      phone: '9000000020',
      password: 'Password123!',
      role: 'ADMIN',
      branchId: null,
      status: 'ACTIVE',
    });
    const branchBAdmin = await User.create({
      name: 'Karur Admin',
      email: 'karur@mm.test',
      phone: '9000000021',
      password: 'Password123!',
      role: 'ADMIN',
      branchId: branchB._id,
      status: 'ACTIVE',
    });
    const clientUser = await User.create({
      name: 'Regular Client',
      email: 'client@mm.test',
      phone: '9000000022',
      password: 'Password123!',
      role: 'CLIENT',
      branchId: branchA._id,
      status: 'ACTIVE',
    });

    const adminToken = generateToken(superAdmin._id, 0);
    const branchBToken = generateToken(branchBAdmin._id, 0);
    const clientToken = generateToken(clientUser._id, 0);

    const deviceA = await BiometricDevice.create({
      deviceId: 1,
      deviceName: 'eSSL X2008',
      model: 'eSSL X2008',
      serialNumber: 'X2008KVP999',
      branchId: branchA._id,
      isActive: true,
      status: 'ONLINE',
    });

    const employee = await Employee.create({
      employeeId: 'EMP001',
      fullName: 'Nataraj',
      phone: '9876543210',
      department: 'Operations',
      designation: 'Manager',
      branchId: branchA._id,
      employmentStatus: 'ACTIVE',
      biometricUserId: '101',
      assignedDeviceId: deviceA._id,
      biometricEnrollmentStatus: 'LINKED',
    });

    await BiometricUserMapping.create({
      biometricUserId: '101',
      subjectType: 'EMPLOYEE',
      employeeId: employee._id,
      deviceId: deviceA._id,
      branchId: branchA._id,
      status: 'ACTIVE',
    });

    await check('1. Unauthorized users (no token / CLIENT role) cannot connect to admin Socket.IO', async () => {
      await assert.rejects(() => connectSocket(port, null), /Unauthorized/);
      await assert.rejects(() => connectSocket(port, clientToken), /Forbidden|Unauthorized/);
    });

    const adminSocket = await connectSocket(port, adminToken);
    const branchBSocket = await connectSocket(port, branchBToken);

    const adminEvents = [];
    const branchBEvents = [];
    adminSocket.on('attendance:employee', (e) => adminEvents.push(e));
    branchBSocket.on('attendance:employee', (e) => branchBEvents.push(e));

    await check('2. Employee check-in on eSSL X2008 emits real-time notification to authorized admin only', async () => {
      const res = await request(
        httpServer,
        'POST',
        `/iclock/cdata?SN=${deviceA.serialNumber}&table=ATTLOG`,
        '101\t2026-11-28 09:02:00\t0\t15\t0\t0',
        null,
        true
      );
      assert.strictEqual(res.status, 200);
      await new Promise((r) => setTimeout(r, 200));

      assert.strictEqual(adminEvents.length, 1);
      assert.strictEqual(branchBEvents.length, 0); // Branch B admin must NOT receive Branch A event
      assert.strictEqual(adminEvents[0].title, 'New Employee Check-in');
      assert.strictEqual(adminEvents[0].employeeName, 'Nataraj');
      assert.strictEqual(adminEvents[0].employeeCode, 'EMP001');
      assert.strictEqual(adminEvents[0].branchName, 'Kovilpatti');
      assert.strictEqual(adminEvents[0].eventType, 'CHECK_IN');
    });

    await check('3. Employee check-out emits real-time notification with Check-out title', async () => {
      const res = await request(
        httpServer,
        'POST',
        `/iclock/cdata?SN=${deviceA.serialNumber}&table=ATTLOG`,
        '101\t2026-11-28 18:15:00\t1\t15\t0\t0',
        null,
        true
      );
      assert.strictEqual(res.status, 200);
      await new Promise((r) => setTimeout(r, 200));

      assert.strictEqual(adminEvents.length, 2);
      assert.strictEqual(adminEvents[1].title, 'Employee Check-out');
      assert.strictEqual(adminEvents[1].eventType, 'CHECK_OUT');
    });

    await check('4. Duplicate biometric event produces NO duplicate notification', async () => {
      const res = await request(
        httpServer,
        'POST',
        `/iclock/cdata?SN=${deviceA.serialNumber}&table=ATTLOG`,
        '101\t2026-11-28 09:02:00\t0\t15\t0\t0',
        null,
        true
      );
      assert.strictEqual(res.status, 200);
      await new Promise((r) => setTimeout(r, 200));
      assert.strictEqual(adminEvents.length, 2);
      const count = await AttendanceNotification.countDocuments();
      assert.strictEqual(count, 2);
    });

    await check('5. Unknown biometric ID is logged but emits NO notification', async () => {
      const res = await request(
        httpServer,
        'POST',
        `/iclock/cdata?SN=${deviceA.serialNumber}&table=ATTLOG`,
        '88888\t2026-11-28 09:05:00\t0\t15\t0\t0',
        null,
        true
      );
      assert.strictEqual(res.status, 200);
      await new Promise((r) => setTimeout(r, 200));
      assert.strictEqual(adminEvents.length, 2);
      const log = await BiometricDeviceLog.findOne({ action: 'UNMAPPED_BIOMETRIC_PUNCH' }).lean();
      assert(log);
    });

    await check('6. Socket disconnect and reconnect does NOT resend historical notifications', async () => {
      adminSocket.disconnect();
      const reconnected = await connectSocket(port, adminToken);
      const replayEvents = [];
      reconnected.on('attendance:employee', (e) => replayEvents.push(e));
      await new Promise((r) => setTimeout(r, 200));
      assert.strictEqual(replayEvents.length, 0);
      reconnected.disconnect();
    });

    await check('7. Notification history persists in MongoDB and supports read / read-all / clear', async () => {
      const list1 = await request(httpServer, 'GET', '/api/admin/attendance-notifications', null, adminToken);
      assert.strictEqual(list1.status, 200);
      assert.strictEqual(list1.data.notifications.length, 2);
      assert.strictEqual(list1.data.unreadCount, 2);

      const firstId = list1.data.notifications[0].id;
      const read1 = await request(httpServer, 'PATCH', `/api/admin/attendance-notifications/${firstId}/read`, null, adminToken);
      assert.strictEqual(read1.status, 200);

      const list2 = await request(httpServer, 'GET', '/api/admin/attendance-notifications', null, adminToken);
      assert.strictEqual(list2.data.unreadCount, 1);

      const readAll = await request(httpServer, 'PATCH', '/api/admin/attendance-notifications/read-all', null, adminToken);
      assert.strictEqual(readAll.status, 200);

      const list3 = await request(httpServer, 'GET', '/api/admin/attendance-notifications', null, adminToken);
      assert.strictEqual(list3.data.unreadCount, 0);

      const cleared = await request(httpServer, 'DELETE', '/api/admin/attendance-notifications/clear', null, adminToken);
      assert.strictEqual(cleared.status, 200);

      const list4 = await request(httpServer, 'GET', '/api/admin/attendance-notifications', null, adminToken);
      assert.strictEqual(list4.data.notifications.length, 0);
    });

    branchBSocket.disconnect();
    console.log(`\nALL ${passed} REAL-TIME NOTIFICATION E2E CHECKS PASSED!`);
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
