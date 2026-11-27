const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');
const WebsiteMedia = require('../models/WebsiteMedia');

const MAX_WEBSITE_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ALLOWED_SHARP_FORMATS = new Set(['jpeg', 'png', 'webp']);
const MAX_IMAGE_WIDTH = 1920;

const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');
const WEBSITE_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'website');

const ensureWebsiteUploadDir = () => {
  if (!fs.existsSync(WEBSITE_UPLOAD_DIR)) {
    fs.mkdirSync(WEBSITE_UPLOAD_DIR, { recursive: true });
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_WEBSITE_IMAGE_BYTES,
    files: 2,
  },
  fileFilter: (_req, file, cb) => {
    const mime = String(file.mimetype || '').toLowerCase();
    if (!ALLOWED_IMAGE_MIME_TYPES.has(mime)) {
      const err = new Error('Unsupported image format. Please upload a JPG, PNG, or WEBP image.');
      err.statusCode = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

/**
 * Middleware supporting optional 'image' and 'thumbnail' fields via multipart/form-data.
 */
const handleWebsiteMediaUpload = (req, res, next) => {
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }

  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ])(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Image exceeds the maximum allowed size of 10 MB.',
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid file upload request.',
      });
    }
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || 'Invalid media upload.',
    });
  });
};

/**
 * Validate magic bytes via sharp and optimize image to WebP (max 1920px width, aspect preserved).
 */
const processWebsiteImageBuffer = async (buffer, { maxWidth = MAX_IMAGE_WIDTH, quality = 82 } = {}) => {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    const err = new Error('Uploaded image file is empty.');
    err.statusCode = 400;
    throw err;
  }

  let metadata;
  try {
    metadata = await sharp(buffer, { failOn: 'error' }).metadata();
  } catch (_e) {
    const err = new Error('Invalid or corrupted image file. Please upload a valid JPG, PNG, or WEBP image.');
    err.statusCode = 400;
    throw err;
  }

  if (!metadata || !ALLOWED_SHARP_FORMATS.has(String(metadata.format || '').toLowerCase())) {
    const err = new Error('Unsupported image content. Only JPG, PNG, and WEBP images are allowed.');
    err.statusCode = 400;
    throw err;
  }

  try {
    const { data, info } = await sharp(buffer)
      .rotate() // Auto-orient & strip EXIF
      .resize({
        width: maxWidth,
        withoutEnlargement: true,
        fit: 'inside',
      })
      .webp({ quality })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: data,
      width: info.width,
      height: info.height,
      sizeBytes: info.size,
      mimeType: 'image/webp',
    };
  } catch (_e) {
    const err = new Error('Failed to process image. Please try another JPG, PNG, or WEBP file.');
    err.statusCode = 400;
    throw err;
  }
};

const saveProcessedWebsiteImage = async (prefix, processed) => {
  ensureWebsiteUploadDir();
  const safePrefix = String(prefix || 'media').replace(/[^a-zA-Z0-9_-]/g, '');
  const randomSuffix = crypto.randomBytes(6).toString('hex');
  const storageKey = `${safePrefix}-${Date.now()}-${randomSuffix}.webp`;
  const targetPath = path.resolve(WEBSITE_UPLOAD_DIR, storageKey);

  if (!targetPath.startsWith(WEBSITE_UPLOAD_DIR + path.sep)) {
    throw new Error('Invalid storage path resolved.');
  }

  await fs.promises.writeFile(targetPath, processed.buffer);

  return {
    url: `/uploads/website/${storageKey}`,
    storageKey,
    mimeType: processed.mimeType,
    sizeBytes: processed.sizeBytes,
    width: processed.width,
    height: processed.height,
  };
};

const deleteStoredWebsiteMedia = async (storageKey) => {
  if (!storageKey || typeof storageKey !== 'string') return;
  const safeName = path.basename(storageKey.trim());
  if (!safeName || safeName !== storageKey.trim()) return;

  const targetPath = path.resolve(WEBSITE_UPLOAD_DIR, safeName);
  if (!targetPath.startsWith(WEBSITE_UPLOAD_DIR + path.sep)) return;

  try {
    await fs.promises.unlink(targetPath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`Failed to delete website media (${safeName}):`, err.message);
    }
  }
};

const validateVideoUrl = (rawUrl) => {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) {
    const err = new Error('Video URL is required for VIDEO media items.');
    err.statusCode = 400;
    throw err;
  }
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    const err = new Error('Invalid or unsafe video URL protocol.');
    err.statusCode = 400;
    throw err;
  }
  if (!/^(https?:\/\/|\/uploads\/)/i.test(trimmed)) {
    const err = new Error('Video URL must be a valid http(s) URL.');
    err.statusCode = 400;
    throw err;
  }
  return trimmed;
};

let seededOnce = false;
const seedInitialGalleryIfEmpty = async () => {
  if (seededOnce) return;
  const count = await WebsiteMedia.countDocuments({});
  if (count > 0) {
    seededOnce = true;
    return;
  }

  await WebsiteMedia.insertMany([
    {
      type: 'PHOTO',
      title: 'Show Up For Yourself',
      description: 'Progressive strength and conditioning work inside Man & Machine.',
      category: 'TRAINING',
      mediaUrl: '/images/framer/experience-conditioning.png',
      displayOrder: 1,
      featured: true,
      active: true,
    },
    {
      type: 'PHOTO',
      title: 'Keep Building',
      description: 'A commitment to strength, confidence, and the discipline to keep going.',
      category: 'TRAINING',
      mediaUrl: '/images/framer/experience-strength.png',
      displayOrder: 2,
      featured: true,
      active: true,
    },
    {
      type: 'PHOTO',
      title: 'Main Training Floor',
      description: 'Commercial-grade free weights, calibrated racks, and conditioning turf.',
      category: 'GYM',
      mediaUrl: '/images/framer/training-floor.png',
      displayOrder: 3,
      featured: false,
      active: true,
    },
    {
      type: 'PHOTO',
      title: 'Man & Machine Community',
      description: 'Members and coaches pushing together every session.',
      category: 'EVENTS',
      mediaUrl: '/images/framer/community-together.png',
      displayOrder: 4,
      featured: false,
      active: true,
    },
  ]);
  seededOnce = true;
};

module.exports = {
  MAX_WEBSITE_IMAGE_BYTES,
  ALLOWED_IMAGE_MIME_TYPES,
  WEBSITE_UPLOAD_DIR,
  handleWebsiteMediaUpload,
  processWebsiteImageBuffer,
  saveProcessedWebsiteImage,
  deleteStoredWebsiteMedia,
  validateVideoUrl,
  seedInitialGalleryIfEmpty,
};
