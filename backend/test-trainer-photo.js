/**
 * test-trainer-photo.js
 * ---------------------
 * Automated verification for Trainer Profile Photo processing, validation,
 * storage lifecycle, RBAC, branch isolation, and controller integration.
 *
 * Runs completely self-contained without touching any production database
 * or leaving test images on disk.
 */

const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');
const sharp = require('sharp');
const mongoose = require('mongoose');

const {
  MAX_PHOTO_SIZE_BYTES,
  TRAINER_UPLOAD_DIR,
  handleTrainerPhotoUpload,
  processTrainerPhotoBuffer,
  saveProcessedTrainerPhoto,
  deleteStoredTrainerPhoto,
  serializeTrainerPhoto,
} = require('./src/services/trainerPhotoService');

const adminController = require('./src/controllers/adminController');
const User = require('./src/models/User');
const TrainerProfile = require('./src/models/TrainerProfile');
const Branch = require('./src/models/Branch');

const makePngBuffer = async (width = 1200, height = 800) => {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 235, g: 62, b: 46 },
    },
  })
    .png()
    .toBuffer();
};

const makeJpegBuffer = async (width = 800, height = 800) => {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 30, g: 30, b: 30 },
    },
  })
    .jpeg()
    .toBuffer();
};

const postMultipart = (port, urlPath, { fieldName = 'photo', filename = 'test.png', mime = 'image/png', buffer, fields = {} }) => {
  return new Promise((resolve, reject) => {
    const boundary = '----MMTestBoundary' + Date.now();
    const parts = [];

    for (const [k, v] of Object.entries(fields)) {
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
    }
    if (buffer) {
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`
        )
      );
      parts.push(buffer);
      parts.push(Buffer.from('\r\n'));
    }
    parts.push(Buffer.from(`--${boundary}--\r\n`));

    const body = Buffer.concat(parts);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, data: raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

const run = async () => {
  const createdStorageKeys = [];
  let passed = 0;

  const test = async (name, fn) => {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  };

  console.log('Running Trainer Profile Photo tests...\n');

  // 1. Image processing & validation
  await test('processes large PNG (1200x800) into 400x400 WebP', async () => {
    const png = await makePngBuffer(1200, 800);
    const processed = await processTrainerPhotoBuffer(png);
    assert.strictEqual(processed.width, 400);
    assert.strictEqual(processed.height, 400);
    assert.strictEqual(processed.mimeType, 'image/webp');
    assert.ok(processed.sizeBytes > 0 && processed.sizeBytes < 100 * 1024);
  });

  await test('processes JPEG image into 400x400 WebP', async () => {
    const jpg = await makeJpegBuffer(800, 800);
    const processed = await processTrainerPhotoBuffer(jpg);
    assert.strictEqual(processed.width, 400);
    assert.strictEqual(processed.height, 400);
    assert.strictEqual(processed.mimeType, 'image/webp');
  });

  await test('rejects corrupt/invalid image buffer with 400', async () => {
    await assert.rejects(
      () => processTrainerPhotoBuffer(Buffer.from('not-an-image-MZ-executable')),
      (err) => err.statusCode === 400
    );
  });

  await test('rejects SVG payload even if disguised', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    await assert.rejects(
      () => processTrainerPhotoBuffer(svg),
      (err) => err.statusCode === 400
    );
  });

  // 2. Save & delete & traversal protection
  await test('saves processed photo to disk and deletes it safely', async () => {
    const png = await makePngBuffer(500, 500);
    const processed = await processTrainerPhotoBuffer(png);
    const trainerId = new mongoose.Types.ObjectId();
    const saved = await saveProcessedTrainerPhoto(trainerId, processed);
    createdStorageKeys.push(saved.storageKey);

    assert.ok(saved.url.startsWith('/uploads/trainers/trainer-'));
    assert.ok(saved.storageKey.endsWith('.webp'));
    assert.ok(fs.existsSync(path.join(TRAINER_UPLOAD_DIR, saved.storageKey)));

    // Path traversal attempt should be a safe no-op
    await deleteStoredTrainerPhoto('../../package.json');
    assert.ok(fs.existsSync(path.join(__dirname, 'package.json')));

    // Normal delete removes file
    await deleteStoredTrainerPhoto(saved.storageKey);
    assert.strictEqual(fs.existsSync(path.join(TRAINER_UPLOAD_DIR, saved.storageKey)), false);
  });

  // 3. Multer middleware HTTP tests
  const app = express();
  app.post('/upload', handleTrainerPhotoUpload, (req, res) => {
    res.status(200).json({ success: true, hasFile: Boolean(req.file), size: req.file?.size || 0 });
  });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address();

  try {
    await test('accepts valid PNG multipart upload', async () => {
      const png = await makePngBuffer(300, 300);
      const res = await postMultipart(port, '/upload', { filename: 'coach.png', mime: 'image/png', buffer: png });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.hasFile, true);
    });

    await test('rejects invalid file type (.svg / .exe) with 400', async () => {
      const res = await postMultipart(port, '/upload', {
        filename: 'evil.exe',
        mime: 'application/octet-stream',
        buffer: Buffer.from('MZ'),
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
    });

    await test('rejects oversized file (> 5 MB) with 400', async () => {
      const big = Buffer.alloc(MAX_PHOTO_SIZE_BYTES + 1024, 0xff);
      const res = await postMultipart(port, '/upload', {
        filename: 'huge.jpg',
        mime: 'image/jpeg',
        buffer: big,
      });
      assert.strictEqual(res.status, 400);
      assert.match(res.data.message, /5 MB/i);
    });
  } finally {
    server.close();
  }

  // 4. Controller integration (Branch isolation + Upload/Replace/Remove) with isolated stubs
  await test('enforces branch isolation on uploadTrainerPhoto (403 on branch mismatch)', async () => {
    const branchA = new mongoose.Types.ObjectId();
    const branchB = new mongoose.Types.ObjectId();
    const trainerId = new mongoose.Types.ObjectId();

    const origFindOne = User.findOne;
    User.findOne = async () => ({ _id: trainerId, role: 'TRAINER', branchId: branchB });

    try {
      const req = {
        params: { id: String(trainerId) },
        user: { _id: new mongoose.Types.ObjectId(), role: 'ADMIN', branchId: branchA },
        query: {},
        body: {},
        file: { buffer: await makePngBuffer(200, 200) },
      };
      const res = {
        statusCode: 200,
        status(c) {
          this.statusCode = c;
          return this;
        },
        json(d) {
          this.body = d;
          return this;
        },
      };
      let caught = null;
      await adminController.uploadTrainerPhoto(req, res, (err) => {
        caught = err;
      });
      assert.ok(caught);
      assert.strictEqual(caught.statusCode, 403);
    } finally {
      User.findOne = origFindOne;
    }
  });

  await test('uploadTrainerPhoto replaces old photo and deleteTrainerPhoto removes it', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const trainerId = new mongoose.Types.ObjectId();

    const storedProfile = {
      userId: trainerId,
      branchId,
      profileImage: '',
      profilePhoto: { url: '', storageKey: '', uploadedAt: null },
      async save() {
        return this;
      },
    };

    const origUserFindOne = User.findOne;
    const origProfFindOne = TrainerProfile.findOne;
    User.findOne = async () => ({ _id: trainerId, role: 'TRAINER', branchId, phone: '9876543210', email: 'c@mm.com' });
    TrainerProfile.findOne = async () => storedProfile;

    const mkRes = () => ({
      statusCode: 200,
      status(c) {
        this.statusCode = c;
        return this;
      },
      json(d) {
        this.body = d;
        return this;
      },
    });

    try {
      // Upload 1st photo
      const res1 = mkRes();
      await adminController.uploadTrainerPhoto(
        {
          params: { id: String(trainerId) },
          user: { role: 'ADMIN' },
          query: {},
          body: {},
          file: { buffer: await makePngBuffer(300, 300) },
        },
        res1,
        (e) => {
          throw e;
        }
      );
      assert.strictEqual(res1.statusCode, 200);
      const firstKey = storedProfile.profilePhoto.storageKey;
      createdStorageKeys.push(firstKey);
      assert.ok(fs.existsSync(path.join(TRAINER_UPLOAD_DIR, firstKey)));

      // Replace with 2nd photo
      const res2 = mkRes();
      await adminController.uploadTrainerPhoto(
        {
          params: { id: String(trainerId) },
          user: { role: 'ADMIN' },
          query: {},
          body: {},
          file: { buffer: await makeJpegBuffer(300, 300) },
        },
        res2,
        (e) => {
          throw e;
        }
      );
      assert.strictEqual(res2.statusCode, 200);
      const secondKey = storedProfile.profilePhoto.storageKey;
      createdStorageKeys.push(secondKey);
      assert.notStrictEqual(firstKey, secondKey);
      assert.strictEqual(fs.existsSync(path.join(TRAINER_UPLOAD_DIR, firstKey)), false, 'Old photo should be deleted');
      assert.strictEqual(fs.existsSync(path.join(TRAINER_UPLOAD_DIR, secondKey)), true, 'New photo should exist');

      // Delete photo
      const res3 = mkRes();
      await adminController.deleteTrainerPhoto(
        { params: { id: String(trainerId) }, user: { role: 'ADMIN' }, query: {}, body: {} },
        res3,
        (e) => {
          throw e;
        }
      );
      assert.strictEqual(res3.statusCode, 200);
      assert.strictEqual(storedProfile.profileImage, '');
      assert.strictEqual(storedProfile.profilePhoto.url, '');
      assert.strictEqual(fs.existsSync(path.join(TRAINER_UPLOAD_DIR, secondKey)), false, 'Deleted photo should be removed from disk');
    } finally {
      User.findOne = origUserFindOne;
      TrainerProfile.findOne = origProfFindOne;
    }
  });

  await test('serializeTrainerPhoto handles trainers without photos cleanly', async () => {
    const empty = serializeTrainerPhoto(null);
    assert.deepStrictEqual(empty, { profileImage: '', profilePhoto: { url: '', uploadedAt: null } });
  });

  // Final cleanup of any lingering test files
  for (const key of createdStorageKeys) {
    await deleteStoredTrainerPhoto(key);
  }

  console.log(`\nAll ${passed} trainer profile photo tests passed!`);
};

run().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
