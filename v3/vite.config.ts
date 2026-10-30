import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Publicado no GitHub Pages em /pmo-app/v3/ (o app 2.x continua na raiz).
export default defineConfig({
  base: process.env.V3_BASE || '/pmo-app/v3/',
  plugins: [react()],
  build: { outDir: process.env.V3_SAIDA || 'dist', emptyOutDir: true, sourcemap: false },
  test: { include: ['src/**/*.test.ts'] },
});
