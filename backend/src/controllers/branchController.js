const Branch = require('../models/Branch');

/**
 * @route   GET /api/branches
 * @desc    Get all active gym branches
 * @access  Public
 */
const getBranches = async (req, res, next) => {
  try {
    const branches = await Branch.find({ isActive: true }).sort({ city: 1 });
    return res.status(200).json({
      success: true,
      count: branches.length,
      branches: branches.map((b) => ({
        id: b._id,
        _id: b._id,
        name: b.name,
        city: b.city,
        address: b.address,
        phone: b.phone,
        openingHours: b.openingHours,
      })),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBranches,
};
