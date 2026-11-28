/**
 * Computes chronological punch summaries, valid IN/OUT work sessions,
 * and unmatched/unusual sequence flags without mutating original timestamps
 * or inventing missing punches.
 */

const getSubjectKey = (rec) => {
  if (rec.employeeId?._id || rec.employeeId) {
    return `EMPLOYEE:${String(rec.employeeId?._id || rec.employeeId)}`;
  }
  if (rec.clientProfileId?._id || rec.clientProfileId) {
    return `CLIENT:${String(rec.clientProfileId?._id || rec.clientProfileId)}`;
  }
  if (rec.userId?._id || rec.userId) {
    return `USER:${String(rec.userId?._id || rec.userId)}`;
  }
  return `UNMAPPED:${rec.deviceId?._id || rec.deviceId || 'unknown'}:${rec.biometricUserId || rec._id}`;
};

const formatDuration = (minutes) => {
  const mins = Math.max(0, Math.round(minutes || 0));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
};

const summarizeDailyPunches = (records = []) => {
  const groups = new Map();

  for (const rec of records) {
    const key = getSubjectKey(rec);
    if (!groups.has(key)) {
      const emp = rec.employeeId && typeof rec.employeeId === 'object' ? rec.employeeId : null;
      const client = rec.clientProfileId && typeof rec.clientProfileId === 'object' ? rec.clientProfileId : null;
      const user = rec.userId && typeof rec.userId === 'object' ? rec.userId : null;
      const branch = rec.branchId && typeof rec.branchId === 'object' ? rec.branchId : null;

      groups.set(key, {
        subjectKey: key,
        subjectType: rec.subjectType || (emp ? 'EMPLOYEE' : client || user ? 'CLIENT' : 'UNKNOWN'),
        subjectId: emp?._id || client?._id || user?._id || null,
        subjectName: emp?.fullName || client?.name || user?.name || 'Unmapped Biometric User',
        subjectCode: emp?.employeeId || client?.clientId || rec.biometricUserId || '—',
        department: emp?.department || '',
        branchName: branch?.city || branch?.name || 'HQ',
        biometricUserId: rec.biometricUserId || '',
        punches: [],
      });
    }
    groups.get(key).punches.push(rec);
  }

  const summaries = [];

  for (const group of groups.values()) {
    const chronological = [...group.punches].sort(
      (a, b) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime()
    );

    const sessions = [];
    const flags = new Set();
    let openCheckIn = null;
    let entriesCount = 0;
    let exitsCount = 0;
    let unknownCount = 0;
    let unmatchedInCount = 0;
    let unmatchedOutCount = 0;

    for (const punch of chronological) {
      const dir = punch.eventType || 'CHECK_IN';

      if (dir === 'CHECK_IN') {
        entriesCount += 1;
        if (openCheckIn) {
          // Previous CHECK_IN had no matching CHECK_OUT before another CHECK_IN
          unmatchedInCount += 1;
          flags.add('CONSECUTIVE_CHECK_IN');
        }
        openCheckIn = punch;
      } else if (dir === 'CHECK_OUT') {
        exitsCount += 1;
        if (openCheckIn) {
          const inMs = new Date(openCheckIn.checkInTime).getTime();
          const outMs = new Date(punch.checkInTime).getTime();
          const durationMinutes = Math.max(0, Math.round((outMs - inMs) / 60000));
          sessions.push({
            checkInId: openCheckIn._id,
            checkOutId: punch._id,
            checkInTime: openCheckIn.checkInTime,
            checkOutTime: punch.checkInTime,
            durationMinutes,
            formattedDuration: formatDuration(durationMinutes),
          });
          openCheckIn = null;
        } else {
          unmatchedOutCount += 1;
          flags.add('UNMATCHED_CHECK_OUT');
        }
      } else {
        unknownCount += 1;
        flags.add('UNKNOWN_DIRECTION');
      }
    }

    if (openCheckIn) {
      unmatchedInCount += 1;
      flags.add('OPEN_CHECK_IN');
    }

    const totalWorkedMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

    summaries.push({
      ...group,
      punches: chronological,
      totalPunches: chronological.length,
      entriesCount,
      exitsCount,
      unknownCount,
      sessions,
      totalWorkedMinutes,
      formattedTotalWorked: formatDuration(totalWorkedMinutes),
      unmatchedInCount,
      unmatchedOutCount,
      hasAnomalies: flags.size > 0,
      flags: Array.from(flags),
    });
  }

  return summaries.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
};

module.exports = {
  summarizeDailyPunches,
  formatDuration,
};
