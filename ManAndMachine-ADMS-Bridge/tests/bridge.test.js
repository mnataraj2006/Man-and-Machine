const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.NODE_ENV = 'test';

const { createBridgeServer } = require('../src/server');

function createMockRenderServer() {
  const received = [];
  let mode = 'ok'; // 'ok' | 'down' | 'error500' | 'error400' | 'unauthorized'

  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      received.push({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body,
      });

      if (mode === 'down') {
        req.socket.destroy();
        return;
      }
      if (mode === 'error500') {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
        return;
      }
      if (mode === 'error400') {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('ERROR: Malformed ATTLOG payload');
        return;
      }
      if (mode === 'unauthorized' || req.headers['x-adms-secret'] !== 'test-secret-123') {
        res.writeHead(401, { 'Content-Type': 'text/plain' });
        res.end('ERROR: Unauthorized');
        return;
      }

      const urlObj = new URL(req.url, 'http://localhost');
      const sn = urlObj.searchParams.get('SN') || 'UNKNOWN';
      const table = (urlObj.searchParams.get('table') || '').toUpperCase();

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      if (req.method === 'GET' && urlObj.pathname === '/iclock/cdata') {
        res.end(`GET OPTION FROM: ${sn}\nATTLOGStamp=None\nRealtime=1\n`);
      } else if (req.method === 'POST' && urlObj.pathname === '/iclock/cdata') {
        const lines = body.split(/\r?\n/).filter((l) => l.trim());
        res.end(table === 'OPERLOG' ? 'OK: 1' : `OK: ${lines.length}`);
      } else {
        res.end('OK');
      }
    });
  });

  return {
    server,
    received,
    setMode(nextMode) {
      mode = nextMode;
    },
    async start() {
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      const { port } = server.address();
      return `http://127.0.0.1:${port}`;
    },
    async stop() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

function httpRequest(url, { method = 'GET', body = null, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: `${u.pathname}${u.search}`,
        method,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            body: Buffer.concat(chunks).toString('utf8'),
            headers: res.headers,
          });
        });
      }
    );
    req.on('error', reject);
    if (body !== null) req.write(body);
    req.end();
  });
}

async function waitFor(predicate, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((r) => setTimeout(r, 40));
  }
  throw new Error('Timed out waiting for condition');
}

function makeSettings(renderUrl, overrides = {}) {
  return {
    bridgeHost: '127.0.0.1',
    bridgePort: 0,
    renderBackendUrl: renderUrl,
    bridgeSharedSecret: 'test-secret-123',
    allowedDeviceSerials: ['TDDB250600919'],
    allowedDeviceIps: ['127.0.0.1'],
    sqliteDbPath: ':memory:',
    cloudRequestTimeoutMs: 2000,
    retryPollIntervalMs: 100,
    retryBaseDelayMs: 60,
    retryMaxDelayMs: 250,
    maxRetryAttempts: 3,
    batchFlushLimit: 20,
    healthBindLocalOnly: true,
    logLevel: 'silent',
    logDir: os.tmpdir(),
    ...overrides,
  };
}

test('1. Authorized GET /iclock/cdata handshake forwards with x-adms-secret', async () => {
  const mockRender = createMockRenderServer();
  const renderUrl = await mockRender.start();
  const bridge = createBridgeServer(makeSettings(renderUrl), { disableFileLogs: true, consoleLogs: false });
  const { port } = await bridge.start();

  try {
    const res = await httpRequest(`http://127.0.0.1:${port}/iclock/cdata?SN=TDDB250600919&options=all&pushver=2.4.1`);
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /GET OPTION FROM: TDDB250600919/);
    assert.equal(mockRender.received.length, 1);
    assert.equal(mockRender.received[0].headers['x-adms-secret'], 'test-secret-123');
  } finally {
    await bridge.stop();
    await mockRender.stop();
  }
});

test('2. Authorized ATTLOG persists to SQLite, responds OK: 2, and delivers to Render', async () => {
  const mockRender = createMockRenderServer();
  const renderUrl = await mockRender.start();
  const bridge = createBridgeServer(makeSettings(renderUrl), { disableFileLogs: true, consoleLogs: false });
  const { port } = await bridge.start();

  try {
    const payload = '101\t2026-11-26 10:00:00\t0\t15\n102\t2026-11-26 10:01:00\t0\t15\n';
    const res = await httpRequest(`http://127.0.0.1:${port}/iclock/cdata?SN=TDDB250600919&table=ATTLOG`, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'text/plain' },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, 'OK: 2');

    await waitFor(() => bridge.queue.getQueueStats().delivered === 1);
    assert.equal(mockRender.received.length, 1);
    assert.equal(mockRender.received[0].headers['x-adms-secret'], 'test-secret-123');
    assert.equal(mockRender.received[0].body, payload);
  } finally {
    await bridge.stop();
    await mockRender.stop();
  }
});

