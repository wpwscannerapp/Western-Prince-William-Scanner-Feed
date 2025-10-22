import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig(({ command }) => {
  return {
    plugins: [react()],
    root: './',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: command === 'serve' ? { // Apply server config only for 'serve' command
      port: 32100,
      host: true,
      hmr: {
        protocol: 'ws',
        port: 32100,
        clientPort: 32100,
        host: new URL(process.env.VITE_APP_URL || 'http://localhost:32100').hostname,
        timeout: 30000,
      },
      watch: {
        usePolling: true,
        interval: 1000,
      },
    } : {}, // Empty object for other commands (like 'build')
    build: {
      outDir: 'dist',
      sourcemap: true,
      assetsDir: 'assets',
      rollupOptions: {
        external: [],
      },
    },
    optimizeDeps: {
      exclude: [],
    },
  };
});