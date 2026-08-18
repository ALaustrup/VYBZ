/**
 * Live source mapping.
 *
 * After migration 0104, `live_sessions.source` / `input_mode` accept `daw`.
 * Until that migration is applied, a check-violation insert falls back to
 * display plus monetization.ingest = "daw" (see startLiveSession).
 * resolveLiveSource still reads the legacy ingest flag.
 */

import type { LiveSource } from "@/types";

export const LIVE_SOURCES: readonly LiveSource[] = ["camera", "display", "both", "daw"];

export function persistableLiveSource(source: LiveSource): LiveSource {
  return source;
}

/** Extra flag so pre-0104 rows and the check-violation fallback stay readable. */
export function dawIngestPatch(source: LiveSource): Record<string, unknown> {
  return source === "daw" ? { ingest: "daw" } : {};
}

export function legacyDawFallback(source: LiveSource): {
  source: "display";
  input_mode: "display";
  monetization: Record<string, unknown>;
} {
  return {
    source: "display",
    input_mode: "display",
    monetization: dawIngestPatch(source),
  };
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

export function isCheckViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "23514") return true;
  const msg = (error.message ?? "").toLowerCase();
  return msg.includes("live_sessions_source_check") || msg.includes("live_sessions_input_mode_check");
}
