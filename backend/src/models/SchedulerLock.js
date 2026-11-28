const mongoose = require('mongoose');

const schedulerLockSchema = new mongoose.Schema(
  {
    lockKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    ownerId: {
      type: String,
      required: true,
      trim: true,
    },
    fencingToken: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
      required: true,
      index: true,
    },
    lastStartedAt: {
      type: Date,
      default: Date.now,
    },
    lastCompletedAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

schedulerLockSchema.statics.acquireLock = async function acquireLock(
  lockKey,
  ownerId,
  ttlMs = 120000
) {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + ttlMs);
  try {
    const doc = await this.findOneAndUpdate(
      {
        lockKey,
        $or: [{ lockedUntil: { $lte: now } }, { ownerId }],
      },
      {
        $set: {
          ownerId,
          lockedUntil,
          lastStartedAt: now,
        },
        $inc: {
          fencingToken: 1,
        },
        $setOnInsert: {
          lockKey,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
      }
    ).lean();
    return doc;
  } catch (err) {
    if (err.code === 11000) {
      return null;
    }
    throw err;
  }
};

schedulerLockSchema.statics.renewLock = async function renewLock(
  lockKey,
  ownerId,
  fencingToken,
  ttlMs = 120000
) {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + ttlMs);
  return this.findOneAndUpdate(
    {
      lockKey,
      ownerId,
      fencingToken,
      lockedUntil: { $gt: now },
    },
    {
      $set: { lockedUntil },
    },
    { returnDocument: 'after' }
  ).lean();
};

schedulerLockSchema.statics.releaseLock = async function releaseLock(
  lockKey,
  ownerId,
  fencingToken = null,
  { lastError = '' } = {}
) {
  const filter = { lockKey, ownerId };
  if (typeof fencingToken === 'number') {
    filter.fencingToken = fencingToken;
  }
  return this.findOneAndUpdate(
    filter,
    {
      $set: {
        lockedUntil: new Date(0),
        lastCompletedAt: new Date(),
        lastError: String(lastError || '').slice(0, 500),
      },
    },
    { returnDocument: 'after' }
  ).lean();
};

const SchedulerLock = mongoose.model('SchedulerLock', schedulerLockSchema);

module.exports = SchedulerLock;
