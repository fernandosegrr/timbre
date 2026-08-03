'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');

const timbreRouter = require('./routes/timbre');
const historyRouter = require('./routes/history');
const numbersRouter = require('./routes/numbers');
const pushRouter = require('./routes/push');
const authRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/healthz', (req, res) => res.send('ok'));

app.use('/api', timbreRouter);
app.use('/api', historyRouter);
app.use('/api', numbersRouter);
app.use('/api', pushRouter);
app.use('/api', authRouter);

// Panel admin + PWA (HTML/JS/manifest/service worker estáticos).
app.use(express.static(path.join(__dirname, '..', 'public')));

// Respuestas de error consistentes en JSON (incluye body malformado).
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido en el body.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno.' });
});

app.listen(PORT, () => {
  console.log(`Backend de timbre escuchando en el puerto ${PORT}`);
});
