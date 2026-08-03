import { useState } from 'react';
import { motion } from 'motion/react';
import { validarCredenciales } from '../lib/api.js';

export default function Login({ onSuccess }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function manejarSubmit(evento) {
    evento.preventDefault();
    setError('');
    setCargando(true);
    try {
      const ok = await validarCredenciales(usuario, password);
      if (ok) {
        onSuccess();
      } else {
        setError('Usuario o contraseña incorrectos.');
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <motion.div
      className="pantalla-centrada"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <motion.form
        className="glass-card login-card"
        onSubmit={manejarSubmit}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="login-icono">🔔</div>
        <h1>Timbre</h1>
        <p className="subtitulo">Panel de administración</p>

        <label>
          Usuario
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoFocus
            autoComplete="username"
            required
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && (
          <motion.p className="mensaje-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {error}
          </motion.p>
        )}

        <motion.button
          type="submit"
          className="boton-primario"
          disabled={cargando}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {cargando ? 'Entrando…' : 'Entrar'}
        </motion.button>
      </motion.form>
    </motion.div>
  );
}
