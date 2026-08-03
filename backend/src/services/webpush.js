'use strict';

const webpush = require('web-push');
const { supabase } = require('../db');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

let configurado = false;

function asegurarConfiguracion() {
  if (configurado) return;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error('Faltan VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY.');
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configurado = true;
}

// Manda push a todas las suscripciones guardadas (todos los celulares que
// instalaron la PWA y aceptaron notificaciones).
async function notificarPush() {
  asegurarConfiguracion();

  const { data: suscripciones, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth');

  if (error) {
    throw new Error(`No se pudieron leer las suscripciones push: ${error.message}`);
  }

  const payload = JSON.stringify({
    title: '🔔 Timbre',
    body: 'Alguien tocó el timbre.',
  });

  await Promise.allSettled(
    (suscripciones || []).map(async (sub) => {
      const suscripcionWebPush = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        await webpush.sendNotification(suscripcionWebPush, payload);
      } catch (err) {
        // 410/404: la suscripción ya no es válida (PWA desinstalada, etc.) - se limpia.
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error(`Error enviando push a suscripción ${sub.id}:`, err.message || err);
        }
      }
    })
  );
}

module.exports = { notificarPush };
