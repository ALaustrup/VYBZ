/**
 * Vibes Radio station beds — served from Vite public/CDN only.
 * Durations measured via ffprobe 2026-08-11 (Law 1).
 */

export type StationBedId = "greeting" | "interstitial";

export type StationBed = {
  id: StationBedId;
  /** Absolute path on the app origin / CDN. Never embedded in edge bundles. */
  path: string;
  title: string;
  artist: string;
  /** Measured duration in seconds. */
  durationSec: number;
  kind: "greeting" | "interstitial";
};

/** Track 1 — You’re what’s next (signed-in greeting only). */
export const STATION_GREETING: StationBed = {
  id: "greeting",
  path: "/audio/1.wav",
  title: "You're what's next",
  artist: "VYBZ",
  durationSec: 9.125,
  kind: "greeting",
};

/** Track 2 — Hear something new (guest + signed-in interstitial). */
export const STATION_INTERSTITIAL: StationBed = {
  id: "interstitial",
  path: "/audio/2.wav",
  title: "Hear something new",
  artist: "VYBZ",
  durationSec: 7.875,
  kind: "interstitial",
};

export const STATION_BEDS = {
  greeting: STATION_GREETING,
  interstitial: STATION_INTERSTITIAL,
} as const;

/** Absolute URL for a station bed on the current origin (or absolute path passthrough). */
export function resolveStationUrl(pathOrUrl: string, origin = typeof window !== "undefined" ? window.location.origin : ""): string {
  if (/^(https?:|blob:|data:)/i.test(pathOrUrl)) return pathOrUrl;
  if (pathOrUrl.startsWith("/")) return origin ? `${origin}${pathOrUrl}` : pathOrUrl;
  return pathOrUrl;
}
