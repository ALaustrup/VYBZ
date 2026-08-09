import { mintEdgeId } from "./ids";
import type { PerceptionEdge, PerceptionEdgeDraft } from "./types";

/** Perception Graph — typed relationships between observation (and later entity) IDs. */
export interface PerceptionGraph {
  edges: PerceptionEdge[];
}

export function emptyGraph(): PerceptionGraph {
  return { edges: [] };
}

export function normalizeEdge(draft: PerceptionEdgeDraft): PerceptionEdge {
  const id =
    draft.id ??
    mintEdgeId({ from: draft.from, to: draft.to, relation: draft.relation });
  return {
    id,
    from: draft.from,
    to: draft.to,
    relation: draft.relation,
    confidence: draft.confidence,
    origin: draft.origin,
  };
}

/**
 * Additive merge by edge id. Later edges with the same id replace earlier ones
 * (same detector re-asserting). Context scoping is the caller's responsibility.
 */
export function mergeGraphs(
  base: PerceptionGraph,
  incoming: PerceptionEdgeDraft[],
): PerceptionGraph {
  const map = new Map<string, PerceptionEdge>();
  for (const e of base.edges) map.set(e.id, e);
  for (const d of incoming) {
    const e = normalizeEdge(d);
    map.set(e.id, e);
  }
  return { edges: [...map.values()].sort((a, b) => a.id.localeCompare(b.id)) };
}

export function edgesFromTo(
  graph: PerceptionGraph,
  from: string,
  relation?: string,
): PerceptionEdge[] {
  return graph.edges.filter(
    (e) => e.from === from && (relation === undefined || e.relation === relation),
  );
}
