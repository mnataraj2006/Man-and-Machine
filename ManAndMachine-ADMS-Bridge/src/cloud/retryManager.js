function createRetryManager({ queue, renderClient, settings, logger }) {
  let timer = null;
  let isFlushing = false;
  let flushRequested = false;
  let stopped = false;

  async function processSingleEvent(event) {
    const result = await renderClient.forwardCdataPost(event.query_string, event.raw_payload);

    if (result.ok) {
      queue.markDelivered(event.id, result.statusCode);
      queue.recordDeviceActivity({
        deviceSerial: event.device_serial,
        cloudSync: true,
        cloudError: '__CLEAR__',
      });
      logger.info('Delivered queued ADMS event to Render', {
        eventId: event.id,
        sn: event.device_serial,
        table: event.table_name,
        lineCount: event.line_count,
        statusCode: result.statusCode,
        attempts: event.attempt_count + 1,
      });
      return;
    }

    const permanent = result.statusCode === 400;
    const errorMessage = result.error || `HTTP ${result.statusCode}: ${result.body.slice(0, 160)}`;
    const retryUpdate = queue.markRetryOrFailed(event.id, event.attempt_count, {
      errorMessage,
      httpStatus: result.statusCode || null,
      retryBaseDelayMs: settings.retryBaseDelayMs,
      retryMaxDelayMs: settings.retryMaxDelayMs,
      maxRetryAttempts: settings.maxRetryAttempts,
      permanent,
    });

    queue.recordDeviceActivity({
      deviceSerial: event.device_serial,
      cloudError: errorMessage,
    });

    logger.warn('Failed delivering ADMS event to Render', {
      eventId: event.id,
      sn: event.device_serial,
      table: event.table_name,
      statusCode: result.statusCode,
      nextStatus: retryUpdate.status,
      attemptCount: retryUpdate.attemptCount,
      error: errorMessage,
    });
  }

  async function flushOnce() {
    if (stopped) return;
    if (isFlushing) {
      flushRequested = true;
      return;
    }

    isFlushing = true;
    try {
      do {
        flushRequested = false;
        const batch = queue.claimPendingBatch(settings.batchFlushLimit, Date.now());
        if (batch.length === 0) break;

        for (const event of batch) {
          if (stopped) break;
          await processSingleEvent(event);
        }
      } while (flushRequested && !stopped);
    } catch (err) {
      logger.error('Retry manager flush error', { error: err.message });
    } finally {
      isFlushing = false;
    }
  }

  function start() {
    stopped = false;
    const recovered = queue.recoverStuckProcessing();
    if (recovered > 0) {
      logger.info('Recovered stuck PROCESSING events on startup', { count: recovered });
    }

    timer = setInterval(() => {
      flushOnce().catch((err) => {
        logger.error('Scheduled retry flush failed', { error: err.message });
      });
    }, settings.retryPollIntervalMs);
    if (typeof timer.unref === 'function') {
      timer.unref();
    }

    // Immediate startup flush
    flushOnce().catch(() => {});
  }

  async function stop() {
    stopped = true;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    // Wait briefly for any in-flight flush to finish
    const deadline = Date.now() + 3000;
    while (isFlushing && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  function triggerFlush() {
    return flushOnce();
  }

  return {
    start,
    stop,
    triggerFlush,
  };
}

module.exports = {
  createRetryManager,
};
