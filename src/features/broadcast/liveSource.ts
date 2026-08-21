/**
 * Live source mapping.
 *
 * After migration 0104, `live_sessions.source` / `input_mode` accept `daw`.
 * Until that migration is applied, a check-violation insert falls back to
 * display plus monetization.ingest = "daw" (see startLiveSession).
 * resolveLiveSource still reads the legacy ingest flag.
 *
 * `audio` is a Creator OS host path (mic, no camera). The CHECK still allows
 * camera | display | both | daw, so audio persists as camera + ingest:"audio".
 */

import type { LiveSource } from "@/types";

/** Go Live order: screen/window first, then audio, then the rest. */
export const HOST_SOURCE_TABS: readonly { id: LiveSource; label: string }[] = [
  { id: "display", label: "Screen" },
  { id: "audio", label: "Audio" },
  { id: "camera", label: "Camera" },
  { id: "both", label: "Both" },
  { id: "daw", label: "VLink" },
];

export const LIVE_SOURCES: readonly LiveSource[] = HOST_SOURCE_TABS.map((t) => t.id);

export const DEFAULT_HOST_SOURCE: LiveSource = "display";

export type PersistableLiveSource = "camera" | "display" | "both" | "daw";

export function persistableLiveSource(source: LiveSource): PersistableLiveSource {
  if (source === "audio") return "camera";
  return source;
}

export function sourceIngestPatch(source: LiveSource): Record<string, unknown> {
  if (source === "daw") return { ingest: "daw" };
  if (source === "audio") return { ingest: "audio" };
  return {};
}

/** Extra flag so pre-0104 rows and the check-violation fallback stay readable. */
export function dawIngestPatch(source: LiveSource): Record<string, unknown> {
  return source === "daw" ? sourceIngestPatch(source) : {};
}

export function legacyDawFallback(source: LiveSource): {
  source: "display";
  input_mode: "display";
  monetization: Record<string, unknown>;
} {
  return {
    source: "display",
    input_mode: "display",
    monetization: sourceIngestPatch(source),
  };
}

export function resolveLiveSource(
  source: unknown,
  monetization?: Record<string, unknown> | null,
): LiveSource {
  if (source === "daw" || monetization?.ingest === "daw") return "daw";
  if (source === "audio" || monetization?.ingest === "audio") return "audio";
  if (source === "display" || source === "both" || source === "camera") return source;
  return "camera";
}

export function isMusicSource(source: LiveSource): boolean {
  return source === "display" || source === "both" || source === "daw";
}

export function audioModeForSource(source: LiveSource): "music" | "speech" {
  return isMusicSource(source) ? "music" : "speech";
}

export type LivekitPublishKind = "camera" | "microphone" | "screen_share" | "screen_share_audio";

/** Map a local track onto the LiveKit source the SFU expects. */
export function livekitPublishSourceKind(
  trackKind: string,
  hostSource?: LiveSource,
): LivekitPublishKind {
  if (trackKind === "video") {
    return hostSource === "display" || hostSource === "both" ? "screen_share" : "camera";
  }
  return hostSource === "display" ? "screen_share_audio" : "microphone";
}

export function isCheckViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "23514") return true;
  const msg = (error.message ?? "").toLowerCase();
  return msg.includes("live_sessions_source_check") || msg.includes("live_sessions_input_mode_check");
}
