const http = require('node:http');
const path = require('node:path');
const { parseEnvFile } = require('../config/settings');

parseEnvFile(path.join(process.cwd(), '.env'));
const port = Number.parseInt(process.env.BRIDGE_PORT || '8081', 10);

const req = http.get(`http://127.0.0.1:${port}/health`, { timeout: 3000 }, (res) => {
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8');
    try {
      const data = JSON.parse(body);
      console.log('=== Man & Machine ADMS Bridge Status ===');
      console.log(`Status       : ${data.status}`);
      console.log(`Uptime       : ${data.uptimeSeconds}s (since ${data.startedAt})`);
      console.log(`Local Listen : ${data.config.bridgeHost}:${data.config.bridgePort}`);
      console.log(`Cloud Target : ${data.config.renderBackendUrl}`);
      console.log(`Cloud Online : ${data.cloud.reachable === null ? 'unknown (no traffic yet)' : data.cloud.reachable}`);
      console.log(`Last Cloud OK: ${data.cloud.lastSuccessAt || 'never'}`);
      console.log(`Queue        : pending=${data.queue.pending}, processing=${data.queue.processing}, delivered=${data.queue.delivered}, failed=${data.queue.failed}`);
      if (data.devices.length === 0) {
        console.log('Devices      : none seen yet');
      } else {
        console.log('Devices      :');
        for (const d of data.devices) {
          console.log(`  - ${d.deviceSerial} (IP: ${d.lastIp || '?'}, lastSeen: ${d.lastSeenAt || 'never'}, lastAttlog: ${d.lastAttlogAt || 'never'})`);
        }
      }
      process.exit(0);
    } catch {
      console.error('Unexpected response from bridge /health:', body);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error(`Bridge is not reachable on http://127.0.0.1:${port}/health (${err.message})`);
  process.exit(1);
});
