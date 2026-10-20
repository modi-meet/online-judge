import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // /api/ai is listed first: vite takes the first prefix that matches. the
    // mentor is its own process; the api never proxies to it.
    proxy: {
      '/api/ai': { target: 'http://localhost:4002', changeOrigin: true },
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
