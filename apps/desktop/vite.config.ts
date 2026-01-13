import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@clutter/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@clutter/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  // 🔥 Force Vite to invalidate deps when packages change
  // Prevents stale cache issues in monorepo with prebuilt packages
  optimizeDeps: {
    force: process.env.VITE_FORCE === 'true',
    // During deep editor work, set VITE_FORCE=true to disable caching entirely
    disabled: process.env.VITE_FORCE === 'true',
  },
  // Reduce console noise
  clearScreen: false,
  logLevel: 'warn',
  // Tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Tell Vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
