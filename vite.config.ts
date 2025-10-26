import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa'; // Import VitePWA

export default defineConfig(({ command }) => {
  // Ensure VITE_SUPABASE_URL is available for Workbox configuration
  const supabaseUrl = process.env.VITE_SUPABASE_URL; 

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        workbox: {
          clientsClaim: true,
          skipWaiting: true,
          // Cache static assets
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
          runtimeCaching: [
            {
              // Cache assets served from the same origin (e.g., bundled JS/CSS, public folder images)
              urlPattern: ({ url }) => url.origin === location.origin,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'static-assets-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                },
              },
            },
            {
              // Cache Supabase REST API for incidents (archive data)
              // Using StaleWhileRevalidate for fresh data when online, but instant fallback when offline
              urlPattern: new RegExp(`^${supabaseUrl}/rest/v1/incidents`),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'supabase-incidents-api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24, // 24 hours
                },
                cacheableResponse: {
                  statuses: [0, 200], // Cache successful responses and opaque responses
                },
              },
            },
            {
              // Cache Supabase Storage for post images
              // Using CacheFirst as images are generally immutable once uploaded
              urlPattern: new RegExp(`^${supabaseUrl}/storage/v1/object/public/post_images/`),
              handler: 'CacheFirst',
              options: {
                cacheName: 'supabase-post-images-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200], // Cache successful responses and opaque responses
                },
              },
            },
          ],
        },
        // Embed manifest.json content directly
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