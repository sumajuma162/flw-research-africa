import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath, URL } from 'node:url';

// `npm run build` produces a normal multi-file build for deployment behind Nginx.
// `npm run build:demo` produces one self-contained HTML file (used for the shareable live demo).
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), ...(mode === 'demo' ? [viteSingleFile()] : [])],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    outDir: mode === 'demo' ? 'dist-demo' : 'dist',
    assetsInlineLimit: mode === 'demo' ? 100_000_000 : 4096,
    chunkSizeWarningLimit: 1500,
  },
  server: { port: 5173 },
}));
