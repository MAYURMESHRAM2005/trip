import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Fail loudly instead of silently drifting to 5174/5175 — the backend
    // CORS whitelist (FRONTEND_URL) only allows the configured origin.
    strictPort: true,
    // Never let the browser cache dev modules. A cached module that no longer
    // matches its importers throws confusing errors like "does not provide an
    // export named ..." after code changes or a dev-server restart.
    headers: {
      'Cache-Control': 'no-store',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
});
