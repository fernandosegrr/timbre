'use strict';

const CLAVE_AUTH = 'timbre_admin_auth';

function headerAuth() {
  const guardado = localStorage.getItem(CLAVE_AUTH);
  return guardado ? { Authorization: `Basic ${guardado}` } : {};
}

export function haySesion() {
  return Boolean(localStorage.getItem(CLAVE_AUTH));
}

export function cerrarSesion() {
  localStorage.removeItem(CLAVE_AUTH);
}

// Valida usuario/password contra el backend (HTTP Basic Auth) y, si son
// correctos, los guarda en localStorage para adjuntarlos en cada petición
// posterior. A propósito NO usa sessionStorage: en un PWA/celular el
// sistema operativo descarga la app en segundo plano todo el tiempo, y
// sessionStorage se pierde con eso, cerrando la sesión sin avisar.
// localStorage sobrevive hasta que se llame a cerrarSesion() explícitamente.
export async function validarCredenciales(usuario, password) {
  const auth = btoa(`${usuario}:${password}`);
  const respuesta = await fetch('/api/auth/check', {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (respuesta.ok) {
    localStorage.setItem(CLAVE_AUTH, auth);
    return true;
  }
  return false;
}

async function peticionProtegida(ruta, opciones = {}) {
  const respuesta = await fetch(ruta, {
    ...opciones,
    headers: {
      ...headerAuth(),
      ...(opciones.body ? { 'Content-Type': 'application/json' } : {}),
      ...opciones.headers,
    },
  });

  if (respuesta.status === 401) {
    cerrarSesion();
    const error = new Error('Sesión no autorizada.');
    error.noAutorizado = true;
    throw error;
  }

  return respuesta;
}

export async function obtenerNumeros() {
  const r = await peticionProtegida('/api/numbers');
  if (!r.ok) throw new Error('No se pudieron cargar los números.');
  return (await r.json()).numbers;
}

export async function agregarNumero(phoneNumber, label) {
  const r = await peticionProtegida('/api/numbers', {
    method: 'POST',
    body: JSON.stringify({ phone_number: phoneNumber, label }),
  });
  if (!r.ok) throw new Error('No se pudo agregar el número (¿ya existe?).');
  return (await r.json()).number;
}

export async function borrarNumero(id) {
  const r = await peticionProtegida(`/api/numbers/${id}`, { method: 'DELETE' });
  if (!r.ok && r.status !== 204) throw new Error('No se pudo borrar el número.');
}

export async function obtenerHistorial() {
  const r = await peticionProtegida('/api/history');
  if (!r.ok) throw new Error('No se pudo cargar el historial.');
  return (await r.json()).events;
}

// Suscripción push es autoservicio: no requiere sesión de admin.
export async function obtenerVapidPublicKey() {
  const r = await fetch('/api/push/vapid-public-key');
  return (await r.json()).publicKey;
}

export async function suscribirPush(suscripcion) {
  const r = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(suscripcion),
  });
  if (!r.ok) throw new Error('No se pudo activar la notificación push.');
}
