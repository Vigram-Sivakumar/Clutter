import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@clutter/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@clutter/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    open: false,
    hmr: {
      overlay: true,
    },
  },
  optimizeDeps: {
    // IMPORTANT: Exclude workspace packages so they use the alias (source files)
    // instead of being pre-bundled from their dist folder
    exclude: ['@clutter/ui', '@clutter/shared'],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});

