import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: './',

  resolve: {
    alias: {
      '@shared-styles': resolve(__dirname, 'src/shared-styles')
    }
  },

  server: {
    port: 5173,
    strictPort: true
  },

  build: {
    outDir: 'dist-renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/renderer/index.html'),
        settings: resolve(__dirname, 'src/settings/index.html'),
        'update-dialog': resolve(__dirname, 'src/update-dialog/index.html')
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});
