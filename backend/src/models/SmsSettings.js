const mongoose = require('mongoose');
const { MEMBER_NOTIFICATIONS, STAFF_NOTIFICATIONS, defaultToggleMap } = require('../utils/smsCatalog');

const smsSettingsSchema = new mongoose.Schema(
  {
    scopeKey: {
      type: String,
      required: true,
      unique: true,
      default: 'GLOBAL',
      trim: true,
    },
    memberNotifications: {
      type: Map,
      of: Boolean,
      default: () => defaultToggleMap(MEMBER_NOTIFICATIONS),
    },
    staffNotifications: {
      type: Map,
      of: Boolean,
      default: () => defaultToggleMap(STAFF_NOTIFICATIONS),
    },
    membershipExpiryNotificationDays: {
      type: Number,
      default: 7,
      min: 1,
      max: 90,
    },
    dailySummaryTime: {
      type: String,
      default: '21:00',
      trim: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Daily Summary Time must be in HH:mm format'],
    },
    absentAlertDays: {
      type: Number,
      default: 7,
      min: 1,
      max: 60,
    },
    balancePreNotifyDays: {
      type: Number,
      default: 3,
      min: 1,
      max: 30,
    },
    sessionPreNotifyMinutes: {
      type: Number,
      default: 60,
      min: 15,
      max: 1440,
    },
    ownerName: {
      type: String,
      trim: true,
      default: 'Owner',
    },
    ownerPhone: {
      type: String,
      trim: true,
      default: '',
    },
    dltConfig: {
      senderId: { type: String, trim: true, uppercase: true, default: '' },
      entityId: { type: String, trim: true, default: '' },
      providerName: { type: String, trim: true, default: 'DLT_HTTP_GATEWAY' },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const SmsSettings = mongoose.model('SmsSettings', smsSettingsSchema);

module.exports = SmsSettings;
