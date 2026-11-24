require('dotenv').config();
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
    await connectDB();

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@manandmachine.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@ManAndMachine2026';
    const adminName = process.env.ADMIN_NAME || 'HQ Administrator';
    const adminPhone = process.env.ADMIN_PHONE || '+91 75988 85566';

    const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingAdmin) {
      console.log(`Admin account already exists for ${adminEmail} (Role: ${existingAdmin.role})`);
      process.exit(0);
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
    console.log(`Successfully created ADMIN account: ${adminEmail} (Role: ADMIN)`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed admin:', err.message);
    process.exit(1);
  }
};

seedAdmin();
