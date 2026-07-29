import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@vybz/domain/credits", replacement: path.resolve(__dirname, "./packages/domain/credits/src/index.ts") },
      { find: "@vybz/data/credits", replacement: path.resolve(__dirname, "./packages/data/credits/src/index.ts") },
      { find: "@vybz/domain/releases", replacement: path.resolve(__dirname, "./packages/domain/releases/src/index.ts") },
      { find: "@vybz/data/releases", replacement: path.resolve(__dirname, "./packages/data/releases/src/index.ts") },
      { find: "@vybz/processing/waveform", replacement: path.resolve(__dirname, "./packages/processing/waveform/src/index.ts") },
      { find: "@vybz/processing/readiness/worker", replacement: path.resolve(__dirname, "./packages/processing/readiness/src/worker.ts") },
      { find: "@vybz/processing/readiness", replacement: path.resolve(__dirname, "./packages/processing/readiness/src/index.ts") },
      { find: "@vybz/contracts", replacement: path.resolve(__dirname, "./src/contracts/index.ts") },
      { find: "@vybz/platform", replacement: path.resolve(__dirname, "./src/platform/bridge/index.ts") },
      { find: "@vybz/domain", replacement: path.resolve(__dirname, "./src/domain/index.ts") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}", "packages/**/*.{test,spec}.{ts,tsx}"],
    css: false,
  },
});
