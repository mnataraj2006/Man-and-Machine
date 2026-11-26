const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const FinanceConfig = require('../models/FinanceConfig');
const FinanceCounter = require('../models/FinanceCounter');
const Branch = require('../models/Branch');
const Membership = require('../models/Membership');
const ClientProfile = require('../models/ClientProfile');
const TrainerBooking = require('../models/TrainerBooking');
const Notification = require('../models/Notification');

const IST_TIMEZONE = 'Asia/Kolkata';

// ==========================================
// 1. TIMEZONE-SAFE (Asia/Kolkata) DATE HELPERS
// ==========================================

const getKolkataParts = (input = new Date()) => {
  const date = input instanceof Date ? input : new Date(input);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(safeDate); // YYYY-MM-DD
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day, dateStr };
};

const getKolkataDayRange = (dateStrInput = null) => {
  const dateStr = dateStrInput || getKolkataParts().dateStr;
  return {
    dateStr,
    start: new Date(`${dateStr}T00:00:00+05:30`),
    end: new Date(`${dateStr}T23:59:59.999+05:30`),
  };
};

const addKolkataDays = (dateStr, deltaDays) => {
  const base = new Date(`${dateStr}T12:00:00+05:30`);
  base.setUTCDate(base.getUTCDate() + deltaDays);
  return getKolkataParts(base).dateStr;
};

const getKolkataMonthRange = (yearInput, monthInput) => {
  const nowParts = getKolkataParts();
  const year = yearInput || nowParts.year;
  const month = monthInput || nowParts.month;
  const mStr = String(month).padStart(2, '0');
  const start = new Date(`${year}-${mStr}-01T00:00:00+05:30`);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nmStr = String(nextMonth).padStart(2, '0');
  const nextStart = new Date(`${nextYear}-${nmStr}-01T00:00:00+05:30`);
  const end = new Date(nextStart.getTime() - 1);
  return { year, month, start, end };
};

const getKolkataYearRange = (yearInput) => {
  const year = yearInput || getKolkataParts().year;
  return {
    year,
    start: new Date(`${year}-01-01T00:00:00+05:30`),
    end: new Date(`${year}-12-31T23:59:59.999+05:30`),
  };
};

const resolveDailyRangeWindow = (range = 'last7days', startDate, endDate) => {
  const todayStr = getKolkataParts().dateStr;

  if (range === 'today') {
    return { ...getKolkataDayRange(todayStr), startDateStr: todayStr, endDateStr: todayStr };
  }
  if (range === 'yesterday') {
    const yStr = addKolkataDays(todayStr, -1);
    return { ...getKolkataDayRange(yStr), startDateStr: yStr, endDateStr: yStr };
  }
  if (range === 'last30days') {
    const startStr = addKolkataDays(todayStr, -29);
    return {
      start: new Date(`${startStr}T00:00:00+05:30`),
      end: new Date(`${todayStr}T23:59:59.999+05:30`),
      startDateStr: startStr,
      endDateStr: todayStr,
    };
  }
  if (range === 'custom' && startDate && endDate) {
    const startStr = startDate.slice(0, 10);
    const endStr = endDate.slice(0, 10);
    return {
      start: new Date(`${startStr}T00:00:00+05:30`),
      end: new Date(`${endStr}T23:59:59.999+05:30`),
      startDateStr: startStr,
      endDateStr: endStr,
    };
  }
  // Default: last7days
  const startStr = addKolkataDays(todayStr, -6);
  return {
    start: new Date(`${startStr}T00:00:00+05:30`),
    end: new Date(`${todayStr}T23:59:59.999+05:30`),
    startDateStr: startStr,
    endDateStr: todayStr,
  };
};

// ==========================================
// 2. BRANCH CODE & SEQUENTIAL NUMBERING
// ==========================================

const resolveBranchCode = async (branchId) => {
  if (!branchId) return 'GEN';
  const branch = await Branch.findById(branchId).select('code city name').lean();
  if (!branch) return 'GEN';
  if (branch.code && branch.code.trim()) {
    return branch.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  }
  const city = (branch.city || branch.name || 'GEN').toLowerCase();
  if (city.includes('kovilpatti')) return 'KVP';
  if (city.includes('karur')) return 'KAR';
  if (city.includes('sivakasi')) return 'SIV';
  return city.replace(/[^a-z0-9]/g, '').toUpperCase().slice(0, 3) || 'GEN';
};

