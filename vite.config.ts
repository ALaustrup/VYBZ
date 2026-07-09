import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

// VYBZ is a client-side SPA. Kept intentionally minimal so the build stays fast
// and predictable for mobile-first deployment; vendors are split into cacheable
// chunks (see build.rollupOptions) so app updates don't re-download dependencies.
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("react-router") || id.includes("/react/") || id.includes("react-dom")) return "react";
          if (id.includes("lucide-react")) return "icons";
          return "vendor";
        },
      },
    },
  },
  plugins: [
    react(),
    // Installable PWA: Workbox precaches the hashed app shell (offline-capable)
    // and auto-updates in the background.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/apple-touch-icon.png"],
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // Layer Web Push + notificationclick handlers onto the generated SW.
        importScripts: ["push-sw.js"],
        // Apply new deploys immediately for returning users (no stale shell).
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Cache media so avatars, banners, and photos survive going offline.
        // (206/range video responses aren't cached; they stream when online.)
        runtimeCaching: [
          {
            // Public media (avatars, banners, chat images).
            urlPattern:
              /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "veiled-media",
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Signed post media. Keyed by the full signed URL; entries are short-
            // lived (the signature expires), so cap tightly to avoid bloat.
            urlPattern:
              /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/sign\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "veiled-media-signed",
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 6 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: "VYBZ — Find Yours.",
        short_name: "VYBZ",
        description:
          "Find Yours. Match with complementary music creators and exchange samples, stems, and project files.",
        id: "/",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#191c22",
        theme_color: "#191c22",
        categories: ["music", "social"],
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
