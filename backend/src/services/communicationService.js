const User = require('../models/User');
const smsService = require('./smsService');
const emailService = require('./emailService');

const safeDispatch = (fn) => async (...args) => {
  try {
    return await fn(...args);
  } catch (err) {
    console.error('[CommunicationService] Dispatch error:', err.message);
    return null;
  }
};

const resolveClientEmail = async (client) => {
  if (!client) return '';
  if (client.email && String(client.email).trim()) return String(client.email).trim().toLowerCase();
  if (client.userId) {
    const u = await User.findById(client.userId).select('email').lean();
    if (u?.email) return String(u.email).trim().toLowerCase();
  }
  return '';
};

/**
 * Dispatch SMS and Email independently so one channel failing never blocks the other.
 */
const dispatchBothChannels = async ({ smsPayload, emailPayload }) => {
  const tasks = [];
  tasks.push(smsPayload ? smsService.sendNotification(smsPayload) : Promise.resolve(null));
  tasks.push(emailPayload ? emailService.sendEmailNotification(emailPayload) : Promise.resolve(null));
  const [smsResult, emailResult] = await Promise.allSettled(tasks);
  return {
    sms: smsResult.status === 'fulfilled' ? smsResult.value : { ok: false, error: smsResult.reason?.message },
    email: emailResult.status === 'fulfilled' ? emailResult.value : { ok: false, error: emailResult.reason?.message },
  };
};

const triggerClientWelcome = safeDispatch(async ({ client, branch, membership }) => {
  if (!client?._id) return;
  const branchName = branch?.city || branch?.name || 'Man & Machine';
  const clientEmail = await resolveClientEmail(client);
  const vars = {
    memberName: client.name || 'Member',
    memberId: client.clientId || String(client._id).slice(-6),
    branchName,
    membershipName: membership?.planName || 'Gym Membership',
    expiryDate: smsService.formatDateIN(membership?.expiryDate),
  };

  await dispatchBothChannels({
    smsPayload: {
      notificationKey: 'MEMBER_WELCOME_GREETINGS',
      recipientPhone: client.phone,
      recipientName: client.name,
      recipientType: 'MEMBER',
      clientProfileId: client._id,
      branchId: branch?._id || client.branchId,
      variables: vars,
      eventKey: `welcome:${client._id}`,
    },
    emailPayload: {
      notificationKey: 'MEMBER_WELCOME_GREETINGS',
      recipientEmail: clientEmail,
      recipientName: client.name,
      recipientType: 'MEMBER',
      clientProfileId: client._id,
      branchId: branch?._id || client.branchId,
      variables: vars,
      eventKey: `email-welcome:${client._id}`,
    },
  });

  const { ownerName, ownerPhone } = await smsService.getOwnerRecipient();
  const { ownerEmail } = await emailService.getOwnerEmailRecipient();

  await dispatchBothChannels({
    smsPayload: ownerPhone
      ? {
          notificationKey: 'STAFF_MEMBER_WELCOME_GREETINGS',
          recipientPhone: ownerPhone,
          recipientName: ownerName,
          recipientType: 'OWNER',
          clientProfileId: client._id,
          branchId: branch?._id || client.branchId,
          variables: { ...vars, ownerName },
          eventKey: `staff-welcome:${client._id}`,
        }
      : null,
    emailPayload: ownerEmail
      ? {
          notificationKey: 'STAFF_MEMBER_WELCOME_GREETINGS',
          recipientEmail: ownerEmail,
          recipientName: ownerName,
          recipientType: 'OWNER',
          clientProfileId: client._id,
          branchId: branch?._id || client.branchId,
          variables: { ...vars, ownerName },
          eventKey: `email-staff-welcome:${client._id}`,
        }
      : null,
  });

  if (membership?._id) {
    await triggerMembershipStatusChange({
      client,
      membership,
      branch,
      status: 'ACTIVE',
      actionRef: `init:${membership._id}`,
    });
  }
});

const buildPaymentReceiptAttachment = ({ client, payment, membership, branchName }) => {
  if (!payment?._id) return [];
  const receiptText = [
    'MAN & MACHINE FITNESS — PAYMENT RECEIPT',
    '========================================',
    `Receipt ID : ${payment.receiptNumber || payment._id}`,
    `Member     : ${client.name || 'Member'} (${client.clientId || ''})`,
    `Branch     : ${branchName}`,
    `Plan       : ${membership?.planName || 'Membership'}`,
    `Amount Paid: Rs.${Number(payment.amount || 0)}`,
    `Date       : ${smsService.formatDateIN(payment.createdAt || new Date())}`,
    '========================================',
    'Thank you for training with Man & Machine Fitness.',
  ].join('\n');

  return [
    {
      filename: `receipt-${payment.receiptNumber || payment._id}.txt`,
      content: Buffer.from(receiptText, 'utf8'),
      contentType: 'text/plain',
    },
  ];
};

