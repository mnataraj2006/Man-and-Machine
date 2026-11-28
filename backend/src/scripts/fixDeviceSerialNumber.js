/**
 * One-time guarded migration script to correct the serialNumber of the existing
 * Kovilpatti BiometricDevice record without deleting or recreating it.
 *
 * Dry-run (default, zero writes):
 *   EXPECTED_MONGODB_HOST=oytly1c.mongodb.net node src/scripts/fixDeviceSerialNumber.js
 *
 * Execute update:
 *   CONFIRM_PROD_DEVICE_SERIAL_FIX=true EXECUTE_SERIAL_FIX=true EXPECTED_MONGODB_HOST=oytly1c.mongodb.net node src/scripts/fixDeviceSerialNumber.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const BiometricDevice = require('../models/BiometricDevice');
const BiometricDeviceLog = require('../models/BiometricDeviceLog');

const TARGET_DEVICE_ID = '6b0958985e57b1b1870626a0';
const EXPECTED_BRANCH_ID = '6b0534f13ca6850c595300e7';
const EXPECTED_DEVICE_NAME = 'KVP Main Entrance';
const OLD_SERIAL = 'TDDB250600919';
const NEW_SERIAL = 'TDBD242100623';
const REQUIRED_DB_NAME = 'man_and_machine';

async function run() {
  const expectedHost = String(process.env.EXPECTED_MONGODB_HOST || '').trim();
  if (!expectedHost) {
    console.error('ABORTED: EXPECTED_MONGODB_HOST must be explicitly provided.');
    process.exit(1);
  }

  const executeWrite =
    process.env.CONFIRM_PROD_DEVICE_SERIAL_FIX === 'true' &&
    process.env.EXECUTE_SERIAL_FIX === 'true';
  const mode = executeWrite ? 'EXECUTE' : 'DRY_RUN';

  if (
    !mongoose.Types.ObjectId.isValid(TARGET_DEVICE_ID) ||
    !mongoose.Types.ObjectId.isValid(EXPECTED_BRANCH_ID)
  ) {
    console.error('ABORTED: Invalid ObjectId constant.');
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

    const hostMatches =
      actualHost === expectedHost || actualHost.endsWith(`.${expectedHost}`);
    if (!hostMatches) {
      console.error(`ABORTED: Connected host "${actualHost}" does not match EXPECTED_MONGODB_HOST "${expectedHost}".`);
      process.exit(1);
    }

    if (actualDbName !== REQUIRED_DB_NAME) {
      console.error(`ABORTED: Connected database "${actualDbName}" does not match required "${REQUIRED_DB_NAME}".`);
      process.exit(1);
    }

    const [device, collision] = await Promise.all([
      BiometricDevice.findById(TARGET_DEVICE_ID).lean(),
      BiometricDevice.findOne({ serialNumber: NEW_SERIAL }).select('_id serialNumber').lean(),
    ]);

    if (!device) {
      console.error(`ABORTED: Target BiometricDevice _id=${TARGET_DEVICE_ID} not found.`);
      process.exit(1);
    }

    if (String(device.branchId) !== EXPECTED_BRANCH_ID) {
      console.error(`ABORTED: Branch mismatch. Expected ${EXPECTED_BRANCH_ID}, found ${device.branchId}.`);
      process.exit(1);
    }

    if (device.deviceName !== EXPECTED_DEVICE_NAME) {
      console.error(`ABORTED: Device name mismatch. Expected "${EXPECTED_DEVICE_NAME}", found "${device.deviceName}".`);
      process.exit(1);
    }

    if (device.serialNumber !== OLD_SERIAL) {
      console.error(`ABORTED: Current serialNumber "${device.serialNumber}" does not match expected "${OLD_SERIAL}".`);
      process.exit(1);
    }

    if (collision && String(collision._id) !== TARGET_DEVICE_ID) {
      console.error(`ABORTED: Another device (${collision._id}) already uses serialNumber "${NEW_SERIAL}".`);
      process.exit(1);
    }

    console.log(
      JSON.stringify({
        mode,
        verifiedTarget: true,
        database: actualDbName,
        host: actualHost,
        deviceObjectId: String(device._id),
        deviceId: device.deviceId,
        branchId: String(device.branchId),
        deviceName: device.deviceName,
        currentSerial: device.serialNumber,
        targetSerial: NEW_SERIAL,
      })
    );

    if (!executeWrite) {
      console.log('DRY_RUN complete. No database changes were made.');
      return;
    }

    const updated = await BiometricDevice.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(TARGET_DEVICE_ID),
        branchId: new mongoose.Types.ObjectId(EXPECTED_BRANCH_ID),
        serialNumber: OLD_SERIAL,
      },
      { $set: { serialNumber: NEW_SERIAL } },
      { returnDocument: 'after' }
    ).lean();

    if (!updated || updated.serialNumber !== NEW_SERIAL) {
      console.error('FAILED: Atomic conditional update did not update serialNumber.');
      process.exit(1);
    }

    await BiometricDeviceLog.create({
      deviceId: updated._id,
      branchId: updated.branchId,
      category: 'ADMIN_ACTION',
      status: 'SUCCESS',
      action: 'CORRECT_DEVICE_SERIAL',
      message: `Corrected device serialNumber from ${OLD_SERIAL} to ${NEW_SERIAL} (preserved _id and deviceId #${updated.deviceId}).`,
      actorUserId: null,
      metadata: {
        oldSerial: OLD_SERIAL,
        newSerial: NEW_SERIAL,
        script: 'fixDeviceSerialNumber.js',
      },
    });

    console.log(
      JSON.stringify({
        status: 'SUCCESS',
        deviceObjectId: String(updated._id),
        deviceId: updated.deviceId,
        branchId: String(updated.branchId),
        oldSerial: OLD_SERIAL,
        newSerial: updated.serialNumber,
      })
    );
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('FAILED:', err.message);
  mongoose.disconnect().catch(() => {});
  process.exit(1);
});
