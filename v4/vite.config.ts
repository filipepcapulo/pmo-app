import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Publicado no GitHub Pages em /pmo-app/v4/ (V4 paralela; a v3 segue em /pmo-app/v3/).
export default defineConfig({
  base: process.env.V3_BASE || '/pmo-app/v4/',
  plugins: [react()],
  build: { outDir: process.env.V3_SAIDA || 'dist', emptyOutDir: true, sourcemap: false },
  test: { include: ['src/**/*.test.ts'] },
});
