const reportService = require('../services/reportService');

const makeHandler = (serviceFn) => async (req, res, next) => {
  try {
    const data = await serviceFn(req.query, req.user);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSummary: makeHandler(reportService.getReportsSummary),
  getMembers: makeHandler(reportService.getMemberReport),
  getMemberships: makeHandler(reportService.getMembershipReport),
  getAttendance: makeHandler(reportService.getAttendanceReport),
  getRevenue: makeHandler(reportService.getRevenueReport),
  getPayments: makeHandler(reportService.getPaymentReport),
  getExpenses: makeHandler(reportService.getExpenseReport),
  getTrainers: makeHandler(reportService.getTrainerReport),
  getLeads: makeHandler(reportService.getLeadReport),
  getBranches: makeHandler(reportService.getBranchReport),
};
