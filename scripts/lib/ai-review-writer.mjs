/**
 * Plain-JS writer for ai-review:prod — mirrors src/perception catalog/ID rules.
 * Keep in sync with perceptionEngineGate tests / docs/perception/SCHEMA.md.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

export function normalizeSegment(raw) {
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/[_\s.]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function mintObservationId({ surface, slug }) {
  const s = normalizeSegment(surface);
  const g = normalizeSegment(slug);
  if (!s || !g) throw new Error("Invalid observation id parts");
  return `${s}.${g}`;
}

export function mintEdgeId({ from, to, relation }) {
  const f = normalizeSegment(String(from).replace(/\./g, "-"));
  const t = normalizeSegment(String(to).replace(/\./g, "-"));
  const r = normalizeSegment(relation);
  return `edge.${f}.${r}.${t}`;
}

export function mergeCatalog({ catalog, drafts, runId, appSha }) {
  const next = { ...catalog };
  const seen = new Set();
  const observations = [];

  for (const draft of drafts) {
    seen.add(draft.id);
    const prev = catalog[draft.id]?.observation;
    let lifecycle = "new";
    if (prev) {
      if (prev.lifecycle === "resolved" || prev.lifecycle === "stale") lifecycle = "regressed";
      else lifecycle = "seen";
    }
    const obs = {
      ...draft,
      lifecycle,
      firstSeenRun: prev?.firstSeenRun ?? runId,
      lastSeenRun: runId,
      appSha: draft.appSha ?? appSha,
    };
    next[draft.id] = { observation: obs };
    observations.push(obs);
  }

  for (const [id, entry] of Object.entries(catalog)) {
    if (seen.has(id)) continue;
    const prev = entry.observation;
    if (prev.lifecycle === "resolved") {
      next[id] = entry;
      continue;
    }
    next[id] = { observation: { ...prev, lifecycle: "stale" } };
  }

  observations.sort((a, b) => a.id.localeCompare(b.id));
  return { observations, catalog: next };
}

export function loadCatalog(catalogPath) {
  if (!existsSync(catalogPath)) return {};
  const raw = readFileSync(catalogPath, "utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

export function writeRunArtifacts({
  root,
  runId,
  date,
  appSha,
  context,
  observations,
  edges,
  catalog,
  status = "draft",
  candidates = [],
  risks = [],
  notes = "",
}) {
  const runsDir = path.join(root, "docs/ai-review/runs");
  const assetsNote = `assets/${runId}/ (gitignored)`;
  mkdirSync(runsDir, { recursive: true });
  mkdirSync(path.join(root, "docs/ai-review/observations"), { recursive: true });

  const surfaces = [...new Set(observations.map((o) => o.surface))];
  const mdPath = path.join(runsDir, `${runId}.md`);
  const jsonPath = path.join(runsDir, `${runId}.observations.json`);
  const catalogPath = path.join(root, "docs/ai-review/observations/catalog.json");

  const obsBlocks = observations
    .map((o) => {
      const ev = o.evidence || {};
      const evLines = [
        ev.url ? `  - url: ${ev.url}` : null,
        ev.screenshotPath ? `  - screenshot: ${ev.screenshotPath}` : null,
        ev.bodySample ? `  - bodySample: ${JSON.stringify(ev.bodySample)}` : null,
        ev.note ? `  - note: ${ev.note}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      return [
        `### \`${o.id}\``,
        "",
        `- surface: ${o.surface}`,
        `- category: ${o.category}`,
        `- severity: ${o.severity}`,
        `- confidence: ${o.confidence}`,
        `- lifecycle: ${o.lifecycle}`,
        `- origin: ${o.origin.detector}@${o.origin.version} (${o.origin.sourceType})`,
        `- summary: ${o.summary}`,
        `- evidence:`,
        evLines || "  - (none)",
      ].join("\n");
    })
    .join("\n\n");

  const edgeBlocks =
    edges.length === 0
      ? "_No edges in this run._"
      : edges.map((e) => `- \`${e.id}\`: ${e.from} —${e.relation}→ ${e.to}`).join("\n");

  const md = `---
id: ${runId}
date: ${date}
app_sha: ${appSha}
status: ${status}
module: website-review
project_id: ${context.projectId}
artifact_id: ${context.artifactId}
session_id: ${context.sessionId}
surfaces_touched: ${JSON.stringify(surfaces)}
---

# Review run: ${runId}

> Observations only. Not implementation instructions. Not authorised work.
> Emitted by Perception Engine module \`website-review\`. Screenshots: ${assetsNote}
${notes ? `>\n> ${notes}\n` : ""}
## Context

- projectId: \`${context.projectId}\`
- artifactId: \`${context.artifactId}\`
- version: \`${context.version}\`
- sessionId: \`${context.sessionId}\`

## Observations

${obsBlocks || "_None._"}

## Perception Graph

${edgeBlocks}

## Candidates (optional ideas — not tasks)

${
  candidates.length
    ? candidates.map((c) => `- ${c}`).join("\n")
    : "- (none)"
}

## Risks

${
  risks.length
    ? risks.map((r) => `- ${r}`).join("\n")
    : "- Credentials must never appear in this file."
}
`;

  writeFileSync(mdPath, md, "utf8");
  writeFileSync(
    jsonPath,
    JSON.stringify({ context, observations, edges }, null, 2) + "\n",
    "utf8",
  );
  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + "\n", "utf8");

  return { mdPath, jsonPath, catalogPath };
}

export function upsertIndex({ root, runId, date, appSha, status, notes = "" }) {
  const indexPath = path.join(root, "docs/ai-review/INDEX.md");
  const header =
    "# AI review runs\n\nChronological index. Each run is an **observation log**, not a work order.\n\n| Date | Id | Status | App SHA | Notes |\n|---|---|---|---|---|\n";
  let body = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : header;

  const noteCell = String(notes || "").replace(/\|/g, "/").slice(0, 80) || "—";
  const row = `| ${date} | [\`${runId}\`](./runs/${runId}.md) | ${status} | \`${appSha}\` | ${noteCell} |`;

  body = body.replace(/\| — \| — \| — \| — \| — \|\r?\n/, "");
  const templateLine = "\nTemplate: [runs/_TEMPLATE.md](./runs/_TEMPLATE.md)\n";
  body = body.replace(/\n*Template: \[runs\/_TEMPLATE\.md\][^\n]*\n?/, "\n");

  if (body.includes(`\`${runId}\``)) {
    body = body.replace(
      new RegExp(`\\| [^|\\n]+ \\| \\[\`${runId}\`\\]\\([^)]+\\) \\|[^\\n]+`),
      row,
    );
  } else {
    if (!body.includes("| Date | Id |")) {
      body = header;
    }
    body = body.trimEnd() + "\n" + row + "\n";
  }
  body = body.trimEnd() + templateLine;
  writeFileSync(indexPath, body.endsWith("\n") ? body : body + "\n", "utf8");
  return indexPath;
}
