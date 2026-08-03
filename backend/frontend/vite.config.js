import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El build queda en ../public (backend/public), que es la carpeta que
// Express ya sirve como estática. Así src/index.js no necesita cambios.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../public',
    emptyOutDir: true,
  },
});
