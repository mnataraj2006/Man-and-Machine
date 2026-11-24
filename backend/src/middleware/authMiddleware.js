const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to protect private endpoints.
 * Validates Bearer token in Authorization header.
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided',
    });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is missing');
    }

    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id)
      .select('-password')
      .populate('branchId', 'name city address phone');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user not found',
      });
    }

    if (user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated or suspended. Please contact management.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, invalid or expired token',
    });
  }
};

/**
 * Role-based authorization middleware.
 * Usage: authorize('ADMIN'), authorize('TRAINER', 'ADMIN'), authorize('CLIENT')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user ? req.user.role : 'GUEST'}' is not permitted to access this area.`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
