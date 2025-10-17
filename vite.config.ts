import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc"; // Using the SWC variant of the React plugin
import path from "path";

export default defineConfig({
  root: '.',
  publicDir: 'public',
  envDir: process.cwd(),
  server: {
    host: true, // Allow external access
    strictPort: true,
    port: 32100, // Keep port 32100 to match Dyad proxy
    hmr: {
      overlay: true,
      clientPort: 32100,
    },
  },
  plugins: [react()], // Let the React plugin handle JSX runtime automatically
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: '/',
  build: {
    outDir: 'dist', // Explicitly set output directory
    sourcemap: true, // Enable sourcemaps for debugging
    // Removed rollupOptions for manualChunks to simplify configuration
    // Vite will handle chunking by default, or it can be re-added if specific needs arise.
  },
  optimizeDeps: {
    // Removed explicit includes for Radix UI components, react-color, react-query, sonner.
    // Vite's dependency pre-bundling should handle these automatically.
    // If issues arise, specific dependencies can be re-added to 'include'.
    exclude: [], // Keep exclude empty unless specific conflicts are identified
  },
  // Removed css.preprocessorOptions as it's not needed for this project
});