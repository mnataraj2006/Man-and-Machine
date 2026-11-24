const User = require('../models/User');
const generateToken = require('../utils/generateToken');

/**
 * Register a new member.
 */
const registerUser = async ({ name, email, password, phone, city }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Check for existing user
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const error = new Error('An account with this email already exists.');
    error.statusCode = 400;
    throw error;
  }

  // Create user
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    phone: phone ? phone.trim() : '',
    city: city ? city.trim() : 'Kovilpatti',
  });

  const token = generateToken(user._id);

  return {
    user: user.toSafeObject(),
    token,
  };
};

/**
 * Authenticate member by credentials.
 */
const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Find user by email
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // Verify password
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(user._id);

  return {
    user: user.toSafeObject(),
    token,
  };
};

module.exports = {
  registerUser,
  loginUser,
};
