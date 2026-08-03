'use strict';

const crypto = require('crypto');

const ADMIN_USER = process.env.ADMIN_USER || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

function comparaSeguro(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Protege rutas con HTTP Basic Auth. Si ADMIN_USER/ADMIN_PASSWORD no están
// configurados, la comparación siempre falla (falla cerrado, no abierto).
function requireBasicAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [tipo, credenciales] = header.split(' ');

  if (tipo === 'Basic' && credenciales) {
    const [usuario, password] = Buffer.from(credenciales, 'base64').toString('utf8').split(':');
    if (usuario && password && comparaSeguro(usuario, ADMIN_USER) && comparaSeguro(password, ADMIN_PASSWORD)) {
      return next();
    }
  }

  res.set('WWW-Authenticate', 'Basic realm="Panel de timbre"');
  res.status(401).send('Acceso no autorizado.');
}

module.exports = { requireBasicAuth };
