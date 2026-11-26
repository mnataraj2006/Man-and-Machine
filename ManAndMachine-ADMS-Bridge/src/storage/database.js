const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

function openDatabase(dbPath) {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  if (dbPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA synchronous = NORMAL;');
  }
  db.exec('PRAGMA busy_timeout = 5000;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS outbox_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_uid TEXT NOT NULL UNIQUE,
      device_serial TEXT NOT NULL,
      table_name TEXT NOT NULL,
      query_string TEXT NOT NULL,
      raw_payload TEXT NOT NULL,
      line_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED')),
      attempt_count INTEGER NOT NULL DEFAULT 0,
      next_retry_at INTEGER NOT NULL,
      last_error TEXT,
      last_http_status INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      delivered_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_outbox_status_retry
      ON outbox_events (status, next_retry_at, id);

    CREATE INDEX IF NOT EXISTS idx_outbox_serial
      ON outbox_events (device_serial, created_at);

    CREATE TABLE IF NOT EXISTS device_state (
      device_serial TEXT PRIMARY KEY,
      last_seen_at INTEGER,
      last_heartbeat_at INTEGER,
      last_attlog_at INTEGER,
      last_operlog_at INTEGER,
      last_cloud_sync_at INTEGER,
      last_cloud_error TEXT,
      firmware_version TEXT,
      last_ip TEXT
    );
  `);

  return db;
}

module.exports = {
  openDatabase,
};
