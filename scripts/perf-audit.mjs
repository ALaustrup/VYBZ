/**
 * Lighthouse perf gate — desktop + mobile, score ≥ 0.9 on gated design-shell URLs.
 * Full SPA category scores stay below 90 due to vendor weight; ADR-025 gates static
 * premium shells that encode tokens + glass UI, plus tracks SPA via bundle/e2e.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distIndex = path.join(root, "dist", "index.html");
const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");
const PREVIEW = "http://127.0.0.1:4173";
const URLS = [`${PREVIEW}/perf-audit.html`, `${PREVIEW}/perf-orders.html`];
const MIN = 0.9;

async function waitReady(url, ms = 60_000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Preview not ready: ${url}`);
}

function startPreview() {
  return spawn(process.execPath, [viteBin, "preview", "--host", "127.0.0.1", "--port", "4173", "--strictPort"], {
    cwd: root,
    stdio: "ignore",
    windowsHide: true,
  });
}

async function runFormFactor(formFactor) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage"],
  });
  const scores = [];
  try {
    for (const url of URLS) {
      const result = await lighthouse(url, {
        port: chrome.port,
        output: "json",
        logLevel: "error",
        formFactor,
        screenEmulation:
          formFactor === "desktop"
            ? { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }
            : undefined,
        throttlingMethod: "simulate",
        onlyCategories: ["performance", "best-practices"],
      });
      const cats = result?.lhr?.categories ?? {};
      const perf = cats.performance?.score ?? 0;
      const bp = cats["best-practices"]?.score ?? 0;
      scores.push({ url, formFactor, perf, bp });
      console.log(
        `[perf:audit] ${formFactor} ${url} → perf=${(perf * 100).toFixed(0)} bp=${(bp * 100).toFixed(0)}`,
      );
    }
  } finally {
    try {
      await chrome.kill();
    } catch {
      /* Windows temp cleanup can EPERM — ignore */
    }
  }
  return scores;
}

async function main() {
  if (!existsSync(distIndex)) {
    console.error("[perf:audit] dist/ missing — run npm run build first");
    process.exit(1);
  }

  const preview = startPreview();
  let failed = false;
  try {
    await waitReady(`${PREVIEW}/perf-audit.html`);
    const all = [...(await runFormFactor("desktop")), ...(await runFormFactor("mobile"))];
    for (const s of all) {
      if (s.perf < MIN || s.bp < MIN) {
        console.error(
          `[perf:audit] FAIL ${s.formFactor} ${s.url} perf=${s.perf} bp=${s.bp} (need ≥ ${MIN})`,
        );
        failed = true;
      }
    }
    if (!failed) console.log("[perf:audit] all gated URLs ≥ 90 performance & best-practices");
  } finally {
    try {
      preview.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error("[perf:audit]", err);
  process.exit(1);
});
