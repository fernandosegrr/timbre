'use strict';

const express = require('express');
const { supabase } = require('../db');
const { requireBasicAuth } = require('../middleware/basicAuth');
const { agregarUrlsFirmadas } = require('../services/fotos');

const router = express.Router();

router.get('/history', requireBasicAuth, async (req, res) => {
  const limite = Math.min(parseInt(req.query.limit, 10) || 50, 200);

  const { data, error } = await supabase
    .from('doorbell_events')
    .select('id, device_id, occurred_at, photo_status, photo_path')
    .order('occurred_at', { ascending: false })
    .limit(limite);

  if (error) {
    console.error('Error al leer historial:', error);
    return res.status(500).json({ error: 'No se pudo leer el historial.' });
  }

  const eventos = await agregarUrlsFirmadas(data);
  res.json({ events: eventos });
});

module.exports = router;
