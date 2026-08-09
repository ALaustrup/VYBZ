/**
 * Stage 1b — live production website-review walker.
 * Read-only: navigate + screenshot + text sample. No uploads/deletes/admin/Stripe.
 * Emits Perception Engine observations into docs/ai-review/ (artifact ≠ build order).
 *
 * Env:
 *   AI_REVIEW_EMAIL, AI_REVIEW_PASSWORD (required)
 *   REVIEW_BASE_URL (default https://vybz.cloud)
 */
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  loadCatalog,
  mergeCatalog,
  mintEdgeId,
  mintObservationId,
  upsertIndex,
  writeRunArtifacts,
} from "./lib/ai-review-writer.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SURFACES = [
  { id: "home", path: "/" },
  { id: "analyzer", path: "/releases" },
  { id: "correct", path: "/tools/correct" },
  { id: "stems", path: "/tools/stems" },
  { id: "library", path: "/library" },
  { id: "codex", path: "/codex" },
  { id: "discover", path: "/discover" },
  { id: "profile", path: "/profile/edit" },
  { id: "settings", path: "/settings/credits" },
  { id: "admin", path: "/admin", expectAdminBounce: true },
];

const ORIGIN = {
  detector: "web.live-walker",
  version: "1.0.0",
  sourceType: "web",
};

function resolveAppSha() {
  const git = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (git.status === 0 && git.stdout.trim()) return git.stdout.trim();
  return "Not measured";
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function truncate(s, n = 240) {
  const t = String(s || "")
    .replace(/\s+/g, " ")
    .trim();
  return t.length <= n ? t : t.slice(0, n) + "…";
}

async function main() {
  const email = process.env.AI_REVIEW_EMAIL;
  const password = process.env.AI_REVIEW_PASSWORD;
  const base = (process.env.REVIEW_BASE_URL || "https://vybz.cloud").replace(/\/$/, "");

  if (!email || !password) {
    console.error(
      "[ai-review:prod] Missing AI_REVIEW_EMAIL or AI_REVIEW_PASSWORD. Fail closed.",
    );
    process.exit(1);
  }

  const appSha = resolveAppSha();
  const date = today();
  const runId = `${date}-prod-live`;
  const sessionId = `prod-${Date.now()}`;
  const context = {
    projectId: "vybz-app",
    artifactId: runId,
    version: appSha,
    sessionId,
  };

  const assetsDir = path.join(root, "docs/ai-review/runs/assets", runId);
  mkdirSync(assetsDir, { recursive: true });

  console.log(`[ai-review:prod] base=${base} run=${runId} sha=${appSha}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const drafts = [];
  const edges = [];

  try {
    await page.goto(`${base}/enter`, { waitUntil: "domcontentloaded", timeout: 60_000 });

    // Best-effort login affordances (production enter / password forms vary)
    const emailSel =
      'input[type="email"], input[name="email"], input[autocomplete="username"]';
    const passSel =
      'input[type="password"], input[name="password"], input[autocomplete="current-password"]';
    await page.waitForSelector(emailSel, { timeout: 30_000 });
    await page.fill(emailSel, email);
    await page.fill(passSel, password);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => null),
      page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Continue")').first().click(),
    ]);

    // Alpha / invite gates may intervene — record and continue if we can reach a surface
    await page.waitForTimeout(1500);

    for (const surface of SURFACES) {
      const url = `${base}${surface.path}`;
      let finalUrl = url;
      let title = "";
      let bodySample = "";
      let screenshotPath = "";
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
        await page.waitForTimeout(800);
        finalUrl = page.url();
        title = await page.title();
        bodySample = truncate(await page.locator("body").innerText().catch(() => ""));
        const shotRel = `assets/${runId}/${surface.id}.png`;
        const shotAbs = path.join(root, "docs/ai-review/runs", shotRel);
        mkdirSync(path.dirname(shotAbs), { recursive: true });
        await page.screenshot({ path: shotAbs, fullPage: false });
        screenshotPath = shotRel;
      } catch (err) {
        bodySample = truncate(`navigation error: ${err?.message || err}`);
      }

      const bounced =
        surface.expectAdminBounce &&
        !finalUrl.includes("/admin");

      drafts.push({
        id: mintObservationId({ surface: surface.id, slug: "live-snapshot" }),
        surface: surface.id,
        category: "chrome",
        severity: surface.expectAdminBounce && !bounced ? "attention" : "info",
        confidence: "high",
        evidence: {
          url: finalUrl,
          screenshotPath: screenshotPath || undefined,
          bodySample,
          note: title ? `title: ${title}` : undefined,
        },
        summary: surface.expectAdminBounce
          ? bounced
            ? `Admin path bounced away from /admin (final ${finalUrl})`
            : `Admin path still on admin-like URL (final ${finalUrl})`
          : `Live snapshot of ${surface.path} → ${finalUrl}`,
        origin: ORIGIN,
      });

      if (surface.id !== "home") {
        edges.push({
          id: mintEdgeId({
            from: mintObservationId({ surface: "home", slug: "live-snapshot" }),
            to: mintObservationId({ surface: surface.id, slug: "live-snapshot" }),
            relation: "relates_to",
          }),
          from: mintObservationId({ surface: "home", slug: "live-snapshot" }),
          to: mintObservationId({ surface: surface.id, slug: "live-snapshot" }),
          relation: "relates_to",
          confidence: "low",
          origin: ORIGIN,
        });
      }
    }
  } finally {
    await browser.close();
  }

  const catalogPath = path.join(root, "docs/ai-review/observations/catalog.json");
  const prior = loadCatalog(catalogPath);
  const { observations, catalog } = mergeCatalog({
    catalog: prior,
    drafts,
    runId,
    appSha,
  });

  const { mdPath, jsonPath } = writeRunArtifacts({
    root,
    runId,
    date,
    appSha,
    context,
    observations,
    edges,
    catalog,
    status: "draft",
  });
  upsertIndex({ root, runId, date, appSha, status: "draft" });

  console.log(`[ai-review:prod] wrote ${mdPath}`);
  console.log(`[ai-review:prod] wrote ${jsonPath}`);
  console.log("[ai-review:prod] updated catalog + INDEX (not auto-committed)");
}

main().catch((err) => {
  console.error("[ai-review:prod] failed:", err);
  process.exit(1);
});
