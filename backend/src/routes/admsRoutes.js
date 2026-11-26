const express = require('express');
const router = express.Router();
const biometricDeviceService = require('../services/biometricDeviceService');

// ADMS devices send text/plain tab-separated payloads
router.use(express.text({ type: '*/*', limit: '2mb' }));

/**
 * Optional server-side ADMS shared secret validation (if ADMS_SHARED_SECRET is configured)
 */
const verifyAdmsSecret = (req, res, next) => {
  const secret = process.env.ADMS_SHARED_SECRET;
  if (!secret) return next();
  const provided = req.headers['x-adms-secret'] || req.query.secret;
  if (provided !== secret) {
    return res.status(401).type('text/plain').send('ERROR: Unauthorized');
  }
  return next();
};

router.use(verifyAdmsSecret);

/**
 * GET /iclock/cdata?SN=TDDB250600919&options=all
 * eSSL / ZKTeco ADMS initial handshake
 */
router.get('/cdata', async (req, res) => {
  try {
    const sn = req.query.SN || req.query.sn;
    const device = await biometricDeviceService.handleAdmsHeartbeat(sn, {
      firmwareVersion: req.query.pushver || '',
    });

    if (!device) {
      return res.status(404).type('text/plain').send('ERROR: Device not registered');
    }
    if (!device.isActive || device.status === 'DISABLED') {
      return res.status(403).type('text/plain').send('ERROR: Device disabled');
    }

    const reply = [
      `GET OPTION FROM: ${device.serialNumber}`,
      'ATTLOGStamp=None',
      'OPERLOGStamp=None',
      'ATTPHOTOStamp=None',
      'ErrorDelay=30',
      'Delay=10',
      'TransTimes=00:00;14:05',
      'TransInterval=1',
      'TransFlag=TransData AttLog\tOpLog\tAttPhoto\tEnrollUser\tChgUser\tEnrollFP\tChgFP\tFACE',
      'Realtime=1',
      'Encrypt=None',
      'TimeZone=330',
    ].join('\n');

    return res.status(200).type('text/plain').send(reply);
  } catch (err) {
    console.error('ADMS GET /iclock/cdata error:', err.message);
    return res.status(500).type('text/plain').send('ERROR');
  }
});

/**
 * POST /iclock/cdata?SN=TDDB250600919&table=ATTLOG
 * Receives attendance punches (ATTLOG) and user/template updates (OPERLOG)
 */
router.post('/cdata', async (req, res) => {
  try {
    const sn = req.query.SN || req.query.sn;
    const table = String(req.query.table || '').toUpperCase();
    const bodyText = typeof req.body === 'string' ? req.body : '';

    if (table === 'ATTLOG') {
      const result = await biometricDeviceService.handleAdmsAttLog(sn, bodyText);
      if (!result.found) return res.status(404).type('text/plain').send('ERROR: Device not registered');
      if (result.disabled) return res.status(403).type('text/plain').send('ERROR: Device disabled');
      return res.status(200).type('text/plain').send(`OK: ${result.processed + result.duplicates}`);
    }

    if (table === 'OPERLOG') {
      const device = await biometricDeviceService.handleAdmsOperLog(sn, bodyText);
      if (!device) return res.status(404).type('text/plain').send('ERROR: Device not registered');
      return res.status(200).type('text/plain').send('OK: 1');
    }

    await biometricDeviceService.handleAdmsHeartbeat(sn);
    return res.status(200).type('text/plain').send('OK');
  } catch (err) {
    console.error('ADMS POST /iclock/cdata error:', err.message);
    return res.status(500).type('text/plain').send('ERROR');
  }
});

/**
 * GET /iclock/getrequest?SN=TDDB250600919
 * Periodic ADMS heartbeat & command poll
 */
router.get('/getrequest', async (req, res) => {
  try {
    const sn = req.query.SN || req.query.sn;
    const device = await biometricDeviceService.handleAdmsHeartbeat(sn);
    if (!device) {
      return res.status(404).type('text/plain').send('ERROR: Device not registered');
    }
    if (!device.isActive || device.status === 'DISABLED') {
      return res.status(403).type('text/plain').send('ERROR: Device disabled');
    }
    return res.status(200).type('text/plain').send('OK');
  } catch (err) {
    console.error('ADMS GET /iclock/getrequest error:', err.message);
    return res.status(500).type('text/plain').send('ERROR');
  }
});

/**
 * POST /iclock/devicecmd?SN=TDDB250600919
 */
router.post('/devicecmd', async (req, res) => {
  try {
    const sn = req.query.SN || req.query.sn;
    await biometricDeviceService.handleAdmsHeartbeat(sn);
    return res.status(200).type('text/plain').send('OK');
  } catch (err) {
    return res.status(500).type('text/plain').send('ERROR');
  }
});

module.exports = router;
