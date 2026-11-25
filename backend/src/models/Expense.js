const mongoose = require('mongoose');

const expenseAuditSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    oldAmount: { type: Number, default: null },
    newAmount: { type: Number, default: null },
    oldStatus: { type: String, default: null },
    newStatus: { type: String, default: null },
    reason: { type: String, trim: true, default: '' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    expenseNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    expenseDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Expense category is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Expense description is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0.01, 'Expense amount must be greater than zero'],
    },
    paymentMethod: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      default: 'CASH',
      index: true,
    },
    vendor: {
      type: String,
      trim: true,
      default: '',
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    attachmentUrl: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'CANCELLED'],
      default: 'ACTIVE',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelReason: {
      type: String,
      trim: true,
      default: '',
    },
    auditLogs: {
      type: [expenseAuditSchema],
      default: [],
    },
  },
  { timestamps: true }
);

expenseSchema.index({ branchId: 1, status: 1, expenseDate: -1 });
expenseSchema.index({ category: 1, status: 1 });

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;
