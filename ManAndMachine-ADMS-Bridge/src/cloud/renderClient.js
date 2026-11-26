const http = require('node:http');
const https = require('node:https');

function createRenderClient(settings, logger) {
  const baseUrl = new URL(settings.renderBackendUrl);
  const isHttps = baseUrl.protocol === 'https:';
  const transport = isHttps ? https : http;

  const cloudState = {
    reachable: null,
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastError: null,
    lastStatusCode: null,
  };

  function request({ method, pathWithQuery, body = null, contentType = 'text/plain' }) {
    return new Promise((resolve) => {
      const targetUrl = new URL(pathWithQuery, baseUrl);
      const headers = {
        'x-adms-secret': settings.bridgeSharedSecret,
        'x-forwarded-by': 'ManAndMachine-ADMS-Bridge',
      };

      let payloadBuffer = null;
      if (body !== null && body !== undefined) {
        payloadBuffer = Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8');
        headers['content-type'] = contentType;
        headers['content-length'] = String(payloadBuffer.length);
      }

      const reqOptions = {
        protocol: targetUrl.protocol,
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isHttps ? 443 : 80),
        path: `${targetUrl.pathname}${targetUrl.search}`,
        method,
        headers,
        timeout: settings.cloudRequestTimeoutMs,
      };

      if (isHttps) {
        reqOptions.rejectUnauthorized = true;
      }

      cloudState.lastAttemptAt = new Date().toISOString();

      const req = transport.request(reqOptions, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const responseBody = Buffer.concat(chunks).toString('utf8');
          const statusCode = res.statusCode || 0;
          cloudState.lastStatusCode = statusCode;

          if (statusCode >= 200 && statusCode < 300) {
            cloudState.reachable = true;
            cloudState.lastSuccessAt = new Date().toISOString();
            cloudState.lastError = null;
          } else if (statusCode >= 500) {
            cloudState.reachable = false;
            cloudState.lastError = `HTTP ${statusCode}`;
          } else {
            cloudState.reachable = true;
            cloudState.lastError = `HTTP ${statusCode}`;
          }

          resolve({
            ok: statusCode >= 200 && statusCode < 300,
            statusCode,
            body: responseBody,
            headers: res.headers,
            error: null,
          });
        });
      });

      req.on('timeout', () => {
        req.destroy(new Error(`Request timed out after ${settings.cloudRequestTimeoutMs}ms`));
      });

      req.on('error', (err) => {
        cloudState.reachable = false;
        cloudState.lastStatusCode = null;
        cloudState.lastError = err.message;
        logger.warn('Cloud request error', {
          method,
          path: targetUrl.pathname,
          error: err.message,
        });
        resolve({
          ok: false,
          statusCode: 0,
          body: '',
          headers: {},
          error: err.message,
        });
      });

      if (payloadBuffer) {
        req.write(payloadBuffer);
      }
      req.end();
    });
  }

  function forwardCdataGet(queryString) {
    const qs = queryString ? `?${queryString}` : '';
    return request({
      method: 'GET',
      pathWithQuery: `/iclock/cdata${qs}`,
    });
  }

  function forwardCdataPost(queryString, rawPayload) {
    const qs = queryString ? `?${queryString}` : '';
    return request({
      method: 'POST',
      pathWithQuery: `/iclock/cdata${qs}`,
      body: rawPayload,
      contentType: 'text/plain',
    });
  }

  function forwardGetRequest(queryString) {
    const qs = queryString ? `?${queryString}` : '';
    return request({
      method: 'GET',
      pathWithQuery: `/iclock/getrequest${qs}`,
    });
  }

  function forwardDeviceCmd(queryString, rawPayload) {
    const qs = queryString ? `?${queryString}` : '';
    return request({
      method: 'POST',
      pathWithQuery: `/iclock/devicecmd${qs}`,
      body: rawPayload || '',
      contentType: 'text/plain',
    });
  }

  function getCloudState() {
    return { ...cloudState };
  }

  return {
    forwardCdataGet,
    forwardCdataPost,
    forwardGetRequest,
    forwardDeviceCmd,
    getCloudState,
  };
}

module.exports = {
  createRenderClient,
};
