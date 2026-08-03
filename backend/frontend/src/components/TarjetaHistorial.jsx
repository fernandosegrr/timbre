import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { obtenerHistorial } from '../lib/api.js';

export default function TarjetaHistorial({ onUnauthorized }) {
  const [eventos, setEventos] = useState(null);
  const [error, setError] = useState('');

  async function cargar() {
    try {
      setEventos(await obtenerHistorial());
    } catch (err) {
      if (err.noAutorizado) return onUnauthorized();
      setError(err.message);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.section
      className="glass-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.4 }}
    >
      <div className="encabezado-tarjeta">
        <h2>Historial de timbrazos</h2>
        <button className="boton-secundario" onClick={cargar}>Refrescar</button>
      </div>
      <div className="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Dispositivo</th>
              <th>Foto</th>
            </tr>
          </thead>
          <tbody>
            {eventos === null && (
              <tr>
                <td colSpan={3} className="texto-tenue">Cargando…</td>
              </tr>
            )}
            {eventos?.length === 0 && (
              <tr>
                <td colSpan={3} className="texto-tenue">Todavía no suena el timbre.</td>
              </tr>
            )}
            {eventos?.map((e) => (
              <tr key={e.id}>
                <td>{new Date(e.occurred_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}</td>
                <td>{e.device_id}</td>
                <td>
                  {e.photo_url ? (
                    <a href={e.photo_url} target="_blank" rel="noreferrer">
                      <img src={e.photo_url} alt="Foto del timbrazo" className="miniatura-foto" />
                    </a>
                  ) : (
                    <span className="texto-tenue estado-foto">
                      {e.photo_status === 'pendiente' ? 'Esperando…' : 'Sin foto'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p className="mensaje-error">{error}</p>}
    </motion.section>
  );
}
