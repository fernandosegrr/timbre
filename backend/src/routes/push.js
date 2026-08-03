'use strict';

const express = require('express');
const { supabase } = require('../db');

const router = express.Router();

// Autoservicio: cualquiera que instale la PWA y acepte notificaciones se
// suscribe sola, no requiere login de admin.
router.get('/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

router.post('/push/subscribe', async (req, res) => {
  const sub = req.body || {};
  const endpoint = sub.endpoint;
  const p256dh = sub.keys && sub.keys.p256dh;
  const auth = sub.keys && sub.keys.auth;

  if (!endpoint || !p256dh || !auth) {
    return res.status(400).json({ error: 'Suscripción push inválida.' });
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ endpoint, p256dh, auth }, { onConflict: 'endpoint' });

  if (error) {
    console.error('Error al guardar suscripción push:', error);
    return res.status(500).json({ error: 'No se pudo guardar la suscripción.' });
  }

  res.status(201).json({ ok: true });
});

module.exports = router;
