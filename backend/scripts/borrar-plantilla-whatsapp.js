'use strict';

require('dotenv').config();

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
const WHATSAPP_TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || 'aviso_timbre';

// Script de un solo uso: borra la plantilla (todas sus variantes de idioma)
// para poder recrearla con otro texto. Ejecutar: node scripts/borrar-plantilla-whatsapp.js
async function main() {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_BUSINESS_ACCOUNT_ID) {
    console.error('Faltan WHATSAPP_ACCESS_TOKEN o WHATSAPP_BUSINESS_ACCOUNT_ID en el entorno (.env).');
    process.exit(1);
  }

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates?name=${encodeURIComponent(WHATSAPP_TEMPLATE_NAME)}`;

  const respuesta = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
  });

  const resultado = await respuesta.json();

  if (!respuesta.ok) {
    console.error(`Error ${respuesta.status} al borrar la plantilla:`, resultado);
    process.exit(1);
  }

  console.log('Plantilla borrada:', resultado);
}

main();
