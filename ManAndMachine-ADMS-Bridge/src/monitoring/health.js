function createHealthMonitor({ settings, queue, renderClient }) {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  function getStatusSnapshot() {
    const queueStats = queue.getQueueStats();
    const devices = queue.getDeviceStates();
    const cloud = renderClient.getCloudState();

    let status = 'healthy';
    if (queueStats.failed > 0 || (queueStats.pending > 0 && cloud.reachable === false)) {
      status = 'degraded';
    }

    return {
      service: 'ManAndMachine-ADMS-Bridge',
      status,
      startedAt,
      uptimeSeconds: Math.floor((Date.now() - startMs) / 1000),
      config: {
        bridgeHost: settings.bridgeHost,
        bridgePort: settings.bridgePort,
        renderBackendUrl: settings.renderBackendUrl,
        allowedDeviceSerials: settings.allowedDeviceSerials,
        allowedDeviceIps: settings.allowedDeviceIps,
        healthBindLocalOnly: settings.healthBindLocalOnly,
        sharedSecretConfigured: Boolean(settings.bridgeSharedSecret),
      },
      queue: queueStats,
      cloud,
      devices,
    };
  }

  return {
    getStatusSnapshot,
  };
}

module.exports = {
  createHealthMonitor,
};
