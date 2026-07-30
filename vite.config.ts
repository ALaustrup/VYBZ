import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";
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
          // Heavy audio→MIDI ML deps: isolated so they load ONLY on demand
          // (dynamic import in lib/audioToMidi), never in the main app shell.
          if (id.includes("@tensorflow") || id.includes("@spotify/basic-pitch") || id.includes("@tonejs/midi")) return "audio-midi";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("lucide-react")) return "icons";
          // Keep react / react-dom / scheduler / react-router in the shared
          // vendor chunk together. Splitting them (especially parking
          // `scheduler` alone) crashes React 18 with
          // `Cannot set properties of undefined (setting 'unstable_now')`
          // → blank dark screen on vybz.cloud.
          return "vendor";
        },
      },
    },
  },
  plugins: [
    react(),
    ...(process.env.ANALYZE === "1"
      ? [
          visualizer({
            filename: "dist/stats.html",
            open: false,
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : []),
    // Installable PWA: Workbox precaches the hashed app shell (offline-capable)
    // and auto-updates in the background.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "favicon.svg",
        "favicon-64.png",
        "og.png",
        "icons/apple-touch-icon.png",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/maskable-512.png",
      ],
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // Don't precache the heavy on-demand audio→MIDI (TensorFlow.js) chunk or model.
        globIgnores: ["**/audio-midi-*.js", "**/models/**"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
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
              cacheName: "vybz-media",
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
              cacheName: "vybz-media-signed",
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
          "Tip + live + catalog for indie artists. Upload, stream on VDock, tip with Vc, go live. Real identity. No ads.",
        id: "/",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#0a0c12",
        theme_color: "#0a0c12",
        lang: "en",
        categories: ["music", "entertainment", "social"],
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
    alias: [
      {
        find: "@vybz/domain/collab",
        replacement: fileURLToPath(new URL("./packages/domain/collab/src/index.ts", import.meta.url)),
      },
      {
        find: "@vybz/domain/credits",
        replacement: fileURLToPath(new URL("./packages/domain/credits/src/index.ts", import.meta.url)),
      },
      {
        find: "@vybz/data/credits",
        replacement: fileURLToPath(new URL("./packages/data/credits/src/index.ts", import.meta.url)),
      },
      {
        find: "@vybz/domain/releases",
        replacement: fileURLToPath(new URL("./packages/domain/releases/src/index.ts", import.meta.url)),
      },
      {
        find: "@vybz/data/releases",
        replacement: fileURLToPath(new URL("./packages/data/releases/src/index.ts", import.meta.url)),
      },
      {
        find: "@vybz/processing/waveform",
        replacement: fileURLToPath(new URL("./packages/processing/waveform/src/index.ts", import.meta.url)),
      },
      {
        find: "@vybz/processing/mastering",
        replacement: fileURLToPath(new URL("./packages/processing/mastering/src/index.ts", import.meta.url)),
      },
      {
        find: "@vybz/processing/metadata",
        replacement: fileURLToPath(new URL("./packages/processing/metadata/src/index.ts", import.meta.url)),
      },
      {
        find: "@vybz/processing/readiness/worker",
        replacement: fileURLToPath(new URL("./packages/processing/readiness/src/worker.ts", import.meta.url)),
      },
      {
        find: "@vybz/processing/readiness",
        replacement: fileURLToPath(new URL("./packages/processing/readiness/src/index.ts", import.meta.url)),
      },
      {
        find: "@vybz/contracts",
        replacement: fileURLToPath(new URL("./src/contracts/index.ts", import.meta.url)),
      },
      {
        find: "@vybz/platform",
        replacement: fileURLToPath(new URL("./src/platform/bridge/index.ts", import.meta.url)),
      },
      {
        find: "@vybz/domain",
        replacement: fileURLToPath(new URL("./src/domain/index.ts", import.meta.url)),
      },
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
    ],
  },
  server: {
    host: true,
    port: 5173,
    // Masters are encode-only; watching them crashes Vite (EBUSY on large MP4s).
    watch: {
      ignored: ["**/Vizualz/**", "**/vizualz/**"],
    },
  },
});
