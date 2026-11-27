const mongoose = require('mongoose');

const biometricPinSequenceSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    sequence: {
      type: Number,
      required: true,
      default: 1000,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Atomically allocates the next numeric biometric PIN for a device using MongoDB $inc.
 * Safe across multiple Render instances and simultaneous first-time initialization.
 */
biometricPinSequenceSchema.statics.allocateNextPin = async function (deviceId, seedMin = 1000) {
  const key = `device:${String(deviceId)}`;
  const safeSeed = Math.max(1000, Number(seedMin) || 1000);

  // Safe first-time initialization without overwriting an existing counter
  try {
    await this.findOneAndUpdate(
      { _id: key },
      { $setOnInsert: { sequence: safeSeed } },
      { upsert: true, new: true }
    );
  } catch (err) {
    // Ignore concurrent E11000 race on first-time upsert; the counter now exists
    if (err?.code !== 11000) throw err;
  }

  // Ensure counter is at least safeSeed if manual PINs were added later, then atomically $inc
  await this.updateOne(
    { _id: key, sequence: { $lt: safeSeed } },
    { $set: { sequence: safeSeed } }
  );

  const doc = await this.findOneAndUpdate(
    { _id: key },
    { $inc: { sequence: 1 } },
    { new: true }
  );

  return String(doc.sequence);
};

const BiometricPinSequence = mongoose.model('BiometricPinSequence', biometricPinSequenceSchema);

module.exports = BiometricPinSequence;
