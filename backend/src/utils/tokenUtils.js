const crypto = require('crypto');

/**
 * Generate a cryptographically secure random hex token (default 32 bytes = 64 hex chars).
 */
const generateSecureToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Compute deterministic SHA-256 hash of a raw token for safe database storage.
 * Raw tokens are never stored in MongoDB.
 */
const hashToken = (rawToken) => {
  if (!rawToken || typeof rawToken !== 'string') return '';
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
};

/**
 * Resolve frontend application base URL for invitation and reset links.
 */
const getFrontendBaseUrl = () => {
  const raw = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';
  return raw.split(',')[0].trim().replace(/\/+$/, '');
};

module.exports = {
  generateSecureToken,
  hashToken,
  getFrontendBaseUrl,
};
