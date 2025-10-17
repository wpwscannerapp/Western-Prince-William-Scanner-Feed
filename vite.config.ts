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
    host: true,  // Allows external access
    strictPort: true, // Ensure Vite uses this exact port
    hmr: {
      // clientPort: 32100, // Removed to let Vite infer automatically
      overlay: true, // Keep the error overlay for development
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