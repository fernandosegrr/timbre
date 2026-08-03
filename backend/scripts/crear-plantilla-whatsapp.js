'use strict';

require('dotenv').config();

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
const WHATSAPP_TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || 'aviso_timbre';
const WHATSAPP_TEMPLATE_LANG = process.env.WHATSAPP_TEMPLATE_LANG || 'es_MX';

// Script de UN SOLO USO: da de alta la plantilla de WhatsApp para el aviso
// de timbre. Ejecutar manualmente: node scripts/crear-plantilla-whatsapp.js
//
// Meta debe APROBAR la plantilla antes de poder usarla para enviar
// mensajes reales (de minutos a ~24h). Revisa el estado en Meta Business
// Suite > WhatsApp Manager > Plantillas de mensajes.
async function main() {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_BUSINESS_ACCOUNT_ID) {
    console.error('Faltan WHATSAPP_ACCESS_TOKEN o WHATSAPP_BUSINESS_ACCOUNT_ID en el entorno (.env).');
    process.exit(1);
  }

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`;

  const respuesta = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: WHATSAPP_TEMPLATE_NAME,
      language: WHATSAPP_TEMPLATE_LANG,
      category: 'UTILITY',
      components: [
        {
          type: 'BODY',
          text: 'ALERTA!! Alguien ha tocado tu puerta a las {{1}} hrs.',
          example: {
            body_text: [['15:45']],
          },
        },
      ],
    }),
  });

  const resultado = await respuesta.json();

  if (!respuesta.ok) {
    console.error(`Error ${respuesta.status} al crear la plantilla:`, resultado);
    process.exit(1);
  }

  console.log('Plantilla creada, pendiente de aprobación de Meta:', resultado);
}

main();
