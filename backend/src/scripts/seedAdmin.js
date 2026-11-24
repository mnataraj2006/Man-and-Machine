const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Branch = require('../models/Branch');

/**
 * Secure Admin Provisioning Script.
 * Usage: node src/scripts/seedAdmin.js
 *
 * Can also read:
 * ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD from .env
 */
const seedAdmin = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@manandmachine.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@ManAndMachine2026';
    const adminName = process.env.ADMIN_NAME || 'HQ Administrator';
    const adminPhone = process.env.ADMIN_PHONE || '+91 75988 85566';

    const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingAdmin) {
      return existingAdmin;
    }

    // Get Kovilpatti HQ branch
    let hqBranch = await Branch.findOne({ city: 'Kovilpatti' });
    if (!hqBranch) {
      hqBranch = await Branch.findOne();
    }

    const admin = new User({
      name: adminName,
      email: adminEmail.toLowerCase(),
      phone: adminPhone,
      password: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      branchId: hqBranch ? hqBranch._id : null,
    });

    await admin.save();
    console.log(`Successfully seeded ADMIN account: ${adminEmail} (Role: ADMIN)`);
    return admin;
  } catch (err) {
    console.error('Admin seeding notice:', err.message);
  }
};

if (require.main === module) {
  seedAdmin()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = seedAdmin;
