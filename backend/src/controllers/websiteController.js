const mongoose = require('mongoose');
const WebsiteMedia = require('../models/WebsiteMedia');
const { GALLERY_CATEGORIES } = require('../models/WebsiteMedia');
const WebsiteContent = require('../models/WebsiteContent');
const dashboardCache = require('../utils/dashboardCache');
const {
  processWebsiteImageBuffer,
  saveProcessedWebsiteImage,
  deleteStoredWebsiteMedia,
  validateVideoUrl,
  seedInitialGalleryIfEmpty,
} = require('../services/websiteMediaService');

const clearPublicWebsiteCache = () => {
  if (typeof dashboardCache.clearAllDashboardCache === 'function') {
    dashboardCache.clearAllDashboardCache();
  }
};

// ==========================================
// PUBLIC ENDPOINTS
// ==========================================

const getPublicGallery = async (req, res, next) => {
  try {
    const category = String(req.query.category || 'ALL').toUpperCase().trim();
    const cacheKey = `public:gallery:${category}`;
    const cached = dashboardCache.getCached(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    await seedInitialGalleryIfEmpty();

    const query = { active: true, isDeleted: false };
    if (category && category !== 'ALL') {
      query.category = category;
    }

    const items = await WebsiteMedia.find(query)
      .sort({ displayOrder: 1, createdAt: -1 })
      .select('type title description category mediaUrl thumbnailUrl width height durationSeconds displayOrder featured createdAt')
      .lean();

    const categoriesPresent = Array.from(
      new Set(
        (await WebsiteMedia.find({ active: true, isDeleted: false }).select('category').lean()).map(
          (i) => i.category || 'OTHER'
        )
      )
    );

    const payload = {
      success: true,
      count: items.length,
      categories: ['ALL', ...categoriesPresent],
      items,
    };

    dashboardCache.setCached(cacheKey, payload, 60000);
    res.status(200).json(payload);
  } catch (err) {
    next(err);
  }
};

const getPublicWebsiteContent = async (req, res, next) => {
  try {
    const cacheKey = 'public:website-content';
    const cached = dashboardCache.getCached(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const doc = await WebsiteContent.getOrCreateMain();
    const plain = doc.toObject();
    delete plain.hero?.backgroundStorageKey;
    delete plain.about?.imageStorageKey;
    delete plain.facilities?.imageStorageKey;
    delete plain.community?.imageStorageKey;
    delete plain.cta?.backgroundStorageKey;

    plain.testimonials = (plain.testimonials || []).filter((t) => t.active !== false);

    const payload = {
      success: true,
      content: plain,
    };

    dashboardCache.setCached(cacheKey, payload, 60000);
    res.status(200).json(payload);
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN GALLERY ENDPOINTS
// ==========================================

const getAdminGallery = async (req, res, next) => {
  try {
    await seedInitialGalleryIfEmpty();
    const { category, type, status } = req.query;
    const query = { isDeleted: false };

    if (category && category !== 'ALL') query.category = String(category).toUpperCase().trim();
    if (type && type !== 'ALL') query.type = String(type).toUpperCase().trim();
    if (status === 'ACTIVE') query.active = true;
    else if (status === 'INACTIVE') query.active = false;

    const items = await WebsiteMedia.find(query)
      .sort({ displayOrder: 1, createdAt: -1 })
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .lean();

    res.status(200).json({
      success: true,
      count: items.length,
      categories: GALLERY_CATEGORIES,
      items,
    });
  } catch (err) {
    next(err);
  }
};

const createGalleryMedia = async (req, res, next) => {
  try {
    const type = String(req.body.type || 'PHOTO').toUpperCase().trim();
    if (!['PHOTO', 'VIDEO'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Media type must be PHOTO or VIDEO.' });
    }

    const title = String(req.body.title || '').trim();
    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required.' });
    }

    const description = String(req.body.description || '').trim();
    const category = String(req.body.category || 'GYM').toUpperCase().trim();
    const displayOrder = req.body.displayOrder !== undefined ? Number(req.body.displayOrder) : 1;
    const featured = req.body.featured === true || req.body.featured === 'true';
    const active = req.body.active === undefined ? true : req.body.active === true || req.body.active === 'true';
    const durationSeconds = req.body.durationSeconds ? Math.max(0, Number(req.body.durationSeconds) || 0) : 0;

    const imageFile = req.files?.image?.[0] || null;
    const thumbFile = req.files?.thumbnail?.[0] || null;

    let mediaUrl = '';
    let thumbnailUrl = String(req.body.thumbnailUrl || '').trim();
    let storageKey = '';
    let thumbnailStorageKey = '';
    let mimeType = '';
    let sizeBytes = 0;
    let width = 0;
    let height = 0;

    if (type === 'PHOTO') {
      if (!imageFile || !imageFile.buffer) {
        return res.status(400).json({ success: false, message: 'Please upload a JPG, PNG, or WEBP image.' });
      }
      const processed = await processWebsiteImageBuffer(imageFile.buffer);
      const saved = await saveProcessedWebsiteImage('gallery', processed);
      mediaUrl = saved.url;
      storageKey = saved.storageKey;
      mimeType = saved.mimeType;
      sizeBytes = saved.sizeBytes;
      width = saved.width;
      height = saved.height;
    } else {
      mediaUrl = validateVideoUrl(req.body.mediaUrl);
      mimeType = 'video/external';
      if (thumbFile && thumbFile.buffer) {
        const processedThumb = await processWebsiteImageBuffer(thumbFile.buffer, { maxWidth: 1280 });
        const savedThumb = await saveProcessedWebsiteImage('thumb', processedThumb);
        thumbnailUrl = savedThumb.url;
        thumbnailStorageKey = savedThumb.storageKey;
      }
    }

    let created;
    try {
      created = await WebsiteMedia.create({
        type,
        title,
        description,
        category,
        mediaUrl,
        thumbnailUrl,
        storageKey,
        thumbnailStorageKey,
        mimeType,
        sizeBytes,
        width,
        height,
        durationSeconds,
        displayOrder: Number.isFinite(displayOrder) ? displayOrder : 1,
        featured,
        active,
        createdBy: req.user?._id || null,
        updatedBy: req.user?._id || null,
      });
    } catch (dbErr) {
      if (storageKey) await deleteStoredWebsiteMedia(storageKey);
      if (thumbnailStorageKey) await deleteStoredWebsiteMedia(thumbnailStorageKey);
      throw dbErr;
    }

    clearPublicWebsiteCache();

    res.status(201).json({
      success: true,
      message: `${type === 'PHOTO' ? 'Photo' : 'Video'} added to gym gallery.`,
      item: created,
    });
  } catch (err) {
    next(err);
  }
};

const updateGalleryMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid media ID.' });
    }

    const item = await WebsiteMedia.findOne({ _id: id, isDeleted: false });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Gallery item not found.' });
    }

    const imageFile = req.files?.image?.[0] || null;
    const thumbFile = req.files?.thumbnail?.[0] || null;

    // Validate & process new media BEFORE mutating DB
    let processedImage = null;
    let processedThumb = null;
    if (imageFile && imageFile.buffer) {
      processedImage = await processWebsiteImageBuffer(imageFile.buffer);
    }
    if (thumbFile && thumbFile.buffer) {
      processedThumb = await processWebsiteImageBuffer(thumbFile.buffer, { maxWidth: 1280 });
    }

    if (req.body.title !== undefined) {
      const trimmed = String(req.body.title).trim();
      if (!trimmed) return res.status(400).json({ success: false, message: 'Title cannot be empty.' });
      item.title = trimmed;
    }
    if (req.body.description !== undefined) item.description = String(req.body.description).trim();
    if (req.body.category !== undefined) item.category = String(req.body.category).toUpperCase().trim();
    if (req.body.displayOrder !== undefined && Number.isFinite(Number(req.body.displayOrder))) {
      item.displayOrder = Number(req.body.displayOrder);
    }
    if (req.body.featured !== undefined) {
      item.featured = req.body.featured === true || req.body.featured === 'true';
    }
    if (req.body.active !== undefined) {
      item.active = req.body.active === true || req.body.active === 'true';
    }
    if (req.body.durationSeconds !== undefined) {
      item.durationSeconds = Math.max(0, Number(req.body.durationSeconds) || 0);
    }
    if (item.type === 'VIDEO' && req.body.mediaUrl !== undefined) {
      item.mediaUrl = validateVideoUrl(req.body.mediaUrl);
    }
    if (item.type === 'VIDEO' && req.body.thumbnailUrl !== undefined && !processedThumb) {
      item.thumbnailUrl = String(req.body.thumbnailUrl).trim();
    }

    const oldStorageKey = item.storageKey || '';
    const oldThumbKey = item.thumbnailStorageKey || '';
    let newSavedImage = null;
    let newSavedThumb = null;

    if (processedImage && item.type === 'PHOTO') {
      newSavedImage = await saveProcessedWebsiteImage('gallery', processedImage);
      item.mediaUrl = newSavedImage.url;
      item.storageKey = newSavedImage.storageKey;
      item.mimeType = newSavedImage.mimeType;
      item.sizeBytes = newSavedImage.sizeBytes;
      item.width = newSavedImage.width;
      item.height = newSavedImage.height;
    }

    if (processedThumb && item.type === 'VIDEO') {
      newSavedThumb = await saveProcessedWebsiteImage('thumb', processedThumb);
      item.thumbnailUrl = newSavedThumb.url;
      item.thumbnailStorageKey = newSavedThumb.storageKey;
    }

    item.updatedBy = req.user?._id || null;

    try {
      await item.save();
    } catch (saveErr) {
      if (newSavedImage?.storageKey) await deleteStoredWebsiteMedia(newSavedImage.storageKey);
      if (newSavedThumb?.storageKey) await deleteStoredWebsiteMedia(newSavedThumb.storageKey);
      throw saveErr;
    }

    // Only delete old media AFTER DB update succeeds
    if (newSavedImage && oldStorageKey) {
      await deleteStoredWebsiteMedia(oldStorageKey);
    }
    if (newSavedThumb && oldThumbKey) {
      await deleteStoredWebsiteMedia(oldThumbKey);
    }

    clearPublicWebsiteCache();

    res.status(200).json({
      success: true,
      message: 'Gallery item updated.',
      item,
    });
  } catch (err) {
    next(err);
  }
};

const toggleGalleryMediaStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid media ID.' });
    }

    const item = await WebsiteMedia.findOne({ _id: id, isDeleted: false });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Gallery item not found.' });
    }

    if (req.body.active !== undefined) {
      item.active = Boolean(req.body.active);
    }
    if (req.body.featured !== undefined) {
      item.featured = Boolean(req.body.featured);
    }
    item.updatedBy = req.user?._id || null;
    await item.save();

    clearPublicWebsiteCache();

    res.status(200).json({
      success: true,
      message: 'Gallery item status updated.',
      item,
    });
  } catch (err) {
    next(err);
  }
};

const reorderGalleryMedia = async (req, res, next) => {
  try {
    const { items, orderedIds } = req.body || {};
    const updates = [];

    if (Array.isArray(items) && items.length > 0) {
      for (const entry of items) {
        if (entry?.id && mongoose.Types.ObjectId.isValid(entry.id) && Number.isFinite(Number(entry.displayOrder))) {
          updates.push({
            updateOne: {
              filter: { _id: entry.id, isDeleted: false },
              update: { $set: { displayOrder: Number(entry.displayOrder), updatedBy: req.user?._id || null } },
            },
          });
        }
      }
    } else if (Array.isArray(orderedIds) && orderedIds.length > 0) {
      orderedIds.forEach((id, idx) => {
        if (mongoose.Types.ObjectId.isValid(id)) {
          updates.push({
            updateOne: {
              filter: { _id: id, isDeleted: false },
              update: { $set: { displayOrder: idx + 1, updatedBy: req.user?._id || null } },
            },
          });
        }
      });
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid reorder items provided.' });
    }

    await WebsiteMedia.bulkWrite(updates);
    clearPublicWebsiteCache();

    res.status(200).json({
      success: true,
      message: 'Gallery order saved.',
    });
  } catch (err) {
    next(err);
  }
};

const deleteGalleryMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid media ID.' });
    }

    const item = await WebsiteMedia.findOne({ _id: id, isDeleted: false });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Gallery item not found.' });
    }

    const oldStorageKey = item.storageKey || '';
    const oldThumbKey = item.thumbnailStorageKey || '';

    item.isDeleted = true;
    item.active = false;
    item.deletedAt = new Date();
    item.storageKey = '';
    item.thumbnailStorageKey = '';
    item.updatedBy = req.user?._id || null;
    await item.save();

    if (oldStorageKey) await deleteStoredWebsiteMedia(oldStorageKey);
    if (oldThumbKey) await deleteStoredWebsiteMedia(oldThumbKey);

    clearPublicWebsiteCache();

    res.status(200).json({
      success: true,
      message: 'Gallery item deleted.',
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN WEBSITE CONTENT ENDPOINTS
// ==========================================

const EDITABLE_SECTIONS = new Set([
  'hero',
  'about',
  'facilities',
  'membershipSection',
  'trainersSection',
  'community',
  'gallerySection',
  'cta',
  'footer',
  'testimonials',
]);

const SECTION_IMAGE_FIELDS = {
  hero: { urlKey: 'backgroundImageUrl', storageKey: 'backgroundStorageKey' },
  about: { urlKey: 'imageUrl', storageKey: 'imageStorageKey' },
  facilities: { urlKey: 'imageUrl', storageKey: 'imageStorageKey' },
  community: { urlKey: 'imageUrl', storageKey: 'imageStorageKey' },
  cta: { urlKey: 'backgroundImageUrl', storageKey: 'backgroundStorageKey' },
};

const getAdminWebsiteContent = async (req, res, next) => {
  try {
    const doc = await WebsiteContent.getOrCreateMain();
    res.status(200).json({
      success: true,
      content: doc,
    });
  } catch (err) {
    next(err);
  }
};

const updateWebsiteContentSection = async (req, res, next) => {
  try {
    const { section } = req.params;
    if (!EDITABLE_SECTIONS.has(section)) {
      return res.status(400).json({ success: false, message: `Unsupported website section: ${section}` });
    }

    const doc = await WebsiteContent.getOrCreateMain();
    const imageFile = req.files?.image?.[0] || null;

    let processedImage = null;
    if (imageFile && imageFile.buffer) {
      processedImage = await processWebsiteImageBuffer(imageFile.buffer);
    }

    if (section === 'testimonials') {
      let incoming = req.body.testimonials;
      if (typeof incoming === 'string') {
        try {
          incoming = JSON.parse(incoming);
        } catch {
          return res.status(400).json({ success: false, message: 'Invalid testimonials JSON payload.' });
        }
      }
      if (!Array.isArray(incoming)) {
        return res.status(400).json({ success: false, message: 'Testimonials must be an array.' });
      }
      doc.testimonials = incoming
        .filter((t) => t && String(t.name || '').trim() && String(t.quote || '').trim())
        .map((t) => ({
          name: String(t.name).trim(),
          role: String(t.role || 'Member').trim(),
          quote: String(t.quote).trim(),
          rating: Math.min(5, Math.max(1, Number(t.rating) || 5)),
          active: t.active !== false,
        }));
    } else {
      const currentSection =
        typeof doc[section]?.toObject === 'function'
          ? doc[section].toObject()
          : { ...(doc[section] || {}) };
      const imgMeta = SECTION_IMAGE_FIELDS[section];

      for (const [k, v] of Object.entries(req.body || {})) {
        if (k === 'image' || k === imgMeta?.storageKey) continue;
        if (v !== undefined && typeof currentSection[k] !== 'object') {
          currentSection[k] = String(v);
        }
      }

      let oldKey = '';
      let newlySaved = null;
      if (processedImage && imgMeta) {
        oldKey = currentSection[imgMeta.storageKey] || '';
        newlySaved = await saveProcessedWebsiteImage(`section-${section}`, processedImage);
        currentSection[imgMeta.urlKey] = newlySaved.url;
        currentSection[imgMeta.storageKey] = newlySaved.storageKey;
      }

      doc[section] = currentSection;
      doc.updatedBy = req.user?._id || null;

      try {
        await doc.save();
      } catch (saveErr) {
        if (newlySaved?.storageKey) await deleteStoredWebsiteMedia(newlySaved.storageKey);
        throw saveErr;
      }

      if (newlySaved && oldKey) {
        await deleteStoredWebsiteMedia(oldKey);
      }

      clearPublicWebsiteCache();
      return res.status(200).json({
        success: true,
        message: `${section} content updated.`,
        content: doc,
      });
    }

    doc.updatedBy = req.user?._id || null;
    await doc.save();
    clearPublicWebsiteCache();

    res.status(200).json({
      success: true,
      message: `${section} content updated.`,
      content: doc,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPublicGallery,
  getPublicWebsiteContent,
  getAdminGallery,
  createGalleryMedia,
  updateGalleryMedia,
  toggleGalleryMediaStatus,
  reorderGalleryMedia,
  deleteGalleryMedia,
  getAdminWebsiteContent,
  updateWebsiteContentSection,
};
