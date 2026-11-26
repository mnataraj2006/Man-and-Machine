const fs = require('node:fs');
const path = require('node:path');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseIntSetting(name, defaultValue, min, max) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return defaultValue;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < min || parsed > max) {
    throw new Error(`Invalid ${name}="${raw}". Must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

function parseCsvList(raw) {
  if (!raw) return [];
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function loadSettings(options = {}) {
  const cwd = options.cwd || process.cwd();
  const envPath = options.envPath || path.join(cwd, '.env');
  if (!options.skipEnvFile) {
    parseEnvFile(envPath);
  }

  const bridgeHost = (process.env.BRIDGE_HOST || '0.0.0.0').trim();
  const bridgePort = parseIntSetting('BRIDGE_PORT', 8081, 0, 65535);

  const renderBackendUrlRaw = (process.env.RENDER_BACKEND_URL || '').trim().replace(/\/+$/, '');
  if (!renderBackendUrlRaw) {
    throw new Error('RENDER_BACKEND_URL is required.');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(renderBackendUrlRaw);
  } catch {
    throw new Error(`RENDER_BACKEND_URL is not a valid URL: "${renderBackendUrlRaw}"`);
  }

  const allowInsecureHttp =
    process.env.NODE_ENV === 'test' || process.env.ALLOW_INSECURE_HTTP_FOR_TESTS === 'true';
  if (parsedUrl.protocol !== 'https:' && !allowInsecureHttp) {
    throw new Error('RENDER_BACKEND_URL must use https:// in production.');
  }

  const bridgeSharedSecret = (process.env.BRIDGE_SHARED_SECRET || '').trim();
  if (!bridgeSharedSecret) {
    throw new Error('BRIDGE_SHARED_SECRET is required.');
  }
  if (
    bridgeSharedSecret === 'replace-with-strong-shared-secret' &&
    process.env.NODE_ENV !== 'test'
  ) {
    throw new Error('BRIDGE_SHARED_SECRET must be changed from the placeholder value.');
  }

  const allowedDeviceSerials = parseCsvList(process.env.ALLOWED_DEVICE_SERIALS);
  const allowedDeviceIps = parseCsvList(process.env.ALLOWED_DEVICE_IPS);

  const sqliteDbPathRaw = (process.env.SQLITE_DB_PATH || './data/bridge.sqlite').trim();
  const sqliteDbPath =
    sqliteDbPathRaw === ':memory:' ? ':memory:' : path.resolve(cwd, sqliteDbPathRaw);

  const logDirRaw = (process.env.LOG_DIR || './logs').trim();
  const logDir = path.resolve(cwd, logDirRaw);

  return {
    bridgeHost,
    bridgePort,
    renderBackendUrl: renderBackendUrlRaw,
    bridgeSharedSecret,
    allowedDeviceSerials,
    allowedDeviceIps,
    sqliteDbPath,
    cloudRequestTimeoutMs: parseIntSetting('CLOUD_REQUEST_TIMEOUT_MS', 10000, 1000, 120000),
    retryPollIntervalMs: parseIntSetting('RETRY_POLL_INTERVAL_MS', 5000, 100, 300000),
    retryBaseDelayMs: parseIntSetting('RETRY_BASE_DELAY_MS', 5000, 50, 300000),
    retryMaxDelayMs: parseIntSetting('RETRY_MAX_DELAY_MS', 300000, 100, 3600000),
    maxRetryAttempts: parseIntSetting('MAX_RETRY_ATTEMPTS', 25, 1, 1000),
    batchFlushLimit: parseIntSetting('BATCH_FLUSH_LIMIT', 20, 1, 200),
    healthBindLocalOnly: String(process.env.HEALTH_BIND_LOCAL_ONLY || 'true').toLowerCase() !== 'false',
    logLevel: (process.env.LOG_LEVEL || 'info').trim().toLowerCase(),
    logDir,
  };
}

module.exports = {
  loadSettings,
  parseEnvFile,
};
