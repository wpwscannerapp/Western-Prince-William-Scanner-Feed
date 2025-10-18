import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 32100, // Match Dyad proxy
    host: true, // Listen on all network interfaces
    hmr: {
      protocol: 'ws', // Explicit WebSocket
      port: 32100,
      clientPort: 32100, // Ensure client matches
    },
    watch: {
      usePolling: true, // Force polling to bypass WebSocket
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true, // For debugging
  },
  optimizeDeps: {
    exclude: [], // No React-related entries
  },
});