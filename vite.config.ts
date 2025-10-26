import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command }) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL; 

  return {
    base: '/',
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        filename: 'service-worker.js',
        workbox: {
          clientsClaim: true,
          skipWaiting: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.origin === location.origin,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'static-assets-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 7,
                },
              },
            },
            {
              // Corrected: Use supabaseUrl for the regex pattern
              urlPattern: new RegExp(`^${supabaseUrl}/rest/v1/incidents`),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'supabase-incidents-api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Corrected: Use supabaseUrl for the regex pattern
              urlPattern: new RegExp(`^${supabaseUrl}/storage/v1/object/public/post_images/`),
              handler: 'CacheFirst',
              options: {
                cacheName: 'supabase-post-images-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
          navigateFallback: 'index.html',
        },
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
      }),
    ],
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
      exclude: [],
    },
  };
});