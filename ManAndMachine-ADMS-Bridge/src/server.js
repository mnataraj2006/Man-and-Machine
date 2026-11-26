const http = require('node:http');
const { loadSettings } = require('./config/settings');
const { createLogger } = require('./monitoring/logger');
const { openDatabase } = require('./storage/database');
const { createEventQueue } = require('./storage/eventQueue');
const { createRenderClient } = require('./cloud/renderClient');
const { createRetryManager } = require('./cloud/retryManager');
const { createHealthMonitor } = require('./monitoring/health');
const { createRequestHandler } = require('./adms/requestHandler');

function createBridgeServer(customSettings = null, customOptions = {}) {
  const settings = customSettings || loadSettings(customOptions);
  const logger = createLogger({
    level: settings.logLevel,
    logDir: customOptions.disableFileLogs ? null : settings.logDir,
    console: customOptions.consoleLogs !== false,
  });

  const db = openDatabase(settings.sqliteDbPath);
  const queue = createEventQueue(db);
  const renderClient = createRenderClient(settings, logger);
  const retryManager = createRetryManager({ queue, renderClient, settings, logger });
  const healthMonitor = createHealthMonitor({ settings, queue, renderClient });
  const requestHandler = createRequestHandler({
    settings,
    queue,
    renderClient,
    retryManager,
    healthMonitor,
    logger,
  });

  const server = http.createServer(requestHandler);

  async function start() {
    retryManager.start();
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(settings.bridgePort, settings.bridgeHost, () => {
        server.removeListener('error', reject);
        resolve();
      });
    });

    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : settings.bridgePort;
    logger.info('ManAndMachine-ADMS-Bridge started', {
      host: settings.bridgeHost,
      port,
      renderBackendUrl: settings.renderBackendUrl,
      allowedDeviceSerials: settings.allowedDeviceSerials,
      sqliteDbPath: settings.sqliteDbPath,
    });
    return { port, host: settings.bridgeHost };
  }

  async function stop() {
    logger.info('Stopping ManAndMachine-ADMS-Bridge');
    await retryManager.stop();
    await new Promise((resolve) => {
      server.close(() => resolve());
    });
    db.close();
  }

  return {
    server,
    settings,
    logger,
    db,
    queue,
    renderClient,
    retryManager,
    healthMonitor,
    start,
    stop,
  };
}

if (require.main === module) {
  let bridge;
  try {
    bridge = createBridgeServer();
  } catch (err) {
    console.error(`[FATAL] Failed to initialize ManAndMachine-ADMS-Bridge: ${err.message}`);
    process.exit(1);
  }

  bridge.start().catch((err) => {
    console.error(`[FATAL] Failed to start server: ${err.message}`);
    process.exit(1);
  });

  const shutdown = async (signal) => {
    bridge.logger.info('Received shutdown signal', { signal });
    try {
      await bridge.stop();
      process.exit(0);
    } catch (err) {
      bridge.logger.error('Error during shutdown', { error: err.message });
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

module.exports = {
  createBridgeServer,
};
