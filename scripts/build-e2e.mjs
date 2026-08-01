/**
 * Production-shaped build WITH Playwright/Lighthouse fixtures enabled.
 *
 * The `/__e2e__/*` routes bypass auth and backend gates, so they are compiled out of
 * ordinary builds. Only this entry point sets VITE_E2E_FIXTURES=on.
 *
 * Never use this to produce an artifact that is deployed anywhere.
 * Typecheck is skipped here because `npm run build` / `npm run lint` already run tsc.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");

if (!existsSync(viteBin)) {
  console.error(`[build:e2e] Vite binary missing at ${viteBin}`);
  process.exit(1);
}

console.log("[build:e2e] building dist/ with VITE_E2E_FIXTURES=on (NOT deployable)");

const result = spawnSync(process.execPath, [viteBin, "build", ...process.argv.slice(2)], {
  cwd: root,
  stdio: "inherit",
  shell: false,
  env: { ...process.env, VITE_E2E_FIXTURES: "on" },
});

if (result.error) {
  console.error("[build:e2e] failed to spawn vite:", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
