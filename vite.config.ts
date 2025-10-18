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
    host: true, // Listen on all network interfaces (0.0.0.0)
    hmr: {
      protocol: 'ws', // Explicit WebSocket
      port: 32100, // WebSocket server port
      clientPort: 32100, // Client-facing port for HMR websocket
      // Explicitly set HMR host to the hostname of VITE_APP_URL
      // This ensures the client connects to the public-facing address
      host: new URL(process.env.VITE_APP_URL || 'http://localhost:32100').hostname,
    },
    watch: {
      usePolling: true, // Force polling to bypass WebSocket file watching issues
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