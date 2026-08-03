'use strict';

const express = require('express');
const { requireBasicAuth } = require('../middleware/basicAuth');

const router = express.Router();

// Usado por la pantalla de login del panel: si las credenciales son
// válidas, requireBasicAuth deja pasar y este handler solo confirma.
router.get('/auth/check', requireBasicAuth, (req, res) => {
  res.json({ ok: true });
});

module.exports = router;
