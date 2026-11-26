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

module.exports = {
  parseAdmsLines,
  isLikelyMalformedAttlog,
  extractFirmwareVersion,
};
