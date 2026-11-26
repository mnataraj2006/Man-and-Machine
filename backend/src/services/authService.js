const User = require('../models/User');
const Branch = require('../models/Branch');
const ClientProfile = require('../models/ClientProfile');
const TrainerProfile = require('../models/TrainerProfile');
const Membership = require('../models/Membership');
const generateToken = require('../utils/generateToken');
const { generateSecureToken, hashToken, getFrontendBaseUrl } = require('../utils/tokenUtils');
const { sendPasswordResetEmail } = require('../utils/emailService');
const { resolveClientTrainer } = require('../utils/trainerAssignment');

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

  const token = generateToken(user._id, user.tokenVersion || 0);

  return {
    token,
    user: {
      ...user.toSafeObject(),
      clientId: profile.clientId,
      branch: {
        id: verifiedBranch._id,
        name: verifiedBranch.name,
        city: verifiedBranch.city,
      },
      trainerAssigned: false,
      clientProfile: {
        clientId: profile.clientId,
        fitnessGoal: profile.fitnessGoal,
        experienceLevel: profile.experienceLevel,
        joiningDate: profile.joiningDate,
        trainerId: null,
        trainerAssigned: false,
        trainer: null,
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

  // Check account status strictly before verifying password
  if (user.status === 'PENDING_ACTIVATION' || user.status === 'PENDING') {
    const error = new Error('Your account is pending activation. Please complete setup using your invitation link before logging in.');
    error.statusCode = 403;
    throw error;
  }

  if (user.status === 'SUSPENDED') {
    const error = new Error('Your account has been suspended. Please contact gym administration.');
    error.statusCode = 403;
    throw error;
  }

  if (user.status === 'INACTIVE') {
    const error = new Error('This account has been deactivated. Please contact gym administration.');
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

  const token = generateToken(user._id, user.tokenVersion || 0);

  let trainerProfileData = null;
  if (user.role === 'TRAINER') {
    trainerProfileData = await TrainerProfile.findOne({ userId: user._id }).lean();
  }

  // If client, fetch profile and trainer assignment
  let clientProfileData = null;
  let trainerAssigned = false;
  let activeMembership = null;
  let hasActiveMembership = false;
  if (user.role === 'CLIENT') {
    const clientProfile = await ClientProfile.findOne({ userId: user._id });
    if (clientProfile) {
      const trainerCheck = await resolveClientTrainer(clientProfile);
      trainerAssigned = trainerCheck.trainerAssigned;
      clientProfileData = {
        clientId: clientProfile.clientId || '',
        fitnessGoal: clientProfile.fitnessGoal,
        experienceLevel: clientProfile.experienceLevel,
        joiningDate: clientProfile.joiningDate,
        trainerId: trainerCheck.trainer ? trainerCheck.trainer.id : null,
        trainingPreference: clientProfile.trainingPreference || 'SELF_TRAINED',
        trainerAssigned,
        trainer: trainerCheck.trainer,
        trainerName: trainerCheck.trainer ? trainerCheck.trainer.name : null,
      };
    }

    const now = new Date();
    const mem = await Membership.findOne({
      userId: user._id,
      status: 'ACTIVE',
      expiryDate: { $gte: now },
    }).populate('branchId', 'name city');

    if (mem) {
      hasActiveMembership = true;
      activeMembership = {
        id: mem._id,
        planName: mem.planName,
        status: mem.status,
        startDate: mem.startDate,
        expiryDate: mem.expiryDate,
        daysRemaining: Math.max(0, Math.ceil((new Date(mem.expiryDate) - now) / (1000 * 60 * 60 * 24))),
        branch: mem.branchId,
        trainingPreference: mem.trainingPreference || 'SELF_TRAINED',
      };
    }
  }

  return {
    token,
    user: {
      ...user.toSafeObject(),
      clientId: clientProfileData?.clientId || '',
      branch: user.branchId ? {
        id: user.branchId._id,
        name: user.branchId.name,
        city: user.branchId.city,
      } : null,
      trainerAssigned,
      hasActiveMembership,
      activeMembership,
      clientProfile: clientProfileData,
      trainerProfile: trainerProfileData,
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

  let clientProfileData = null;
  let trainerAssigned = false;
  let activeMembership = null;
  let hasActiveMembership = false;
  if (user.role === 'CLIENT') {
    const clientProfile = await ClientProfile.findOne({ userId: user._id });
    if (clientProfile) {
      const trainerCheck = await resolveClientTrainer(clientProfile);
      trainerAssigned = trainerCheck.trainerAssigned;
      clientProfileData = {
        clientId: clientProfile.clientId || '',
        fitnessGoal: clientProfile.fitnessGoal,
        experienceLevel: clientProfile.experienceLevel,
        joiningDate: clientProfile.joiningDate,
        trainerId: trainerCheck.trainer ? trainerCheck.trainer.id : null,
        trainingPreference: clientProfile.trainingPreference || 'SELF_TRAINED',
        trainerAssigned,
        trainer: trainerCheck.trainer,
        trainerName: trainerCheck.trainer ? trainerCheck.trainer.name : null,
        membershipId: clientProfile.membershipId,
      };
    }

    const now = new Date();
    const mem = await Membership.findOne({
      userId: user._id,
      status: 'ACTIVE',
      expiryDate: { $gte: now },
    }).populate('branchId', 'name city');

    if (mem) {
      hasActiveMembership = true;
      activeMembership = {
        id: mem._id,
        planName: mem.planName,
        status: mem.status,
        startDate: mem.startDate,
        expiryDate: mem.expiryDate,
        daysRemaining: Math.max(0, Math.ceil((new Date(mem.expiryDate) - now) / (1000 * 60 * 60 * 24))),
        branch: mem.branchId,
        trainingPreference: mem.trainingPreference || 'SELF_TRAINED',
      };
    }
  }

  return {
    ...user.toSafeObject(),
    clientId: clientProfileData?.clientId || '',
    branch: user.branchId,
    trainerAssigned,
    hasActiveMembership,
    activeMembership,
    clientProfile: clientProfileData,
  };
};

/**
 * Verify single-use activation token validity without consuming it.
 */
const verifyActivationToken = async (rawToken) => {
  const tokenHash = hashToken(rawToken);
  if (!tokenHash) {
    const error = new Error('Invalid activation link.');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({ activationTokenHash: tokenHash })
    .select('+activationTokenHash +activationTokenExpiresAt')
    .populate('branchId', 'name city');

  if (!user) {
    const error = new Error('Activation link is invalid or has already been used.');
    error.statusCode = 400;
    throw error;
  }

  if (user.status !== 'PENDING_ACTIVATION' || user.activationUsedAt) {
    const error = new Error('This account has already been activated or is no longer eligible for activation.');
    error.statusCode = 400;
    throw error;
  }

  if (!user.activationTokenExpiresAt || new Date(user.activationTokenExpiresAt) < new Date()) {
    const error = new Error('This activation link has expired. Please ask an administrator to resend your invitation.');
    error.statusCode = 400;
    throw error;
  }

  return {
    name: user.name,
    email: user.email,
    role: user.role,
    branch: user.branchId ? { name: user.branchId.name, city: user.branchId.city } : null,
  };
};

/**
 * Complete account activation: set password, mark single-use token consumed, activate account.
 */
const activateAccountWithToken = async (rawToken, newPassword) => {
  const tokenHash = hashToken(rawToken);
  if (!tokenHash) {
    const error = new Error('Invalid activation token.');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({ activationTokenHash: tokenHash })
    .select('+activationTokenHash +activationTokenExpiresAt');

  if (!user) {
    const error = new Error('Activation link is invalid or has already been used.');
    error.statusCode = 400;
    throw error;
  }

  if (user.status !== 'PENDING_ACTIVATION' || user.activationUsedAt) {
    const error = new Error('This account has already been activated.');
    error.statusCode = 400;
    throw error;
  }

  if (!user.activationTokenExpiresAt || new Date(user.activationTokenExpiresAt) < new Date()) {
    const error = new Error('Activation link has expired. Ask an administrator to resend the invitation.');
    error.statusCode = 400;
    throw error;
  }

  user.password = newPassword;
  user.status = 'ACTIVE';
  user.activationTokenHash = null;
  user.activationTokenExpiresAt = null;
  user.activationUsedAt = new Date();
  user.tokenVersion = (user.tokenVersion || 0) + 1;

  await user.save();

  return {
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
};

/**
 * Request password reset for an existing active user.
 * Never reveals to caller whether the email exists.
 */
const requestPasswordReset = async (email) => {
  const normalizedEmail = (email || '').toLowerCase().trim();
  if (!normalizedEmail) {
    return { dispatched: false };
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user || user.status !== 'ACTIVE') {
    // Do not reveal account existence or state
    return { dispatched: false };
  }

  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  user.passwordResetTokenHash = tokenHash;
  user.passwordResetTokenExpiresAt = expiresAt;
  user.passwordResetRequestedAt = new Date();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${getFrontendBaseUrl()}/reset-password/${rawToken}`;
  await sendPasswordResetEmail({
    to: user.email,
    userName: user.name,
    resetUrl,
    expiresInMinutes: 30,
  });

  return { dispatched: true };
};

/**
 * Verify password reset token without consuming it.
 */
const verifyPasswordResetToken = async (rawToken) => {
  const tokenHash = hashToken(rawToken);
  if (!tokenHash) {
    const error = new Error('Invalid password reset link.');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({ passwordResetTokenHash: tokenHash })
    .select('+passwordResetTokenHash +passwordResetTokenExpiresAt');

  if (!user || !user.passwordResetTokenExpiresAt || new Date(user.passwordResetTokenExpiresAt) < new Date()) {
    const error = new Error('Password reset link is invalid or has expired.');
    error.statusCode = 400;
    throw error;
  }

  if (user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
    const error = new Error('This account is deactivated or suspended.');
    error.statusCode = 403;
    throw error;
  }

  return {
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

/**
 * Consume single-use password reset token, update password, and invalidate existing sessions.
 */
const resetPasswordWithToken = async (rawToken, newPassword) => {
  const tokenHash = hashToken(rawToken);
  if (!tokenHash) {
    const error = new Error('Invalid password reset link.');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({ passwordResetTokenHash: tokenHash })
    .select('+passwordResetTokenHash +passwordResetTokenExpiresAt');

  if (!user || !user.passwordResetTokenExpiresAt || new Date(user.passwordResetTokenExpiresAt) < new Date()) {
    const error = new Error('Password reset link is invalid or has expired.');
    error.statusCode = 400;
    throw error;
  }

  if (user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
    const error = new Error('This account is deactivated or suspended.');
    error.statusCode = 403;
    throw error;
  }

  user.password = newPassword;
  if (user.status === 'PENDING_ACTIVATION') {
    user.status = 'ACTIVE';
    user.activationUsedAt = user.activationUsedAt || new Date();
    user.activationTokenHash = null;
    user.activationTokenExpiresAt = null;
  }
  user.passwordResetTokenHash = null;
  user.passwordResetTokenExpiresAt = null;
  user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidates all existing sessions

  await user.save();

  return {
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

module.exports = {
  registerClient,
  loginUser,
  getMemberDetails,
  verifyActivationToken,
  activateAccountWithToken,
  requestPasswordReset,
  verifyPasswordResetToken,
  resetPasswordWithToken,
};
