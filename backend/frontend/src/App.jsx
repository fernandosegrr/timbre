import { useState } from 'react';
import AuroraBackground from './components/AuroraBackground.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { haySesion, cerrarSesion } from './lib/api.js';

export default function App() {
  const [autenticado, setAutenticado] = useState(haySesion());

  function manejarLogout() {
    cerrarSesion();
    setAutenticado(false);
  }

  return (
    <div className="app-shell">
      <AuroraBackground />
      {autenticado ? (
        <Dashboard onLogout={manejarLogout} onUnauthorized={manejarLogout} />
      ) : (
        <Login onSuccess={() => setAutenticado(true)} />
      )}
    </div>
  );
}
