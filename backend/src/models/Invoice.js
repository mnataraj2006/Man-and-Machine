const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    itemType: {
      type: String,
      enum: ['MEMBERSHIP', 'JOINING_FEE', 'PERSONAL_TRAINING', 'DISCOUNT', 'TAX', 'OTHER'],
      default: 'OTHER',
    },
    quantity: { type: Number, default: 1, min: 1 },
    unitPrice: { type: Number, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const auditLogSchema = new mongoose.Schema(
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

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      default: null,
      unique: true,
      trim: true,
      index: true,
    },
    clientProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientProfile', default: null, index: true },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // Optional: walk-in clients (no User account) are identified by clientProfileId only
      default: null,
      index: true,
    },
    membershipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Membership',
      default: null,
      index: true,
    },
    trainerBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TrainerBooking',
      default: null,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        'MEMBERSHIP_PURCHASE',
        'MEMBERSHIP_RENEWAL',
        'JOINING_FEE',
        'PERSONAL_TRAINING',
        'OTHER_SERVICE',
      ],
      default: 'MEMBERSHIP_PURCHASE',
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    items: {
      type: [invoiceItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    joiningFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    discount: {
      type: Number,
      min: 0,
      default: 0,
    },
    additionalCharges: {
      type: Number,
      min: 0,
      default: 0,
    },
    taxRate: {
      type: Number,
      min: 0,
      default: 0,
    },
    taxAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    refundedAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    balanceAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ['PAID', 'PARTIALLY_PAID', 'PENDING', 'CANCELLED', 'REFUNDED'],
      default: 'PENDING',
      index: true,
    },
    paymentMethod: {
      type: String,
      uppercase: true,
      trim: true,
      default: 'UPI',
      index: true,
    },
    invoiceDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
      index: true,
    },
    notes: {
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
      type: [auditLogSchema],
      default: [],
    },
  },
  { timestamps: true }
);

invoiceSchema.index({ branchId: 1, invoiceDate: -1 });
invoiceSchema.index({ status: 1, balanceAmount: -1 });
invoiceSchema.index({ clientId: 1, invoiceDate: -1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
