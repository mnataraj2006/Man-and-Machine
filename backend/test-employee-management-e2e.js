const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('./src/server');
const User = require('./src/models/User');
const Branch = require('./src/models/Branch');
const ClientProfile = require('./src/models/ClientProfile');
const BiometricDevice = require('./src/models/BiometricDevice');
const BiometricEnrollment = require('./src/models/BiometricEnrollment');
const BiometricUserMapping = require('./src/models/BiometricUserMapping');
const BiometricDeviceLog = require('./src/models/BiometricDeviceLog');
const Attendance = require('./src/models/Attendance');
const Employee = require('./src/models/Employee');
const generateToken = require('./src/utils/generateToken');
const biometricDeviceService = require('./src/services/biometricDeviceService');

const request = (server, method, path, body = null, token = null, isText = false) =>
  new Promise((resolve, reject) => {
    const addr = server.address();
    const payload = body
      ? isText
        ? String(body)
        : JSON.stringify(body)
      : null;

    const headers = {};
    if (payload) {
      headers['Content-Type'] = isText ? 'text/plain' : 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: addr.port,
        path,
        method,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
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
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-employee-e2e';
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  // Ensure indexes are built
  await Promise.all([
    Employee.init(),
    BiometricUserMapping.init(),
    Attendance.init(),
  ]);

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
    const branchA = await Branch.create({
      name: 'Man & Machine Kovilpatti',
      city: 'Kovilpatti',
      code: 'KVP',
      address: 'Main Road, Kovilpatti',
      phone: '9876543210',
      isActive: true,
    });
    const branchB = await Branch.create({
      name: 'Man & Machine Karur',
      city: 'Karur',
      code: 'KRR',
      address: 'Main Road, Karur',
      phone: '9876543211',
      isActive: true,
    });

    const globalAdmin = await User.create({
      name: 'Super Admin',
      email: 'superadmin@mm.test',
      phone: '9000000001',
      password: 'Password123!',
      role: 'ADMIN',
      branchId: null,
      status: 'ACTIVE',
    });
    const branchAdminA = await User.create({
      name: 'KVP Manager',
      email: 'kvpmanager@mm.test',
      phone: '9000000002',
      password: 'Password123!',
      role: 'ADMIN',
      branchId: branchA._id,
      status: 'ACTIVE',
    });

    const adminToken = generateToken(globalAdmin._id, globalAdmin.tokenVersion || 0);
    const branchAToken = generateToken(branchAdminA._id, branchAdminA.tokenVersion || 0);

    const deviceA = await BiometricDevice.create({
      deviceId: 1,
      deviceName: 'KVP Front Gate',
      model: 'eSSL X2008',
      serialNumber: 'X2008KVP001',
      branchId: branchA._id,
      isActive: true,
      status: 'ONLINE',
    });
    const deviceB = await BiometricDevice.create({
      deviceId: 2,
      deviceName: 'KRR Front Gate',
      model: 'eSSL X2008',
      serialNumber: 'X2008KRR001',
      branchId: branchB._id,
      isActive: true,
      status: 'ONLINE',
    });

    let emp1;
    let emp2;

    await check('1. Admin can create employee with auto-generated Employee ID & leading-zero Biometric ID', async () => {
      const res = await request(
        server,
        'POST',
        '/api/admin/employees',
        {
          fullName: 'Nataraj Kumar',
          phone: '9876500001',
          email: 'nataraj@mm.test',
          department: 'Operations',
          designation: 'Branch Manager',
          branchId: branchA._id,
          joiningDate: '2026-01-15',
          employmentType: 'FULL_TIME',
          biometricUserId: '00101',
          assignedDeviceId: deviceA._id,
          biometricEnrollmentStatus: 'LINKED',
        },
        adminToken
      );
      assert.strictEqual(res.status, 201, res.data?.message);
      emp1 = res.data.employee;
      assert.strictEqual(emp1.employeeId, 'EMP001');
      assert.strictEqual(emp1.biometricUserId, '00101');
      assert.strictEqual(emp1.biometricEnrollmentStatus, 'LINKED');

      const mapping = await BiometricUserMapping.findOne({
        deviceId: deviceA._id,
        biometricUserId: '00101',
      }).lean();
      assert(mapping && mapping.subjectType === 'EMPLOYEE' && mapping.status === 'ACTIVE');
    });

    await check('2. Duplicate Employee ID is rejected (409)', async () => {
      const res = await request(
        server,
        'POST',
        '/api/admin/employees',
        {
          employeeId: 'EMP001',
          fullName: 'Duplicate ID Test',
          phone: '9876500002',
          department: 'Front Desk',
          designation: 'Receptionist',
          branchId: branchA._id,
        },
        adminToken
      );
      assert.strictEqual(res.status, 409);
    });

    await check('3. Duplicate Biometric User ID on same device is rejected (409)', async () => {
      const res = await request(
        server,
        'POST',
        '/api/admin/employees',
        {
          fullName: 'Second Staff',
          phone: '9876500003',
          department: 'Coaching',
          designation: 'Floor Coach',
          branchId: branchA._id,
          biometricUserId: '00101',
          assignedDeviceId: deviceA._id,
        },
        adminToken
      );
      assert.strictEqual(res.status, 409);
    });

    await check('4. Same Biometric User ID is allowed on a DIFFERENT device/branch', async () => {
      const res = await request(
        server,
        'POST',
        '/api/admin/employees',
        {
          fullName: 'Karur Staff',
          phone: '9876500004',
          department: 'Coaching',
          designation: 'Floor Coach',
          branchId: branchB._id,
          biometricUserId: '00101',
          assignedDeviceId: deviceB._id,
        },
        adminToken
      );
      assert.strictEqual(res.status, 201, res.data?.message);
      emp2 = res.data.employee;
      assert(/^EMP\d{3,}$/.test(emp2.employeeId));
      assert.notStrictEqual(emp2.employeeId, emp1.employeeId);
    });

    await check('5. Employee can be edited and searched/filtered', async () => {
      const editRes = await request(
        server,
        'PUT',
        `/api/admin/employees/${emp1._id}`,
        { designation: 'Senior Branch Manager', address: 'Kovilpatti' },
        adminToken
      );
      assert.strictEqual(editRes.status, 200);
      assert.strictEqual(editRes.data.employee.designation, 'Senior Branch Manager');

      const searchRes = await request(
        server,
        'GET',
        '/api/admin/employees?search=00101&department=Operations',
        null,
        adminToken
      );
      assert.strictEqual(searchRes.status, 200);
      assert.strictEqual(searchRes.data.total, 1);
      assert.strictEqual(searchRes.data.employees[0].employeeId, 'EMP001');
    });

    await check('6. Branch manager cannot access another branch employee (403)', async () => {
      const res = await request(server, 'GET', `/api/admin/employees/${emp2._id}`, null, branchAToken);
      assert.strictEqual(res.status, 403);
    });

    await check('7. ADMS attendance maps to Employee, auto-verifies status, and prevents duplicates', async () => {
      const attLine = '00101\t2026-11-28 08:30:00\t0\t15\t0\t0';
      const admsRes = await request(
        server,
        'POST',
        `/iclock/cdata?SN=${deviceA.serialNumber}&table=ATTLOG`,
        attLine,
        null,
        true
      );
      assert.strictEqual(admsRes.status, 200);

      // Duplicate punch should be ignored
      const dupRes = await request(
        server,
        'POST',
        `/iclock/cdata?SN=${deviceA.serialNumber}&table=ATTLOG`,
        attLine,
        null,
        true
      );
      assert.strictEqual(dupRes.status, 200);

      const empAtt = await Attendance.find({ employeeId: emp1._id }).lean();
      assert.strictEqual(empAtt.length, 1);
      assert.strictEqual(empAtt[0].subjectType, 'EMPLOYEE');
      assert.strictEqual(empAtt[0].biometricUserId, '00101');
      assert.strictEqual(empAtt[0].attendanceStatus, 'SUCCESS');

      const updatedEmp = await Employee.findById(emp1._id).lean();
      assert.strictEqual(updatedEmp.biometricEnrollmentStatus, 'VERIFIED');
    });

    await check('8. Unknown biometric ID is recorded safely as UNMAPPED_USER + device log', async () => {
      const admsRes = await request(
        server,
        'POST',
        `/iclock/cdata?SN=${deviceA.serialNumber}&table=ATTLOG`,
        '99999\t2026-11-28 08:35:00\t0\t15\t0\t0',
        null,
        true
      );
      assert.strictEqual(admsRes.status, 200);

      const unmappedAtt = await Attendance.findOne({ deviceId: deviceA._id, biometricUserId: '99999' }).lean();
      assert(unmappedAtt);
      assert.strictEqual(unmappedAtt.attendanceStatus, 'UNMAPPED_USER');
      assert.strictEqual(unmappedAtt.subjectType, 'UNKNOWN');

      const unmappedLog = await BiometricDeviceLog.findOne({
        deviceId: deviceA._id,
        action: 'UNMAPPED_BIOMETRIC_PUNCH',
      }).lean();
      assert(unmappedLog);
    });

    await check('9. Existing client ADMS attendance processing continues working', async () => {
      const clientProfile = await ClientProfile.create({
        clientId: 'MM000001',
        name: 'Client One',
        phone: '9876500099',
        branchId: branchA._id,
        status: 'ACTIVE',
      });
      await BiometricEnrollment.create({
        clientProfileId: clientProfile._id,
        branchId: branchA._id,
        assignedDeviceId: deviceA._id,
        biometricUserId: '501',
        consentStatus: 'GRANTED',
        status: 'ENROLLED',
      });
      await BiometricUserMapping.create({
        biometricUserId: '501',
        subjectType: 'CLIENT',
        clientProfileId: clientProfile._id,
        deviceId: deviceA._id,
        branchId: branchA._id,
        status: 'ACTIVE',
      });

      const admsRes = await request(
        server,
        'POST',
        `/iclock/cdata?SN=${deviceA.serialNumber}&table=ATTLOG`,
        '501\t2026-11-28 08:40:00\t0\t15\t0\t0',
        null,
        true
      );
      assert.strictEqual(admsRes.status, 200);

      const clientAtt = await Attendance.findOne({ clientProfileId: clientProfile._id }).lean();
      assert(clientAtt);
      assert.strictEqual(clientAtt.subjectType, 'CLIENT');
      assert.strictEqual(clientAtt.biometricUserId, '501');
    });

    await check('10. Safe deactivation preserves attendance & biometricUserId, marks mapping INACTIVE, and supports reactivation', async () => {
      const deactRes = await request(
        server,
        'PATCH',
        `/api/admin/employees/${emp1._id}/deactivate`,
        { reason: 'Resigned', exitDate: '2026-11-28' },
        adminToken
      );
      assert.strictEqual(deactRes.status, 200);
      assert.strictEqual(deactRes.data.employee.employmentStatus, 'INACTIVE');
      assert.strictEqual(deactRes.data.employee.biometricUserId, '00101');
      assert(deactRes.data.employee.deactivatedAt);

      const inactiveMapping = await BiometricUserMapping.findOne({
        deviceId: deviceA._id,
        biometricUserId: '00101',
      }).lean();
      assert.strictEqual(inactiveMapping.status, 'INACTIVE');

      // Attendance history preserved
      const profRes = await request(server, 'GET', `/api/admin/employees/${emp1._id}`, null, adminToken);
      assert.strictEqual(profRes.status, 200);
      assert.strictEqual(profRes.data.recentAttendance.length, 1);

      // Reactivate
      const reactRes = await request(
        server,
        'PATCH',
        `/api/admin/employees/${emp1._id}/reactivate`,
        { reason: 'Rejoined' },
        adminToken
      );
      assert.strictEqual(reactRes.status, 200);
      assert.strictEqual(reactRes.data.employee.employmentStatus, 'ACTIVE');

      const restoredMapping = await BiometricUserMapping.findOne({
        deviceId: deviceA._id,
        biometricUserId: '00101',
      }).lean();
      assert.strictEqual(restoredMapping.status, 'ACTIVE');
    });

    console.log(`\nALL ${passed} EMPLOYEE MANAGEMENT E2E CHECKS PASSED!`);
  } finally {
    server.close();
    await mongoose.disconnect();
    await mongod.stop();
  }
})().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
