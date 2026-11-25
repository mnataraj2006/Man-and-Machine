/**
 * Lightweight sliding-window in-memory rate limiter for auth-sensitive endpoints
 * (login, forgot-password, reset-password, account activation).
 */
const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 25,
  message = 'Too many requests. Please wait a few minutes and try again.',
  keyPrefix = 'rl',
} = {}) => {
  const hits = new Map();

  // Periodically prune expired windows to prevent unbounded memory growth
  const pruneInterval = setInterval(() => {
    const now = Date.now();
    for (const [k, record] of hits.entries()) {
      if (now > record.resetAt) {
        hits.delete(k);
      }
    }
  }, Math.min(windowMs, 5 * 60 * 1000));
  if (pruneInterval.unref) pruneInterval.unref();

  return (req, res, next) => {
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      'unknown';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    let record = hits.get(key);
    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + windowMs };
    }

    record.count += 1;
    hits.set(key, record);

    const remaining = Math.max(0, max - record.count);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (record.count > max) {
      return res.status(429).json({
        success: false,
        message,
      });
    }

    next();
  };
};

module.exports = { createRateLimiter };
