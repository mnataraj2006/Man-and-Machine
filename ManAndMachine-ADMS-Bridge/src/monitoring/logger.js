const fs = require('node:fs');
const path = require('node:path');

const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

const SENSITIVE_KEYS = new Set([
  'secret',
  'bridgeSharedSecret',
  'BRIDGE_SHARED_SECRET',
  'ADMS_SHARED_SECRET',
  'x-adms-secret',
  'authorization',
  'password',
  'passwd',
  'token',
]);

function redactObject(value) {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(redactObject);

  const output = {};
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(k) || SENSITIVE_KEYS.has(k.toLowerCase())) {
      output[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null) {
      output[k] = redactObject(v);
    } else {
      output[k] = v;
    }
  }
  return output;
}

function createLogger(options = {}) {
  const levelName = options.level || 'info';
  const minLevel = LEVELS[levelName] ?? LEVELS.info;
  const logDir = options.logDir || null;
  const writeToConsole = options.console !== false;

  if (logDir) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  function write(level, message, meta) {
    const levelValue = LEVELS[level] ?? LEVELS.info;
    if (levelValue < minLevel) return;

    const entry = {
      ts: new Date().toISOString(),
      level,
      message,
    };

    if (meta && Object.keys(meta).length > 0) {
      entry.meta = redactObject(meta);
    }

    const line = JSON.stringify(entry);
    if (writeToConsole) {
      if (level === 'error') {
        console.error(line);
      } else if (level === 'warn') {
        console.warn(line);
      } else {
        console.log(line);
      }
    }

    if (logDir) {
      const dateStr = entry.ts.slice(0, 10);
      const filePath = path.join(logDir, `bridge-${dateStr}.log`);
      fs.appendFile(filePath, `${line}\n`, () => {});
    }
  }

  return {
    debug: (msg, meta) => write('debug', msg, meta),
    info: (msg, meta) => write('info', msg, meta),
    warn: (msg, meta) => write('warn', msg, meta),
    error: (msg, meta) => write('error', msg, meta),
  };
}

module.exports = {
  createLogger,
  redactObject,
};
