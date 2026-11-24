const authService = require('../services/authService');

/**
 * Validate Indian phone numbers: 10 digits starting with 6, 7, 8, or 9
 * Accepts optional +91 or 91 country code prefix.
 */
const isValidIndianPhone = (phone) => {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return (
    (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) ||
    (digits.length === 12 && digits.startsWith('91') && /^91[6-9]\d{9}$/.test(digits))
  );
};

/**
 * Validate password strength: minimum 8 characters, at least one letter and one number
 */
const isStrongPassword = (password) => {
  if (!password || password.length < 8) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasLetter && hasNumber;
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new client account
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      confirmPassword,
      branchId,
      fitnessGoal,
      experienceLevel,
    } = req.body;

    // 1. Name validation (2 to 80 characters)
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Full name is required.',
      });
    }
    if (name.trim().length < 2 || name.trim().length > 80) {
      return res.status(400).json({
        success: false,
        message: 'Full name must be between 2 and 80 characters.',
      });
    }

    // 2. Email validation
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.',
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    // 3. Indian Phone validation
    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number is required.',
      });
    }
    if (!isValidIndianPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit Indian mobile number.',
      });
    }

    // 4. Password validation (min 8 chars, strength check)
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required.',
      });
    }
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must include at least one letter and one number for account security.',
      });
    }

    // 5. Confirm password match if provided
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
      });
    }

    // Execute client registration (role is securely hard-locked to CLIENT)
    const result = await authService.registerClient({
      name,
      email,
      phone,
      password,
      branchId,
      fitnessGoal,
      experienceLevel,
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & return token and role
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const result = await authService.loginUser({ email, password });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get currently logged in member profile with role & branch
 * @access  Private (JWT Protected)
 */
const getMe = async (req, res, next) => {
  try {
    const details = await authService.getMemberDetails(req.user._id);
    if (!details) {
      return res.status(404).json({
        success: false,
        message: 'Member profile not found.',
      });
    }

    return res.status(200).json({
      success: true,
      user: details,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Clear session
 * @access  Public
 */
const logout = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

module.exports = {
  register,
  login,
  getMe,
  logout,
};
