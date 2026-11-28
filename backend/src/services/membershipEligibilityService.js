const os = require('os');
const crypto = require('crypto');
const Membership = require('../models/Membership');
const Payment = require('../models/Payment');
const User = require('../models/User');
const ClientProfile = require('../models/ClientProfile');
const BiometricEnrollment = require('../models/BiometricEnrollment');
const BiometricUserMapping = require('../models/BiometricUserMapping');
const SchedulerLock = require('../models/SchedulerLock');
const { getKolkataEndOfToday, syncClientProfileMembership } = require('../utils/membershipSync');

const INSTANCE_ID = `${os.hostname()}-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
const EXPIRY_LOCK_KEY = 'MEMBERSHIP_EXPIRY_SWEEP';
let expiryTimer = null;
let isRunningSweep = false;

/**
 * Authoritative centralized membership eligibility check for a client profile.
 * Never assumes a payment record alone means active; verifies status, dates (IST),
 * branch scope, and account/payment state.
 */
const evaluateClientMembershipEligibility = async (profile, { branchId = null, now = new Date() } = {}) => {
  if (!profile) {
    return {
      eligible: false,
      accessDecision: 'DENIED',
      reason: 'CLIENT_NOT_FOUND',
      membershipStatus: 'NOT_FOUND',
      attendanceStatus: 'UNMAPPED_USER',
      activeMembership: null,
      latestMembership: null,
    };
  }

  if (branchId && profile.branchId && String(profile.branchId) !== String(branchId)) {
    return {
      eligible: false,
      accessDecision: 'DENIED',
      reason: 'BRANCH_MISMATCH',
      membershipStatus: 'NO_MEMBERSHIP',
      attendanceStatus: 'FLAGGED_NO_MEMBERSHIP',
      activeMembership: null,
      latestMembership: null,
    };
  }

  if (profile.status === 'SUSPENDED' || profile.status === 'INACTIVE') {
    return {
      eligible: false,
      accessDecision: 'DENIED',
      reason: 'MEMBERSHIP_SUSPENDED',
      membershipStatus: 'SUSPENDED',
      attendanceStatus: 'FLAGGED_SUSPENDED',
      activeMembership: null,
      latestMembership: null,
    };
  }

  if (profile.userId) {
    const user = await User.findById(profile.userId).select('status').lean();
    if (user && (user.status === 'SUSPENDED' || user.status === 'INACTIVE')) {
      return {
        eligible: false,
        accessDecision: 'DENIED',
        reason: 'MEMBERSHIP_SUSPENDED',
        membershipStatus: 'SUSPENDED',
        attendanceStatus: 'FLAGGED_SUSPENDED',
        activeMembership: null,
        latestMembership: null,
      };
    }
  }

  const identityQuery = profile.userId
    ? { $or: [{ userId: profile.userId }, { clientProfileId: profile._id }] }
    : { clientProfileId: profile._id };

  const memberships = await Membership.find(identityQuery).sort({ expiryDate: -1, createdAt: -1 }).lean();
  if (!memberships || memberships.length === 0) {
    return {
      eligible: false,
      accessDecision: 'DENIED',
      reason: 'NO_MEMBERSHIP',
      membershipStatus: 'NO_MEMBERSHIP',
      attendanceStatus: 'FLAGGED_NO_MEMBERSHIP',
      activeMembership: null,
      latestMembership: null,
    };
  }

  const endOfToday = getKolkataEndOfToday(now);

  // Find an active, within-period membership whose linked payment (if any) is not failed/refunded
  for (const m of memberships) {
    if (m.status !== 'ACTIVE') continue;
    if (new Date(m.startDate) > endOfToday) continue;
    if (new Date(m.expiryDate) < now) continue;

    if (m.paymentId) {
      const payment = await Payment.findById(m.paymentId).select('status').lean();
      if (payment && ['FAILED', 'REFUNDED', 'CANCELLED'].includes(payment.status)) {
        continue;
      }
    }

    return {
      eligible: true,
      accessDecision: 'ALLOWED',
      reason: 'ACTIVE',
      membershipStatus: 'ACTIVE',
      attendanceStatus: 'SUCCESS',
      activeMembership: m,
      latestMembership: memberships[0],
    };
  }

  const latest = memberships[0];

  if (latest.status === 'PENDING_PAYMENT' || latest.status === 'PENDING') {
    return {
      eligible: false,
      accessDecision: 'DENIED',
      reason: 'PAYMENT_PENDING',
      membershipStatus: 'NO_MEMBERSHIP',
      attendanceStatus: 'FLAGGED_NO_MEMBERSHIP',
      activeMembership: null,
      latestMembership: latest,
    };
  }

  if (latest.status === 'EXPIRED' || (latest.status === 'ACTIVE' && new Date(latest.expiryDate) < now)) {
    return {
      eligible: false,
      accessDecision: 'DENIED',
      reason: 'MEMBERSHIP_EXPIRED',
      membershipStatus: 'EXPIRED',
      attendanceStatus: 'FLAGGED_EXPIRED',
      activeMembership: null,
      latestMembership: latest,
    };
  }

  if (latest.status === 'FROZEN' || latest.status === 'PAUSED') {
    return {
      eligible: false,
      accessDecision: 'DENIED',
      reason: 'MEMBERSHIP_SUSPENDED',
      membershipStatus: 'FROZEN',
      attendanceStatus: 'FLAGGED_FROZEN',
      activeMembership: null,
      latestMembership: latest,
    };
  }

  if (latest.status === 'CANCELLED') {
    return {
      eligible: false,
      accessDecision: 'DENIED',
      reason: 'MEMBERSHIP_CANCELLED',
      membershipStatus: 'CANCELLED',
      attendanceStatus: 'FLAGGED_CANCELLED',
      activeMembership: null,
      latestMembership: latest,
    };
  }

  return {
    eligible: false,
    accessDecision: 'DENIED',
    reason: 'NO_MEMBERSHIP',
    membershipStatus: 'NO_MEMBERSHIP',
    attendanceStatus: 'FLAGGED_NO_MEMBERSHIP',
    activeMembership: null,
    latestMembership: latest,
  };
};

/**
 * Combines membership eligibility with biometric enrollment & consent validity.
 */
const evaluateFacilityAccessEligibility = async (profile, { branchId = null, now = new Date() } = {}) => {
  const membershipEval = await evaluateClientMembershipEligibility(profile, { branchId, now });
  if (!profile) return membershipEval;

  const targetBranchId = branchId || profile.branchId;
  const enrollment = await BiometricEnrollment.findOne({
    clientProfileId: profile._id,
    ...(targetBranchId ? { branchId: targetBranchId } : {}),
  }).lean();

  if (!enrollment || enrollment.consentStatus === 'WITHDRAWN' || enrollment.status === 'REVOKED') {
    return {
      ...membershipEval,
      eligible: false,
      accessDecision: 'DENIED',
      reason: !enrollment ? 'BIOMETRIC_NOT_ENROLLED' : 'CONSENT_REQUIRED',
      enrollment: enrollment || null,
    };
  }

  return {
    ...membershipEval,
    enrollment,
  };
};

/**
 * Synchronize BiometricEnrollment accessState without deleting face templates or device PINs.
 * Idempotent: only appends history when accessState or accessDenialReason changes.
 */
const syncBiometricAccessForClient = async (profile, { actorUserId = null, now = new Date() } = {}) => {
  if (!profile?._id) return null;

  const evalResult = await evaluateClientMembershipEligibility(profile, {
    branchId: profile.branchId,
    now,
  });

  const enrollments = await BiometricEnrollment.find({ clientProfileId: profile._id });
  const nextState = evalResult.eligible ? 'ALLOWED' : 'DENIED';
  const nextReason = evalResult.eligible ? '' : evalResult.reason;

  for (const enrollment of enrollments) {
    const changed = enrollment.accessState !== nextState || enrollment.accessDenialReason !== nextReason;
    if (!changed) continue;

    enrollment.accessState = nextState;
    enrollment.accessDenialReason = nextReason;
    enrollment.accessUpdatedAt = now;
    enrollment.history.push({
      action: evalResult.eligible ? 'BIOMETRIC_ACCESS_RESTORED' : 'BIOMETRIC_ACCESS_SUSPENDED',
      fromStatus: enrollment.status,
      toStatus: enrollment.status,
      actorUserId,
      note: evalResult.eligible
        ? 'Membership active — biometric facility access restored (existing PIN & face enrollment preserved).'
        : `Membership ineligible (${nextReason}) — biometric facility access denied (face template & PIN preserved).`,
      timestamp: now,
    });
    await enrollment.save();
  }

  // If membership is now active and enrollment/mapping exists, ensure mapping remains ACTIVE
  if (evalResult.eligible) {
    await BiometricUserMapping.updateMany(
      { clientProfileId: profile._id, subjectType: 'CLIENT', status: 'INACTIVE' },
      { $set: { status: 'ACTIVE' } }
    );
  }

  return {
    accessState: nextState,
    accessDenialReason: nextReason,
    eligibility: evalResult,
    updatedEnrollments: enrollments.length,
  };
};

/**
 * Scheduled/on-demand membership expiry sweep.
 * Marks past-due ACTIVE memberships as EXPIRED, syncs ClientProfile, and updates BiometricEnrollment.accessState
 * without deleting device users or face templates.
 */
const runMembershipExpirySweep = async ({ now = new Date() } = {}) => {
  if (isRunningSweep) return { skipped: true, reason: 'IN_PROCESS_LOCK' };
  isRunningSweep = true;

  let lockAcquired = false;
  let fencingToken = null;
  const summary = { expiredCount: 0, clientsSynced: 0, errors: [] };

  try {
    const lock = await SchedulerLock.acquireLock(EXPIRY_LOCK_KEY, INSTANCE_ID, 60000);
    if (!lock) {
      return { skipped: true, reason: 'DISTRIBUTED_LOCK_HELD' };
    }
    lockAcquired = true;
    fencingToken = lock.fencingToken;

    const expiredDocs = await Membership.find({
      status: 'ACTIVE',
      expiryDate: { $lt: now },
    }).lean();

    if (expiredDocs.length > 0) {
      const ids = expiredDocs.map((d) => d._id);
      const upd = await Membership.updateMany(
        { _id: { $in: ids }, status: 'ACTIVE', expiryDate: { $lt: now } },
        { $set: { status: 'EXPIRED' } }
      );
      summary.expiredCount = upd.modifiedCount || 0;

      const seenProfiles = new Set();
      for (const m of expiredDocs) {
        const key = String(m.clientProfileId || m.userId || '');
        if (!key || seenProfiles.has(key)) continue;
        seenProfiles.add(key);

        try {
          const synced = await syncClientProfileMembership({
            userId: m.userId,
            clientProfileId: m.clientProfileId,
          });
          if (synced?.profile) {
            await syncBiometricAccessForClient(synced.profile, { now });
            summary.clientsSynced += 1;
          }
        } catch (err) {
          summary.errors.push(err.message);
        }
      }
    }

    return summary;
  } finally {
    isRunningSweep = false;
    if (lockAcquired) {
      await SchedulerLock.releaseLock(EXPIRY_LOCK_KEY, INSTANCE_ID, fencingToken, {
        lastError: summary.errors.join('; '),
      }).catch(() => {});
    }
  }
};

const startMembershipExpiryScheduler = () => {
  if (expiryTimer) return expiryTimer;
  const intervalMs = 5 * 60 * 1000;
  expiryTimer = setInterval(() => {
    runMembershipExpirySweep().catch((err) => {
      console.error('Membership expiry sweep error:', err.message);
    });
  }, intervalMs);
  if (typeof expiryTimer.unref === 'function') expiryTimer.unref();

  // Run an initial sweep shortly after startup
  const bootTimer = setTimeout(() => {
    runMembershipExpirySweep().catch(() => {});
  }, 10000);
  if (typeof bootTimer.unref === 'function') bootTimer.unref();

  return expiryTimer;
};

module.exports = {
  evaluateClientMembershipEligibility,
  evaluateFacilityAccessEligibility,
  syncBiometricAccessForClient,
  runMembershipExpirySweep,
  startMembershipExpiryScheduler,
};
