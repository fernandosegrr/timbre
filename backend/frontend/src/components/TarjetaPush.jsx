import { useState } from 'react';
import { motion } from 'motion/react';
import { obtenerVapidPublicKey, suscribirPush } from '../lib/api.js';

// Convierte la VAPID public key (base64url) al Uint8Array que pide PushManager.
function convertirVapidKey(base64Url) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function TarjetaPush() {
  const [estado, setEstado] = useState('inactivo'); // inactivo | activando | activo | error
  const [mensaje, setMensaje] = useState('');

  async function activar() {
    setEstado('activando');
    setMensaje('');
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Este navegador no soporta notificaciones push.');
      }

      const permiso = await Notification.requestPermission();
      if (permiso !== 'granted') throw new Error('Permiso de notificaciones no concedido.');

      const registro = await navigator.serviceWorker.register('/service-worker.js');
      const publicKey = await obtenerVapidPublicKey();
      if (!publicKey) throw new Error('El servidor no tiene configuradas las llaves VAPID todavía.');

      const suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertirVapidKey(publicKey),
      });

      await suscribirPush(suscripcion);
      setEstado('activo');
    } catch (err) {
      setEstado('error');
      setMensaje(err.message);
    }
  }

  return (
    <motion.section
      className="glass-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05, duration: 0.4 }}
    >
      <h2>Notificaciones en este dispositivo</h2>
      <p className="texto-tenue">Recibe un push nativo cada vez que suena el timbre.</p>
      <motion.button
        className="boton-primario"
        onClick={activar}
        disabled={estado === 'activando' || estado === 'activo'}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {estado === 'activo'
          ? '✓ Notificaciones activadas'
          : estado === 'activando'
            ? 'Activando…'
            : 'Activar notificaciones'}
      </motion.button>
      {mensaje && <p className="mensaje-error">{mensaje}</p>}
    </motion.section>
  );
}
