const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { createRateLimiter } = require('../middleware/rateLimitMiddleware');

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many login attempts. Please wait 15 minutes and try again.',
  keyPrefix: 'auth-login',
});

const resetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many password reset or activation requests. Please wait a few minutes and try again.',
  keyPrefix: 'auth-reset',
});

// Public routes
router.post('/register', authController.register);
router.post('/signup', authController.register); // Alias for signup
router.post('/login', loginLimiter, authController.login);
router.post('/logout', authController.logout);

// Trainer & account activation routes
router.get('/activate/:token', resetLimiter, authController.verifyActivation);
router.post('/activate/:token', resetLimiter, authController.activateAccount);

// Forgot & reset password routes
router.post('/forgot-password', resetLimiter, authController.forgotPassword);
router.get('/reset-password/:token', resetLimiter, authController.verifyResetToken);
router.post('/reset-password/:token', resetLimiter, authController.resetPassword);

// Protected routes
router.get('/me', protect, authController.getMe);

module.exports = router;
