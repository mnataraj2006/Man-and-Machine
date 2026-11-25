const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT embedding user ID and tokenVersion for session revocation.
 */
const generateToken = (userId, tokenVersion = 0) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign({ id: userId, tokenVersion }, secret, {
    expiresIn,
  });
};

module.exports = generateToken;
