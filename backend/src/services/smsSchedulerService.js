const Membership = require('../models/Membership');
const ClientProfile = require('../models/ClientProfile');
const Invoice = require('../models/Invoice');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const TrainerBooking = require('../models/TrainerBooking');
const TrainerProfile = require('../models/TrainerProfile');
const smsService = require('./smsService');
const emailService = require('./emailService');
const communicationService = require('./communicationService');

let schedulerTimer = null;
let isRunningPass = false;

const getKolkataParts = (date = new Date()) => {
  const ist = new Date(new Date(date).getTime() + 330 * 60 * 1000);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth() + 1;
  const day = ist.getUTCDate();
  const hour = ist.getUTCHours();
  const minute = ist.getUTCMinutes();
  const pad = (n) => String(n).padStart(2, '0');
  return {
    dateStr: `${year}-${pad(month)}-${pad(day)}`,
    monthStr: `${year}-${pad(month)}`,
    year,
    month,
    day,
    hhmm: `${pad(hour)}:${pad(minute)}`,
    minutesOfDay: hour * 60 + minute,
  };
};

const parseHHMM = (str) => {
  const [h, m] = String(str || '21:00').split(':').map((x) => parseInt(x, 10));
  return (Number.isNaN(h) ? 21 : h) * 60 + (Number.isNaN(m) ? 0 : m);
};

const isAnyChannelEnabled = (settings, audience, key) => {
  const smsOn =
    settings.smsEnabled !== false &&
    (audience === 'MEMBER' ? settings.memberNotifications?.[key] : settings.staffNotifications?.[key]);
  const emailOn =
    settings.emailEnabled === true &&
    (audience === 'MEMBER' ? settings.emailMemberNotifications?.[key] : settings.emailStaffNotifications?.[key]);
  return Boolean(smsOn || emailOn);
};

