const User = require('../models/User');
const Branch = require('../models/Branch');
const ClientProfile = require('../models/ClientProfile');
const generateToken = require('../utils/generateToken');

/**
 * Standardize Indian mobile numbers to +91XXXXXXXXXX
 */
const normalizeIndianPhone = (rawPhone) => {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    const ten = digits.slice(2);
    return `+91 ${ten.slice(0, 5)} ${ten.slice(5)}`;
  }
  return rawPhone.trim();
};

/**
 * Public client registration.
 * CRITICAL RULE: Role is ALWAYS forced to 'CLIENT'.
 * Never trust a role provided by the request payload.
 */
const registerClient = async ({
  name,
  email,
  phone,
  password,
  branchId,
  fitnessGoal,
  experienceLevel,
}) => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check for duplicate email
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const error = new Error('An account with this email address is already registered.');
    error.statusCode = 409;
    throw error;
  }

  // 2. Validate that branch exists and is active
  let verifiedBranch = null;
  if (branchId) {
    verifiedBranch = await Branch.findOne({ _id: branchId, isActive: true });
  }

  // Fallback to default Kovilpatti branch if invalid or not specified
  if (!verifiedBranch) {
    verifiedBranch = await Branch.findOne({ city: 'Kovilpatti', isActive: true });
    if (!verifiedBranch) {
      // If no branch found, grab first active branch
      verifiedBranch = await Branch.findOne({ isActive: true });
    }
  }

  if (!verifiedBranch) {
    const error = new Error('The selected training branch is currently unavailable. Please choose another location.');
    error.statusCode = 400;
    throw error;
  }

  const formattedPhone = normalizeIndianPhone(phone);

  // 3. Create User record with role strictly locked to CLIENT
  const user = new User({
    name: name.trim(),
    email: normalizedEmail,
    phone: formattedPhone,
    password,
    role: 'CLIENT', // HARD ENFORCED: Never allow role escalation from public signup
    branchId: verifiedBranch._id,
    status: 'ACTIVE',
  });

  await user.save();

  // 4. Create associated ClientProfile
  let profile = null;
  try {
    profile = await ClientProfile.create({
      userId: user._id,
      branchId: verifiedBranch._id,
      fitnessGoal: fitnessGoal || 'General Fitness',
      experienceLevel: experienceLevel || 'Beginner',
      joiningDate: new Date(),
    });
  } catch (profileErr) {
    // If profile creation fails, clean up the user to prevent orphaned records
    await User.findByIdAndDelete(user._id);
    throw profileErr;
  }

  const token = generateToken(user._id);

  return {
    token,
    user: {
      ...user.toSafeObject(),
      branch: {
        id: verifiedBranch._id,
        name: verifiedBranch.name,
        city: verifiedBranch.city,
      },
      clientProfile: {
        fitnessGoal: profile.fitnessGoal,
        experienceLevel: profile.experienceLevel,
        joiningDate: profile.joiningDate,
      },
    },
  };
};

/**
 * Authenticate member by credentials.
 */
const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Find user by email and populate branch
  const user = await User.findOne({ email: normalizedEmail }).populate('branchId', 'name city address');
  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // Check account status
  if (user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
    const error = new Error('This account has been deactivated or suspended. Please contact gym administration.');
    error.statusCode = 403;
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

  // If client, fetch profile
  let clientProfile = null;
  if (user.role === 'CLIENT') {
    clientProfile = await ClientProfile.findOne({ userId: user._id });
  }

  return {
    token,
    user: {
      ...user.toSafeObject(),
      branch: user.branchId ? {
        id: user.branchId._id,
        name: user.branchId.name,
        city: user.branchId.city,
      } : null,
      clientProfile: clientProfile ? {
        fitnessGoal: clientProfile.fitnessGoal,
        experienceLevel: clientProfile.experienceLevel,
        joiningDate: clientProfile.joiningDate,
      } : null,
    },
  };
};

/**
 * Fetch member profile and role-specific details
 */
const getMemberDetails = async (userId) => {
  const user = await User.findById(userId)
    .select('-password')
    .populate('branchId', 'name city address phone openingHours');

  if (!user) return null;

  let clientProfile = null;
  if (user.role === 'CLIENT') {
    clientProfile = await ClientProfile.findOne({ userId: user._id });
  }

  return {
    ...user.toSafeObject(),
    branch: user.branchId,
    clientProfile: clientProfile ? {
      fitnessGoal: clientProfile.fitnessGoal,
      experienceLevel: clientProfile.experienceLevel,
      joiningDate: clientProfile.joiningDate,
      trainerId: clientProfile.trainerId,
      membershipId: clientProfile.membershipId,
    } : null,
  };
};

module.exports = {
  registerClient,
  loginUser,
  getMemberDetails,
};
