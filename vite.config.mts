import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const projectRoot = import.meta.dirname;

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: resolve(projectRoot, 'index.html'),
        leetcode: resolve(projectRoot, 'src/scripts/leetcode.ts'),
        background: resolve(projectRoot, 'src/background.ts'),
      },
      output: {
        entryFileNames: 'static/scripts/[name].js',
        chunkFileNames: 'static/scripts/[name]-[hash].js',
        assetFileNames: 'static/media/[name]-[hash][extname]',
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
