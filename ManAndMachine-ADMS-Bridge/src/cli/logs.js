const fs = require('node:fs');
const path = require('node:path');
const { parseEnvFile } = require('../config/settings');

parseEnvFile(path.join(process.cwd(), '.env'));
const logDir = path.resolve(process.cwd(), (process.env.LOG_DIR || './logs').trim());
const maxLines = Number.parseInt(process.argv[2] || '40', 10) || 40;

if (!fs.existsSync(logDir)) {
  console.log(`No log directory found at: ${logDir}`);
  process.exit(0);
}

const files = fs
  .readdirSync(logDir)
  .filter((name) => name.startsWith('bridge-') && name.endsWith('.log'))
  .sort();

if (files.length === 0) {
  console.log(`No bridge-*.log files found in: ${logDir}`);
  process.exit(0);
}

const latestFile = path.join(logDir, files[files.length - 1]);
const content = fs.readFileSync(latestFile, 'utf8').trim();
if (!content) {
  console.log(`Log file is empty: ${latestFile}`);
  process.exit(0);
}

const lines = content.split(/\r?\n/).slice(-maxLines);
console.log(`=== Latest ${lines.length} lines from ${latestFile} ===`);
for (const line of lines) {
  console.log(line);
}
