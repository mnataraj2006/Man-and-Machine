/**
 * Maps backend biometricSummary / enrollment fields to unified Admin UI states.
 * Never infers success from frontend-local state or treats DEVICE_USER_READY as ENROLLED.
 */
export function mapBiometricUiState(bio = {}) {
  const displayStatus = bio?.displayStatus || 'NOT_ENROLLED';
  const rawStatus = bio?.rawEnrollmentStatus || null;
  const syncStatus = bio?.deviceUserSyncStatus || 'NOT_STARTED';
  const hasEnrollment = Boolean(bio?.enrollmentId || (rawStatus && rawStatus !== 'NOT_STARTED'));

  if (!hasEnrollment && displayStatus === 'NOT_ENROLLED') {
    return {
      key: 'NOT_SET_UP',
      label: 'Not Set Up',
      actionLabel: 'Set Up Biometric Access',
      actionType: 'SETUP',
      badgeClass: 'bg-[#202020] text-[#B8B8B8] border-[#303030]',
    };
  }

  if (displayStatus === 'REVOKED' || rawStatus === 'REVOKED') {
    return {
      key: 'REVOKED',
      label: 'Revoked',
      actionLabel: 'View Biometric Details',
      actionType: 'DETAILS',
      badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    };
  }

  if (displayStatus === 'DISABLED') {
    return {
      key: 'DISABLED',
      label: 'Disabled',
      actionLabel: 'View Biometric Details',
      actionType: 'DETAILS',
      badgeClass: 'bg-[#202020] text-[#858585] border-[#303030]',
    };
  }

  if (displayStatus === 'SYNC_FAILED' || rawStatus === 'FAILED') {
    return {
      key: 'FAILED',
      label: 'Setup Failed',
      actionLabel: 'Retry Setup',
      actionType: 'RETRY',
      badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    };
  }

  if (displayStatus === 'ENROLLED' || displayStatus === 'DEVICE_OFFLINE') {
    return {
      key: 'ENROLLED',
      label: displayStatus === 'DEVICE_OFFLINE' ? 'Biometric Active (Device Offline)' : 'Biometric Active',
      actionLabel: 'View Biometric Details',
      actionType: 'DETAILS',
      badgeClass:
        displayStatus === 'DEVICE_OFFLINE'
          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    };
  }

  if (rawStatus === 'FACE_ENROLLMENT_PENDING') {
    return {
      key: 'FACE_ENROLLMENT_PENDING',
      label: 'Face Enrollment Pending',
      actionLabel: 'View Instructions',
      actionType: 'INSTRUCTIONS',
      badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    };
  }

  if (displayStatus === 'DEVICE_USER_READY' || rawStatus === 'DEVICE_USER_READY') {
    return {
      key: 'DEVICE_USER_READY',
      label: 'Ready for Face Enrollment',
      actionLabel: 'View Instructions',
      actionType: 'INSTRUCTIONS',
      badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    };
  }

  if (
    displayStatus === 'DEVICE_USER_SYNCING' ||
    rawStatus === 'DEVICE_USER_SYNCING' ||
    ['PENDING', 'SENT'].includes(syncStatus)
  ) {
    return {
      key: 'DEVICE_USER_SYNCING',
      label: 'Sending to Device',
      actionLabel: 'View Progress',
      actionType: 'PROGRESS',
      badgeClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    };
  }

  if (displayStatus === 'AWAITING_PHYSICAL_ENROLLMENT' || rawStatus === 'AWAITING_PHYSICAL_ENROLLMENT') {
    return {
      key: 'AWAITING_PHYSICAL_ENROLLMENT',
      label: 'Waiting for Device',
      actionLabel: 'View Progress',
      actionType: 'PROGRESS',
      badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    };
  }

  return {
    key: 'ADMIN_CONFIRMED',
    label: 'Registration Approved',
    actionLabel: 'View Progress',
    actionType: 'PROGRESS',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  };
}

/**
 * Computes the 6-step setup progress strictly from backend evidence.
 * Returns status: 'completed' | 'in_progress' | 'failed' | 'pending'.
 */
export function computeBiometricSetupSteps(bio = {}, enrollmentDetails = null) {
  const enr = enrollmentDetails?.enrollment || {};
  const syncJob = enr.deviceUserSyncJobId || null;

  const rawStatus = enr.status || bio.rawEnrollmentStatus || null;
  const displayStatus = bio.displayStatus || 'NOT_ENROLLED';
  const syncStatus = syncJob?.status || bio.deviceUserSyncStatus || enr.deviceUserSyncStatus || 'NOT_STARTED';
  const deviceEnrStatus = bio.deviceEnrollmentStatus || enr.deviceEnrollmentStatus || 'NOT_STARTED';
  const faceStatus = bio.faceEnrollmentStatus || enr.faceEnrollmentStatus || 'NOT_ENROLLED';
  const pin = enr.biometricUserId || bio.biometricUserId || null;
  const hasEnrollment = Boolean(bio.enrollmentId || enr._id || (rawStatus && rawStatus !== 'NOT_STARTED'));
  const isApproved =
    hasEnrollment &&
    (enr.adminApprovalStatus === 'APPROVED' ||
      ['APPROVED', 'DEVICE_USER_SYNCING', 'AWAITING_PHYSICAL_ENROLLMENT', 'DEVICE_USER_READY', 'FACE_ENROLLMENT_PENDING', 'ENROLLED'].includes(rawStatus));

  const isFailed = displayStatus === 'SYNC_FAILED' || rawStatus === 'FAILED' || syncStatus === 'FAILED';
  const isActive = displayStatus === 'ENROLLED' && bio.gymAccessStatus === 'GRANTED';
  const isDeviceConfirmed =
    isActive ||
    displayStatus === 'DEVICE_USER_READY' ||
    rawStatus === 'DEVICE_USER_READY' ||
    syncStatus === 'VERIFIED' ||
    deviceEnrStatus === 'DEVICE_VERIFIED';

  const step1 = isApproved ? 'completed' : hasEnrollment ? 'in_progress' : 'pending';
  const step2 = pin ? 'completed' : isApproved ? 'in_progress' : 'pending';

  let step3 = 'pending';
  if (isDeviceConfirmed || ['SENT', 'ACKNOWLEDGED', 'VERIFIED'].includes(syncStatus)) {
    step3 = 'completed';
  } else if (isFailed) {
    step3 = 'failed';
  } else if (syncStatus === 'PENDING' || displayStatus === 'DEVICE_USER_SYNCING') {
    step3 = 'in_progress';
  }

  let step4 = 'pending';
  if (isDeviceConfirmed) {
    step4 = 'completed';
  } else if (isFailed) {
    step4 = 'failed';
  } else if (['SENT', 'ACKNOWLEDGED'].includes(syncStatus)) {
    step4 = 'in_progress';
  }

  let step5 = 'pending';
  if (faceStatus === 'ENROLLED' && displayStatus === 'ENROLLED') {
    step5 = 'completed';
  } else if (isDeviceConfirmed || rawStatus === 'FACE_ENROLLMENT_PENDING') {
    step5 = 'in_progress';
  }

  const step6 = isActive ? 'completed' : 'pending';

  return [
    { number: 1, title: 'Admin Approval', status: step1 },
    { number: 2, title: 'Biometric PIN Assignment', status: step2 },
    { number: 3, title: 'Sending User Details to Device', status: step3 },
    { number: 4, title: 'Device Confirmation', status: step4 },
    { number: 5, title: 'Physical Face Enrollment', status: step5 },
    { number: 6, title: 'Biometric Access Active', status: step6 },
  ];
}
