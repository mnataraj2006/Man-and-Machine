const mongoose = require('mongoose');
const ClientProfile = require('../models/ClientProfile');
const Membership = require('../models/Membership');

// Per-user in-flight lock to prevent concurrent duplicate membership purchases
const activeLocks = new Set();

function acquireUserPurchaseLock(userId) {
  const key = String(userId);
  if (activeLocks.has(key)) return false;
  activeLocks.add(key);
  return true;
}

function releaseUserPurchaseLock(userId) {
  activeLocks.delete(String(userId));
}

/**
 * Run callback inside a MongoDB transaction if supported (Atlas / replica set),
 * falling back gracefully to non-transactional execution on standalone instances.
 */
async function runWithOptionalTransaction(fn) {
  let session = null;
  try {
    session = await mongoose.startSession();
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } catch (err) {
    const msg = String(err?.message || '');
    if (
      msg.includes('Transaction numbers are only allowed on a replica set') ||
      msg.includes('sessions are not supported')
    ) {
      return fn(null);
    }
    throw err;
  } finally {
    if (session) {
      await session.endSession().catch(() => {});
    }
  }
}

/**
 * Synchronizes ClientProfile.membershipId with the authoritative Membership collection.
 * Prefers the latest ACTIVE non-expired membership; otherwise falls back to the latest membership.
 */
async function syncClientProfileMembership({ userId = null, clientProfileId = null, session = null } = {}) {
  const opts = session ? { session } : {};

  let profile = null;
  if (clientProfileId) {
    profile = await ClientProfile.findById(clientProfileId, null, opts);
  }
  if (!profile && userId) {
    profile = await ClientProfile.findOne({ userId }, null, opts);
  }
  if (!profile) return null;

  const orConds = [];
  if (profile.userId) orConds.push({ userId: profile.userId });
  if (userId && String(userId) !== String(profile.userId || '')) orConds.push({ userId });
  orConds.push({ clientProfileId: profile._id });

  const now = new Date();
  const active = await Membership.findOne(
    {
      $or: orConds,
      status: 'ACTIVE',
      expiryDate: { $gte: now },
    },
    null,
    opts
  ).sort({ expiryDate: -1, createdAt: -1 });

  const authoritative =
    active ||
    (await Membership.findOne({ $or: orConds }, null, opts).sort({ createdAt: -1 }));

  const nextMembershipId = authoritative ? authoritative._id.toString() : '';
  if (profile.membershipId !== nextMembershipId) {
    profile.membershipId = nextMembershipId;
    await profile.save(opts);
  }

  return { profile, authoritativeMembership: authoritative || null };
}

/**
 * Authoritative backend pricing calculator for global and branch-specific MembershipPlans.
 * Ensures subtotal + joiningFee - discountAmount === finalPrice always balances.
 */
function resolveMembershipPlanPricing({ plan, branchId, customAmount = undefined, allowCustomAmount = false }) {
  if (!plan || !plan.isActive) {
    const err = new Error('Selected plan is inactive or no longer exists.');
    err.statusCode = 404;
    throw err;
  }

  if (plan.branchId && branchId && String(plan.branchId) !== String(branchId)) {
    const err = new Error(`The plan "${plan.name}" is restricted to another branch.`);
    err.statusCode = 400;
    throw err;
  }

  const branchConfig = branchId
    ? (plan.branchPricing || []).find((bp) => bp.branchId?.toString() === branchId.toString())
    : null;

  if (branchConfig && branchConfig.isAvailable === false) {
    const err = new Error(`The plan "${plan.name}" is not available at the selected branch.`);
    err.statusCode = 400;
    throw err;
  }

  let basePrice = branchConfig ? Number(branchConfig.basePrice || 0) : Number(plan.price || 0);
  let joiningFee = branchConfig ? Number(branchConfig.joiningFee || 0) : 0;
  let discountType = branchConfig ? branchConfig.discountType || 'NONE' : 'NONE';
  let discountValue = branchConfig ? Number(branchConfig.discountValue || 0) : 0;

  let discountAmount = 0;
  if (discountType === 'FIXED') {
    discountAmount = Math.min(basePrice + joiningFee, Math.max(0, discountValue));
  } else if (discountType === 'PERCENTAGE') {
    discountAmount = Math.min(
      basePrice + joiningFee,
      Math.round(((basePrice + joiningFee) * Math.max(0, discountValue)) / 100)
    );
  }

  let finalPrice = Math.max(0, basePrice + joiningFee - discountAmount);

  if (allowCustomAmount && customAmount !== undefined && customAmount !== '') {
    const parsed = Number(customAmount);
    if (!Number.isFinite(parsed) || parsed < 0) {
      const err = new Error('Membership fee must be a valid non-negative number.');
      err.statusCode = 400;
      throw err;
    }
    const listTotal = basePrice + joiningFee;
    if (parsed <= listTotal) {
      discountAmount = listTotal - parsed;
      discountType = discountAmount > 0 ? 'FIXED' : 'NONE';
      discountValue = discountAmount;
    } else {
      basePrice = parsed;
      joiningFee = 0;
      discountType = 'NONE';
      discountValue = 0;
      discountAmount = 0;
    }
    finalPrice = parsed;
  }

  const durationDays = Number(plan.durationDays) || Number(plan.durationMonths || 1) * 30 || 30;
  const durationMonths = Number(plan.durationMonths) || Math.max(1, Math.round(durationDays / 30));

  return {
    planId: plan._id,
    planName: plan.name,
    branchConfig: branchConfig || null,
    basePrice,
    joiningFee,
    discountType,
    discountValue,
    discountAmount,
    finalPrice,
    durationDays,
    durationMonths,
  };
}

function getKolkataEndOfToday(referenceDate = new Date()) {
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(referenceDate);
  return new Date(`${dateStr}T23:59:59.999+05:30`);
}

module.exports = {
  acquireUserPurchaseLock,
  releaseUserPurchaseLock,
  runWithOptionalTransaction,
  syncClientProfileMembership,
  resolveMembershipPlanPricing,
  getKolkataEndOfToday,
};
