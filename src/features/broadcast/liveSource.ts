/**
 * Live source mapping.
 *
 * Production `live_sessions.source` / `input_mode` CHECKs still allow only
 * camera | display | both. DAW ingest is persisted as display plus
 * monetization.ingest = "daw" until an additive migration widens the constraint.
 * Do not insert "daw" into those columns — the row will be rejected.
 */

import type { LiveSource } from "@/types";

export type PersistableLiveSource = "camera" | "display" | "both";

export function persistableLiveSource(source: LiveSource): PersistableLiveSource {
  return source === "daw" ? "display" : source;
}

export function dawIngestPatch(source: LiveSource): Record<string, unknown> {
  return source === "daw" ? { ingest: "daw" } : {};
}

export function resolveLiveSource(
  source: unknown,
  monetization?: Record<string, unknown> | null,
): LiveSource {
  if (source === "daw" || monetization?.ingest === "daw") return "daw";
  if (source === "display" || source === "both" || source === "camera") return source;
  return "camera";
}

export function isMusicSource(source: LiveSource): boolean {
  return source === "display" || source === "both" || source === "daw";
}
