const crypto = require('node:crypto');

function computeEventUid(deviceSerial, tableName, rawPayload) {
  return crypto
    .createHash('sha256')
    .update(`${deviceSerial}|${tableName}|${rawPayload}`)
    .digest('hex');
}

function createEventQueue(db) {
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO outbox_events (
      event_uid,
      device_serial,
      table_name,
      query_string,
      raw_payload,
      line_count,
      status,
      attempt_count,
      next_retry_at,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 0, ?, ?, ?)
  `);

  const findByUidStmt = db.prepare(`
    SELECT id, status, attempt_count FROM outbox_events WHERE event_uid = ?
  `);

  const recoverProcessingStmt = db.prepare(`
    UPDATE outbox_events
    SET status = 'PENDING', updated_at = ?
    WHERE status = 'PROCESSING'
  `);

  const selectPendingStmt = db.prepare(`
    SELECT id, event_uid, device_serial, table_name, query_string, raw_payload, line_count, attempt_count
    FROM outbox_events
    WHERE status = 'PENDING' AND next_retry_at <= ?
    ORDER BY id ASC
    LIMIT ?
  `);

  const markProcessingStmt = db.prepare(`
    UPDATE outbox_events
    SET status = 'PROCESSING', updated_at = ?
    WHERE id = ? AND status = 'PENDING'
  `);

  const markDeliveredStmt = db.prepare(`
    UPDATE outbox_events
    SET status = 'DELIVERED',
        last_http_status = ?,
        last_error = NULL,
        delivered_at = ?,
        updated_at = ?
    WHERE id = ?
  `);

  const markRetryStmt = db.prepare(`
    UPDATE outbox_events
    SET status = ?,
        attempt_count = ?,
        next_retry_at = ?,
        last_http_status = ?,
        last_error = ?,
        updated_at = ?
    WHERE id = ?
  `);

  const statsStmt = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'PROCESSING' THEN 1 ELSE 0 END) AS processing,
      SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) AS delivered,
      SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failed,
      MIN(CASE WHEN status = 'PENDING' THEN created_at ELSE NULL END) AS oldest_pending_at,
      MAX(delivered_at) AS last_delivered_at
    FROM outbox_events
  `);

  const upsertDeviceStmt = db.prepare(`
    INSERT INTO device_state (
      device_serial,
      last_seen_at,
      last_heartbeat_at,
      last_attlog_at,
      last_operlog_at,
      last_cloud_sync_at,
      last_cloud_error,
      firmware_version,
      last_ip
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(device_serial) DO UPDATE SET
      last_seen_at = COALESCE(excluded.last_seen_at, device_state.last_seen_at),
      last_heartbeat_at = COALESCE(excluded.last_heartbeat_at, device_state.last_heartbeat_at),
      last_attlog_at = COALESCE(excluded.last_attlog_at, device_state.last_attlog_at),
      last_operlog_at = COALESCE(excluded.last_operlog_at, device_state.last_operlog_at),
      last_cloud_sync_at = COALESCE(excluded.last_cloud_sync_at, device_state.last_cloud_sync_at),
      last_cloud_error = CASE
        WHEN excluded.last_cloud_error = '__CLEAR__' THEN NULL
        WHEN excluded.last_cloud_error IS NOT NULL THEN excluded.last_cloud_error
        ELSE device_state.last_cloud_error
      END,
      firmware_version = COALESCE(excluded.firmware_version, device_state.firmware_version),
      last_ip = COALESCE(excluded.last_ip, device_state.last_ip)
  `);

  const listDevicesStmt = db.prepare(`
    SELECT * FROM device_state ORDER BY last_seen_at DESC
  `);

  function enqueueEvent({ deviceSerial, tableName, queryString, rawPayload, lineCount }) {
    const now = Date.now();
    const uid = computeEventUid(deviceSerial, tableName, rawPayload);
    const result = insertStmt.run(
      uid,
      deviceSerial,
      tableName,
      queryString,
      rawPayload,
      lineCount,
      now,
      now,
      now
    );

    const row = findByUidStmt.get(uid);
    return {
      inserted: result.changes > 0,
      id: row.id,
      eventUid: uid,
      status: row.status,
    };
  }

  function recoverStuckProcessing() {
    const res = recoverProcessingStmt.run(Date.now());
    return res.changes;
  }

  function claimPendingBatch(limit = 20, nowMs = Date.now()) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const candidates = selectPendingStmt.all(nowMs, limit);
      const claimed = [];
      for (const row of candidates) {
        const res = markProcessingStmt.run(nowMs, row.id);
        if (res.changes > 0) {
          claimed.push(row);
        }
      }
      db.exec('COMMIT');
      return claimed;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  function markDelivered(id, httpStatus) {
    const now = Date.now();
    markDeliveredStmt.run(httpStatus, now, now, id);
  }

  function markRetryOrFailed(
    id,
    attemptCountSoFar,
    { errorMessage, httpStatus = null, retryBaseDelayMs, retryMaxDelayMs, maxRetryAttempts, permanent = false }
  ) {
    const now = Date.now();
    const nextAttempt = attemptCountSoFar + 1;
    const isFailed = permanent || nextAttempt >= maxRetryAttempts;
    const newStatus = isFailed ? 'FAILED' : 'PENDING';
    const expDelay = Math.min(retryMaxDelayMs, retryBaseDelayMs * 2 ** Math.max(0, attemptCountSoFar));
    const jitter = Math.floor(Math.random() * Math.min(1000, Math.max(10, Math.floor(expDelay * 0.1))));
    const nextRetryAt = now + expDelay + jitter;

    markRetryStmt.run(
      newStatus,
      nextAttempt,
      nextRetryAt,
      httpStatus,
      errorMessage ? String(errorMessage).slice(0, 500) : null,
      now,
      id
    );

    return {
      status: newStatus,
      attemptCount: nextAttempt,
      nextRetryAt,
    };
  }

  function getQueueStats() {
    const row = statsStmt.get() || {};
    return {
      pending: Number(row.pending || 0),
      processing: Number(row.processing || 0),
      delivered: Number(row.delivered || 0),
      failed: Number(row.failed || 0),
      oldestPendingAt: row.oldest_pending_at ? new Date(row.oldest_pending_at).toISOString() : null,
      lastDeliveredAt: row.last_delivered_at ? new Date(row.last_delivered_at).toISOString() : null,
    };
  }

  function recordDeviceActivity({
    deviceSerial,
    ip = null,
    firmwareVersion = null,
    heartbeat = false,
    attlog = false,
    operlog = false,
    cloudSync = false,
    cloudError = null,
  }) {
    const now = Date.now();
    upsertDeviceStmt.run(
      deviceSerial,
      now,
      heartbeat ? now : null,
      attlog ? now : null,
      operlog ? now : null,
      cloudSync ? now : null,
      cloudError,
      firmwareVersion,
      ip
    );
  }

  function getDeviceStates() {
    return listDevicesStmt.all().map((row) => ({
      deviceSerial: row.device_serial,
      lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at).toISOString() : null,
      lastHeartbeatAt: row.last_heartbeat_at ? new Date(row.last_heartbeat_at).toISOString() : null,
      lastAttlogAt: row.last_attlog_at ? new Date(row.last_attlog_at).toISOString() : null,
      lastOperlogAt: row.last_operlog_at ? new Date(row.last_operlog_at).toISOString() : null,
      lastCloudSyncAt: row.last_cloud_sync_at ? new Date(row.last_cloud_sync_at).toISOString() : null,
      lastCloudError: row.last_cloud_error || null,
      firmwareVersion: row.firmware_version || null,
      lastIp: row.last_ip || null,
    }));
  }

  return {
    enqueueEvent,
    recoverStuckProcessing,
    claimPendingBatch,
    markDelivered,
    markRetryOrFailed,
    getQueueStats,
    recordDeviceActivity,
    getDeviceStates,
  };
}

module.exports = {
  createEventQueue,
  computeEventUid,
};
