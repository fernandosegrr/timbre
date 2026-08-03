'use strict';

async function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.register('/service-worker.js');
}

// Convierte la VAPID public key (base64url) al formato Uint8Array que pide PushManager.
function convertirVapidKey(base64Url) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function activarNotificaciones() {
  const estadoEl = document.getElementById('estado-push');
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      estadoEl.textContent = 'Este navegador no soporta notificaciones push.';
      return;
    }

    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') {
      estadoEl.textContent = 'Permiso de notificaciones no concedido.';
      return;
    }

    const registro = await registrarServiceWorker();
    const { publicKey } = await fetch('/api/push/vapid-public-key').then((r) => r.json());

    if (!publicKey) {
      estadoEl.textContent = 'El servidor todavía no tiene configuradas las llaves VAPID.';
      return;
    }

    const suscripcion = await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertirVapidKey(publicKey),
    });

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(suscripcion),
    });

    estadoEl.textContent = 'Notificaciones activadas en este dispositivo.';
  } catch (err) {
    console.error(err);
    estadoEl.textContent = 'Error activando notificaciones: ' + err.message;
  }
}

async function cargarNumeros() {
  const cuerpo = document.getElementById('tabla-numeros');
  cuerpo.innerHTML = '<tr><td colspan="3">Cargando...</td></tr>';

  const respuesta = await fetch('/api/numbers');
  if (!respuesta.ok) {
    cuerpo.innerHTML = '<tr><td colspan="3">No se pudo cargar (¿sesión no autorizada?)</td></tr>';
    return;
  }

  const { numbers } = await respuesta.json();
  cuerpo.innerHTML = '';
  for (const numero of numbers) {
    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td>${numero.phone_number}</td>
      <td>${numero.label || ''}</td>
      <td><button data-id="${numero.id}" class="borrar-numero">Borrar</button></td>
    `;
    cuerpo.appendChild(fila);
  }

  document.querySelectorAll('.borrar-numero').forEach((boton) => {
    boton.addEventListener('click', async () => {
      await fetch(`/api/numbers/${boton.dataset.id}`, { method: 'DELETE' });
      cargarNumeros();
    });
  });
}

async function agregarNumero(evento) {
  evento.preventDefault();
  const numero = document.getElementById('input-numero').value;
  const etiqueta = document.getElementById('input-etiqueta').value;

  await fetch('/api/numbers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: numero, label: etiqueta }),
  });

  document.getElementById('form-numero').reset();
  cargarNumeros();
}

async function cargarHistorial() {
  const cuerpo = document.getElementById('tabla-historial');
  cuerpo.innerHTML = '<tr><td colspan="2">Cargando...</td></tr>';

  const respuesta = await fetch('/api/history');
  if (!respuesta.ok) {
    cuerpo.innerHTML = '<tr><td colspan="2">No se pudo cargar (¿sesión no autorizada?)</td></tr>';
    return;
  }

  const { events } = await respuesta.json();
  cuerpo.innerHTML = '';
  for (const evento of events) {
    const fila = document.createElement('tr');
    const fecha = new Date(evento.occurred_at).toLocaleString('es-MX');
    fila.innerHTML = `<td>${fecha}</td><td>${evento.device_id}</td>`;
    cuerpo.appendChild(fila);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('boton-activar-push').addEventListener('click', activarNotificaciones);
  document.getElementById('form-numero').addEventListener('submit', agregarNumero);
  document.getElementById('boton-refrescar-historial').addEventListener('click', cargarHistorial);

  registrarServiceWorker();
  cargarNumeros();
  cargarHistorial();
});
