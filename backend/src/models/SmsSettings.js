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
    smsEnabled: {
      type: Boolean,
      default: true,
    },
    emailEnabled: {
      type: Boolean,
      default: false,
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
    emailMemberNotifications: {
      type: Map,
      of: Boolean,
      default: () => defaultToggleMap(MEMBER_NOTIFICATIONS),
    },
    emailStaffNotifications: {
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
    ownerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    dltConfig: {
      senderId: { type: String, trim: true, uppercase: true, default: '' },
      entityId: { type: String, trim: true, default: '' },
      providerName: { type: String, trim: true, default: 'DLT_HTTP_GATEWAY' },
    },
    smtpConfig: {
      host: { type: String, trim: true, default: '' },
      port: { type: Number, default: 587, min: 1, max: 65535 },
      secure: { type: Boolean, default: false },
      username: { type: String, trim: true, default: '' },
      passwordEncrypted: { type: String, default: '', select: false },
      senderEmail: { type: String, trim: true, lowercase: true, default: '' },
      senderName: { type: String, trim: true, default: 'Man & Machine Fitness' },
      replyTo: { type: String, trim: true, lowercase: true, default: '' },
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
