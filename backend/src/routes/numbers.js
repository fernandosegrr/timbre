'use strict';

const express = require('express');
const { supabase } = require('../db');
const { requireBasicAuth } = require('../middleware/basicAuth');

const router = express.Router();

router.use(requireBasicAuth);

router.get('/numbers', async (req, res) => {
  const { data, error } = await supabase
    .from('notification_numbers')
    .select('id, phone_number, label, active, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error al leer números:', error);
    return res.status(500).json({ error: 'No se pudieron leer los números.' });
  }

  res.json({ numbers: data });
});

router.post('/numbers', async (req, res) => {
  const { phone_number: numero, label } = req.body || {};
  const numeroLimpio = typeof numero === 'string' ? numero.replace(/[^\d]/g, '') : '';

  if (!numeroLimpio) {
    return res.status(400).json({ error: 'phone_number es requerido (solo dígitos, formato E.164 sin "+").' });
  }

  const { data, error } = await supabase
    .from('notification_numbers')
    .insert({ phone_number: numeroLimpio, label: label || null })
    .select('id, phone_number, label, active, created_at')
    .single();

  if (error) {
    console.error('Error al agregar número:', error);
    return res.status(500).json({ error: 'No se pudo agregar el número (¿ya existe?).' });
  }

  res.status(201).json({ number: data });
});

router.delete('/numbers/:id', async (req, res) => {
  const { error } = await supabase
    .from('notification_numbers')
    .delete()
    .eq('id', req.params.id);

  if (error) {
    console.error('Error al borrar número:', error);
    return res.status(500).json({ error: 'No se pudo borrar el número.' });
  }

  res.status(204).end();
});

module.exports = router;
