'use strict';

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error('Faltan SUPABASE_URL o SUPABASE_SECRET_KEY en las variables de entorno.');
}

// Cliente server-side con la secret key: acceso total (bypasea RLS).
// Esta key NUNCA debe llegar al navegador; solo se usa aquí, del lado del servidor.
const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

module.exports = { supabase };
