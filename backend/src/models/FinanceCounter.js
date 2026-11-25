const mongoose = require('mongoose');

const financeCounterSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const FinanceCounter = mongoose.model('FinanceCounter', financeCounterSchema);

module.exports = FinanceCounter;
