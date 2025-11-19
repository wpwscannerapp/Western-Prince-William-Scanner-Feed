import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import netlifyPlugin from '@netlify/vite-plugin';

export default defineConfig(({ command, mode }) => {
  // Load environment variables based on the current mode
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  // const supabaseUrl = env.VITE_SUPABASE_URL; // Removed unused variable

  const plugins = [
    react(),
    netlifyPlugin(), // Add the Netlify Vite plugin here
  ];

  // Only include VitePWA plugin in build mode
  if (command === 'build') {
    // Re-enabling VitePWA plugin
    plugins.push(
      VitePWA({
        registerType: 'autoUpdate',
        // Change to injectManifest to use a custom service worker file
        injectManifest: {
          swSrc: 'src/service-worker.ts', // Point to our custom SW file
          // Ensure the manifest is generated and injected
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        },
        // Remove workbox config as its functionality is now integrated into swSrc
        manifest: {
          name: "Western Prince William Scanner Feed",
          short_name: "WPW Scanner",
          description: "Exclusive Scanner Updates for Western Prince William",
          start_url: "/",
          display: "standalone",
          background_color: "#000000",
          theme_color: "#000000",
          icons: [
            {
              src: "/Logo.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: "/Logo.png",
              sizes: "512x512",
              type: "image/png"
            }
          ]
        },
      })
    );
  }

  return {
    base: '/',
    plugins,
    root: './',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: command === 'serve' ? {
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
    } : {},
    build: {
      outDir: 'dist',
      sourcemap: true,
      assetsDir: 'assets',
      rollupOptions: {
        external: [],
      },
    },
    optimizeDeps: {
      // Removed map dependencies
      include: [],
      exclude: [],
    },
  };
});