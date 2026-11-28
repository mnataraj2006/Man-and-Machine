/**
 * One-time manual script to grant Global Admin scope (branchId: null)
 * to the HQ Admin account (6b0535042580c0f2ec0a0fc2).
 *
 * Requires explicit confirmation and exact production host verification:
 *   CONFIRM_GLOBAL_ADMIN_SCOPE=true EXPECTED_MONGODB_HOST=<atlas-host> node src/scripts/setGlobalAdminScope.js
 *
 * Optional rollback mode (requires ROLLBACK_BRANCH_ID=<ObjectId>):
 *   CONFIRM_GLOBAL_ADMIN_SCOPE=true EXPECTED_MONGODB_HOST=<atlas-host> ROLLBACK_BRANCH_ID=<ObjectId> node src/scripts/setGlobalAdminScope.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const TARGET_ADMIN_ID = '6b0535042580c0f2ec0a0fc2';
const REQUIRED_DB_NAME = 'man_and_machine';

async function run() {
  if (process.env.CONFIRM_GLOBAL_ADMIN_SCOPE !== 'true') {
    console.error('ABORTED: Set CONFIRM_GLOBAL_ADMIN_SCOPE=true to execute this one-time update.');
    process.exit(1);
  }

  const expectedHost = String(process.env.EXPECTED_MONGODB_HOST || '').trim();
  if (!expectedHost) {
    console.error('ABORTED: EXPECTED_MONGODB_HOST must be explicitly provided.');
    process.exit(1);
  }

  const rollbackBranchId = String(process.env.ROLLBACK_BRANCH_ID || '').trim();
  const isRollback = Boolean(rollbackBranchId);
  const mode = isRollback ? 'ROLLBACK' : 'SET_GLOBAL_ADMIN_SCOPE';

  if (!mongoose.Types.ObjectId.isValid(TARGET_ADMIN_ID)) {
    console.error('ABORTED: Invalid TARGET_ADMIN_ID.');
    process.exit(1);
  }
  if (isRollback && !mongoose.Types.ObjectId.isValid(rollbackBranchId)) {
    console.error('ABORTED: Invalid ROLLBACK_BRANCH_ID.');
    process.exit(1);
  }

  await connectDB();

  try {
    const actualHost = String(mongoose.connection.host || '').trim();
    const actualDbName = String(mongoose.connection.name || '').trim();

    if (
      !actualHost ||
      actualHost === 'localhost' ||
      actualHost === '127.0.0.1' ||
      actualHost === '::1' ||
      /staging/i.test(actualHost)
    ) {
      console.error(`ABORTED: Refusing to run against non-production host "${actualHost}".`);
      process.exit(1);
    }

    if (actualHost !== expectedHost) {
      console.error(`ABORTED: Connected host "${actualHost}" does not match EXPECTED_MONGODB_HOST "${expectedHost}".`);
      process.exit(1);
    }

    if (actualDbName !== REQUIRED_DB_NAME) {
      console.error(`ABORTED: Connected database "${actualDbName}" does not match required "${REQUIRED_DB_NAME}".`);
      process.exit(1);
    }

    console.log(
      JSON.stringify({
        verifiedTarget: true,
        database: actualDbName,
        host: actualHost,
        targetAdminId: TARGET_ADMIN_ID,
        mode,
      })
    );

    const matches = await User.find({ _id: TARGET_ADMIN_ID })
      .select('_id role branchId')
      .lean();

    if (matches.length !== 1) {
      console.error(`ABORTED: Expected exactly 1 matching user, found ${matches.length}.`);
      process.exit(1);
    }

    const admin = matches[0];
    if (String(admin._id) !== TARGET_ADMIN_ID) {
      console.error('ABORTED: User _id mismatch.');
      process.exit(1);
    }
    if (admin.role !== 'ADMIN') {
      console.error(`ABORTED: Expected role ADMIN, found ${admin.role}.`);
      process.exit(1);
    }

    const previousBranchId = admin.branchId ? String(admin.branchId) : null;

    if (!isRollback && previousBranchId === null) {
      console.error('ABORTED: Current branchId is already null. No changes made.');
      process.exit(1);
    }

    const targetBranchValue = isRollback
      ? new mongoose.Types.ObjectId(rollbackBranchId)
      : null;

    const filter = isRollback
      ? { _id: admin._id, role: 'ADMIN' }
      : { _id: admin._id, role: 'ADMIN', branchId: { $ne: null } };

    const updateRes = await User.updateOne(filter, { $set: { branchId: targetBranchValue } });
    if (updateRes.modifiedCount !== 1) {
      console.error('FAILED: Update did not modify exactly 1 document.');
      process.exit(1);
    }

    const verified = await User.findById(admin._id).select('_id role branchId').lean();
    const ok = isRollback
      ? String(verified?.branchId || '') === rollbackBranchId
      : verified?.branchId === null;

    console.log(
      JSON.stringify({
        status: ok ? 'SUCCESS' : 'FAILED',
        mode,
        userId: String(verified._id),
        role: verified.role,
        previousBranchId,
        newBranchId: verified.branchId ? String(verified.branchId) : null,
      })
    );

    if (!ok) process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('FAILED:', err.message);
  mongoose.disconnect().catch(() => {});
  process.exit(1);
});
