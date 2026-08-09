/**
 * Ingest agent (Grok) review output into SCHEMA run artifacts + catalog.
 *
 * Usage:
 *   npm run ai-review:ingest -- --file docs/ai-review/inbox/foo.input.json
 *   npm run ai-review:ingest -- --file path/to/grok-paste.txt
 *   type paste.txt | npm run ai-review:ingest -- --stdin --run-id 2026-08-09-prod-grok-unauth
 *
 * Accepts:
 *   - JSON envelope { runId, observations[], context?, ... }
 *   - Grok prose blocks: id: / origin: / evidence: url: / bodySample:
 *
 * Does NOT auto-commit. status defaults to draft. artifact ≠ build order.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadCatalog,
  mergeCatalog,
  upsertIndex,
  writeRunArtifacts,
} from "./lib/ai-review-writer.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function surfaceFromId(id) {
  const i = String(id).indexOf(".");
  return i === -1 ? "unknown" : String(id).slice(0, i);
}

function categoryFromId(id) {
  const parts = String(id).split(".");
  if (parts.length < 2) return "chrome";
  const slug = parts.slice(1).join(".");
  if (slug.includes("fallback") || slug.includes("bounce") || slug.includes("gate")) {
    return "gate";
  }
  if (slug.includes("cta") || slug.includes("copy")) return "copy";
  if (slug.includes("dropzone") || slug.includes("empty")) return "empty-state";
  return "chrome";
}

/** Parse Grok-style prose into observation drafts. */
export function parseGrokProse(text) {
  const blocks = text.split(/(?=^id:\s*)/m).map((b) => b.trim()).filter(Boolean);
  const observations = [];

  for (const block of blocks) {
    if (!/^id:\s*/m.test(block)) continue;
    const idMatch = /^id:\s*(\S+)/m.exec(block);
    if (!idMatch) continue;
    const id = idMatch[1].trim();

    let origin = {
      detector: "grok.ui-review",
      version: "1.0.0",
      sourceType: "web",
    };
    const originLine = /origin:\s*(\{[\s\S]*?\})/m.exec(block);
    if (originLine) {
      try {
        const cleaned = originLine[1]
          .replace(/(\w+)\s*:/g, '"$1":')
          .replace(/'/g, '"');
        origin = { ...origin, ...JSON.parse(cleaned) };
      } catch {
        /* keep default */
      }
    }

    const url = /^\s*url:\s*(.+)$/m.exec(block)?.[1]?.trim();
    const bodySample = /^\s*bodySample:\s*([\s\S]+?)(?=\n\s*id:|\n*$)/m.exec(block)?.[1]
      ?.trim()
      ?.replace(/\n+$/, "");

    const summary =
      bodySample?.split(/[.!?]/)[0]?.trim().slice(0, 160) ||
      `Observation ${id}`;

    observations.push({
      id,
      surface: surfaceFromId(id),
      category: categoryFromId(id),
      severity: id.includes("fallback") || id.includes("bounce") ? "notice" : "info",
      confidence: "high",
      summary,
      origin,
      evidence: {
        ...(url ? { url } : {}),
        ...(bodySample ? { bodySample: bodySample.slice(0, 500) } : {}),
      },
    });
  }

  return observations;
}

function readInput() {
  if (hasFlag("--stdin")) {
    return { kind: "auto", text: readFileSync(0, "utf8") };
  }
  const file = argValue("--file");
  if (!file) {
    console.error(
      "[ai-review:ingest] Usage: --file <path.json|.txt> or --stdin --run-id <id>",
    );
    process.exit(1);
  }
  const abs = path.isAbsolute(file) ? file : path.join(root, file);
  if (!existsSync(abs)) {
    console.error(`[ai-review:ingest] File not found: ${abs}`);
    process.exit(1);
  }
  const text = readFileSync(abs, "utf8");
  if (abs.endsWith(".json")) {
    return { kind: "json", data: JSON.parse(text) };
  }
  return { kind: "prose", text };
}

function normalizeEnvelope(raw) {
  let data;
  if (raw.kind === "json") {
    data = raw.data;
  } else {
    const observations = parseGrokProse(raw.text);
    if (observations.length === 0) {
      console.error("[ai-review:ingest] No observations parsed from prose.");
      process.exit(1);
    }
    const runId =
      argValue("--run-id") ||
      `${new Date().toISOString().slice(0, 10)}-prod-grok-ingest`;
    data = {
      runId,
      date: runId.slice(0, 10),
      appSha: argValue("--app-sha") || "Not measured",
      status: "draft",
      context: {
        projectId: "vybz-app",
        artifactId: runId,
        version: "Not measured",
        sessionId: `ingest-${Date.now()}`,
      },
      observations,
      edges: [],
      candidates: [],
      risks: ["Ingested from agent prose — verify evidence before accepting for planning."],
      notes: "Ingested via ai-review:ingest",
    };
  }

  const runId = data.runId || argValue("--run-id");
  if (!runId) {
    console.error("[ai-review:ingest] runId required in JSON or via --run-id");
    process.exit(1);
  }

  return {
    runId,
    date: data.date || runId.slice(0, 10),
    appSha: data.appSha || "Not measured",
    status: data.status || "draft",
    notes: data.notes || "",
    context: data.context || {
      projectId: "vybz-app",
      artifactId: runId,
      version: data.appSha || "Not measured",
      sessionId: `ingest-${Date.now()}`,
    },
    drafts: data.observations || [],
    edges: data.edges || [],
    candidates: data.candidates || [],
    risks: data.risks || [],
  };
}

function main() {
  const envelope = normalizeEnvelope(readInput());
  const catalogPath = path.join(root, "docs/ai-review/observations/catalog.json");
  const prior = loadCatalog(catalogPath);
  const { observations, catalog } = mergeCatalog({
    catalog: prior,
    drafts: envelope.drafts,
    runId: envelope.runId,
    appSha: envelope.appSha,
  });

  const { mdPath, jsonPath } = writeRunArtifacts({
    root,
    runId: envelope.runId,
    date: envelope.date,
    appSha: envelope.appSha,
    context: envelope.context,
    observations,
    edges: envelope.edges,
    catalog,
    status: envelope.status,
    candidates: envelope.candidates,
    risks: envelope.risks,
    notes: envelope.notes,
  });
  upsertIndex({
    root,
    runId: envelope.runId,
    date: envelope.date,
    appSha: envelope.appSha,
    status: envelope.status,
    notes: envelope.notes,
  });

  console.log(`[ai-review:ingest] wrote ${mdPath}`);
  console.log(`[ai-review:ingest] wrote ${jsonPath}`);
  console.log("[ai-review:ingest] updated catalog + INDEX (not auto-committed)");
  console.log(`[ai-review:ingest] ${observations.length} observations · status=${envelope.status}`);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main();
}