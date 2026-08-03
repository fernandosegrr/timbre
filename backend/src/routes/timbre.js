'use strict';

const express = require('express');
const multer = require('multer');
const { supabase } = require('../db');
const { requireDeviceSecret } = require('../middleware/deviceSecret');
const { enviarPlantillaTimbre } = require('../services/whatsapp');
const { notificarPush } = require('../services/webpush');
const { buscarEventoPendiente, guardarFoto } = require('../services/fotos');

const router = express.Router();
const subidaFoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB de sobra para un solo frame jpg
});

// Recibe el aviso del ESP32. Sin autenticación real esto sería un endpoint
// público que cualquiera podría golpear para disparar WhatsApp/push falsos,
// por eso exige el header X-Device-Secret.
router.post('/timbre', requireDeviceSecret, async (req, res) => {
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

// Consultado por el relay de fotos (Termux + ffmpeg contra el DVR local)
// cada 1-2s: ¿hay un timbrazo reciente esperando su foto?
router.get('/timbre/pending-photo', requireDeviceSecret, async (req, res) => {
  const eventId = await buscarEventoPendiente();
  if (eventId === null) return res.json({ pending: false });
  res.json({ pending: true, event_id: eventId });
});

// El relay sube aquí el frame que capturó del DVR.
router.post('/timbre/foto', requireDeviceSecret, subidaFoto.single('photo'), async (req, res) => {
  const eventId = req.body.event_id;
  if (!eventId || !req.file) {
    return res.status(400).json({ error: 'Se requiere event_id y el campo "photo".' });
  }

  try {
    await guardarFoto(eventId, req.file.buffer);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error al guardar la foto:', err.message);
    res.status(500).json({ error: err.message });
  }
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
