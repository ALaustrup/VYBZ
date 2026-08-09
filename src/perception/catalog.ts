import type { Lifecycle, Observation, ObservationDraft } from "./types";

export interface CatalogEntry {
  observation: Observation;
}

/** id → latest observation */
export type ObservationCatalog = Record<string, CatalogEntry>;

export interface CatalogMergeResult {
  observations: Observation[];
  catalog: ObservationCatalog;
}

function priorLifecycle(prev: Observation | undefined): Lifecycle | undefined {
  return prev?.lifecycle;
}

/**
 * Merge drafts into catalog for a run.
 * - first appearance → new
 * - still present → seen (unless was resolved/stale → regressed)
 * Entries in catalog not seen this run are marked stale (or stay resolved).
 */
export function mergeCatalog(input: {
  catalog: ObservationCatalog;
  drafts: ObservationDraft[];
  runId: string;
  appSha: string;
}): CatalogMergeResult {
  const { runId, appSha } = input;
  const next: ObservationCatalog = { ...input.catalog };
  const seenIds = new Set<string>();
  const observations: Observation[] = [];

  for (const draft of input.drafts) {
    seenIds.add(draft.id);
    const prev = input.catalog[draft.id]?.observation;
    let lifecycle: Lifecycle = "new";
    if (prev) {
      const pl = priorLifecycle(prev);
      if (pl === "resolved" || pl === "stale") lifecycle = "regressed";
      else lifecycle = "seen";
    }
    const obs: Observation = {
      id: draft.id,
      surface: draft.surface,
      category: draft.category,
      severity: draft.severity,
      confidence: draft.confidence,
      evidence: draft.evidence,
      summary: draft.summary,
      origin: draft.origin,
      lifecycle,
      firstSeenRun: prev?.firstSeenRun ?? runId,
      lastSeenRun: runId,
      appSha: draft.appSha ?? appSha,
      entityId: draft.entityId,
    };
    next[draft.id] = { observation: obs };
    observations.push(obs);
  }

  for (const [id, entry] of Object.entries(input.catalog)) {
    if (seenIds.has(id)) continue;
    const prev = entry.observation;
    if (prev.lifecycle === "resolved") {
      next[id] = entry;
      continue;
    }
    next[id] = {
      observation: {
        ...prev,
        lifecycle: "stale",
      },
    };
  }

  observations.sort((a, b) => a.id.localeCompare(b.id));
  return { observations, catalog: next };
}
