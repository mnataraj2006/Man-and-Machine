const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Branch name is required'],
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      required: [true, 'Branch city is required'],
      trim: true,
      unique: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      default: '',
    },
    openingHours: {
      type: String,
      trim: true,
      default: 'Mon - Sat: 5:30 AM - 10:00 PM | Sun: 6:00 AM - 1:00 PM',
    },
    facilities: {
      type: [String],
      default: ['Fully Air-Conditioned Gym', 'Steam Bath', 'Clean Atmosphere', 'Bike Parking'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Branch = mongoose.model('Branch', branchSchema);

module.exports = Branch;
