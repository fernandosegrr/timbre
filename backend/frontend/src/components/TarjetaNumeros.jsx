import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { obtenerNumeros, agregarNumero, borrarNumero } from '../lib/api.js';

export default function TarjetaNumeros({ onUnauthorized }) {
  const [numeros, setNumeros] = useState(null);
  const [numero, setNumero] = useState('');
  const [etiqueta, setEtiqueta] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    try {
      setNumeros(await obtenerNumeros());
    } catch (err) {
      if (err.noAutorizado) return onUnauthorized();
      setError(err.message);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function manejarAgregar(evento) {
    evento.preventDefault();
    setError('');
    setGuardando(true);
    try {
      await agregarNumero(numero.replace(/[^\d]/g, ''), etiqueta);
      setNumero('');
      setEtiqueta('');
      await cargar();
    } catch (err) {
      if (err.noAutorizado) return onUnauthorized();
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function manejarBorrar(id) {
    try {
      await borrarNumero(id);
      await cargar();
    } catch (err) {
      if (err.noAutorizado) return onUnauthorized();
      setError(err.message);
    }
  }

  return (
    <motion.section
      className="glass-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
    >
      <div className="encabezado-tarjeta">
        <h2>Números de WhatsApp</h2>
        <button className="boton-secundario" onClick={cargar} type="button">Refrescar</button>
      </div>

      <div className="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th>Número</th>
              <th>Etiqueta</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {numeros === null && (
              <tr>
                <td colSpan={3} className="texto-tenue">Cargando…</td>
              </tr>
            )}
            {numeros?.length === 0 && (
              <tr>
                <td colSpan={3} className="texto-tenue">Todavía no hay números.</td>
              </tr>
            )}
            <AnimatePresence>
              {numeros?.map((n) => (
                <motion.tr key={n.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <td>{n.phone_number}</td>
                  <td>{n.label || '—'}</td>
                  <td>
                    <button className="boton-icono" onClick={() => manejarBorrar(n.id)} aria-label="Borrar número">
                      ✕
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <form className="form-inline" onSubmit={manejarAgregar}>
        <input
          placeholder="521XXXXXXXXXX"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          inputMode="numeric"
          required
        />
        <input placeholder="Etiqueta (opcional)" value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} />
        <motion.button
          className="boton-primario"
          type="submit"
          disabled={guardando}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Agregar
        </motion.button>
      </form>
      {error && <p className="mensaje-error">{error}</p>}
    </motion.section>
  );
}