test('3. Authorized OPERLOG persists to SQLite, responds OK: 1, and delivers to Render', async () => {
  const mockRender = createMockRenderServer();
  const renderUrl = await mockRender.start();
  const bridge = createBridgeServer(makeSettings(renderUrl), { disableFileLogs: true, consoleLogs: false });
  const { port } = await bridge.start();

  try {
    const payload = 'OPLOG 1\t1\t2026-11-26 10:05:00\t0\nUserCount=263\nFaceCount=248\n';
    const res = await httpRequest(`http://127.0.0.1:${port}/iclock/cdata?SN=TDDB250600919&table=OPERLOG`, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'text/plain' },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, 'OK: 1');

    await waitFor(() => bridge.queue.getQueueStats().delivered === 1);
    assert.equal(mockRender.received.length, 1);
  } finally {
    await bridge.stop();
    await mockRender.stop();
  }
});

test('4. Authorized GET /iclock/getrequest forwards live without queuing', async () => {
  const mockRender = createMockRenderServer();
  const renderUrl = await mockRender.start();
  const bridge = createBridgeServer(makeSettings(renderUrl), { disableFileLogs: true, consoleLogs: false });
  const { port } = await bridge.start();

  try {
    const res = await httpRequest(`http://127.0.0.1:${port}/iclock/getrequest?SN=TDDB250600919`);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, 'OK');
    assert.equal(mockRender.received.length, 1);
    assert.equal(bridge.queue.getQueueStats().delivered, 0);
    assert.equal(bridge.queue.getQueueStats().pending, 0);
  } finally {
    await bridge.stop();
    await mockRender.stop();
  }
});

