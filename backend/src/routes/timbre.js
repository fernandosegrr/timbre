'use strict';

const express = require('express');
const crypto = require('crypto');
const { supabase } = require('../db');
const { enviarPlantillaTimbre } = require('../services/whatsapp');
const { notificarPush } = require('../services/webpush');

const router = express.Router();

const DEVICE_SHARED_SECRET = process.env.DEVICE_SHARED_SECRET || '';

function comparaSeguro(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Recibe el aviso del ESP32. Sin autenticación real esto sería un endpoint
// público que cualquiera podría golpear para disparar WhatsApp/push falsos,
// por eso exige el header X-Device-Secret.
router.post('/timbre', async (req, res) => {
  const secretoRecibido = req.get('X-Device-Secret') || '';
  if (!DEVICE_SHARED_SECRET || !comparaSeguro(secretoRecibido, DEVICE_SHARED_SECRET)) {
    return res.status(401).json({ error: 'Secreto de dispositivo inválido.' });
  }

  const { event, device_id: deviceId } = req.body || {};
  if (event !== 'doorbell_ring' || !deviceId) {
    return res.status(400).json({
      error: 'Body inválido. Se espera {"event":"doorbell_ring","device_id":"..."}.',
    });
  }

  const { data, error } = await supabase
    .from('doorbell_events')
    .insert({ device_id: deviceId })
    .select('id, occurred_at')
    .single();

  if (error) {
    console.error('Error al guardar el evento de timbre:', error);
    return res.status(500).json({ error: 'No se pudo guardar el evento.' });
  }

  // Responder ya: el ESP32 tiene timeout corto (~5s) y no debe esperar a
  // que salgan los WhatsApp/push.
  res.status(200).json({ ok: true, id: data.id, occurred_at: data.occurred_at });

  // Notificaciones en segundo plano, después de responder. Un fallo aquí
  // solo se loguea: nunca debe tumbar el endpoint ni el request del ESP32.
  despacharNotificaciones(data.occurred_at).catch((err) => {
    console.error('Error inesperado despachando notificaciones:', err);
  });
});

async function despacharNotificaciones(occurredAt) {
  const { data: numeros, error: errorNumeros } = await supabase
    .from('notification_numbers')
    .select('phone_number')
    .eq('active', true);

  if (errorNumeros) {
    console.error('Error al leer números de notificación:', errorNumeros);
  } else {
    for (const { phone_number: numero } of numeros || []) {
      enviarPlantillaTimbre(numero, occurredAt).catch((err) => {
        console.error(`Error enviando WhatsApp a ${numero}:`, err.message || err);
      });
    }
  }

  notificarPush().catch((err) => {
    console.error('Error enviando notificaciones push:', err.message || err);
  });
}

module.exports = router;