const generateSequentialNumber = async ({ kind = 'INVOICE', branchId, date = new Date() }) => {
  const config = await FinanceConfig.getOrCreateConfig();
  const branchCode = await resolveBranchCode(branchId);
  const { year } = getKolkataParts(date);

  let prefix = 'MM';
  if (kind === 'INVOICE') prefix = config.invoiceSettings?.prefix || 'MM';
  else if (kind === 'RECEIPT') prefix = config.invoiceSettings?.receiptPrefix || 'RCP';
  else if (kind === 'EXPENSE') prefix = config.invoiceSettings?.expensePrefix || 'EXP';

  const counterKey = `${kind}:${prefix}:${branchCode}:${year}`;
  const startSeed = Math.max(1, Number(config.invoiceSettings?.sequenceStart) || 1);

  let counter = await FinanceCounter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 } },
    { new: true }
  );

  if (!counter) {
    try {
      counter = await FinanceCounter.create({ key: counterKey, seq: startSeed });
    } catch {
      counter = await FinanceCounter.findOneAndUpdate(
        { key: counterKey },
        { $inc: { seq: 1 } },
        { new: true }
      );
    }
  }

  return `${prefix}-${branchCode}-${year}-${String(counter.seq).padStart(6, '0')}`;
};

const generateTransactionRef = (tag = 'FIN') => {
  return `TXN-${tag}-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
};

// ==========================================
// 3. INVOICE <-> PAYMENT RECONCILIATION
// ==========================================

const roundMoney = (val) => Math.max(0, Math.round((Number(val) || 0) * 100) / 100);

const recalculateInvoiceFromPayments = async (invoiceId, actorId = null, reason = '') => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return null;

  const linkedPayments = await Payment.find({ invoiceId: invoice._id }).sort({ date: 1, createdAt: 1 });

  const paidAmount = roundMoney(
    linkedPayments
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  );
  const refundedAmount = roundMoney(
    linkedPayments
      .filter((p) => p.status === 'REFUNDED')
      .reduce((sum, p) => sum + (Number(p.refundedAmount) || Number(p.amount) || 0), 0)
  );

  const oldStatus = invoice.status;
  invoice.paidAmount = paidAmount;
  invoice.refundedAmount = refundedAmount;
  invoice.balanceAmount = roundMoney(Math.max(0, invoice.totalAmount - paidAmount));

  const latestPaid = [...linkedPayments].reverse().find((p) => p.status === 'PAID');
  if (latestPaid) {
    invoice.paymentMethod = latestPaid.paymentMethod;
  }

  if (invoice.status !== 'CANCELLED') {
    if (refundedAmount > 0 && paidAmount === 0) {
      invoice.status = 'REFUNDED';
    } else if (invoice.totalAmount > 0 && paidAmount >= invoice.totalAmount) {
      invoice.status = 'PAID';
      invoice.balanceAmount = 0;
    } else if (invoice.totalAmount === 0 && paidAmount === 0 && linkedPayments.some((p) => p.status === 'PAID')) {
      invoice.status = 'PAID';
    } else if (paidAmount > 0 && invoice.balanceAmount > 0) {
      invoice.status = 'PARTIALLY_PAID';
    } else {
      invoice.status = 'PENDING';
    }
  }

  if (actorId && (oldStatus !== invoice.status || reason)) {
    invoice.updatedBy = actorId;
    invoice.auditLogs.push({
      action: 'INVOICE_RECALCULATED',
      oldStatus,
      newStatus: invoice.status,
      oldAmount: invoice.totalAmount,
      newAmount: invoice.paidAmount,
      reason: reason || `Reconciled payments (Paid: ₹${paidAmount}, Balance: ₹${invoice.balanceAmount})`,
      userId: actorId,
      timestamp: new Date(),
    });
  }

  await invoice.save();

  // Sync linked Membership if invoice settles it
  if (invoice.membershipId && invoice.status === 'PAID') {
    const mem = await Membership.findById(invoice.membershipId);
    if (mem && mem.status === 'PENDING') {
      mem.status = 'ACTIVE';
      await mem.save();
      await ClientProfile.findOneAndUpdate(
        { userId: mem.userId },
        { membershipStatus: 'ACTIVE', membershipExpiryDate: mem.expiryDate }
      );
    }
  }

  // Sync linked TrainerBooking if settled
  if (invoice.trainerBookingId && invoice.status === 'PAID') {
    const booking = await TrainerBooking.findById(invoice.trainerBookingId);
    if (booking && booking.paymentStatus !== 'PAID') {
      booking.paymentStatus = 'PAID';
      booking.bookingStatus = 'CONFIRMED';
      await booking.save();
    }
  }

  return invoice;
};

/**
 * Generates an Invoice for a real billable transaction.
 * Reuses `existingPayment` if already created by existing client/admin flows so no duplicate Payments occur.
 */
const createInvoiceAndOptionalPayment = async ({
  clientId,
  clientProfileId = null,
  branchId,
  membershipId = null,
  trainerBookingId = null,
  category = 'MEMBERSHIP_PURCHASE',
  description,
  items = [],
  subtotal,
  joiningFee = 0,
  discount = 0,
  additionalCharges = 0,
  taxRate = 0,
  taxAmount = 0,
  totalAmount,
  paidAmount = 0,
  paymentMethod = 'UPI',
  invoiceDate = new Date(),
  dueDate = null,
  referenceNumber = '',
  notes = '',
  createdBy = null,
  existingPayment = null,
}) => {
  const config = await FinanceConfig.getOrCreateConfig();
  const safeDate = invoiceDate ? new Date(invoiceDate) : new Date();

  const resolvedSubtotal = roundMoney(subtotal !== undefined ? subtotal : totalAmount || 0);
  const resolvedJoiningFee = roundMoney(joiningFee);
  const resolvedDiscount = roundMoney(discount);
  const resolvedAdditional = roundMoney(additionalCharges);

  const taxableBase = Math.max(0, resolvedSubtotal + resolvedJoiningFee + resolvedAdditional - resolvedDiscount);
  const resolvedTaxRate = roundMoney(taxRate);
  const resolvedTaxAmount =
    taxAmount !== undefined && taxAmount !== null && Number(taxAmount) > 0
      ? roundMoney(taxAmount)
      : resolvedTaxRate > 0
      ? roundMoney((taxableBase * resolvedTaxRate) / 100)
      : 0;

  const computedTotal =
    totalAmount !== undefined && totalAmount !== null
      ? roundMoney(totalAmount)
      : roundMoney(taxableBase + resolvedTaxAmount);

  let initialPaid = 0;
  if (existingPayment) {
    initialPaid = existingPayment.status === 'PAID' ? roundMoney(existingPayment.amount) : 0;
  } else {
    initialPaid = roundMoney(paidAmount);
  }

  if (initialPaid > computedTotal) {
    const err = new Error('Initial paid amount cannot exceed invoice total.');
    err.statusCode = 400;
    throw err;
  }

  const normalizedMethod = (existingPayment?.paymentMethod || paymentMethod || 'UPI').toUpperCase().trim();
  const invoiceNumber = await generateSequentialNumber({
    kind: 'INVOICE',
    branchId,
    date: safeDate,
  });

  const defaultDueDays = Number(config.invoiceSettings?.defaultDueDays ?? 7);
  const resolvedDueDate =
    dueDate
      ? new Date(dueDate)
      : new Date(safeDate.getTime() + defaultDueDays * 24 * 60 * 60 * 1000);

  let status = 'PENDING';
  if (existingPayment?.status === 'REFUNDED') status = 'REFUNDED';
  else if (computedTotal > 0 && initialPaid >= computedTotal) status = 'PAID';
  else if (computedTotal === 0 && existingPayment?.status === 'PAID') status = 'PAID';
  else if (initialPaid > 0 && initialPaid < computedTotal) status = 'PARTIALLY_PAID';

  const balanceAmount = status === 'PAID' ? 0 : roundMoney(Math.max(0, computedTotal - initialPaid));

  const builtItems =
    items && items.length > 0
      ? items
      : [
          {
            title: description || 'Gym Service',
            itemType: category === 'PERSONAL_TRAINING' ? 'PERSONAL_TRAINING' : 'MEMBERSHIP',
            quantity: 1,
            unitPrice: resolvedSubtotal,
            amount: resolvedSubtotal,
          },
          ...(resolvedJoiningFee > 0
            ? [
                {
                  title: 'Joining Fee',
                  itemType: 'JOINING_FEE',
                  quantity: 1,
                  unitPrice: resolvedJoiningFee,
                  amount: resolvedJoiningFee,
                },
              ]
            : []),
          ...(resolvedDiscount > 0
            ? [
                {
                  title: 'Discount',
                  itemType: 'DISCOUNT',
                  quantity: 1,
                  unitPrice: -resolvedDiscount,
                  amount: -resolvedDiscount,
                },
              ]
            : []),
          ...(resolvedTaxAmount > 0
            ? [
                {
                  title: `GST (${resolvedTaxRate}%)`,
                  itemType: 'TAX',
                  quantity: 1,
                  unitPrice: resolvedTaxAmount,
                  amount: resolvedTaxAmount,
                },
              ]
            : []),
        ];

  const invoice = await Invoice.create({
    invoiceNumber,
    clientId,
    clientProfileId,
    membershipId,
    trainerBookingId,
    branchId,
    category,
    description: description || 'Membership & Gym Services',
    items: builtItems,
    subtotal: resolvedSubtotal,
    joiningFee: resolvedJoiningFee,
    discount: resolvedDiscount,
    additionalCharges: resolvedAdditional,
    taxRate: resolvedTaxRate,
    taxAmount: resolvedTaxAmount,
    totalAmount: computedTotal,
    paidAmount: initialPaid,
    refundedAmount: existingPayment?.status === 'REFUNDED' ? roundMoney(existingPayment.amount) : 0,
    balanceAmount,
    status,
    paymentMethod: normalizedMethod,
    invoiceDate: safeDate,
    dueDate: resolvedDueDate,
    notes: notes || '',
    createdBy,
    auditLogs: [
      {
        action: 'INVOICE_CREATED',
        oldAmount: null,
        newAmount: computedTotal,
        oldStatus: null,
        newStatus: status,
        reason: `Invoice ${invoiceNumber} generated`,
        userId: createdBy,
        timestamp: new Date(),
      },
    ],
  });

  let linkedPayment = existingPayment;
  if (existingPayment) {
    existingPayment.invoiceId = invoice._id;
    if (membershipId && !existingPayment.membershipId) {
      existingPayment.membershipId = membershipId;
    }
    if (existingPayment.status === 'PAID' && !existingPayment.receiptNumber) {
      existingPayment.receiptNumber = await generateSequentialNumber({
        kind: 'RECEIPT',
        branchId,
        date: existingPayment.date || safeDate,
      });
    }
    await existingPayment.save();
  } else if (initialPaid > 0) {
    const receiptNumber = await generateSequentialNumber({
      kind: 'RECEIPT',
      branchId,
      date: safeDate,
    });
    linkedPayment = await Payment.create({
      userId: clientId,
      clientProfileId,
      branchId,
      invoiceId: invoice._id,
      membershipId,
      transactionId: generateTransactionRef('INV'),
      receiptNumber,
      referenceNumber: referenceNumber || '',
      description: `${invoice.description} (${invoice.invoiceNumber})`,
      amount: initialPaid,
      paymentMethod: normalizedMethod,
      status: 'PAID',
      date: safeDate,
      notes: notes || '',
      createdBy,
      auditLogs: [
        {
          action: 'PAYMENT_RECORDED',
          oldAmount: 0,
          newAmount: initialPaid,
          oldStatus: null,
          newStatus: 'PAID',
          reason: `Payment against ${invoice.invoiceNumber}`,
          userId: createdBy,
          timestamp: new Date(),
        },
      ],
    });
  }

  return { invoice, payment: linkedPayment };
};

/**
 * Records a partial or full payment against an existing Invoice and generates a Receipt.
 */
const recordPaymentOnInvoice = async (
  invoiceId,
  { amount, paymentMethod = 'UPI', paymentDate = new Date(), referenceNumber = '', notes = '', createdBy }
) => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    const err = new Error('Invoice not found.');
    err.statusCode = 404;
    throw err;
  }

  if (invoice.status === 'CANCELLED' || invoice.status === 'REFUNDED') {
    const err = new Error(`Cannot record payment on a ${invoice.status.toLowerCase()} invoice.`);
    err.statusCode = 400;
    throw err;
  }

  const payAmount = roundMoney(amount);
  if (payAmount <= 0) {
    const err = new Error('Payment amount must be greater than zero.');
    err.statusCode = 400;
    throw err;
  }

  if (payAmount > roundMoney(invoice.balanceAmount)) {
    const err = new Error(
      `Payment amount (₹${payAmount}) cannot exceed outstanding balance (₹${invoice.balanceAmount}).`
    );
    err.statusCode = 400;
    throw err;
  }

  const safeDate = paymentDate ? new Date(paymentDate) : new Date();
  const normalizedMethod = (paymentMethod || 'UPI').toUpperCase().trim();
  const receiptNumber = await generateSequentialNumber({
    kind: 'RECEIPT',
    branchId: invoice.branchId,
    date: safeDate,
  });

  // Check if there is an unsettled PENDING payment record representing the original due;
  // for clean partial payment audit trail, if it's a partial settlement on an existing single PENDING payment, keep full history as new PAID payment or convert only when full match if no partials exist.
  // Creating an explicit PAID Payment record for each settlement guarantees exact date-wise cash/UPI reporting!
  const payment = await Payment.create({
    userId: invoice.clientId,
    clientProfileId: invoice.clientProfileId || null,
    branchId: invoice.branchId,
    invoiceId: invoice._id,
    membershipId: invoice.membershipId,
    transactionId: generateTransactionRef('RCP'),
    receiptNumber,
    referenceNumber: (referenceNumber || '').trim(),
    description: `Payment for ${invoice.invoiceNumber}: ${invoice.description}`,
    amount: payAmount,
    paymentMethod: normalizedMethod,
    status: 'PAID',
    date: safeDate,
    notes: (notes || '').trim(),
    createdBy,
    auditLogs: [
      {
        action: 'PAYMENT_RECORDED',
        oldAmount: 0,
        newAmount: payAmount,
        oldStatus: null,
        newStatus: 'PAID',
        reason: notes || `Settlement against ${invoice.invoiceNumber}`,
        userId: createdBy,
        timestamp: new Date(),
      },
    ],
  });

  // Remove/mark stale zero-collected placeholder PENDING payment only if full invoice is now settled and a matching PENDING placeholder existed without partial receipt
  if (payAmount >= invoice.balanceAmount) {
    await Payment.deleteMany({
      invoiceId: invoice._id,
      status: 'PENDING',
      receiptNumber: { $in: [null, '', undefined] },
    });
  }

  const updatedInvoice = await recalculateInvoiceFromPayments(
    invoice._id,
    createdBy,
    `Recorded payment ₹${payAmount} via ${normalizedMethod} (${receiptNumber})`
  );

  return { invoice: updatedInvoice, payment };
};

/**
 * Idempotent migration of legacy Payment records (that lack an invoiceId) and billable Memberships
 * so existing MongoDB records appear accurately inside Finance without duplicating anything.
 */
let syncPromise = null;
const ensureLegacyInvoicesSynced = async () => {
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    try {
      // 1. Sync unlinked Payments -> Invoices
      const unlinkedPayments = await Payment.find({
        invoiceId: null,
        status: { $in: ['PAID', 'PENDING', 'REFUNDED'] },
      }).sort({ date: 1, createdAt: 1 });

      for (const p of unlinkedPayments) {
        // Double-check if a Membership references this paymentId
        const linkedMem = await Membership.findOne({ paymentId: p._id }).lean();
        const linkedBooking = await TrainerBooking.findOne({ paymentId: p._id }).lean();

        const total = roundMoney(linkedMem?.finalAmount || p.amount || 0);
        const subtotal = roundMoney(linkedMem?.basePrice || total);
        const joiningFee = roundMoney(linkedMem?.joiningFee || 0);
        let discount = 0;
        if (linkedMem?.discountType === 'FIXED') discount = roundMoney(linkedMem.discountValue);
        else if (linkedMem?.discountType === 'PERCENTAGE') {
          discount = roundMoney(((subtotal + joiningFee) * (linkedMem.discountValue || 0)) / 100);
        }

        const category = linkedBooking
          ? 'PERSONAL_TRAINING'
          : linkedMem
          ? 'MEMBERSHIP_PURCHASE'
          : 'OTHER_SERVICE';

        await createInvoiceAndOptionalPayment({
          clientId: p.userId,
          branchId: p.branchId,
          membershipId: linkedMem?._id || null,
          trainerBookingId: linkedBooking?._id || null,
          category,
          description: p.description,
          subtotal,
          joiningFee,
          discount,
          totalAmount: total || roundMoney(p.amount),
          paymentMethod: p.paymentMethod,
          invoiceDate: p.date || p.createdAt,
          existingPayment: p,
        });
      }

      // 2. Sync historical paid/active Memberships that had finalAmount > 0 and no Invoice or Payment at all
      const linkedMembershipIds = await Invoice.distinct('membershipId', {
        membershipId: { $ne: null },
      });
      const legacyMemberships = await Membership.find({
        _id: { $nin: linkedMembershipIds },
        paymentId: null,
        $or: [{ finalAmount: { $gt: 0 } }, { amount: { $gt: 0 } }],
      }).sort({ createdAt: 1 });

      for (const m of legacyMemberships) {
        const total = roundMoney(m.finalAmount || m.amount || 0);
        if (total <= 0) continue;

        const subtotal = roundMoney(m.basePrice || total);
        const joiningFee = roundMoney(m.joiningFee || 0);
        let discount = 0;
        if (m.discountType === 'FIXED') discount = roundMoney(m.discountValue);
        else if (m.discountType === 'PERCENTAGE') {
          discount = roundMoney(((subtotal + joiningFee) * (m.discountValue || 0)) / 100);
        }

        const isPaid = m.status === 'ACTIVE' || m.status === 'EXPIRED' || m.status === 'PAUSED';
        const { payment } = await createInvoiceAndOptionalPayment({
          clientId: m.userId,
          branchId: m.branchId,
          membershipId: m._id,
          category: 'MEMBERSHIP_PURCHASE',
          description: `Membership: ${m.planName}`,
          subtotal,
          joiningFee,
          discount,
          totalAmount: total,
          paidAmount: isPaid ? total : 0,
          paymentMethod: m.paymentMethod || 'UPI',
          invoiceDate: m.startDate || m.createdAt,
          createdBy: m.assignedBy || null,
        });

        if (payment) {
          m.paymentId = payment._id;
          await m.save();
        }
      }
    } finally {
      syncPromise = null;
    }
  })();

  return syncPromise;
};

// ==========================================
// 4. FINANCIAL CALCULATIONS & REPORTING
// ==========================================

const buildBranchFilter = (branchId) => {
  if (!branchId || branchId === 'ALL' || branchId === 'all') return {};
  if (mongoose.Types.ObjectId.isValid(branchId)) {
    return { branchId: new mongoose.Types.ObjectId(branchId) };
  }
  return {};
};

const computeFinanceSummary = async ({ branchId = 'ALL', startDate = null, endDate = null } = {}) => {
  await ensureLegacyInvoicesSynced();

  const branchFilter = buildBranchFilter(branchId);
  const { dateStr: todayStr, year: currentYear, month: currentMonth } = getKolkataParts();
  const todayRange = getKolkataDayRange(todayStr);
  const monthRange = getKolkataMonthRange(currentYear, currentMonth);
  const yearRange = getKolkataYearRange(currentYear);

  const periodMatch = {};
  if (startDate || endDate) {
    periodMatch.$gte = startDate ? new Date(`${startDate.slice(0, 10)}T00:00:00+05:30`) : new Date(0);
    periodMatch.$lte = endDate ? new Date(`${endDate.slice(0, 10)}T23:59:59.999+05:30`) : new Date();
  }

  const paymentDateCond = Object.keys(periodMatch).length ? { date: periodMatch } : {};
  const invoiceDateCond = Object.keys(periodMatch).length ? { invoiceDate: periodMatch } : {};
  const expenseDateCond = Object.keys(periodMatch).length ? { expenseDate: periodMatch } : {};

  // Parallel aggregations from real MongoDB records
  const [
    todayPaidPayments,
    monthPaidPayments,
    yearPaidPayments,
    periodPaidPayments,
    periodRefundedPayments,
    activeInvoices,
    pendingInvoices,
    periodActiveExpenses,
    monthActiveExpenses,
    yearActiveExpenses,
    todayActiveExpenses,
    branches,
    config,
  ] = await Promise.all([
    Payment.find({ ...branchFilter, status: 'PAID', date: { $gte: todayRange.start, $lte: todayRange.end } }).lean(),
    Payment.find({ ...branchFilter, status: 'PAID', date: { $gte: monthRange.start, $lte: monthRange.end } }).lean(),
    Payment.find({ ...branchFilter, status: 'PAID', date: { $gte: yearRange.start, $lte: yearRange.end } }).lean(),
    Payment.find({ ...branchFilter, status: 'PAID', ...paymentDateCond }).lean(),
    Payment.find({ ...branchFilter, status: 'REFUNDED', ...paymentDateCond }).lean(),
    Invoice.find({ ...branchFilter, status: { $nin: ['CANCELLED', 'REFUNDED'] }, ...invoiceDateCond }).lean(),
    Invoice.find({
      ...branchFilter,
      status: { $in: ['PENDING', 'PARTIALLY_PAID'] },
      balanceAmount: { $gt: 0 },
    }).lean(),
    Expense.find({ ...branchFilter, status: 'ACTIVE', ...expenseDateCond }).lean(),
    Expense.find({ ...branchFilter, status: 'ACTIVE', expenseDate: { $gte: monthRange.start, $lte: monthRange.end } }).lean(),
    Expense.find({ ...branchFilter, status: 'ACTIVE', expenseDate: { $gte: yearRange.start, $lte: yearRange.end } }).lean(),
    Expense.find({ ...branchFilter, status: 'ACTIVE', expenseDate: { $gte: todayRange.start, $lte: todayRange.end } }).lean(),
    Branch.find({ isActive: true }).lean(),
    FinanceConfig.getOrCreateConfig(),
  ]);

  const sumAmounts = (arr, field = 'amount') =>
    roundMoney(arr.reduce((acc, item) => acc + (Number(item[field]) || 0), 0));

  const todayCollection = sumAmounts(todayPaidPayments);
  const thisMonthCollection = sumAmounts(monthPaidPayments);
  const thisYearCollection = sumAmounts(yearPaidPayments);

  const grossRevenue = sumAmounts(activeInvoices, 'totalAmount');
  const collectedRevenue = sumAmounts(periodPaidPayments);
  const refunds = sumAmounts(periodRefundedPayments);
  const pendingBalance = sumAmounts(pendingInvoices, 'balanceAmount');

  const totalExpenses = sumAmounts(periodActiveExpenses);
  const monthExpenses = sumAmounts(monthActiveExpenses);
  const yearExpenses = sumAmounts(yearActiveExpenses);
  const todayExpenses = sumAmounts(todayActiveExpenses);

  const netRevenue = roundMoney(collectedRevenue - refunds - totalExpenses);
  const monthNetRevenue = roundMoney(thisMonthCollection - monthExpenses);

  // Payment method breakdown (for period)
  const methodTotalsMap = {};
  for (const p of periodPaidPayments) {
    const code = (p.paymentMethod || 'OTHER').toUpperCase();
    if (!methodTotalsMap[code]) {
      methodTotalsMap[code] = { code, count: 0, amount: 0, todayAmount: 0 };
    }
    methodTotalsMap[code].count += 1;
    methodTotalsMap[code].amount = roundMoney(methodTotalsMap[code].amount + (Number(p.amount) || 0));
  }
  for (const p of todayPaidPayments) {
    const code = (p.paymentMethod || 'OTHER').toUpperCase();
    if (!methodTotalsMap[code]) {
      methodTotalsMap[code] = { code, count: 0, amount: 0, todayAmount: 0 };
    }
    methodTotalsMap[code].todayAmount = roundMoney(methodTotalsMap[code].todayAmount + (Number(p.amount) || 0));
  }

  const labelLookup = {};
  for (const pm of config.paymentMethods || []) {
    labelLookup[pm.code] = pm.label;
  }
  const paymentMethodBreakdown = Object.values(methodTotalsMap).map((m) => ({
    ...m,
    label: labelLookup[m.code] || m.code,
  }));

  // Branch-wise breakdown
  const branchBreakdown = await Promise.all(
    branches.map(async (b) => {
      const [bPaid, bRefunds, bActiveInv, bPendingInv, bExpenses] = await Promise.all([
        Payment.find({ branchId: b._id, status: 'PAID', ...paymentDateCond }).lean(),
        Payment.find({ branchId: b._id, status: 'REFUNDED', ...paymentDateCond }).lean(),
        Invoice.find({ branchId: b._id, status: { $nin: ['CANCELLED', 'REFUNDED'] }, ...invoiceDateCond }).lean(),
        Invoice.find({ branchId: b._id, status: { $in: ['PENDING', 'PARTIALLY_PAID'] }, balanceAmount: { $gt: 0 } }).lean(),
        Expense.find({ branchId: b._id, status: 'ACTIVE', ...expenseDateCond }).lean(),
      ]);

      const bCollected = sumAmounts(bPaid);
      const bRefundAmt = sumAmounts(bRefunds);
      const bExpenseAmt = sumAmounts(bExpenses);
      return {
        branchId: b._id,
        city: b.city,
        name: b.name,
        invoiceCount: bActiveInv.length,
        grossRevenue: sumAmounts(bActiveInv, 'totalAmount'),
        collectedRevenue: bCollected,
        refunds: bRefundAmt,
        outstanding: sumAmounts(bPendingInv, 'balanceAmount'),
        expenses: bExpenseAmt,
        netRevenue: roundMoney(bCollected - bRefundAmt - bExpenseAmt),
      };
    })
  );

  // Outstanding invoices list (top 25 most urgent)
  const outstandingList = await Invoice.find({
    ...branchFilter,
    status: { $in: ['PENDING', 'PARTIALLY_PAID'] },
    balanceAmount: { $gt: 0 },
  })
    .sort({ dueDate: 1, invoiceDate: -1 })
    .limit(50)
    .populate('clientId', 'name email phone')
    .populate('branchId', 'name city code')
    .lean();

  return {
    todayDate: todayStr,
    todayCollection,
    thisMonthCollection,
    thisYearCollection,
    grossRevenue,
    collectedRevenue,
    pendingBalance,
    refunds,
    totalExpenses,
    todayExpenses,
    monthExpenses,
    yearExpenses,
    netRevenue,
    monthNetRevenue,
    totalInvoices: activeInvoices.length,
    pendingInvoicesCount: pendingInvoices.length,
    paymentMethodBreakdown,
    branchBreakdown,
    outstandingInvoices: outstandingList,
  };
};

module.exports = {
  IST_TIMEZONE,
  getKolkataParts,
  getKolkataDayRange,
  addKolkataDays,
  getKolkataMonthRange,
  getKolkataYearRange,
  resolveDailyRangeWindow,
  resolveBranchCode,
  generateSequentialNumber,
  generateTransactionRef,
  roundMoney,
  recalculateInvoiceFromPayments,
  createInvoiceAndOptionalPayment,
  recordPaymentOnInvoice,
  ensureLegacyInvoicesSynced,
  computeFinanceSummary,
};
