const mongoose = require('mongoose');

const paymentAuditSchema = new mongoose.Schema(
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

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    clientProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientProfile', default: null, index: true },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null,
      index: true,
    },
    membershipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Membership',
      default: null,
      index: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    receiptNumber: {
      type: String,
      trim: true,
      default: undefined,
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      uppercase: true,
      trim: true,
      default: 'UPI',
      index: true,
    },
    status: {
      type: String,
      enum: ['PAID', 'PENDING', 'PENDING_APPROVAL', 'REJECTED', 'FAILED', 'REFUNDED'],
      default: 'PAID',
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    receiptUrl: {
      type: String,
      default: '',
    },
    refundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    refundReason: {
      type: String,
      trim: true,
      default: '',
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    auditLogs: {
      type: [paymentAuditSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ userId: 1, date: -1 });
paymentSchema.index({ branchId: 1, status: 1, date: -1 });
paymentSchema.index({ receiptNumber: 1 }, { unique: true, sparse: true });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
