const mongoose = require('mongoose');

const DEFAULT_PAYMENT_METHODS = [
  { code: 'CASH', label: 'Cash', isActive: true },
  { code: 'UPI', label: 'UPI', isActive: true },
  { code: 'CARD', label: 'Card', isActive: true },
  { code: 'BANK_TRANSFER', label: 'Bank Transfer', isActive: true },
  { code: 'ONLINE', label: 'Online Payment', isActive: true },
  { code: 'OTHER', label: 'Other', isActive: true },
];

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Electricity', isActive: true },
  { name: 'Rent', isActive: true },
  { name: 'Equipment', isActive: true },
  { name: 'Maintenance', isActive: true },
  { name: 'Cleaning', isActive: true },
  { name: 'Staff', isActive: true },
  { name: 'Marketing', isActive: true },
  { name: 'Internet', isActive: true },
  { name: 'Water', isActive: true },
  { name: 'Supplies', isActive: true },
  { name: 'Other', isActive: true },
];

const paymentMethodConfigSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    label: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const expenseCategoryConfigSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const financeConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      unique: true,
      default: 'default',
    },
    paymentMethods: {
      type: [paymentMethodConfigSchema],
      default: () => DEFAULT_PAYMENT_METHODS,
    },
    expenseCategories: {
      type: [expenseCategoryConfigSchema],
      default: () => DEFAULT_EXPENSE_CATEGORIES,
    },
    invoiceSettings: {
      prefix: { type: String, trim: true, uppercase: true, default: 'MM' },
      receiptPrefix: { type: String, trim: true, uppercase: true, default: 'RCP' },
      expensePrefix: { type: String, trim: true, uppercase: true, default: 'EXP' },
      sequenceStart: { type: Number, min: 1, default: 1 },
      defaultDueDays: { type: Number, min: 0, default: 7 },
      gstEnabled: { type: Boolean, default: false },
      gstRate: { type: Number, min: 0, max: 100, default: 0 },
      gstNumber: { type: String, trim: true, default: '' },
      receiptFooter: {
        type: String,
        trim: true,
        default: 'Thank you for training with MAN & MACHINE FITNESS GYM.',
      },
      showBranchAddress: { type: Boolean, default: true },
    },
    defaults: {
      timezone: { type: String, default: 'Asia/Kolkata' },
      currency: { type: String, default: 'INR' },
      currencySymbol: { type: String, default: '₹' },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

financeConfigSchema.statics.getOrCreateConfig = async function () {
  let config = await this.findOne({ key: 'default' });
  if (!config) {
    config = await this.create({ key: 'default' });
  }
  return config;
};

const FinanceConfig = mongoose.model('FinanceConfig', financeConfigSchema);

module.exports = FinanceConfig;
