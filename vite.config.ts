import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Using path.resolve for robustness
    },
  },
  server: {
    port: 32100, // Matches Dyad proxy
    host: '0.0.0.0',  // Listen on all network interfaces
    strictPort: true, // Ensure Vite uses this exact port
    hmr: {
      overlay: true, // Keep the error overlay for development
      port: 32100, // Explicitly set HMR port to match server port
      host: '0.0.0.0', // Explicitly set HMR host to listen on all interfaces
      clientPort: 32100, // Ensure client connects to the correct port
      protocol: 'ws', // Explicitly set protocol to WebSocket
      path: '/ws', // Explicitly set WebSocket path
      timeout: 30000, // Increase timeout for HMR connection
    },
    watch: {
      usePolling: true, // Explicitly enable polling for HMR to bypass WebSocket issues
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