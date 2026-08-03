'use strict';

const crypto = require('crypto');

const DEVICE_SHARED_SECRET = process.env.DEVICE_SHARED_SECRET || '';

function comparaSeguro(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Protege rutas con el mismo secreto compartido que usan el ESP32 y el
// relay de fotos (Termux). Sin DEVICE_SHARED_SECRET configurado, falla
// cerrado (nunca deja pasar por accidente).
function requireDeviceSecret(req, res, next) {
  const recibido = req.get('X-Device-Secret') || '';
  if (!DEVICE_SHARED_SECRET || !comparaSeguro(recibido, DEVICE_SHARED_SECRET)) {
    return res.status(401).json({ error: 'Secreto de dispositivo inválido.' });
  }
  next();
}

module.exports = { requireDeviceSecret };
