function sendText(res, statusCode, body) {
  const text = body === undefined || body === null ? '' : String(body);
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(text, 'utf8'),
    Connection: 'close',
  });
  res.end(text);
}

function sendJson(res, statusCode, data) {
  const json = JSON.stringify(data, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(json, 'utf8'),
  });
  res.end(json);
}

function buildFallbackCdataOptions(sn) {
  return [
    `GET OPTION FROM: ${sn}`,
    'ATTLOGStamp=None',
    'OPERLOGStamp=9999',
    'ATTPHOTOStamp=None',
    'ErrorDelay=30',
    'Delay=10',
    'TransTimes=00:00;14:05',
    'TransInterval=1',
    'TransFlag=1111111000',
    'TimeZone=330',
    'Realtime=1',
    'Encrypt=0',
  ].join('\n') + '\n';
}

module.exports = {
  sendText,
  sendJson,
  buildFallbackCdataOptions,
};