const triggerMembershipPayment = safeDispatch(async ({ client, payment, membership, branch }) => {
  if (!client?._id || !payment?._id) return;
  const branchName = branch?.city || branch?.name || 'Man & Machine';
  const clientEmail = await resolveClientEmail(client);
  const vars = {
    memberName: client.name || 'Member',
    memberId: client.clientId || String(client._id).slice(-6),
    paymentAmount: String(Number(payment.amount || 0)),
    membershipName: membership?.planName || 'Membership',
    branchName,
  };
  const attachments = buildPaymentReceiptAttachment({ client, payment, membership, branchName });

  await dispatchBothChannels({
    smsPayload: {
      notificationKey: 'MEMBER_MEMBERSHIP_PAYMENT',
      recipientPhone: client.phone,
      recipientName: client.name,
      recipientType: 'MEMBER',
      clientProfileId: client._id,
      branchId: branch?._id || payment.branchId,
      variables: vars,
      eventKey: `member-payment:${payment._id}`,
    },
    emailPayload: {
      notificationKey: 'MEMBER_MEMBERSHIP_PAYMENT',
      recipientEmail: clientEmail,
      recipientName: client.name,
      recipientType: 'MEMBER',
      clientProfileId: client._id,
      branchId: branch?._id || payment.branchId,
      variables: vars,
      attachments,
      eventKey: `email-member-payment:${payment._id}`,
    },
  });

  const { ownerName, ownerPhone } = await smsService.getOwnerRecipient();
  const { ownerEmail } = await emailService.getOwnerEmailRecipient();

  await dispatchBothChannels({
    smsPayload: ownerPhone
      ? {
          notificationKey: 'STAFF_MEMBERSHIP_PAYMENT',
          recipientPhone: ownerPhone,
          recipientName: ownerName,
          recipientType: 'OWNER',
          clientProfileId: client._id,
          branchId: branch?._id || payment.branchId,
          variables: { ...vars, ownerName },
          eventKey: `staff-payment:${payment._id}`,
        }
      : null,
    emailPayload: ownerEmail
      ? {
          notificationKey: 'STAFF_MEMBERSHIP_PAYMENT',
          recipientEmail: ownerEmail,
          recipientName: ownerName,
          recipientType: 'OWNER',
          clientProfileId: client._id,
          branchId: branch?._id || payment.branchId,
          variables: { ...vars, ownerName },
          eventKey: `email-staff-payment:${payment._id}`,
        }
      : null,
  });
});

