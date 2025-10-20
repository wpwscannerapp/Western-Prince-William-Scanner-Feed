import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc'; // Keep swc version
import path from 'path';
import dyadComponentTagger from '@dyad-sh/react-vite-component-tagger';

export default defineConfig({
  plugins: [dyadComponentTagger(), react()],
  root: './', // Ensure root is explicitly set
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
      timeout: 30000, // Added HMR timeout
    },
    watch: {
      usePolling: true, // Force polling to bypass WebSocket file watching issues
      interval: 1000, // Added polling interval
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true, // For debugging
    assetsDir: 'assets', // Ensure assetsDir is set
  },
  optimizeDeps: {
    exclude: [], // No React-related entries
  },
});