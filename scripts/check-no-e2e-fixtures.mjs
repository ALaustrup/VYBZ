/**
 * Guard: assert that no Playwright/Lighthouse fixture reached the production bundle.
 *
 * The `/__e2e__/*` routes render seeded data and deliberately bypass auth and backend
 * gates. They were live on vybz.cloud until the 2026-07-31 production audit. This check
 * fails the build if they ever come back.
 *
 * Run against a dist/ produced by `npm run build` — NOT by `npm run build:e2e`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

const MARKERS = [
  "__e2e__",
  "mastering-e2e-fixture",
  "cost-sentinel-e2e-fixture",
  "ai-credits-e2e-fixture",
  "collab-e2e-fixture",
  "storefront-orders-fixture",
  "track-actions-fixture",
  "library-fixture",
  "dashboard-fixture",
];

const SCANNED_EXTENSIONS = new Set([".js", ".mjs", ".css", ".html", ".map"]);

/**
 * Static Lighthouse harnesses from `public/` (ADR-025, `scripts/perf-audit.mjs`).
 * They are hand-written markup with no auth bypass, no live data and no app code, and
 * they reuse a fixture test id purely so the perf gate can select an element.
 */
const ALLOWED = new Set(["perf-audit.html", "perf-orders.html"]);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (SCANNED_EXTENSIONS.has(path.extname(entry)) && !ALLOWED.has(entry)) out.push(full);
  }
  return out;
}

try {
  statSync(dist);
} catch {
  console.error("[check:no-fixtures] dist/ not found — run `npm run build` first.");
  process.exit(1);
}

const hits = [];
for (const file of walk(dist)) {
  const contents = readFileSync(file, "utf8");
  for (const marker of MARKERS) {
    if (contents.includes(marker)) {
      hits.push({ file: path.relative(root, file), marker });
    }
  }
}

if (hits.length > 0) {
  console.error("[check:no-fixtures] FAIL — e2e fixtures are present in the production bundle:");
  for (const hit of hits) console.error(`  ${hit.file} → "${hit.marker}"`);
  console.error(
    "\nFixtures must stay behind the VITE_E2E_FIXTURES build flag (src/app/e2eFixtures.tsx).",
  );
  process.exit(1);
}

console.log(`[check:no-fixtures] OK — ${MARKERS.length} markers absent from dist/`);