const triggerMembershipStatusChange = safeDispatch(
  async ({ client, membership, branch, status, actionRef = '' }) => {
    if (!client?._id || !membership?._id) return;
    const branchName = branch?.city || branch?.name || 'Man & Machine';
    const upper = String(status || membership.status || '').toUpperCase();
    const clientEmail = await resolveClientEmail(client);

    let memberKey = null;
    let staffKey = null;
    if (upper === 'FROZEN') {
      memberKey = 'MEMBER_MEMBERSHIP_FREEZE';
      staffKey = 'STAFF_MEMBERSHIP_FREEZE';
    } else if (upper === 'PAUSED' || upper === 'SUSPENDED') {
      memberKey = 'MEMBER_MEMBERSHIP_SUSPENSION';
      staffKey = 'STAFF_MEMBERSHIP_SUSPENDED';
    } else if (upper === 'CANCELLED') {
      memberKey = 'MEMBER_MEMBERSHIP_CANCELLATION';
      staffKey = 'STAFF_MEMBERSHIP_CANCELLED';
    } else if (upper === 'DELETED') {
      memberKey = 'MEMBER_MEMBERSHIP_DELETION';
      staffKey = 'STAFF_MEMBERSHIP_DELETED';
    } else if (upper === 'ACTIVE') {
      memberKey = 'MEMBER_MEMBERSHIP_ACTIVATION';
      staffKey = 'STAFF_MEMBERSHIP_ACTIVATED';
    } else if (upper === 'GIFT_DAYS') {
      memberKey = 'MEMBER_GIVING_GIFT_DAYS';
      staffKey = 'STAFF_GIVING_GIFT_DAYS';
    } else if (upper === 'UPDATED') {
      staffKey = 'STAFF_UPDATE_MEMBERSHIP_INFO';
    }

    const vars = {
      memberName: client.name || 'Member',
      memberId: client.clientId || String(client._id).slice(-6),
      membershipName: membership.planName || 'Membership',
      expiryDate: smsService.formatDateIN(membership.expiryDate),
      branchName,
    };
    const suffix = actionRef || `${membership._id}:${upper}:${new Date().toISOString().slice(0, 16)}`;

    if (memberKey) {
      await dispatchBothChannels({
        smsPayload: {
          notificationKey: memberKey,
          recipientPhone: client.phone,
          recipientName: client.name,
          recipientType: 'MEMBER',
          clientProfileId: client._id,
          branchId: branch?._id || membership.branchId,
          variables: vars,
          eventKey: `${memberKey}:${suffix}`,
        },
        emailPayload: {
          notificationKey: memberKey,
          recipientEmail: clientEmail,
          recipientName: client.name,
          recipientType: 'MEMBER',
          clientProfileId: client._id,
          branchId: branch?._id || membership.branchId,
          variables: vars,
          eventKey: `email-${memberKey}:${suffix}`,
        },
      });
    }

    const { ownerName, ownerPhone } = await smsService.getOwnerRecipient();
    const { ownerEmail } = await emailService.getOwnerEmailRecipient();
    if (staffKey) {
      await dispatchBothChannels({
        smsPayload: ownerPhone
          ? {
              notificationKey: staffKey,
              recipientPhone: ownerPhone,
              recipientName: ownerName,
              recipientType: 'OWNER',
              clientProfileId: client._id,
              branchId: branch?._id || membership.branchId,
              variables: { ...vars, ownerName },
              eventKey: `${staffKey}:${suffix}`,
            }
          : null,
        emailPayload: ownerEmail
          ? {
              notificationKey: staffKey,
              recipientEmail: ownerEmail,
              recipientName: ownerName,
              recipientType: 'OWNER',
              clientProfileId: client._id,
              branchId: branch?._id || membership.branchId,
              variables: { ...vars, ownerName },
              eventKey: `email-${staffKey}:${suffix}`,
            }
          : null,
      });
    }
  }
);

const triggerClientUpdated = safeDispatch(async ({ client, branch }) => {
  if (!client?._id) return;
  const { ownerName, ownerPhone } = await smsService.getOwnerRecipient();
  const { ownerEmail } = await emailService.getOwnerEmailRecipient();
  const stamp = `${client._id}:${new Date().toISOString().slice(0, 16)}`;
  const vars = {
    ownerName,
    memberName: client.name || 'Member',
    memberId: client.clientId || String(client._id).slice(-6),
    branchName: branch?.city || branch?.name || 'Man & Machine',
  };

  await dispatchBothChannels({
    smsPayload: ownerPhone
      ? {
          notificationKey: 'STAFF_UPDATE_MEMBER_INFO',
          recipientPhone: ownerPhone,
          recipientName: ownerName,
          recipientType: 'OWNER',
          clientProfileId: client._id,
          branchId: branch?._id || client.branchId,
          variables: vars,
          eventKey: `staff-member-update:${stamp}`,
        }
      : null,
    emailPayload: ownerEmail
      ? {
          notificationKey: 'STAFF_UPDATE_MEMBER_INFO',
          recipientEmail: ownerEmail,
          recipientName: ownerName,
          recipientType: 'OWNER',
          clientProfileId: client._id,
          branchId: branch?._id || client.branchId,
          variables: vars,
          eventKey: `email-staff-member-update:${stamp}`,
        }
      : null,
  });
});

