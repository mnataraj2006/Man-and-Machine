const fs = require('node:fs');
const path = require('node:path');
const { parseEnvFile } = require('../config/settings');
const { openDatabase } = require('../storage/database');
const { createEventQueue } = require('../storage/eventQueue');

parseEnvFile(path.join(process.cwd(), '.env'));
const dbRel = (process.env.SQLITE_DB_PATH || './data/bridge.sqlite').trim();
const dbPath = path.resolve(process.cwd(), dbRel);

if (!fs.existsSync(dbPath)) {
  console.log(`SQLite queue database does not exist yet at: ${dbPath}`);
  process.exit(0);
}

const db = openDatabase(dbPath);
try {
  const queue = createEventQueue(db);
  const stats = queue.getQueueStats();
  const devices = queue.getDeviceStates();

  console.log('=== Man & Machine ADMS Outbox Queue ===');
  console.log(`Database      : ${dbPath}`);
  console.log(`Pending       : ${stats.pending}`);
  console.log(`Processing    : ${stats.processing}`);
  console.log(`Delivered     : ${stats.delivered}`);
  console.log(`Failed        : ${stats.failed}`);
  console.log(`Oldest Pending: ${stats.oldestPendingAt || 'none'}`);
  console.log(`Last Delivered: ${stats.lastDeliveredAt || 'never'}`);

  const recentIssues = db
    .prepare(
      `SELECT id, device_serial, table_name, status, attempt_count, last_http_status, last_error, created_at
       FROM outbox_events
       WHERE status IN ('PENDING', 'FAILED')
       ORDER BY id DESC
       LIMIT 10`
    )
    .all();

  if (recentIssues.length > 0) {
    console.log('\nRecent Pending/Failed Events (max 10):');
    for (const row of recentIssues) {
      console.log(
        `  #${row.id} [${row.status}] ${row.device_serial} ${row.table_name} attempts=${row.attempt_count} http=${row.last_http_status || '-'} err=${row.last_error || '-'}`
      );
    }
  }

  if (devices.length > 0) {
    console.log('\nKnown Devices:');
    for (const d of devices) {
      console.log(
        `  - ${d.deviceSerial} (IP: ${d.lastIp || '?'}, lastSeen: ${d.lastSeenAt || 'never'}, lastCloudSync: ${d.lastCloudSyncAt || 'never'})`
      );
    }
  }
} finally {
  db.close();
}
