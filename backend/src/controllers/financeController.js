const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const FinanceConfig = require('../models/FinanceConfig');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Notification = require('../models/Notification');
const financeService = require('../services/financeService');

const buildBranchQuery = (branchId) => {
  if (!branchId || branchId === 'ALL' || branchId === 'all') return {};
  if (mongoose.Types.ObjectId.isValid(branchId)) {
    return { branchId: new mongoose.Types.ObjectId(branchId) };
  }
  return {};
};

// ==========================================
// 1. FINANCE SUMMARY
// ==========================================

const getSummary = async (req, res, next) => {
  try {
    const { branchId = 'ALL', startDate, endDate } = req.query;
    const summary = await financeService.computeFinanceSummary({
      branchId,
      startDate,
      endDate,
    });

    res.status(200).json({
      success: true,
      summary,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 2. INVOICES (ALL, TODAY, DETAIL, CREATE, PAYMENT, CANCEL, REFUND, REMINDER)
// ==========================================

const buildInvoiceFilterQuery = async ({
  branchId,
  status,
  paymentMethod,
  search,
  startDate,
  endDate,
  clientId,
  outstandingOnly,
}) => {
  const query = { ...buildBranchQuery(branchId) };

  if (status && status !== 'ALL') {
    query.status = status;
  }
  if (outstandingOnly === 'true' || outstandingOnly === true) {
    query.status = { $in: ['PENDING', 'PARTIALLY_PAID'] };
    query.balanceAmount = { $gt: 0 };
  }
  if (paymentMethod && paymentMethod !== 'ALL') {
    query.paymentMethod = paymentMethod.toUpperCase();
  }
  if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
    query.clientId = clientId;
  }
  if (startDate || endDate) {
    query.invoiceDate = {};
    if (startDate) query.invoiceDate.$gte = new Date(`${startDate.slice(0, 10)}T00:00:00+05:30`);
    if (endDate) query.invoiceDate.$lte = new Date(`${endDate.slice(0, 10)}T23:59:59.999+05:30`);
  }

  if (search && search.trim()) {
    const term = search.trim();
    const matchingUsers = await User.find({
      $or: [
        { name: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
      ],
    })
      .select('_id')
      .lean();
    const userIds = matchingUsers.map((u) => u._id);

    query.$or = [
      { invoiceNumber: { $regex: term, $options: 'i' } },
      { description: { $regex: term, $options: 'i' } },
      { clientId: { $in: userIds } },
    ];
  }

  return query;
};

const getInvoices = async (req, res, next) => {
  try {
    await financeService.ensureLegacyInvoicesSynced();

    const {
      branchId = 'ALL',
      status = 'ALL',
      paymentMethod = 'ALL',
      search = '',
      startDate,
      endDate,
      clientId,
      outstandingOnly,
      page = 1,
      limit = 20,
    } = req.query;

    const query = await buildInvoiceFilterQuery({
      branchId,
      status,
      paymentMethod,
      search,
      startDate,
      endDate,
      clientId,
      outstandingOnly,
    });

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [invoices, total, activeMatching] = await Promise.all([
      Invoice.find(query)
        .sort({ invoiceDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('clientId', 'name email phone')
        .populate('branchId', 'name city code address phone')
        .populate('createdBy', 'name email role')
        .populate('membershipId', 'planName startDate expiryDate status')
        .lean(),
      Invoice.countDocuments(query),
      Invoice.find({ ...query, status: { $ne: 'CANCELLED' } })
        .select('totalAmount paidAmount balanceAmount status')
        .lean(),
    ]);

    const totals = activeMatching.reduce(
      (acc, inv) => {
        acc.totalAmount = financeService.roundMoney(acc.totalAmount + (inv.totalAmount || 0));
        acc.paidAmount = financeService.roundMoney(acc.paidAmount + (inv.paidAmount || 0));
        acc.balanceAmount = financeService.roundMoney(acc.balanceAmount + (inv.balanceAmount || 0));
        return acc;
      },
      { totalAmount: 0, paidAmount: 0, balanceAmount: 0 }
    );

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
      totals,
      invoices,
    });
  } catch (err) {
    next(err);
  }
};

const getTodayInvoices = async (req, res, next) => {
  try {
    await financeService.ensureLegacyInvoicesSynced();

    const { branchId = 'ALL', status = 'ALL', paymentMethod = 'ALL', search = '' } = req.query;
    const { dateStr, start, end } = financeService.getKolkataDayRange();

    const baseTodayQuery = await buildInvoiceFilterQuery({
      branchId,
      status,
      paymentMethod,
      search,
      startDate: dateStr,
      endDate: dateStr,
    });

    const allTodayForStats = await Invoice.find({
      ...buildBranchQuery(branchId),
      invoiceDate: { $gte: start, $lte: end },
      status: { $ne: 'CANCELLED' },
    }).lean();

    const invoices = await Invoice.find(baseTodayQuery)
      .sort({ invoiceDate: -1, createdAt: -1 })
      .populate('clientId', 'name email phone')
      .populate('branchId', 'name city code address phone')
      .populate('createdBy', 'name role')
      .lean();

    // Actual money collected today in IST
    const todayPaidPayments = await Payment.find({
      ...buildBranchQuery(branchId),
      status: 'PAID',
      date: { $gte: start, $lte: end },
    }).lean();

    const stats = {
      date: dateStr,
      timezone: financeService.IST_TIMEZONE,
      totalInvoices: allTodayForStats.length,
      paidInvoices: allTodayForStats.filter((i) => i.status === 'PAID').length,
      pendingInvoices: allTodayForStats.filter((i) => ['PENDING', 'PARTIALLY_PAID'].includes(i.status)).length,
      grossAmount: financeService.roundMoney(
        allTodayForStats.reduce((s, i) => s + (i.totalAmount || 0), 0)
      ),
      collectedAmount: financeService.roundMoney(
        todayPaidPayments.reduce((s, p) => s + (p.amount || 0), 0)
      ),
      outstandingAmount: financeService.roundMoney(
        allTodayForStats.reduce((s, i) => s + (i.balanceAmount || 0), 0)
      ),
    };

    res.status(200).json({
      success: true,
      stats,
      invoices,
    });
  } catch (err) {
    next(err);
  }
};

const getInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid invoice ID' });
    }

    const [invoice, payments, config] = await Promise.all([
      Invoice.findById(id)
        .populate('clientId', 'name email phone')
        .populate('branchId', 'name city code address phone email')
        .populate('membershipId', 'planName startDate expiryDate status basePrice joiningFee discountType discountValue finalAmount')
        .populate('createdBy', 'name email role')
        .populate('updatedBy', 'name email role')
        .populate('cancelledBy', 'name email role')
        .populate('auditLogs.userId', 'name email role')
        .lean(),
      Payment.find({ invoiceId: id })
        .sort({ date: -1, createdAt: -1 })
        .populate('createdBy', 'name email role')
        .lean(),
      FinanceConfig.getOrCreateConfig(),
    ]);

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.status(200).json({
      success: true,
      invoice,
      payments,
      receiptSettings: config.invoiceSettings,
    });
  } catch (err) {
    next(err);
  }
};

const createInvoice = async (req, res, next) => {
  try {
    const {
      clientId,
      branchId,
      membershipId = null,
      category = 'OTHER_SERVICE',
      description,
      subtotal,
      joiningFee = 0,
      discount = 0,
      additionalCharges = 0,
      applyTax = false,
      paidAmount = 0,
      paymentMethod = 'UPI',
      invoiceDate,
      dueDate,
      referenceNumber = '',
      notes = '',
    } = req.body;

    if (!clientId || !mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({ success: false, message: 'Valid member is required' });
    }
    if (!description || !String(description).trim()) {
      return res.status(400).json({ success: false, message: 'Description is required' });
    }

    const client = await User.findById(clientId).lean();
    if (!client) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const resolvedBranchId = branchId && mongoose.Types.ObjectId.isValid(branchId) ? branchId : client.branchId;
    if (!resolvedBranchId) {
      return res.status(400).json({ success: false, message: 'Branch is required for invoice numbering' });
    }

    const baseSub = financeService.roundMoney(subtotal);
    const fee = financeService.roundMoney(joiningFee);
    const disc = financeService.roundMoney(discount);
    const addl = financeService.roundMoney(additionalCharges);
    const taxableBase = Math.max(0, baseSub + fee + addl - disc);

    if (taxableBase <= 0) {
      return res.status(400).json({ success: false, message: 'Invoice net total must be greater than zero' });
    }

    const config = await FinanceConfig.getOrCreateConfig();
    const gstEnabled = Boolean(applyTax) && Boolean(config.invoiceSettings?.gstEnabled);
    const taxRate = gstEnabled ? Number(config.invoiceSettings?.gstRate) || 0 : 0;
    const taxAmount = taxRate > 0 ? financeService.roundMoney((taxableBase * taxRate) / 100) : 0;
    const totalAmount = financeService.roundMoney(taxableBase + taxAmount);

    const paid = financeService.roundMoney(paidAmount);
    if (paid < 0 || paid > totalAmount) {
      return res.status(400).json({
        success: false,
        message: `Paid amount (₹${paid}) must be between ₹0 and total invoice amount (₹${totalAmount}).`,
      });
    }

    const result = await financeService.createInvoiceAndOptionalPayment({
      clientId,
      branchId: resolvedBranchId,
      membershipId,
      category,
      description: String(description).trim(),
      subtotal: baseSub,
      joiningFee: fee,
      discount: disc,
      additionalCharges: addl,
      taxRate,
      taxAmount,
      totalAmount,
      paidAmount: paid,
      paymentMethod,
      invoiceDate: invoiceDate || new Date(),
      dueDate: dueDate || null,
      referenceNumber,
      notes,
      createdBy: req.user._id,
    });

    const populatedInvoice = await Invoice.findById(result.invoice._id)
      .populate('clientId', 'name email phone')
      .populate('branchId', 'name city code address phone')
      .populate('createdBy', 'name role')
      .lean();

    res.status(201).json({
      success: true,
      message: `Invoice ${result.invoice.invoiceNumber} created successfully`,
      invoice: populatedInvoice,
      payment: result.payment,
    });
  } catch (err) {
    next(err);
  }
};

const recordInvoicePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod = 'UPI', paymentDate, referenceNumber = '', notes = '' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid invoice ID' });
    }

    const { invoice, payment } = await financeService.recordPaymentOnInvoice(id, {
      amount,
      paymentMethod,
      paymentDate,
      referenceNumber,
      notes,
      createdBy: req.user._id,
    });

    const [populatedInvoice, populatedPayment, config] = await Promise.all([
      Invoice.findById(invoice._id)
        .populate('clientId', 'name email phone')
        .populate('branchId', 'name city code address phone')
        .lean(),
      Payment.findById(payment._id)
        .populate('userId', 'name email phone')
        .populate('branchId', 'name city code address phone')
        .populate('createdBy', 'name email role')
        .lean(),
      FinanceConfig.getOrCreateConfig(),
    ]);

    res.status(201).json({
      success: true,
      message: `Payment of ₹${payment.amount} recorded (${payment.receiptNumber})`,
      invoice: populatedInvoice,
      payment: populatedPayment,
      receipt: {
        receiptNumber: populatedPayment.receiptNumber,
        invoiceNumber: populatedInvoice.invoiceNumber,
        date: populatedPayment.date,
        branch: populatedInvoice.branchId,
        member: populatedInvoice.clientId,
        service: populatedInvoice.description,
        invoiceTotal: populatedInvoice.totalAmount,
        amountPaidNow: populatedPayment.amount,
        totalPaidToDate: populatedInvoice.paidAmount,
        balanceRemaining: populatedInvoice.balanceAmount,
        paymentMethod: populatedPayment.paymentMethod,
        referenceNumber: populatedPayment.referenceNumber,
        receivedBy: req.user.name,
        footer: config.invoiceSettings?.receiptFooter,
        showBranchAddress: config.invoiceSettings?.showBranchAddress !== false,
      },
    });
  } catch (err) {
    next(err);
  }
};

const cancelInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = '' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid invoice ID' });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    if (invoice.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Invoice is already cancelled' });
    }

    const activePaid = await Payment.countDocuments({ invoiceId: invoice._id, status: 'PAID' });
    if (activePaid > 0) {
      return res.status(400).json({
        success: false,
        message: 'This invoice has settled payments. Issue a refund before voiding/cancelling.',
      });
    }

    const oldStatus = invoice.status;
    invoice.status = 'CANCELLED';
    invoice.cancelledBy = req.user._id;
    invoice.cancelledAt = new Date();
    invoice.cancelReason = (reason || 'Cancelled by administrator').trim();
    invoice.updatedBy = req.user._id;
    invoice.auditLogs.push({
      action: 'INVOICE_CANCELLED',
      oldStatus,
      newStatus: 'CANCELLED',
      oldAmount: invoice.totalAmount,
      newAmount: 0,
      reason: invoice.cancelReason,
      userId: req.user._id,
      timestamp: new Date(),
    });
    await invoice.save();

    // Mark any unsettled pending payments on this invoice as FAILED so they aren't counted
    await Payment.updateMany(
      { invoiceId: invoice._id, status: 'PENDING' },
      {
        $set: { status: 'FAILED', updatedBy: req.user._id },
        $push: {
          auditLogs: {
            action: 'INVOICE_CANCELLED',
            oldStatus: 'PENDING',
            newStatus: 'FAILED',
            reason: invoice.cancelReason,
            userId: req.user._id,
            timestamp: new Date(),
          },
        },
      }
    );

    res.status(200).json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} cancelled with audit trail`,
      invoice,
    });
  } catch (err) {
    next(err);
  }
};

const refundInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Refund processed by administrator' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid invoice ID' });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const paidPayments = await Payment.find({ invoiceId: id, status: 'PAID' });
    if (paidPayments.length === 0) {
      return res.status(400).json({ success: false, message: 'No settled payments found to refund' });
    }

    for (const p of paidPayments) {
      p.status = 'REFUNDED';
      p.refundedAmount = p.amount;
      p.refundReason = reason.trim();
      p.refundedAt = new Date();
      p.refundedBy = req.user._id;
      p.updatedBy = req.user._id;
      p.auditLogs.push({
        action: 'PAYMENT_REFUNDED',
        oldStatus: 'PAID',
        newStatus: 'REFUNDED',
        oldAmount: p.amount,
        newAmount: p.amount,
        reason: reason.trim(),
        userId: req.user._id,
        timestamp: new Date(),
      });
      await p.save();
    }

    const updated = await financeService.recalculateInvoiceFromPayments(
      invoice._id,
      req.user._id,
      `Refund issued: ${reason.trim()}`
    );

    res.status(200).json({
      success: true,
      message: `Refund recorded for invoice ${updated.invoiceNumber}`,
      invoice: updated,
    });
  } catch (err) {
    next(err);
  }
};

const sendInvoiceReminder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findById(id).populate('branchId', 'city name').lean();
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    if (invoice.balanceAmount <= 0 || !['PENDING', 'PARTIALLY_PAID'].includes(invoice.status)) {
      return res.status(400).json({ success: false, message: 'No outstanding balance on this invoice' });
    }

    await Notification.create({
      userId: invoice.clientId,
      title: `Payment Reminder: ${invoice.invoiceNumber}`,
      message: `Friendly reminder: ₹${invoice.balanceAmount.toLocaleString('en-IN')} is outstanding on invoice ${invoice.invoiceNumber} (${invoice.description}) at ${invoice.branchId?.city || 'Gym'} branch.`,
      category: 'PAYMENTS',
    });

    res.status(200).json({
      success: true,
      message: `Payment reminder sent to member for ${invoice.invoiceNumber}`,
    });
  } catch (err) {
    next(err);
  }
};

const getPaymentReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid payment ID' });
    }

    const [payment, config] = await Promise.all([
      Payment.findById(id)
        .populate('userId', 'name email phone')
        .populate('branchId', 'name city code address phone email')
        .populate('invoiceId')
        .populate('createdBy', 'name role')
        .lean(),
      FinanceConfig.getOrCreateConfig(),
    ]);

    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found' });

    const inv = payment.invoiceId;
    res.status(200).json({
      success: true,
      receipt: {
        receiptNumber: payment.receiptNumber || payment.transactionId,
        transactionId: payment.transactionId,
        invoiceNumber: inv?.invoiceNumber || 'N/A',
        date: payment.date,
        branch: payment.branchId,
        member: payment.userId,
        service: inv?.description || payment.description,
        invoiceTotal: inv?.totalAmount ?? payment.amount,
        amountPaidNow: payment.amount,
        totalPaidToDate: inv?.paidAmount ?? payment.amount,
        balanceRemaining: inv?.balanceAmount ?? 0,
        paymentMethod: payment.paymentMethod,
        referenceNumber: payment.referenceNumber || '',
        status: payment.status,
        receivedBy: payment.createdBy?.name || 'MAN & MACHINE Desk',
        footer: config.invoiceSettings?.receiptFooter,
        showBranchAddress: config.invoiceSettings?.showBranchAddress !== false,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 3. DAY-WISE & MONTH-WISE COLLECTIONS
// ==========================================

const getDailyCollections = async (req, res, next) => {
  try {
    await financeService.ensureLegacyInvoicesSynced();

    const {
      range = 'last7days',
      startDate,
      endDate,
      branchId = 'ALL',
      paymentMethod = 'ALL',
      status = 'ALL',
    } = req.query;

    const { start, end, startDateStr, endDateStr } = financeService.resolveDailyRangeWindow(
      range,
      startDate,
      endDate
    );

    const branchQ = buildBranchQuery(branchId);
    const methodQ = paymentMethod && paymentMethod !== 'ALL' ? { paymentMethod: paymentMethod.toUpperCase() } : {};
    const statusInvoiceQ = status && status !== 'ALL' ? { status } : { status: { $ne: 'CANCELLED' } };

    const [paidPayments, invoicesInRange] = await Promise.all([
      Payment.find({
        ...branchQ,
        ...methodQ,
        status: 'PAID',
        date: { $gte: start, $lte: end },
      }).lean(),
      Invoice.find({
        ...branchQ,
        ...methodQ,
        ...statusInvoiceQ,
        invoiceDate: { $gte: start, $lte: end },
      }).lean(),
    ]);

    // Build ordered map of all dates in the range (IST)
    const dayMap = {};
    let cursor = startDateStr;
    let safety = 0;
    while (cursor <= endDateStr && safety < 366) {
      dayMap[cursor] = {
        date: cursor,
        invoicesCount: 0,
        collectedAmount: 0,
        pendingAmount: 0,
        grossAmount: 0,
        byMethod: {},
      };
      cursor = financeService.addKolkataDays(cursor, 1);
      safety += 1;
    }

    for (const inv of invoicesInRange) {
      const dKey = financeService.getKolkataParts(inv.invoiceDate).dateStr;
      if (!dayMap[dKey]) {
        dayMap[dKey] = {
          date: dKey,
          invoicesCount: 0,
          collectedAmount: 0,
          pendingAmount: 0,
          grossAmount: 0,
          byMethod: {},
        };
      }
      dayMap[dKey].invoicesCount += 1;
      dayMap[dKey].grossAmount = financeService.roundMoney(dayMap[dKey].grossAmount + (inv.totalAmount || 0));
      if (['PENDING', 'PARTIALLY_PAID'].includes(inv.status)) {
        dayMap[dKey].pendingAmount = financeService.roundMoney(
          dayMap[dKey].pendingAmount + (inv.balanceAmount || 0)
        );
      }
    }

    for (const p of paidPayments) {
      const dKey = financeService.getKolkataParts(p.date).dateStr;
      if (!dayMap[dKey]) {
        dayMap[dKey] = {
          date: dKey,
          invoicesCount: 0,
          collectedAmount: 0,
          pendingAmount: 0,
          grossAmount: 0,
          byMethod: {},
        };
      }
      dayMap[dKey].collectedAmount = financeService.roundMoney(
        dayMap[dKey].collectedAmount + (p.amount || 0)
      );
      const pm = (p.paymentMethod || 'OTHER').toUpperCase();
      dayMap[dKey].byMethod[pm] = financeService.roundMoney((dayMap[dKey].byMethod[pm] || 0) + (p.amount || 0));
    }

    const dailyRows = Object.values(dayMap).sort((a, b) => b.date.localeCompare(a.date));
    const chartSeries = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

    const summary = {
      startDate: startDateStr,
      endDate: endDateStr,
      totalCollected: financeService.roundMoney(dailyRows.reduce((s, r) => s + r.collectedAmount, 0)),
      totalPending: financeService.roundMoney(dailyRows.reduce((s, r) => s + r.pendingAmount, 0)),
      totalInvoices: dailyRows.reduce((s, r) => s + r.invoicesCount, 0),
    };

    res.status(200).json({
      success: true,
      summary,
      daily: dailyRows,
      chart: chartSeries,
    });
  } catch (err) {
    next(err);
  }
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const getMonthlyCollections = async (req, res, next) => {
  try {
    await financeService.ensureLegacyInvoicesSynced();

    const currentYear = financeService.getKolkataParts().year;
    const year = parseInt(req.query.year, 10) || currentYear;
    const { branchId = 'ALL', paymentMethod = 'ALL' } = req.query;

    const { start, end } = financeService.getKolkataYearRange(year);
    const branchQ = buildBranchQuery(branchId);
    const methodQ = paymentMethod && paymentMethod !== 'ALL' ? { paymentMethod: paymentMethod.toUpperCase() } : {};

    const [paidPayments, refundedPayments, invoices, expenses, branches] = await Promise.all([
      Payment.find({ ...branchQ, ...methodQ, status: 'PAID', date: { $gte: start, $lte: end } }).lean(),
      Payment.find({ ...branchQ, ...methodQ, status: 'REFUNDED', date: { $gte: start, $lte: end } }).lean(),
      Invoice.find({ ...branchQ, ...methodQ, status: { $ne: 'CANCELLED' }, invoiceDate: { $gte: start, $lte: end } }).lean(),
      Expense.find({ ...branchQ, status: 'ACTIVE', expenseDate: { $gte: start, $lte: end } }).lean(),
      Branch.find({ isActive: true }).lean(),
    ]);

    const months = MONTH_NAMES.map((name, idx) => ({
      monthNumber: idx + 1,
      month: name,
      shortMonth: name.slice(0, 3),
      invoicesCount: 0,
      grossSales: 0,
      collected: 0,
      outstanding: 0,
      refunds: 0,
      expenses: 0,
      netCollection: 0,
    }));

    for (const inv of invoices) {
      const mIdx = financeService.getKolkataParts(inv.invoiceDate).month - 1;
      if (months[mIdx]) {
        months[mIdx].invoicesCount += 1;
        if (inv.status !== 'REFUNDED') {
          months[mIdx].grossSales = financeService.roundMoney(months[mIdx].grossSales + (inv.totalAmount || 0));
        }
        if (['PENDING', 'PARTIALLY_PAID'].includes(inv.status)) {
          months[mIdx].outstanding = financeService.roundMoney(
            months[mIdx].outstanding + (inv.balanceAmount || 0)
          );
        }
      }
    }

    for (const p of paidPayments) {
      const mIdx = financeService.getKolkataParts(p.date).month - 1;
      if (months[mIdx]) {
        months[mIdx].collected = financeService.roundMoney(months[mIdx].collected + (p.amount || 0));
      }
    }

    for (const r of refundedPayments) {
      const mIdx = financeService.getKolkataParts(r.date).month - 1;
      if (months[mIdx]) {
        months[mIdx].refunds = financeService.roundMoney(
          months[mIdx].refunds + (r.refundedAmount || r.amount || 0)
        );
      }
    }

    for (const e of expenses) {
      const mIdx = financeService.getKolkataParts(e.expenseDate).month - 1;
      if (months[mIdx]) {
        months[mIdx].expenses = financeService.roundMoney(months[mIdx].expenses + (e.amount || 0));
      }
    }

    for (const m of months) {
      m.netCollection = financeService.roundMoney(m.collected - m.refunds);
    }

    // Branch comparison for selected year
    const branchComparison = await Promise.all(
      branches.map(async (b) => {
        const [bPaid, bRefunds, bInvoices] = await Promise.all([
          Payment.find({ branchId: b._id, ...methodQ, status: 'PAID', date: { $gte: start, $lte: end } }).lean(),
          Payment.find({ branchId: b._id, ...methodQ, status: 'REFUNDED', date: { $gte: start, $lte: end } }).lean(),
          Invoice.find({ branchId: b._id, ...methodQ, status: { $ne: 'CANCELLED' }, invoiceDate: { $gte: start, $lte: end } }).lean(),
        ]);
        const collected = financeService.roundMoney(bPaid.reduce((s, p) => s + (p.amount || 0), 0));
        const refunds = financeService.roundMoney(bRefunds.reduce((s, p) => s + (p.amount || 0), 0));
        const outstanding = financeService.roundMoney(
          bInvoices
            .filter((i) => ['PENDING', 'PARTIALLY_PAID'].includes(i.status))
            .reduce((s, i) => s + (i.balanceAmount || 0), 0)
        );
        return {
          branchId: b._id,
          city: b.city,
          name: b.name,
          invoicesCount: bInvoices.length,
          collected,
          refunds,
          outstanding,
          netCollection: financeService.roundMoney(collected - refunds),
        };
      })
    );

    res.status(200).json({
      success: true,
      year,
      months,
      branchComparison,
      totals: {
        invoicesCount: months.reduce((s, m) => s + m.invoicesCount, 0),
        grossSales: financeService.roundMoney(months.reduce((s, m) => s + m.grossSales, 0)),
        collected: financeService.roundMoney(months.reduce((s, m) => s + m.collected, 0)),
        outstanding: financeService.roundMoney(months.reduce((s, m) => s + m.outstanding, 0)),
        refunds: financeService.roundMoney(months.reduce((s, m) => s + m.refunds, 0)),
        netCollection: financeService.roundMoney(months.reduce((s, m) => s + m.netCollection, 0)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 4. EXPENSES MANAGEMENT & SUMMARY
// ==========================================

const getExpenses = async (req, res, next) => {
  try {
    const {
      branchId = 'ALL',
      category = 'ALL',
      paymentMethod = 'ALL',
      status = 'ACTIVE',
      search = '',
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const branchQ = buildBranchQuery(branchId);
    const query = { ...branchQ };
    if (status && status !== 'ALL') query.status = status;
    if (category && category !== 'ALL') query.category = category;
    if (paymentMethod && paymentMethod !== 'ALL') query.paymentMethod = paymentMethod.toUpperCase();

    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) query.expenseDate.$gte = new Date(`${startDate.slice(0, 10)}T00:00:00+05:30`);
      if (endDate) query.expenseDate.$lte = new Date(`${endDate.slice(0, 10)}T23:59:59.999+05:30`);
    }

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { expenseNumber: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
        { vendor: { $regex: term, $options: 'i' } },
        { category: { $regex: term, $options: 'i' } },
        { referenceNumber: { $regex: term, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const { year: curYear, month: curMonth, dateStr: todayStr } = financeService.getKolkataParts();
    const todayRange = financeService.getKolkataDayRange(todayStr);
    const monthRange = financeService.getKolkataMonthRange(curYear, curMonth);
    const yearRange = financeService.getKolkataYearRange(curYear);

    const [expenses, total, allActiveYear, branches] = await Promise.all([
      Expense.find(query)
        .sort({ expenseDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('branchId', 'name city code')
        .populate('createdBy', 'name email role')
        .populate('updatedBy', 'name email role')
        .populate('cancelledBy', 'name email role')
        .lean(),
      Expense.countDocuments(query),
      Expense.find({
        ...branchQ,
        status: 'ACTIVE',
        expenseDate: { $gte: yearRange.start, $lte: yearRange.end },
      }).lean(),
      Branch.find({ isActive: true }).lean(),
    ]);

    const todayExpenses = financeService.roundMoney(
      allActiveYear
        .filter((e) => e.expenseDate >= todayRange.start && e.expenseDate <= todayRange.end)
        .reduce((s, e) => s + (e.amount || 0), 0)
    );
    const monthExpenses = financeService.roundMoney(
      allActiveYear
        .filter((e) => e.expenseDate >= monthRange.start && e.expenseDate <= monthRange.end)
        .reduce((s, e) => s + (e.amount || 0), 0)
    );
    const yearExpenses = financeService.roundMoney(
      allActiveYear.reduce((s, e) => s + (e.amount || 0), 0)
    );

    // Filtered matching total
    const matchingAllActive = await Expense.find({ ...query, status: 'ACTIVE' }).select('amount').lean();
    const filteredTotal = financeService.roundMoney(
      matchingAllActive.reduce((s, e) => s + (e.amount || 0), 0)
    );

    // Breakdown by Category (filtered or year)
    const catMap = {};
    for (const e of allActiveYear) {
      catMap[e.category] = financeService.roundMoney((catMap[e.category] || 0) + (e.amount || 0));
    }
    const byCategory = Object.entries(catMap)
      .map(([cat, amount]) => ({ category: cat, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Breakdown by Branch (this year)
    const byBranch = await Promise.all(
      branches.map(async (b) => {
        const list = await Expense.find({
          branchId: b._id,
          status: 'ACTIVE',
          expenseDate: { $gte: yearRange.start, $lte: yearRange.end },
        })
          .select('amount')
          .lean();
        return {
          branchId: b._id,
          city: b.city,
          name: b.name,
          amount: financeService.roundMoney(list.reduce((s, e) => s + (e.amount || 0), 0)),
        };
      })
    );

    // Monthly expense chart (Jan-Dec)
    const monthlyChart = MONTH_NAMES.map((name, idx) => ({
      monthNumber: idx + 1,
      month: name.slice(0, 3),
      amount: 0,
    }));
    for (const e of allActiveYear) {
      const mIdx = financeService.getKolkataParts(e.expenseDate).month - 1;
      if (monthlyChart[mIdx]) {
        monthlyChart[mIdx].amount = financeService.roundMoney(monthlyChart[mIdx].amount + (e.amount || 0));
      }
    }

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
      summary: {
        todayExpenses,
        monthExpenses,
        yearExpenses,
        filteredTotal,
        byCategory,
        byBranch,
        monthlyChart,
      },
      expenses,
    });
  } catch (err) {
    next(err);
  }
};

const createExpense = async (req, res, next) => {
  try {
    const {
      expenseDate,
      branchId,
      category,
      description,
      amount,
      paymentMethod = 'CASH',
      vendor = '',
      referenceNumber = '',
      notes = '',
      attachmentUrl = '',
    } = req.body;

    if (!branchId || !mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ success: false, message: 'Valid branch is required' });
    }
    if (!category || !String(category).trim()) {
      return res.status(400).json({ success: false, message: 'Expense category is required' });
    }
    if (!description || !String(description).trim()) {
      return res.status(400).json({ success: false, message: 'Expense description is required' });
    }

    const parsedAmount = financeService.roundMoney(amount);
    if (parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Expense amount must be greater than zero' });
    }

    const safeDate = expenseDate ? new Date(`${String(expenseDate).slice(0, 10)}T12:00:00+05:30`) : new Date();
    const expenseNumber = await financeService.generateSequentialNumber({
      kind: 'EXPENSE',
      branchId,
      date: safeDate,
    });

    const expense = await Expense.create({
      expenseNumber,
      branchId,
      expenseDate: safeDate,
      category: String(category).trim(),
      description: String(description).trim(),
      amount: parsedAmount,
      paymentMethod: String(paymentMethod || 'CASH').toUpperCase().trim(),
      vendor: String(vendor || '').trim(),
      referenceNumber: String(referenceNumber || '').trim(),
      notes: String(notes || '').trim(),
      attachmentUrl: String(attachmentUrl || '').trim(),
      status: 'ACTIVE',
      createdBy: req.user._id,
      auditLogs: [
        {
          action: 'EXPENSE_CREATED',
          oldAmount: null,
          newAmount: parsedAmount,
          oldStatus: null,
          newStatus: 'ACTIVE',
          reason: `Created ${expenseNumber}`,
          userId: req.user._id,
          timestamp: new Date(),
        },
      ],
    });

    const populated = await Expense.findById(expense._id)
      .populate('branchId', 'name city code')
      .populate('createdBy', 'name email role')
      .lean();

    res.status(201).json({
      success: true,
      message: `Expense ${expenseNumber} recorded`,
      expense: populated,
    });
  } catch (err) {
    next(err);
  }
};

const updateExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid expense ID' });
    }

    const expense = await Expense.findById(id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    if (expense.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Cannot edit a cancelled expense record' });
    }

    const {
      expenseDate,
      branchId,
      category,
      description,
      amount,
      paymentMethod,
      vendor,
      referenceNumber,
      notes,
      attachmentUrl,
      editReason = 'Updated by administrator',
    } = req.body;

    const oldAmount = expense.amount;
    if (amount !== undefined) {
      const parsedAmount = financeService.roundMoney(amount);
      if (parsedAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Expense amount must be greater than zero' });
      }
      expense.amount = parsedAmount;
    }

    if (branchId && mongoose.Types.ObjectId.isValid(branchId)) expense.branchId = branchId;
    if (expenseDate) expense.expenseDate = new Date(`${String(expenseDate).slice(0, 10)}T12:00:00+05:30`);
    if (category) expense.category = String(category).trim();
    if (description) expense.description = String(description).trim();
    if (paymentMethod) expense.paymentMethod = String(paymentMethod).toUpperCase().trim();
    if (vendor !== undefined) expense.vendor = String(vendor).trim();
    if (referenceNumber !== undefined) expense.referenceNumber = String(referenceNumber).trim();
    if (notes !== undefined) expense.notes = String(notes).trim();
    if (attachmentUrl !== undefined) expense.attachmentUrl = String(attachmentUrl).trim();

    expense.updatedBy = req.user._id;
    expense.auditLogs.push({
      action: 'EXPENSE_UPDATED',
      oldAmount,
      newAmount: expense.amount,
      oldStatus: expense.status,
      newStatus: expense.status,
      reason: String(editReason || 'Updated by administrator').trim(),
      userId: req.user._id,
      timestamp: new Date(),
    });

    await expense.save();

    const populated = await Expense.findById(expense._id)
      .populate('branchId', 'name city code')
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Expense updated with audit entry',
      expense: populated,
    });
  } catch (err) {
    next(err);
  }
};

const cancelExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Cancelled by administrator' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid expense ID' });
    }

    const expense = await Expense.findById(id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    if (expense.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Expense is already cancelled' });
    }

    expense.status = 'CANCELLED';
    expense.cancelledBy = req.user._id;
    expense.cancelledAt = new Date();
    expense.cancelReason = String(reason || 'Cancelled by administrator').trim();
    expense.updatedBy = req.user._id;
    expense.auditLogs.push({
      action: 'EXPENSE_CANCELLED',
      oldAmount: expense.amount,
      newAmount: 0,
      oldStatus: 'ACTIVE',
      newStatus: 'CANCELLED',
      reason: expense.cancelReason,
      userId: req.user._id,
      timestamp: new Date(),
    });

    await expense.save();

    res.status(200).json({
      success: true,
      message: `Expense ${expense.expenseNumber || ''} cancelled cleanly`,
      expense,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 5. FINANCE CONFIG
// ==========================================

const getConfig = async (req, res, next) => {
  try {
    const config = await FinanceConfig.getOrCreateConfig();
    res.status(200).json({
      success: true,
      config,
    });
  } catch (err) {
    next(err);
  }
};

const updateConfig = async (req, res, next) => {
  try {
    const config = await FinanceConfig.getOrCreateConfig();
    const { paymentMethods, expenseCategories, invoiceSettings } = req.body;

    if (Array.isArray(paymentMethods)) {
      const cleaned = paymentMethods
        .filter((m) => m && m.label && String(m.label).trim())
        .map((m) => ({
          ...(m._id && mongoose.Types.ObjectId.isValid(m._id) ? { _id: m._id } : {}),
          code: (m.code || m.label).toUpperCase().trim().replace(/[^A-Z0-9]+/g, '_'),
          label: String(m.label).trim(),
          isActive: m.isActive !== false,
        }));
      if (cleaned.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one payment method is required' });
      }
      config.paymentMethods = cleaned;
    }

    if (Array.isArray(expenseCategories)) {
      const cleaned = expenseCategories
        .filter((c) => c && c.name && String(c.name).trim())
        .map((c) => ({
          ...(c._id && mongoose.Types.ObjectId.isValid(c._id) ? { _id: c._id } : {}),
          name: String(c.name).trim(),
          isActive: c.isActive !== false,
        }));
      if (cleaned.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one expense category is required' });
      }
      config.expenseCategories = cleaned;
    }

    if (invoiceSettings && typeof invoiceSettings === 'object') {
      const cur = config.invoiceSettings || {};
      config.invoiceSettings = {
        prefix: invoiceSettings.prefix
          ? String(invoiceSettings.prefix).toUpperCase().trim().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'MM'
          : cur.prefix,
        receiptPrefix: invoiceSettings.receiptPrefix
          ? String(invoiceSettings.receiptPrefix).toUpperCase().trim().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'RCP'
          : cur.receiptPrefix,
        expensePrefix: invoiceSettings.expensePrefix
          ? String(invoiceSettings.expensePrefix).toUpperCase().trim().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'EXP'
          : cur.expensePrefix,
        sequenceStart:
          invoiceSettings.sequenceStart !== undefined
            ? Math.max(1, parseInt(invoiceSettings.sequenceStart, 10) || 1)
            : cur.sequenceStart,
        defaultDueDays:
          invoiceSettings.defaultDueDays !== undefined
            ? Math.max(0, parseInt(invoiceSettings.defaultDueDays, 10) || 0)
            : cur.defaultDueDays,
        gstEnabled:
          invoiceSettings.gstEnabled !== undefined ? Boolean(invoiceSettings.gstEnabled) : cur.gstEnabled,
        gstRate:
          invoiceSettings.gstRate !== undefined
            ? Math.min(100, Math.max(0, Number(invoiceSettings.gstRate) || 0))
            : cur.gstRate,
        gstNumber: invoiceSettings.gstNumber !== undefined ? String(invoiceSettings.gstNumber).trim() : cur.gstNumber,
        receiptFooter:
          invoiceSettings.receiptFooter !== undefined
            ? String(invoiceSettings.receiptFooter).trim()
            : cur.receiptFooter,
        showBranchAddress:
          invoiceSettings.showBranchAddress !== undefined
            ? Boolean(invoiceSettings.showBranchAddress)
            : cur.showBranchAddress,
      };
    }

    config.updatedBy = req.user._id;
    await config.save();

    res.status(200).json({
      success: true,
      message: 'Finance configuration saved successfully',
      config,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSummary,
  getInvoices,
  getTodayInvoices,
  getInvoiceById,
  createInvoice,
  recordInvoicePayment,
  cancelInvoice,
  refundInvoice,
  sendInvoiceReminder,
  getPaymentReceipt,
  getDailyCollections,
  getMonthlyCollections,
  getExpenses,
  createExpense,
  updateExpense,
  cancelExpense,
  getConfig,
  updateConfig,
};
