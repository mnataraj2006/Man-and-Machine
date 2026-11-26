const mongoose = require('mongoose');

const clientSequenceSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    sequence: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Atomically increments the client sequence and returns the formatted permanent Client ID (e.g. MM000001).
 * Uses MongoDB findOneAndUpdate with $inc so concurrent registrations never collide.
 */
clientSequenceSchema.statics.getNextClientId = async function (session = null) {
  const options = { new: true, upsert: true };
  if (session) options.session = session;

  const doc = await this.findByIdAndUpdate(
    'client',
    { $inc: { sequence: 1 } },
    options
  );
  return `MM${String(doc.sequence).padStart(6, '0')}`;
};

const ClientSequence = mongoose.model('ClientSequence', clientSequenceSchema);

module.exports = ClientSequence;
