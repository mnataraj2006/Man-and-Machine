const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ALLOWED_SHARP_FORMATS = new Set(['jpeg', 'png', 'webp']);
const TARGET_DIMENSION = 400; // 400x400 px square profile photo

const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');
const TRAINER_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'trainers');

const ensureUploadDir = () => {
  if (!fs.existsSync(TRAINER_UPLOAD_DIR)) {
    fs.mkdirSync(TRAINER_UPLOAD_DIR, { recursive: true });
  }
};

// Multer memory storage so we can validate & process via sharp before touching disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PHOTO_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const mime = String(file.mimetype || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mime)) {
      const err = new Error('Unsupported image format. Please upload a JPG, PNG, or WEBP image.');
      err.statusCode = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

/**
 * Express middleware for optional or required single 'photo' upload with friendly 400 errors.
 */
const handleTrainerPhotoUpload = (req, res, next) => {
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }

  upload.single('photo')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Profile photo exceeds the maximum allowed size of 5 MB.',
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid file upload request.',
      });
    }
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || 'Invalid profile photo upload.',
    });
  });
};

/**
 * Validate magic bytes/image integrity and resize/compress to 400x400 WebP in memory.
 */
const processTrainerPhotoBuffer = async (buffer) => {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    const err = new Error('Uploaded image file is empty.');
    err.statusCode = 400;
    throw err;
  }

  let metadata;
  try {
    metadata = await sharp(buffer, { failOn: 'error' }).metadata();
  } catch (_e) {
    const err = new Error('Invalid or corrupted image file. Please upload a valid JPG, PNG, or WEBP photo.');
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
      .rotate() // Auto-orient based on EXIF and strip EXIF metadata on output
      .resize(TARGET_DIMENSION, TARGET_DIMENSION, {
        fit: 'cover',
        position: 'attention',
      })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: data,
      width: info.width,
      height: info.height,
      sizeBytes: info.size,
      mimeType: 'image/webp',
    };
  } catch (_e) {
    const err = new Error('Failed to process image. Please try another JPG, PNG, or WEBP photo.');
    err.statusCode = 400;
    throw err;
  }
};

/**
 * Persist a processed photo buffer to disk using a safe, non-guessable storage key.
 */
const saveProcessedTrainerPhoto = async (trainerId, processed) => {
  ensureUploadDir();
  const safeId = String(trainerId).replace(/[^a-zA-Z0-9_-]/g, '');
  const randomSuffix = crypto.randomBytes(6).toString('hex');
  const storageKey = `trainer-${safeId}-${Date.now()}-${randomSuffix}.webp`;
  const targetPath = path.resolve(TRAINER_UPLOAD_DIR, storageKey);

  if (!targetPath.startsWith(TRAINER_UPLOAD_DIR + path.sep)) {
    throw new Error('Invalid storage path resolved.');
  }

  await fs.promises.writeFile(targetPath, processed.buffer);

  return {
    url: `/uploads/trainers/${storageKey}`,
    storageKey,
    uploadedAt: new Date(),
    mimeType: processed.mimeType,
    sizeBytes: processed.sizeBytes,
    width: processed.width,
    height: processed.height,
  };
};

/**
 * Safely delete a stored photo by storageKey (ignores missing files, blocks traversal).
 */
const deleteStoredTrainerPhoto = async (storageKey) => {
  if (!storageKey || typeof storageKey !== 'string') return;
  const safeName = path.basename(storageKey.trim());
  if (!safeName || safeName !== storageKey.trim()) return;

  const targetPath = path.resolve(TRAINER_UPLOAD_DIR, safeName);
  if (!targetPath.startsWith(TRAINER_UPLOAD_DIR + path.sep)) return;

  try {
    await fs.promises.unlink(targetPath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`Failed to delete trainer photo (${safeName}):`, err.message);
    }
  }
};

const emptyProfilePhoto = () => ({
  url: '',
  storageKey: '',
  uploadedAt: null,
  mimeType: '',
  sizeBytes: 0,
  width: 0,
  height: 0,
});

const serializeTrainerPhoto = (profile) => {
  const url = profile?.profilePhoto?.url || profile?.profileImage || '';
  return {
    profileImage: url,
    profilePhoto: {
      url,
      uploadedAt: profile?.profilePhoto?.uploadedAt || null,
    },
  };
};

module.exports = {
  MAX_PHOTO_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  UPLOAD_ROOT,
  TRAINER_UPLOAD_DIR,
  handleTrainerPhotoUpload,
  processTrainerPhotoBuffer,
  saveProcessedTrainerPhoto,
  deleteStoredTrainerPhoto,
  emptyProfilePhoto,
  serializeTrainerPhoto,
};
