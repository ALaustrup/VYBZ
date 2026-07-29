import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@vybz/contracts": path.resolve(__dirname, "./src/contracts/index.ts"),
      "@vybz/platform": path.resolve(__dirname, "./src/platform/bridge/index.ts"),
      "@vybz/domain": path.resolve(__dirname, "./src/domain/index.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: false,
  },
});
