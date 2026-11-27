const mongoose = require('mongoose');

const GALLERY_CATEGORIES = ['GYM', 'EQUIPMENT', 'TRAINING', 'TRAINERS', 'EVENTS', 'CLASSES', 'OTHER'];

const websiteMediaSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['PHOTO', 'VIDEO'],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Media title is required'],
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    category: {
      type: String,
      uppercase: true,
      trim: true,
      default: 'GYM',
      index: true,
    },
    mediaUrl: {
      type: String,
      required: [true, 'Media URL is required'],
      trim: true,
    },
    thumbnailUrl: {
      type: String,
      trim: true,
      default: '',
    },
    storageKey: {
      type: String,
      trim: true,
      default: '',
    },
    thumbnailStorageKey: {
      type: String,
      trim: true,
      default: '',
    },
    mimeType: {
      type: String,
      trim: true,
      default: '',
    },
    sizeBytes: {
      type: Number,
      default: 0,
      min: 0,
    },
    width: {
      type: Number,
      default: 0,
      min: 0,
    },
    height: {
      type: Number,
      default: 0,
      min: 0,
    },
    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    displayOrder: {
      type: Number,
      default: 1,
      index: true,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

websiteMediaSchema.index({ active: 1, isDeleted: 1, displayOrder: 1, createdAt: -1 });

const WebsiteMedia = mongoose.model('WebsiteMedia', websiteMediaSchema);

module.exports = WebsiteMedia;
module.exports.GALLERY_CATEGORIES = GALLERY_CATEGORIES;
