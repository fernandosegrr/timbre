import { motion } from 'motion/react';
import TarjetaPush from '../components/TarjetaPush.jsx';
import TarjetaNumeros from '../components/TarjetaNumeros.jsx';
import TarjetaHistorial from '../components/TarjetaHistorial.jsx';

export default function Dashboard({ onLogout, onUnauthorized }) {
  return (
    <motion.div
      className="panel"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <header className="panel-header">
        <h1>🔔 Timbre</h1>
        <button className="boton-secundario" onClick={onLogout}>Cerrar sesión</button>
      </header>

      <div className="panel-grid">
        <TarjetaPush />
        <TarjetaNumeros onUnauthorized={onUnauthorized} />
        <TarjetaHistorial onUnauthorized={onUnauthorized} />
      </div>
    </motion.div>
  );
}