const runScheduledSmsPass = async (now = new Date()) => {
  if (isRunningPass) return { skipped: true };
  isRunningPass = true;
  const summary = { executedAt: now.toISOString(), checksRun: [] };

  try {
    const { settings } = await smsService.getOrCreateSettings();
    const { dateStr, monthStr, month, day, minutesOfDay } = getKolkataParts(now);
    const { ownerName, ownerPhone } = await smsService.getOwnerRecipient();
    const { ownerEmail } = await emailService.getOwnerEmailRecipient();

    // 1. Membership Expiry & Owner Expiry Alert
    if (
      isAnyChannelEnabled(settings, 'MEMBER', 'MEMBER_MEMBERSHIP_EXPIRY') ||
      isAnyChannelEnabled(settings, 'STAFF', 'STAFF_MEMBERSHIP_EXPIRY_OWNER')
    ) {
      summary.checksRun.push('MEMBERSHIP_EXPIRY');
      const daysAhead = settings.membershipExpiryNotificationDays || 7;
      const targetStart = new Date(`${dateStr}T00:00:00+05:30`);
      const targetEnd = new Date(targetStart.getTime() + daysAhead * 86400000 + 86399999);

      const expiring = await Membership.find({
        status: 'ACTIVE',
        expiryDate: { $gte: targetStart, $lte: targetEnd },
      })
        .populate('clientProfileId')
        .populate('branchId', 'name city')
        .lean();

      for (const m of expiring) {
        const client = m.clientProfileId;
        if (!client) continue;
        const clientEmail = await communicationService.resolveClientEmail(client);
        const vars = {
          memberName: client.name || 'Member',
          memberId: client.clientId || '',
          membershipName: m.planName || 'Membership',
          expiryDate: smsService.formatDateIN(m.expiryDate),
          branchName: m.branchId?.city || m.branchId?.name || 'Man & Machine',
          ownerName,
        };
        await communicationService.dispatchBothChannels({
          smsPayload: {
            notificationKey: 'MEMBER_MEMBERSHIP_EXPIRY',
            recipientPhone: client.phone,
            recipientName: client.name,
            recipientType: 'MEMBER',
            clientProfileId: client._id,
            branchId: m.branchId?._id || m.branchId,
            variables: vars,
            eventKey: `sched-expiry:${m._id}:${dateStr}`,
          },
          emailPayload: {
            notificationKey: 'MEMBER_MEMBERSHIP_EXPIRY',
            recipientEmail: clientEmail,
            recipientName: client.name,
            recipientType: 'MEMBER',
            clientProfileId: client._id,
            branchId: m.branchId?._id || m.branchId,
            variables: vars,
            eventKey: `email-sched-expiry:${m._id}:${dateStr}`,
          },
        });
        await communicationService.dispatchBothChannels({
          smsPayload: ownerPhone
            ? {
                notificationKey: 'STAFF_MEMBERSHIP_EXPIRY_OWNER',
                recipientPhone: ownerPhone,
                recipientName: ownerName,
                recipientType: 'OWNER',
                clientProfileId: client._id,
                branchId: m.branchId?._id || m.branchId,
                variables: vars,
                eventKey: `sched-expiry-owner:${m._id}:${dateStr}`,
              }
            : null,
          emailPayload: ownerEmail
            ? {
                notificationKey: 'STAFF_MEMBERSHIP_EXPIRY_OWNER',
                recipientEmail: ownerEmail,
                recipientName: ownerName,
                recipientType: 'OWNER',
                clientProfileId: client._id,
                branchId: m.branchId?._id || m.branchId,
                variables: vars,
                eventKey: `email-sched-expiry-owner:${m._id}:${dateStr}`,
              }
            : null,
        });
      }
    }

    // 2. Membership Overdue & Owner Overdue Alert
    if (
      isAnyChannelEnabled(settings, 'MEMBER', 'MEMBER_MEMBERSHIP_OVERDUE') ||
      isAnyChannelEnabled(settings, 'STAFF', 'STAFF_MEMBERSHIP_OVERDUE_OWNER')
    ) {
      summary.checksRun.push('MEMBERSHIP_OVERDUE');
      const overdue = await Membership.find({
        status: { $in: ['ACTIVE', 'EXPIRED'] },
        expiryDate: { $lt: new Date(`${dateStr}T00:00:00+05:30`) },
      })
        .populate('clientProfileId')
        .populate('branchId', 'name city')
        .limit(100)
        .lean();

      for (const m of overdue) {
        const client = m.clientProfileId;
        if (!client) continue;
        const clientEmail = await communicationService.resolveClientEmail(client);
        const vars = {
          memberName: client.name || 'Member',
          memberId: client.clientId || '',
          membershipName: m.planName || 'Membership',
          expiryDate: smsService.formatDateIN(m.expiryDate),
          branchName: m.branchId?.city || m.branchId?.name || 'Man & Machine',
          ownerName,
        };
        await communicationService.dispatchBothChannels({
          smsPayload: {
            notificationKey: 'MEMBER_MEMBERSHIP_OVERDUE',
            recipientPhone: client.phone,
            recipientName: client.name,
            recipientType: 'MEMBER',
            clientProfileId: client._id,
            branchId: m.branchId?._id || m.branchId,
            variables: vars,
            eventKey: `sched-overdue:${m._id}:${dateStr}`,
          },
          emailPayload: {
            notificationKey: 'MEMBER_MEMBERSHIP_OVERDUE',
            recipientEmail: clientEmail,
            recipientName: client.name,
            recipientType: 'MEMBER',
            clientProfileId: client._id,
            branchId: m.branchId?._id || m.branchId,
            variables: vars,
            eventKey: `email-sched-overdue:${m._id}:${dateStr}`,
          },
        });
        await communicationService.dispatchBothChannels({
          smsPayload: ownerPhone
            ? {
                notificationKey: 'STAFF_MEMBERSHIP_OVERDUE_OWNER',
                recipientPhone: ownerPhone,
                recipientName: ownerName,
                recipientType: 'OWNER',
                clientProfileId: client._id,
                branchId: m.branchId?._id || m.branchId,
                variables: vars,
                eventKey: `sched-overdue-owner:${m._id}:${dateStr}`,
              }
            : null,
          emailPayload: ownerEmail
            ? {
                notificationKey: 'STAFF_MEMBERSHIP_OVERDUE_OWNER',
                recipientEmail: ownerEmail,
                recipientName: ownerName,
                recipientType: 'OWNER',
                clientProfileId: client._id,
                branchId: m.branchId?._id || m.branchId,
                variables: vars,
                eventKey: `email-sched-overdue-owner:${m._id}:${dateStr}`,
              }
            : null,
        });
      }
    }

    // 3. Balance Payment Pre-Notification & Overdue Notification
    if (
      isAnyChannelEnabled(settings, 'MEMBER', 'MEMBER_PRE_BALANCE_PAYMENT') ||
      isAnyChannelEnabled(settings, 'MEMBER', 'MEMBER_OVERDUE_BALANCE_PAYMENT')
    ) {
      summary.checksRun.push('BALANCE_PAYMENT');
      const todayStart = new Date(`${dateStr}T00:00:00+05:30`);
      const preEnd = new Date(todayStart.getTime() + (settings.balancePreNotifyDays || 3) * 86400000);
      const dueInvoices = await Invoice.find({
        balanceDue: { $gt: 0 },
        paymentStatus: { $in: ['UNPAID', 'PARTIAL'] },
      })
        .populate('clientProfileId')
        .populate('branchId', 'name city')
        .limit(100)
        .lean();

      for (const inv of dueInvoices) {
        const client = inv.clientProfileId;
        if (!client) continue;
        const clientEmail = await communicationService.resolveClientEmail(client);
        const dueDt = inv.dueDate ? new Date(inv.dueDate) : inv.issuedAt ? new Date(inv.issuedAt) : todayStart;
        const vars = {
          memberName: client.name || 'Member',
          dueAmount: Number(inv.balanceDue || 0).toFixed(0),
          expiryDate: smsService.formatDateIN(dueDt),
          branchName: inv.branchId?.city || inv.branchId?.name || 'Man & Machine',
        };
        if (dueDt < todayStart) {
          await communicationService.dispatchBothChannels({
            smsPayload: {
              notificationKey: 'MEMBER_OVERDUE_BALANCE_PAYMENT',
              recipientPhone: client.phone,
              recipientName: client.name,
              recipientType: 'MEMBER',
              clientProfileId: client._id,
              branchId: inv.branchId?._id || inv.branchId,
              variables: vars,
              eventKey: `sched-bal-overdue:${inv._id}:${dateStr}`,
            },
            emailPayload: {
              notificationKey: 'MEMBER_OVERDUE_BALANCE_PAYMENT',
              recipientEmail: clientEmail,
              recipientName: client.name,
              recipientType: 'MEMBER',
              clientProfileId: client._id,
              branchId: inv.branchId?._id || inv.branchId,
              variables: vars,
              eventKey: `email-sched-bal-overdue:${inv._id}:${dateStr}`,
            },
          });
        } else if (dueDt <= preEnd) {
          await communicationService.dispatchBothChannels({
            smsPayload: {
              notificationKey: 'MEMBER_PRE_BALANCE_PAYMENT',
              recipientPhone: client.phone,
              recipientName: client.name,
              recipientType: 'MEMBER',
              clientProfileId: client._id,
              branchId: inv.branchId?._id || inv.branchId,
              variables: vars,
              eventKey: `sched-bal-pre:${inv._id}:${dateStr}`,
            },
            emailPayload: {
              notificationKey: 'MEMBER_PRE_BALANCE_PAYMENT',
              recipientEmail: clientEmail,
              recipientName: client.name,
              recipientType: 'MEMBER',
              clientProfileId: client._id,
              branchId: inv.branchId?._id || inv.branchId,
              variables: vars,
              eventKey: `email-sched-bal-pre:${inv._id}:${dateStr}`,
            },
          });
        }
      }
    }

    // 4. Birthday & Anniversary Wishes + Owner/Staff Alerts
    const needsBirthday =
      isAnyChannelEnabled(settings, 'MEMBER', 'MEMBER_BIRTHDAY_WISHES') ||
      isAnyChannelEnabled(settings, 'STAFF', 'STAFF_BIRTHDAY_ALERT') ||
      isAnyChannelEnabled(settings, 'STAFF', 'STAFF_MEMBER_BIRTHDAY_OWNER');
    const needsAnniversary =
      isAnyChannelEnabled(settings, 'MEMBER', 'MEMBER_ANNIVERSARY_WISHES') ||
      isAnyChannelEnabled(settings, 'STAFF', 'STAFF_ANNIVERSARY_ALERT') ||
      isAnyChannelEnabled(settings, 'STAFF', 'STAFF_MEMBER_ANNIVERSARY_OWNER');

    if (needsBirthday || needsAnniversary) {
      summary.checksRun.push('BIRTHDAY_ANNIVERSARY');
      const clients = await ClientProfile.find({
        $or: [{ dateOfBirth: { $ne: null } }, { joiningDate: { $ne: null } }],
      })
        .populate('branchId', 'name city')
        .lean();

      for (const c of clients) {
        const clientEmail = await communicationService.resolveClientEmail(c);
        const branchName = c.branchId?.city || c.branchId?.name || 'Man & Machine';
        const vars = {
          memberName: c.name || 'Member',
          memberId: c.clientId || '',
          branchName,
          ownerName,
        };

        if (needsBirthday && c.dateOfBirth) {
          const dob = getKolkataParts(c.dateOfBirth);
          if (dob.month === month && dob.day === day) {
            await communicationService.dispatchBothChannels({
              smsPayload: {
                notificationKey: 'MEMBER_BIRTHDAY_WISHES',
                recipientPhone: c.phone,
                recipientName: c.name,
                recipientType: 'MEMBER',
                clientProfileId: c._id,
                branchId: c.branchId?._id || c.branchId,
                variables: vars,
                eventKey: `sched-bday:${c._id}:${dateStr}`,
              },
              emailPayload: {
                notificationKey: 'MEMBER_BIRTHDAY_WISHES',
                recipientEmail: clientEmail,
                recipientName: c.name,
                recipientType: 'MEMBER',
                clientProfileId: c._id,
                branchId: c.branchId?._id || c.branchId,
                variables: vars,
                eventKey: `email-sched-bday:${c._id}:${dateStr}`,
              },
            });
            await communicationService.dispatchBothChannels({
              smsPayload: ownerPhone
                ? {
                    notificationKey: 'STAFF_BIRTHDAY_ALERT',
                    recipientPhone: ownerPhone,
                    recipientName: ownerName,
                    recipientType: 'OWNER',
                    clientProfileId: c._id,
                    branchId: c.branchId?._id || c.branchId,
                    variables: vars,
                    eventKey: `sched-bday-staff:${c._id}:${dateStr}`,
                  }
                : null,
              emailPayload: ownerEmail
                ? {
                    notificationKey: 'STAFF_BIRTHDAY_ALERT',
                    recipientEmail: ownerEmail,
                    recipientName: ownerName,
                    recipientType: 'OWNER',
                    clientProfileId: c._id,
                    branchId: c.branchId?._id || c.branchId,
                    variables: vars,
                    eventKey: `email-sched-bday-staff:${c._id}:${dateStr}`,
                  }
                : null,
            });
            await communicationService.dispatchBothChannels({
              smsPayload: ownerPhone
                ? {
                    notificationKey: 'STAFF_MEMBER_BIRTHDAY_OWNER',
                    recipientPhone: ownerPhone,
                    recipientName: ownerName,
                    recipientType: 'OWNER',
                    clientProfileId: c._id,
                    branchId: c.branchId?._id || c.branchId,
                    variables: vars,
                    eventKey: `sched-bday-owner:${c._id}:${dateStr}`,
                  }
                : null,
              emailPayload: ownerEmail
                ? {
                    notificationKey: 'STAFF_MEMBER_BIRTHDAY_OWNER',
                    recipientEmail: ownerEmail,
                    recipientName: ownerName,
                    recipientType: 'OWNER',
                    clientProfileId: c._id,
                    branchId: c.branchId?._id || c.branchId,
                    variables: vars,
                    eventKey: `email-sched-bday-owner:${c._id}:${dateStr}`,
                  }
                : null,
            });
          }
        }

        if (needsAnniversary && c.joiningDate) {
          const j = getKolkataParts(c.joiningDate);
          if (j.month === month && j.day === day && j.dateStr !== dateStr) {
            await communicationService.dispatchBothChannels({
              smsPayload: {
                notificationKey: 'MEMBER_ANNIVERSARY_WISHES',
                recipientPhone: c.phone,
                recipientName: c.name,
                recipientType: 'MEMBER',
                clientProfileId: c._id,
                branchId: c.branchId?._id || c.branchId,
                variables: vars,
                eventKey: `sched-anniv:${c._id}:${dateStr}`,
              },
              emailPayload: {
                notificationKey: 'MEMBER_ANNIVERSARY_WISHES',
                recipientEmail: clientEmail,
                recipientName: c.name,
                recipientType: 'MEMBER',
                clientProfileId: c._id,
                branchId: c.branchId?._id || c.branchId,
                variables: vars,
                eventKey: `email-sched-anniv:${c._id}:${dateStr}`,
              },
            });
            await communicationService.dispatchBothChannels({
              smsPayload: ownerPhone
                ? {
                    notificationKey: 'STAFF_ANNIVERSARY_ALERT',
                    recipientPhone: ownerPhone,
                    recipientName: ownerName,
                    recipientType: 'OWNER',
                    clientProfileId: c._id,
                    branchId: c.branchId?._id || c.branchId,
                    variables: vars,
                    eventKey: `sched-anniv-staff:${c._id}:${dateStr}`,
                  }
                : null,
              emailPayload: ownerEmail
                ? {
                    notificationKey: 'STAFF_ANNIVERSARY_ALERT',
                    recipientEmail: ownerEmail,
                    recipientName: ownerName,
                    recipientType: 'OWNER',
                    clientProfileId: c._id,
                    branchId: c.branchId?._id || c.branchId,
                    variables: vars,
                    eventKey: `email-sched-anniv-staff:${c._id}:${dateStr}`,
                  }
                : null,
            });
            await communicationService.dispatchBothChannels({
              smsPayload: ownerPhone
                ? {
                    notificationKey: 'STAFF_MEMBER_ANNIVERSARY_OWNER',
                    recipientPhone: ownerPhone,
                    recipientName: ownerName,
                    recipientType: 'OWNER',
                    clientProfileId: c._id,
                    branchId: c.branchId?._id || c.branchId,
                    variables: vars,
                    eventKey: `sched-anniv-owner:${c._id}:${dateStr}`,
                  }
                : null,
              emailPayload: ownerEmail
                ? {
                    notificationKey: 'STAFF_MEMBER_ANNIVERSARY_OWNER',
                    recipientEmail: ownerEmail,
                    recipientName: ownerName,
                    recipientType: 'OWNER',
                    clientProfileId: c._id,
                    branchId: c.branchId?._id || c.branchId,
                    variables: vars,
                    eventKey: `email-sched-anniv-owner:${c._id}:${dateStr}`,
                  }
                : null,
            });
          }
        }
      }
    }

    // 5. Absent Member Alert
    if (isAnyChannelEnabled(settings, 'MEMBER', 'MEMBER_ABSENT_ALERT')) {
      summary.checksRun.push('ABSENT_ALERT');
      const absentDays = settings.absentAlertDays || 7;
      const cutoff = new Date(now.getTime() - absentDays * 86400000);
      const activeMemberships = await Membership.find({ status: 'ACTIVE', expiryDate: { $gte: now } })
        .populate('clientProfileId')
        .populate('branchId', 'name city')
        .limit(100)
        .lean();

      for (const m of activeMemberships) {
        const client = m.clientProfileId;
        if (!client) continue;
        const recentAtt = await Attendance.findOne({
          $or: [
            { clientProfileId: client._id },
            ...(client.userId ? [{ userId: client.userId }] : []),
          ],
          checkInTime: { $gte: cutoff },
        })
          .select('_id')
          .lean();
        if (!recentAtt) {
          const clientEmail = await communicationService.resolveClientEmail(client);
          const vars = {
            memberName: client.name || 'Member',
            branchName: m.branchId?.city || m.branchId?.name || 'Man & Machine',
          };
          await communicationService.dispatchBothChannels({
            smsPayload: {
              notificationKey: 'MEMBER_ABSENT_ALERT',
              recipientPhone: client.phone,
              recipientName: client.name,
              recipientType: 'MEMBER',
              clientProfileId: client._id,
              branchId: m.branchId?._id || m.branchId,
              variables: vars,
              eventKey: `sched-absent:${client._id}:${dateStr}`,
            },
            emailPayload: {
              notificationKey: 'MEMBER_ABSENT_ALERT',
              recipientEmail: clientEmail,
              recipientName: client.name,
              recipientType: 'MEMBER',
              clientProfileId: client._id,
              branchId: m.branchId?._id || m.branchId,
              variables: vars,
              eventKey: `email-sched-absent:${client._id}:${dateStr}`,
            },
          });
        }
      }
    }

    // 6. Upcoming Session Reminders (Member & Trainer)
    if (
      isAnyChannelEnabled(settings, 'MEMBER', 'MEMBER_SESSION_PRE_NOTIFICATION') ||
      isAnyChannelEnabled(settings, 'STAFF', 'STAFF_SESSION_PRE_NOTIFICATION_TRAINER')
    ) {
      summary.checksRun.push('SESSION_PRE_NOTIFICATION');
      const todayStart = new Date(`${dateStr}T00:00:00+05:30`);
      const tomorrowEnd = new Date(todayStart.getTime() + 2 * 86400000);
      const bookings = await TrainerBooking.find({
        bookingStatus: 'CONFIRMED',
        date: { $gte: todayStart, $lte: tomorrowEnd },
      })
        .populate('clientId', 'name phone email')
        .populate('trainerId', 'name phone email')
        .populate('branchId', 'name city')
        .lean();

      for (const b of bookings) {
        const branchName = b.branchId?.city || b.branchId?.name || 'Man & Machine';
        const vars = {
          memberName: b.clientId?.name || 'Member',
          trainerName: b.trainerId?.name || 'Coach',
          sessionDate: smsService.formatDateIN(b.date),
          sessionTime: b.startTime || '',
          branchName,
        };
        await communicationService.dispatchBothChannels({
          smsPayload: b.clientId?.phone
            ? {
                notificationKey: 'MEMBER_SESSION_PRE_NOTIFICATION',
                recipientPhone: b.clientId.phone,
                recipientName: b.clientId.name,
                recipientType: 'MEMBER',
                branchId: b.branchId?._id || b.branchId,
                variables: vars,
                eventKey: `sched-sess-member:${b._id}`,
              }
            : null,
          emailPayload: b.clientId?.email
            ? {
                notificationKey: 'MEMBER_SESSION_PRE_NOTIFICATION',
                recipientEmail: b.clientId.email,
                recipientName: b.clientId.name,
                recipientType: 'MEMBER',
                branchId: b.branchId?._id || b.branchId,
                variables: vars,
                eventKey: `email-sched-sess-member:${b._id}`,
              }
            : null,
        });

        const trainerProfile = b.trainerId?._id
          ? await TrainerProfile.findOne({ userId: b.trainerId._id }).select('contactPhone contactEmail').lean()
          : null;
        const trainerPhone = trainerProfile?.contactPhone || b.trainerId?.phone || '';
        const trainerEmail = trainerProfile?.contactEmail || b.trainerId?.email || '';

        await communicationService.dispatchBothChannels({
          smsPayload: trainerPhone
            ? {
                notificationKey: 'STAFF_SESSION_PRE_NOTIFICATION_TRAINER',
                recipientPhone: trainerPhone,
                recipientName: b.trainerId?.name || 'Coach',
                recipientType: 'TRAINER',
                trainerId: b.trainerId?._id || null,
                branchId: b.branchId?._id || b.branchId,
                variables: vars,
                eventKey: `sched-sess-trainer:${b._id}`,
              }
            : null,
          emailPayload: trainerEmail
            ? {
                notificationKey: 'STAFF_SESSION_PRE_NOTIFICATION_TRAINER',
                recipientEmail: trainerEmail,
                recipientName: b.trainerId?.name || 'Coach',
                recipientType: 'TRAINER',
                trainerId: b.trainerId?._id || null,
                branchId: b.branchId?._id || b.branchId,
                variables: vars,
                eventKey: `email-sched-sess-trainer:${b._id}`,
              }
            : null,
        });
      }
    }

    // 7. Daily Summary, Daily Expected Business & Monthly Summary at configured dailySummaryTime (IST)
    const targetMinutes = parseHHMM(settings.dailySummaryTime);
    if (minutesOfDay >= targetMinutes && (ownerPhone || ownerEmail)) {
      const todayStart = new Date(`${dateStr}T00:00:00+05:30`);
      const todayEnd = new Date(`${dateStr}T23:59:59.999+05:30`);

      if (isAnyChannelEnabled(settings, 'STAFF', 'STAFF_DAILY_SUMMARY')) {
        summary.checksRun.push('DAILY_SUMMARY');
        const [payments, newMembers, checkIns] = await Promise.all([
          Payment.find({ status: 'PAID', createdAt: { $gte: todayStart, $lte: todayEnd } })
            .select('amount')
            .lean(),
          ClientProfile.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
          Attendance.countDocuments({ date: { $gte: todayStart, $lte: todayEnd } }),
        ]);
        const totalAmt = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
        const vars = {
          sessionDate: dateStr,
          branchName: 'All Branches',
          paymentAmount: String(Math.round(totalAmt)),
          dueAmount: String(newMembers),
          memberId: String(checkIns),
        };
        const reportBuffer = Buffer.from(
          `Man & Machine Daily Summary (${dateStr})\nCollections: Rs.${Math.round(totalAmt)}\nNew Members: ${newMembers}\nCheck-ins: ${checkIns}\n`,
          'utf8'
        );
        await communicationService.dispatchBothChannels({
          smsPayload: ownerPhone
            ? {
                notificationKey: 'STAFF_DAILY_SUMMARY',
                recipientPhone: ownerPhone,
                recipientName: ownerName,
                recipientType: 'OWNER',
                variables: vars,
                eventKey: `sched-daily-summary:${dateStr}`,
              }
            : null,
          emailPayload: ownerEmail
            ? {
                notificationKey: 'STAFF_DAILY_SUMMARY',
                recipientEmail: ownerEmail,
                recipientName: ownerName,
                recipientType: 'OWNER',
                variables: vars,
                attachments: [{ filename: `daily-summary-${dateStr}.txt`, content: reportBuffer, contentType: 'text/plain' }],
                eventKey: `email-sched-daily-summary:${dateStr}`,
              }
            : null,
        });
      }

      if (isAnyChannelEnabled(settings, 'STAFF', 'STAFF_DAILY_EXPECTED_BUSINESS')) {
        summary.checksRun.push('DAILY_EXPECTED_BUSINESS');
        const openInvoices = await Invoice.find({ balanceDue: { $gt: 0 } }).select('balanceDue').lean();
        const totalDue = openInvoices.reduce((s, i) => s + Number(i.balanceDue || 0), 0);
        const vars = {
          sessionDate: dateStr,
          branchName: 'All Branches',
          dueAmount: String(Math.round(totalDue)),
        };
        await communicationService.dispatchBothChannels({
          smsPayload: ownerPhone
            ? {
                notificationKey: 'STAFF_DAILY_EXPECTED_BUSINESS',
                recipientPhone: ownerPhone,
                recipientName: ownerName,
                recipientType: 'OWNER',
                variables: vars,
                eventKey: `sched-daily-expected:${dateStr}`,
              }
            : null,
          emailPayload: ownerEmail
            ? {
                notificationKey: 'STAFF_DAILY_EXPECTED_BUSINESS',
                recipientEmail: ownerEmail,
                recipientName: ownerName,
                recipientType: 'OWNER',
                variables: vars,
                eventKey: `email-sched-daily-expected:${dateStr}`,
              }
            : null,
        });
      }

      if (day === 1 && isAnyChannelEnabled(settings, 'STAFF', 'STAFF_MONTHLY_SUMMARY')) {
        summary.checksRun.push('MONTHLY_SUMMARY');
        const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
        const prevMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
        const [payments, newMembers] = await Promise.all([
          Payment.find({ status: 'PAID', createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd } })
            .select('amount')
            .lean(),
          ClientProfile.countDocuments({ createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd } }),
        ]);
        const totalAmt = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
        const vars = {
          sessionDate: monthStr,
          branchName: 'All Branches',
          paymentAmount: String(Math.round(totalAmt)),
          memberId: String(newMembers),
        };
        const monthlyReport = Buffer.from(
          `Man & Machine Monthly Summary (${monthStr})\nTotal Collections: Rs.${Math.round(totalAmt)}\nNew Members: ${newMembers}\n`,
          'utf8'
        );
        await communicationService.dispatchBothChannels({
          smsPayload: ownerPhone
            ? {
                notificationKey: 'STAFF_MONTHLY_SUMMARY',
                recipientPhone: ownerPhone,
                recipientName: ownerName,
                recipientType: 'OWNER',
                variables: vars,
                eventKey: `sched-monthly-summary:${monthStr}`,
              }
            : null,
          emailPayload: ownerEmail
            ? {
                notificationKey: 'STAFF_MONTHLY_SUMMARY',
                recipientEmail: ownerEmail,
                recipientName: ownerName,
                recipientType: 'OWNER',
                variables: vars,
                attachments: [{ filename: `monthly-summary-${monthStr}.txt`, content: monthlyReport, contentType: 'text/plain' }],
                eventKey: `email-sched-monthly-summary:${monthStr}`,
              }
            : null,
        });
      }
    }
  } catch (err) {
    console.error('Communication scheduler pass error:', err.message);
  } finally {
    isRunningPass = false;
  }

  return summary;
};

const startSmsScheduler = () => {
  if (schedulerTimer) return;
  schedulerTimer = setInterval(() => {
    runScheduledSmsPass().catch((err) => {
      console.error('Scheduled communication pass failed:', err.message);
    });
  }, 60 * 1000);
  if (typeof schedulerTimer.unref === 'function') {
    schedulerTimer.unref();
  }
};

const stopSmsScheduler = () => {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
};

module.exports = {
  getKolkataParts,
  runScheduledSmsPass,
  startSmsScheduler,
  stopSmsScheduler,
};