test('5. Authorized POST /iclock/devicecmd forwards live without queuing', async () => {
  const mockRender = createMockRenderServer();
  const renderUrl = await mockRender.start();
  const bridge = createBridgeServer(makeSettings(renderUrl), { disableFileLogs: true, consoleLogs: false });
  const { port } = await bridge.start();

  try {
    const res = await httpRequest(`http://127.0.0.1:${port}/iclock/devicecmd?SN=TDDB250600919`, {
      method: 'POST',
      body: 'ID=12&Return=0&CMD=INFO\n',
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, 'OK');
    assert.equal(mockRender.received.length, 1);
    assert.equal(bridge.queue.getQueueStats().delivered, 0);
  } finally {
    await bridge.stop();
    await mockRender.stop();
  }
});

test('6. Unauthorized device serial is rejected with 403 and not forwarded', async () => {
  const mockRender = createMockRenderServer();
  const renderUrl = await mockRender.start();
  const bridge = createBridgeServer(makeSettings(renderUrl), { disableFileLogs: true, consoleLogs: false });
  const { port } = await bridge.start();

  try {
    const res = await httpRequest(`http://127.0.0.1:${port}/iclock/cdata?SN=ROGUE999&table=ATTLOG`, {
      method: 'POST',
      body: '101\t2026-11-26 10:00:00\t0\t15\n',
    });
    assert.equal(res.statusCode, 403);
    assert.equal(mockRender.received.length, 0);
    assert.equal(bridge.queue.getQueueStats().pending, 0);
  } finally {
    await bridge.stop();
    await mockRender.stop();
  }
});

test('7. Invalid serial format is rejected with 400', async () => {
  const mockRender = createMockRenderServer();
  const renderUrl = await mockRender.start();
  const bridge = createBridgeServer(makeSettings(renderUrl), { disableFileLogs: true, consoleLogs: false });
  const { port } = await bridge.start();

  try {
    const res = await httpRequest(`http://127.0.0.1:${port}/iclock/cdata?SN=..bad..`);
    assert.equal(res.statusCode, 400);
    assert.equal(mockRender.received.length, 0);
  } finally {
    await bridge.stop();
    await mockRender.stop();
  }
});

test('8. Unauthorized source IP is rejected with 403', async () => {
  const mockRender = createMockRenderServer();
  const renderUrl = await mockRender.start();
  const bridge = createBridgeServer(
    makeSettings(renderUrl, { allowedDeviceIps: ['192.168.0.203'] }),
    { disableFileLogs: true, consoleLogs: false }
  );
  const { port } = await bridge.start();

  try {
    const res = await httpRequest(`http://127.0.0.1:${port}/iclock/getrequest?SN=TDDB250600919`);
    assert.equal(res.statusCode, 403);
    assert.equal(mockRender.received.length, 0);
  } finally {
    await bridge.stop();
    await mockRender.stop();
  }
});

test('9. Duplicate identical ATTLOG payload does not create duplicate outbox rows', async () => {
  const mockRender = createMockRenderServer();
  mockRender.setMode('error500');
  const renderUrl = await mockRender.start();
  const bridge = createBridgeServer(makeSettings(renderUrl), { disableFileLogs: true, consoleLogs: false });
  const { port } = await bridge.start();

  try {
    const payload = '201\t2026-11-26 11:00:00\t0\t15\n';
    const r1 = await httpRequest(`http://127.0.0.1:${port}/iclock/cdata?SN=TDDB250600919&table=ATTLOG`, {
      method: 'POST',
      body: payload,
    });
    const r2 = await httpRequest(`http://127.0.0.1:${port}/iclock/cdata?SN=TDDB250600919&table=ATTLOG`, {
      method: 'POST',
      body: payload,
    });
    assert.equal(r1.statusCode, 200);
    assert.equal(r2.statusCode, 200);
    const stats = bridge.queue.getQueueStats();
    assert.equal(stats.pending + stats.processing + stats.failed + stats.delivered, 1);
  } finally {
    await bridge.stop();
    await mockRender.stop();
  }
});

test('10 & 11. Render outage queues locally with OK: 1, then delivers automatically on recovery', async () => {
  const mockRender = createMockRenderServer();
  mockRender.setMode('down');
  const renderUrl = await mockRender.start();
  const bridge = createBridgeServer(makeSettings(renderUrl), { disableFileLogs: true, consoleLogs: false });
  const { port } = await bridge.start();

  try {
    const res = await httpRequest(`http://127.0.0.1:${port}/iclock/cdata?SN=TDDB250600919&table=ATTLOG`, {
      method: 'POST',
      body: '301\t2026-11-26 12:00:00\t0\t15\n',
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, 'OK: 1');

    await waitFor(() => bridge.queue.getQueueStats().pending === 1);
    assert.equal(bridge.queue.getQueueStats().delivered, 0);

    // Recover Render
    mockRender.setMode('ok');
    await waitFor(() => bridge.queue.getQueueStats().delivered === 1, 4000);
    assert.equal(bridge.queue.getQueueStats().pending, 0);
  } finally {
    await bridge.stop();
    await mockRender.stop();
  }
});

test('12. Restart persistence: queued and stuck PROCESSING events survive restart and deliver', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adms-bridge-test-'));
  const dbPath = path.join(tmpDir, 'bridge.sqlite');

  const mockRender = createMockRenderServer();
  mockRender.setMode('down');
  const renderUrl = await mockRender.start();

  const bridge1 = createBridgeServer(makeSettings(renderUrl, { sqliteDbPath: dbPath }), {
    disableFileLogs: true,
    consoleLogs: false,
  });
  const { port: port1 } = await bridge1.start();

  try {
    await httpRequest(`http://127.0.0.1:${port1}/iclock/cdata?SN=TDDB250600919&table=ATTLOG`, {
      method: 'POST',
      body: '401\t2026-11-26 13:00:00\t0\t15\n',
    });
    // Simulate a crash leaving row in PROCESSING
    bridge1.db.exec("UPDATE outbox_events SET status = 'PROCESSING'");
  } finally {
    await bridge1.stop();
  }

  mockRender.setMode('ok');
  const bridge2 = createBridgeServer(makeSettings(renderUrl, { sqliteDbPath: dbPath }), {
    disableFileLogs: true,
    consoleLogs: false,
  });
  await bridge2.start();

  try {
    await waitFor(() => bridge2.queue.getQueueStats().delivered === 1, 4000);
    assert.equal(bridge2.queue.getQueueStats().pending, 0);
  } finally {
    await bridge2.stop();
    await mockRender.stop();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('13. Permanent 400 from Render marks event FAILED without infinite retries', async () => {
  const mockRender = createMockRenderServer();
  mockRender.setMode('error400');
  const renderUrl = await mockRender.start();
  const bridge = createBridgeServer(makeSettings(renderUrl), { disableFileLogs: true, consoleLogs: false });
  const { port } = await bridge.start();

  try {
    await httpRequest(`http://127.0.0.1:${port}/iclock/cdata?SN=TDDB250600919&table=ATTLOG`, {
      method: 'POST',
      body: '501\t2026-11-26 14:00:00\t0\t15\n',
    });
    await waitFor(() => bridge.queue.getQueueStats().failed === 1, 3000);
    assert.equal(mockRender.received.length, 1);
  } finally {
    await bridge.stop();
    await mockRender.stop();
  }
});

test('14. Local /health endpoint returns status and queue counts without exposing secrets', async () => {
  const mockRender = createMockRenderServer();
  const renderUrl = await mockRender.start();
  const bridge = createBridgeServer(makeSettings(renderUrl), { disableFileLogs: true, consoleLogs: false });
  const { port } = await bridge.start();

  try {
    const res = await httpRequest(`http://127.0.0.1:${port}/health`);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.includes('test-secret-123'), false);
    const json = JSON.parse(res.body);
    assert.equal(json.service, 'ManAndMachine-ADMS-Bridge');
    assert.equal(json.config.sharedSecretConfigured, true);
    assert.ok(json.queue);
  } finally {
    await bridge.stop();
    await mockRender.stop();
  }
});

test('15. Render unreachable during handshake/getrequest returns safe local ADMS fallback', async () => {
  const mockRender = createMockRenderServer();
  mockRender.setMode('down');
  const renderUrl = await mockRender.start();
  const bridge = createBridgeServer(makeSettings(renderUrl), { disableFileLogs: true, consoleLogs: false });
  const { port } = await bridge.start();

  try {
    const cdataRes = await httpRequest(`http://127.0.0.1:${port}/iclock/cdata?SN=TDDB250600919&options=all`);
    assert.equal(cdataRes.statusCode, 200);
    assert.match(cdataRes.body, /GET OPTION FROM: TDDB250600919/);

    const getReqRes = await httpRequest(`http://127.0.0.1:${port}/iclock/getrequest?SN=TDDB250600919`);
    assert.equal(getReqRes.statusCode, 200);
    assert.equal(getReqRes.body, 'OK');
  } finally {
    await bridge.stop();
    await mockRender.stop();
  }
});

test('16. [SIMULATED] Unauthorized bridge request (Render 401) is not marked delivered', async () => {
  const mockRender = createMockRenderServer();
  mockRender.setMode('unauthorized');
  const renderUrl = await mockRender.start();
  const bridge = createBridgeServer(
    makeSettings(renderUrl, { maxRetryAttempts: 2, retryBaseDelayMs: 30, retryPollIntervalMs: 50 }),
    { disableFileLogs: true, consoleLogs: false }
  );
  const { port } = await bridge.start();

  try {
    const res = await httpRequest(`http://127.0.0.1:${port}/iclock/cdata?SN=TDDB250600919&table=ATTLOG`, {
      method: 'POST',
      body: '601\t2026-11-26 15:00:00\t0\t15\n',
    });
    assert.equal(res.statusCode, 200);
    await waitFor(() => bridge.queue.getQueueStats().failed === 1, 3000);
    assert.equal(bridge.queue.getQueueStats().delivered, 0);
  } finally {
    await bridge.stop();
    await mockRender.stop();
  }
});

test('17. [SIMULATED] Oversized payload (> 256KB) is rejected with 413 and not queued', async () => {
  const mockRender = createMockRenderServer();
  const renderUrl = await mockRender.start();
  const bridge = createBridgeServer(makeSettings(renderUrl), { disableFileLogs: true, consoleLogs: false });
  const { port } = await bridge.start();

  try {
    const oversized = 'A'.repeat(260 * 1024);
    const res = await httpRequest(`http://127.0.0.1:${port}/iclock/cdata?SN=TDDB250600919&table=ATTLOG`, {
      method: 'POST',
      body: oversized,
    });
    assert.equal(res.statusCode, 413);
    assert.equal(bridge.queue.getQueueStats().pending, 0);
    assert.equal(mockRender.received.length, 0);
  } finally {
    await bridge.stop();
    await mockRender.stop();
  }
});


test('18. Missing table parameter with positive ATTLOG payload appends table=ATTLOG and preserves other params', async () => {
  const mockRender = createMockRenderServer();
  const renderUrl = await mockRender.start();
  const bridge = createBridgeServer(makeSettings(renderUrl), { disableFileLogs: true, consoleLogs: false });
  const { port } = await bridge.start();

  try {
    const payload = '1001\t2026-11-28 09:05:00\t0\t15\t0\t0\n';
    const res = await httpRequest(`http://127.0.0.1:${port}/iclock/cdata?SN=TDDB250600919&Stamp=9999`, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'text/plain' },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, 'OK: 1');

    await waitFor(() => bridge.queue.getQueueStats().delivered === 1);
    assert.equal(mockRender.received.length, 1);
    const forwardedUrl = new URL(mockRender.received[0].url, 'http://localhost');
    assert.equal(forwardedUrl.searchParams.get('SN'), 'TDDB250600919');
    assert.equal(forwardedUrl.searchParams.get('Stamp'), '9999');
    assert.equal(forwardedUrl.searchParams.get('table'), 'ATTLOG');
  } finally {
    await bridge.stop();
    await mockRender.stop();
  }
});

test('19. Explicit table=OPERLOG remains OPERLOG and is never overwritten to ATTLOG', async () => {
  const mockRender = createMockRenderServer();
  const renderUrl = await mockRender.start();
  const bridge = createBridgeServer(makeSettings(renderUrl), { disableFileLogs: true, consoleLogs: false });
  const { port } = await bridge.start();

  try {
    const payload = 'OPLOG 1\t1\t2026-11-28 09:06:00\t0\n';
    const res = await httpRequest(`http://127.0.0.1:${port}/iclock/cdata?SN=TDDB250600919&table=OPERLOG`, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'text/plain' },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, 'OK: 1');

    await waitFor(() => bridge.queue.getQueueStats().delivered === 1);
    const forwardedUrl = new URL(mockRender.received[0].url, 'http://localhost');
    assert.equal(forwardedUrl.searchParams.get('table'), 'OPERLOG');
  } finally {
    await bridge.stop();
    await mockRender.stop();
  }
});

test('20. Unknown or OPERLOG-like payload without table parameter is NOT classified as ATTLOG', async () => {
  const mockRender = createMockRenderServer();
  const renderUrl = await mockRender.start();
  const bridge = createBridgeServer(makeSettings(renderUrl), { disableFileLogs: true, consoleLogs: false });
  const { port } = await bridge.start();

  try {
    const res = await httpRequest(`http://127.0.0.1:${port}/iclock/cdata?SN=TDDB250600919`, {
      method: 'POST',
      body: 'USER PIN=1001\tName=Test\n',
      headers: { 'Content-Type': 'text/plain' },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, 'OK');
    assert.equal(bridge.queue.getQueueStats().pending, 0);
    assert.equal(bridge.queue.getQueueStats().delivered, 0);
    assert.equal(mockRender.received.length, 0);
  } finally {
    await bridge.stop();
    await mockRender.stop();
  }
});


test('21. GET /iclock/getrequest.aspx forwards heartbeat to Render and does not mark cloudSync when Render is down', async () => {
  const mockRender = createMockRenderServer();
  const renderUrl = await mockRender.start();
  const bridge = createBridgeServer(makeSettings(renderUrl), { disableFileLogs: true, consoleLogs: false });
  const { port } = await bridge.start();

  try {
    const res = await httpRequest(`http://127.0.0.1:${port}/iclock/getrequest.aspx?SN=TDDB250600919`, {
      method: 'GET',
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, 'OK');
    assert.equal(mockRender.received.length, 1);
    assert.ok(mockRender.received[0].url.startsWith('/iclock/getrequest'));
    const snapshot = bridge.healthMonitor.getStatusSnapshot();
    const prevCloudSync = snapshot.devices.find((d) => d.deviceSerial === 'TDDB250600919')?.lastCloudSyncAt;
    assert.ok(prevCloudSync);

    mockRender.setMode('down');
    const downRes = await httpRequest(`http://127.0.0.1:${port}/iclock/getrequest.aspx?SN=TDDB250600919`, {
      method: 'GET',
    });
    assert.equal(downRes.statusCode, 200);
    assert.equal(downRes.body, 'OK');
    const afterDown = bridge.healthMonitor.getStatusSnapshot();
    assert.equal(afterDown.devices.find((d) => d.deviceSerial === 'TDDB250600919')?.lastCloudSyncAt, prevCloudSync);
    assert.equal(afterDown.cloud.reachable, false);
  } finally {
    await bridge.stop();
    await mockRender.stop();
  }
});

test('22. POST /iclock/devicecmd.aspx forwards device command ack to Render', async () => {
  const mockRender = createMockRenderServer();
  const renderUrl = await mockRender.start();
  const bridge = createBridgeServer(makeSettings(renderUrl), { disableFileLogs: true, consoleLogs: false });
  const { port } = await bridge.start();

  try {
    const res = await httpRequest(`http://127.0.0.1:${port}/iclock/devicecmd.aspx?SN=TDDB250600919`, {
      method: 'POST',
      body: 'ID=1&Return=0&CMD=INFO\n',
      headers: { 'Content-Type': 'text/plain' },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(mockRender.received.length, 1);
    assert.ok(mockRender.received[0].url.startsWith('/iclock/devicecmd'));
  } finally {
    await bridge.stop();
    await mockRender.stop();
  }
});
