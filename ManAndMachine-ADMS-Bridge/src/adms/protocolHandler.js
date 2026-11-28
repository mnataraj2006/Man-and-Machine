function parseAdmsLines(rawBody) {
  if (!rawBody || typeof rawBody !== 'string') return [];
  return rawBody
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isLikelyMalformedAttlog(lines) {
  if (lines.length === 0) return false;
  // Valid ATTLOG lines have at least PIN<TAB>DateTime
  return lines.every((line) => {
    const parts = line.split('\t');
    return parts.length < 2 || !parts[0].trim() || !parts[1].trim();
  });
}

function extractFirmwareVersion(queryParams) {
  return (
    queryParams.get('pushver') ||
    queryParams.get('FWVersion') ||
    queryParams.get('fwver') ||
    null
  );
}

function isStrictAttlogLines(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return false;
  return lines.every((line) => {
    const parts = line.split('\t');
    if (parts.length < 2) return false;
    const pin = parts[0].trim();
    const ts = parts[1].trim();
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(pin)) return false;
    if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(ts)) {
      return false;
    }
    const parsed = new Date(ts.includes('T') ? ts : `${ts.replace(' ', 'T')}+05:30`);
    return !Number.isNaN(parsed.getTime());
  });
}

function ensureQueryTableParam(queryString, tableName) {
  const params = new URLSearchParams(queryString || '');
  if (!params.get('table')) {
    params.set('table', tableName);
  }
  return params.toString();
}

module.exports = {
  parseAdmsLines,
  isLikelyMalformedAttlog,
  isStrictAttlogLines,
  ensureQueryTableParam,
  extractFirmwareVersion,
};
