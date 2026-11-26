const SERIAL_REGEX = /^[A-Za-z0-9_-]{3,40}$/;

function normalizeIp(ip) {
  if (!ip) return '';
  let cleaned = String(ip).trim();
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.slice(7);
  }
  if (cleaned === '::1') {
    return '127.0.0.1';
  }
  return cleaned;
}

function isValidSerialFormat(sn) {
  return typeof sn === 'string' && SERIAL_REGEX.test(sn.trim());
}

function isIpAllowed(remoteIp, allowedDeviceIps) {
  if (!Array.isArray(allowedDeviceIps) || allowedDeviceIps.length === 0) {
    return true;
  }
  const normalizedRemote = normalizeIp(remoteIp);
  return allowedDeviceIps.some((allowed) => normalizeIp(allowed) === normalizedRemote);
}

function isSerialAllowed(sn, allowedDeviceSerials) {
  if (!isValidSerialFormat(sn)) return false;
  if (!Array.isArray(allowedDeviceSerials) || allowedDeviceSerials.length === 0) {
    return true;
  }
  const normalizedSn = sn.trim().toUpperCase();
  return allowedDeviceSerials.some((allowed) => allowed.trim().toUpperCase() === normalizedSn);
}

function validateDeviceRequest({ sn, remoteIp, settings }) {
  if (!isValidSerialFormat(sn)) {
    return {
      ok: false,
      statusCode: 400,
      reason: 'INVALID_SERIAL_FORMAT',
      message: 'Invalid or missing device serial number (SN)',
    };
  }

  if (!isIpAllowed(remoteIp, settings.allowedDeviceIps)) {
    return {
      ok: false,
      statusCode: 403,
      reason: 'IP_NOT_ALLOWED',
      message: `Device IP ${normalizeIp(remoteIp)} is not in ALLOWED_DEVICE_IPS`,
    };
  }

  if (!isSerialAllowed(sn, settings.allowedDeviceSerials)) {
    return {
      ok: false,
      statusCode: 403,
      reason: 'SERIAL_NOT_ALLOWED',
      message: `Device serial ${sn.trim()} is not in ALLOWED_DEVICE_SERIALS`,
    };
  }

  return {
    ok: true,
    sn: sn.trim(),
    remoteIp: normalizeIp(remoteIp),
  };
}

module.exports = {
  normalizeIp,
  isValidSerialFormat,
  isIpAllowed,
  isSerialAllowed,
  validateDeviceRequest,
};
