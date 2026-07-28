import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/cms-survey/',   // GitHub Pages serves from this subpath
  server: {
    port: 5173,
  },
});
