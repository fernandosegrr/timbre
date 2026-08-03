'use strict';

const { supabase } = require('../db');

const BUCKET = 'timbre-fotos';
const TIMEOUT_PENDIENTE_MS = 30_000; // si no llega foto en este tiempo, se da por perdida
const VIGENCIA_URL_FIRMADA_S = 300; // 5 min: suficiente para que cargue el panel

// Si un evento lleva más de TIMEOUT_PENDIENTE_MS en "pendiente" sin foto,
// lo marca "sin_foto" - así pending-photo no lo reporta para siempre si el
// relay de Termux está apagado o el DVR no responde.
async function expirarFotosPendientes() {
  const limite = new Date(Date.now() - TIMEOUT_PENDIENTE_MS).toISOString();
  const { error } = await supabase
    .from('doorbell_events')
    .update({ photo_status: 'sin_foto' })
    .eq('photo_status', 'pendiente')
    .lt('occurred_at', limite);

  if (error) console.error('Error al expirar fotos pendientes:', error);
}

// Devuelve el id del timbrazo más reciente esperando foto, o null si no hay.
async function buscarEventoPendiente() {
  await expirarFotosPendientes();

  const { data, error } = await supabase
    .from('doorbell_events')
    .select('id')
    .eq('photo_status', 'pendiente')
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error al buscar evento pendiente de foto:', error);
    return null;
  }
  return data ? data.id : null;
}

// Sube la foto al bucket privado y asocia el evento. Tira si algo falla,
// el caller (la ruta) decide cómo responder.
async function guardarFoto(eventId, buffer) {
  const path = `eventos/${eventId}.jpg`;

  const { error: errorSubida } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: true });

  if (errorSubida) throw new Error(`No se pudo subir la foto: ${errorSubida.message}`);

  const { error: errorUpdate } = await supabase
    .from('doorbell_events')
    .update({ photo_status: 'recibida', photo_path: path })
    .eq('id', eventId);

  if (errorUpdate) throw new Error(`Foto subida pero no se pudo asociar al evento: ${errorUpdate.message}`);
}

// Agrega photo_url (firmada, temporal) a cada evento que ya tiene foto.
// El bucket es privado, por eso no hay una URL pública fija que guardar.
async function agregarUrlsFirmadas(eventos) {
  const conFoto = eventos.filter((e) => e.photo_path);
  if (conFoto.length === 0) return eventos;

  const urls = {};
  await Promise.all(
    conFoto.map(async (e) => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(e.photo_path, VIGENCIA_URL_FIRMADA_S);
      if (!error) urls[e.id] = data.signedUrl;
      else console.error(`Error al firmar URL de foto del evento ${e.id}:`, error);
    })
  );

  return eventos.map((e) => ({ ...e, photo_url: urls[e.id] || null }));
}

module.exports = { buscarEventoPendiente, guardarFoto, agregarUrlsFirmadas };
