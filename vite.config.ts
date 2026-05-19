import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import electronRenderer from 'vite-plugin-electron-renderer';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, 'src/renderer'),
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  },
  plugins: [
    electronRenderer(),
    nodePolyfills({
      include: ['crypto'], // polyfill only crypto
      globals: { Buffer: true, global: true, process: true },
    }),
  ]

});