const triggerTrainerAssigned = safeDispatch(
  async ({ client, branch, trainerUser, trainerPhone, trainerEmail }) => {
    if (!client?._id || !trainerUser?._id) return;
    const branchName = branch?.city || branch?.name || 'Man & Machine';
    const clientEmail = await resolveClientEmail(client);
    const vars = {
      memberName: client.name || 'Member',
      memberId: client.clientId || String(client._id).slice(-6),
      trainerName: trainerUser.name || 'Coach',
      branchName,
    };
    const stamp = `${client._id}:${trainerUser._id}:${new Date().toISOString().slice(0, 16)}`;

    await dispatchBothChannels({
      smsPayload: {
        notificationKey: 'MEMBER_TRAINER_ASSIGN_ALERT',
        recipientPhone: client.phone,
        recipientName: client.name,
        recipientType: 'MEMBER',
        clientProfileId: client._id,
        trainerId: trainerUser._id,
        branchId: branch?._id || client.branchId,
        variables: vars,
        eventKey: `member-trainer-assign:${stamp}`,
      },
      emailPayload: {
        notificationKey: 'MEMBER_TRAINER_ASSIGN_ALERT',
        recipientEmail: clientEmail,
        recipientName: client.name,
        recipientType: 'MEMBER',
        clientProfileId: client._id,
        trainerId: trainerUser._id,
        branchId: branch?._id || client.branchId,
        variables: vars,
        eventKey: `email-member-trainer-assign:${stamp}`,
      },
    });

    const targetTrainerPhone = trainerPhone || trainerUser.phone || '';
    const targetTrainerEmail = trainerEmail || trainerUser.email || '';

    await dispatchBothChannels({
      smsPayload: targetTrainerPhone
        ? {
            notificationKey: 'STAFF_TRAINER_ASSIGN_ALERT',
            recipientPhone: targetTrainerPhone,
            recipientName: trainerUser.name,
            recipientType: 'TRAINER',
            clientProfileId: client._id,
            trainerId: trainerUser._id,
            branchId: branch?._id || client.branchId,
            variables: vars,
            eventKey: `staff-trainer-assign:${stamp}`,
          }
        : null,
      emailPayload: targetTrainerEmail
        ? {
            notificationKey: 'STAFF_TRAINER_ASSIGN_ALERT',
            recipientEmail: targetTrainerEmail,
            recipientName: trainerUser.name,
            recipientType: 'TRAINER',
            clientProfileId: client._id,
            trainerId: trainerUser._id,
            branchId: branch?._id || client.branchId,
            variables: vars,
            eventKey: `email-staff-trainer-assign:${stamp}`,
          }
        : null,
    });
  }
);

const triggerWorkoutAssigned = safeDispatch(async ({ client, branch, workoutPlanName, trainerName }) => {
  if (!client?._id) return;
  const clientEmail = await resolveClientEmail(client);
  const vars = {
    memberName: client.name || 'Member',
    workoutPlan: workoutPlanName || 'Custom Workout Plan',
    trainerName: trainerName || 'Coach',
    branchName: branch?.city || branch?.name || 'Man & Machine',
  };
  const stamp = `${client._id}:${new Date().toISOString().slice(0, 16)}`;

  await dispatchBothChannels({
    smsPayload: {
      notificationKey: 'MEMBER_ASSIGN_WORKOUT_PLAN',
      recipientPhone: client.phone,
      recipientName: client.name,
      recipientType: 'MEMBER',
      clientProfileId: client._id,
      branchId: branch?._id || client.branchId,
      variables: vars,
      eventKey: `workout-assign:${stamp}`,
    },
    emailPayload: {
      notificationKey: 'MEMBER_ASSIGN_WORKOUT_PLAN',
      recipientEmail: clientEmail,
      recipientName: client.name,
      recipientType: 'MEMBER',
      clientProfileId: client._id,
      branchId: branch?._id || client.branchId,
      variables: vars,
      eventKey: `email-workout-assign:${stamp}`,
    },
  });
});

const triggerManualAttendance = safeDispatch(async ({ client, branch, attendance }) => {
  if (!client?._id || !attendance?._id) return;
  const dt = attendance.checkInTime ? new Date(attendance.checkInTime) : new Date();
  const clientEmail = await resolveClientEmail(client);
  const vars = {
    memberName: client.name || 'Member',
    branchName: branch?.city || branch?.name || 'Man & Machine',
    sessionDate: smsService.formatDateIN(dt),
    sessionTime: dt.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
  };

  await dispatchBothChannels({
    smsPayload: {
      notificationKey: 'MEMBER_MANUAL_ATTENDANCE_ADDED',
      recipientPhone: client.phone,
      recipientName: client.name,
      recipientType: 'MEMBER',
      clientProfileId: client._id,
      branchId: branch?._id || attendance.branchId,
      variables: vars,
      eventKey: `manual-attendance:${attendance._id}`,
    },
    emailPayload: {
      notificationKey: 'MEMBER_MANUAL_ATTENDANCE_ADDED',
      recipientEmail: clientEmail,
      recipientName: client.name,
      recipientType: 'MEMBER',
      clientProfileId: client._id,
      branchId: branch?._id || attendance.branchId,
      variables: vars,
      eventKey: `email-manual-attendance:${attendance._id}`,
    },
  });
});

module.exports = {
  dispatchBothChannels,
  resolveClientEmail,
  triggerClientWelcome,
  triggerMembershipPayment,
  triggerMembershipStatusChange,
  triggerClientUpdated,
  triggerTrainerAssigned,
  triggerWorkoutAssigned,
  triggerManualAttendance,
};
