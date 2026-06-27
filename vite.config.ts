import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

// MYVYB is a client-side SPA. We keep the config intentionally minimal so the
// build stays fast and predictable for mobile-first deployment.
export default defineConfig({
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
        name: "MYVYB — secrets, beautifully hidden",
        short_name: "MYVYB",
        description:
          "Anonymous veiled confessions. Swipe through secrets, unveil, and connect.",
        id: "/",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#050307",
        theme_color: "#050307",
        categories: ["social", "lifestyle"],
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
