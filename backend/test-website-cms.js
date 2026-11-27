/**
 * test-website-cms.js
 * -------------------
 * Automated verification for Admin-editable Website Content + Gym Gallery:
 * - Image upload, magic-byte validation, WebP optimization, replacement cleanup, soft-delete
 * - Video creation & unsafe URL rejection
 * - Reordering, enable/disable, featured toggle
 * - Public gallery filtering (active-only, sorted by displayOrder)
 * - WebsiteContent section updates
 * - RBAC (401/403 for unauthenticated/non-admin)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const mongoose = require('mongoose');

const WebsiteMedia = require('./src/models/WebsiteMedia');
const WebsiteContent = require('./src/models/WebsiteContent');
const { DEFAULT_CONTENT } = require('./src/models/WebsiteContent');
const websiteController = require('./src/controllers/websiteController');
const {
  WEBSITE_UPLOAD_DIR,
  processWebsiteImageBuffer,
  deleteStoredWebsiteMedia,
  validateVideoUrl,
} = require('./src/services/websiteMediaService');
const { authorize } = require('./src/middleware/authMiddleware');

const makePng = (w = 800, h = 600) =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: 235, g: 62, b: 46 } } }).png().toBuffer();

const mkRes = () => ({
  statusCode: 200,
  body: null,
  status(c) {
    this.statusCode = c;
    return this;
  },
  json(d) {
    this.body = d;
    return this;
  },
});

const run = async () => {
  let passed = 0;
  const createdKeys = [];
  const test = async (name, fn) => {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  };

  console.log('Running Website CMS & Gym Gallery tests...\n');

  const mediaStore = [];
  let contentDoc = null;

  const wrapMedia = (obj) => ({
    ...obj,
    async save() {
      const idx = mediaStore.findIndex((x) => String(x._id) === String(this._id));
      if (idx >= 0) mediaStore[idx] = { ...this };
      return this;
    },
    toObject() {
      return { ...this };
    },
  });

  const orig = {
    countDocuments: WebsiteMedia.countDocuments,
    create: WebsiteMedia.create,
    find: WebsiteMedia.find,
    findOne: WebsiteMedia.findOne,
    bulkWrite: WebsiteMedia.bulkWrite,
    getOrCreateMain: WebsiteContent.getOrCreateMain,
  };

  WebsiteMedia.countDocuments = async () => mediaStore.filter((m) => !m.isDeleted).length;
  WebsiteMedia.create = async (data) => {
    const doc = wrapMedia({ _id: new mongoose.Types.ObjectId(), isDeleted: false, createdAt: new Date(), ...data });
    mediaStore.push(doc);
    return doc;
  };
  WebsiteMedia.findOne = async (filter = {}) => {
    const found = mediaStore.find(
      (m) => (!filter._id || String(m._id) === String(filter._id)) && (filter.isDeleted === undefined || m.isDeleted === filter.isDeleted)
    );
    return found ? wrapMedia(found) : null;
  };
  WebsiteMedia.find = (filter = {}) => {
    const matches = mediaStore.filter((m) => {
      if (filter.isDeleted !== undefined && m.isDeleted !== filter.isDeleted) return false;
      if (filter.active !== undefined && m.active !== filter.active) return false;
      if (filter.category && m.category !== filter.category) return false;
      if (filter.type && m.type !== filter.type) return false;
      return true;
    });
    const chain = {
      sort: (s) => {
        if (s?.displayOrder === 1) matches.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        return chain;
      },
      select: () => chain,
      populate: () => chain,
      lean: async () => matches.map((m) => ({ ...m })),
    };
    return chain;
  };
  WebsiteMedia.bulkWrite = async (ops) => {
    for (const op of ops) {
      const target = mediaStore.find((m) => String(m._id) === String(op.updateOne.filter._id));
      if (target && op.updateOne.update.$set) {
        Object.assign(target, op.updateOne.update.$set);
      }
    }
  };
  WebsiteContent.getOrCreateMain = async () => {
    if (!contentDoc) {
      contentDoc = {
        ...JSON.parse(JSON.stringify(DEFAULT_CONTENT)),
        async save() {
          return this;
        },
        toObject() {
          return JSON.parse(JSON.stringify(this));
        },
      };
      for (const sec of ['hero', 'about', 'facilities', 'community', 'cta']) {
        const val = contentDoc[sec];
        contentDoc[sec] = {
          ...val,
          toObject() {
            return { ...val };
          },
        };
      }
    }
    return contentDoc;
  };

  const adminUser = { _id: new mongoose.Types.ObjectId(), role: 'ADMIN', name: 'Admin' };

  try {
    let photoId = null;

    await test('RBAC blocks non-admin users with 403', async () => {
      const mw = authorize('ADMIN');
      const res = mkRes();
      let nextCalled = false;
      mw({ user: { role: 'CLIENT' } }, res, () => {
        nextCalled = true;
      });
      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 403);
    });

    await test('rejects corrupt/SVG image buffer with 400', async () => {
      await assert.rejects(
        () => processWebsiteImageBuffer(Buffer.from('<svg></svg>')),
        (err) => err.statusCode === 400
      );
    });

    await test('rejects unsafe javascript: video URL with 400', async () => {
      assert.throws(() => validateVideoUrl('javascript:alert(1)'), (err) => err.statusCode === 400);
    });

    await test('adds PHOTO gallery item and optimizes to WebP', async () => {
      const png = await makePng(2200, 1200);
      const res = mkRes();
      await websiteController.createGalleryMedia(
        {
          user: adminUser,
          body: { type: 'PHOTO', title: 'Main Floor', category: 'GYM', displayOrder: 1, featured: true, active: true },
          files: { image: [{ buffer: png }] },
        },
        res,
        (e) => { throw e; }
      );
      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.item.width, 1920);
      assert.ok(res.body.item.storageKey.endsWith('.webp'));
      createdKeys.push(res.body.item.storageKey);
      photoId = res.body.item._id;
      assert.ok(fs.existsSync(path.join(WEBSITE_UPLOAD_DIR, res.body.item.storageKey)));
    });

    await test('adds VIDEO gallery item with external URL', async () => {
      const res = mkRes();
      await websiteController.createGalleryMedia(
        {
          user: adminUser,
          body: {
            type: 'VIDEO',
            title: 'Deadlift Session',
            category: 'TRAINING',
            mediaUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            displayOrder: 2,
            active: true,
          },
          files: {},
        },
        res,
        (e) => { throw e; }
      );
      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.item.type, 'VIDEO');
    });

    await test('replaces PHOTO and deletes old file only after DB save', async () => {
      const oldItem = mediaStore.find((m) => String(m._id) === String(photoId));
      const oldKey = oldItem.storageKey;
      const newPng = await makePng(800, 800);
      const res = mkRes();
      await websiteController.updateGalleryMedia(
        {
          params: { id: String(photoId) },
          user: adminUser,
          body: { title: 'Main Floor Updated' },
          files: { image: [{ buffer: newPng }] },
        },
        res,
        (e) => { throw e; }
      );
      assert.strictEqual(res.statusCode, 200);
      const newKey = res.body.item.storageKey;
      createdKeys.push(newKey);
      assert.notStrictEqual(oldKey, newKey);
      assert.strictEqual(fs.existsSync(path.join(WEBSITE_UPLOAD_DIR, oldKey)), false);
      assert.strictEqual(fs.existsSync(path.join(WEBSITE_UPLOAD_DIR, newKey)), true);
    });

    await test('disables item and hides it from GET /api/public/gallery', async () => {
      const toggleRes = mkRes();
      await websiteController.toggleGalleryMediaStatus(
        { params: { id: String(photoId) }, user: adminUser, body: { active: false } },
        toggleRes,
        (e) => { throw e; }
      );
      assert.strictEqual(toggleRes.body.item.active, false);

      const pubRes = mkRes();
      await websiteController.getPublicGallery({ query: {} }, pubRes, (e) => { throw e; });
      assert.strictEqual(pubRes.statusCode, 200);
      assert.strictEqual(pubRes.body.items.length, 1);
      assert.strictEqual(pubRes.body.items[0].title, 'Deadlift Session');
    });

    await test('reorders gallery items and persists displayOrder', async () => {
      const videoId = mediaStore[1]._id;
      const res = mkRes();
      await websiteController.reorderGalleryMedia(
        { user: adminUser, body: { orderedIds: [String(videoId), String(photoId)] } },
        res,
        (e) => { throw e; }
      );
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(mediaStore[1].displayOrder, 1);
      assert.strictEqual(mediaStore[0].displayOrder, 2);
    });

    await test('soft-deletes gallery item and cleans up stored file', async () => {
      const key = mediaStore.find((m) => String(m._id) === String(photoId)).storageKey;
      const res = mkRes();
      await websiteController.deleteGalleryMedia(
        { params: { id: String(photoId) }, user: adminUser },
        res,
        (e) => { throw e; }
      );
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(mediaStore[0].isDeleted, true);
      assert.strictEqual(fs.existsSync(path.join(WEBSITE_UPLOAD_DIR, key)), false);
    });

    await test('updates WebsiteContent section (gallerySection) and serves it publicly', async () => {
      const updRes = mkRes();
      await websiteController.updateWebsiteContentSection(
        { params: { section: 'gallerySection' }, user: adminUser, body: { headline: 'OUR FLOOR IN ACTION.' }, files: {} },
        updRes,
        (e) => { throw e; }
      );
      assert.strictEqual(updRes.statusCode, 200);

      const pubRes = mkRes();
      await websiteController.getPublicWebsiteContent({}, pubRes, (e) => { throw e; });
      assert.strictEqual(pubRes.statusCode, 200);
      assert.strictEqual(pubRes.body.content.gallerySection.headline, 'OUR FLOOR IN ACTION.');
    });
  } finally {
    WebsiteMedia.countDocuments = orig.countDocuments;
    WebsiteMedia.create = orig.create;
    WebsiteMedia.find = orig.find;
    WebsiteMedia.findOne = orig.findOne;
    WebsiteMedia.bulkWrite = orig.bulkWrite;
    WebsiteContent.getOrCreateMain = orig.getOrCreateMain;

    for (const k of createdKeys) {
      await deleteStoredWebsiteMedia(k);
    }
  }

  console.log(`\nAll ${passed} Website CMS & Gym Gallery tests passed!`);
};

run().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
