/**
 * M9 — VDock playback signal contract (Law 5).
 * Marks whether the dock is playing dry catalog/local audio vs a disclosed simulation.
 * The AudioBus engine itself never applies hidden DSP (see audioBus.ts).
 */

export const DRY_PLAYBACK_VERSION = "m9.dry-playback.1";

export type PlaybackSignalKind = "catalog" | "local" | "ambient" | "simulation";

export type PlaybackSignal = {
  kind: PlaybackSignalKind;
  /** Non-null when the source is not ordinary dry catalog/local audio. */
  disclosure: string | null;
  version: typeof DRY_PLAYBACK_VERSION;
};

export function catalogSignal(): PlaybackSignal {
  return { kind: "catalog", disclosure: null, version: DRY_PLAYBACK_VERSION };
}

export function localSignal(): PlaybackSignal {
  return { kind: "local", disclosure: null, version: DRY_PLAYBACK_VERSION };
}

export function ambientSignal(): PlaybackSignal {
  return {
    kind: "ambient",
    disclosure:
      "Generated ambient pad — synthesised loop, not a catalog master. VDock plays it dry (no hidden EQ/comp).",
    version: DRY_PLAYBACK_VERSION,
  };
}

export function simulationSignal(label: string): PlaybackSignal {
  return {
    kind: "simulation",
    disclosure: `${label} — disclosed simulation. VDock does not apply undisclosed DSP.`,
    version: DRY_PLAYBACK_VERSION,
  };
}

/** Resolve signal for a track; prefer explicit tag, then known ambient id / URL shape. */
export function resolveTrackSignal(track: {
  id: string;
  url: string;
  signal?: PlaybackSignal;
} | null): PlaybackSignal | null {
  if (!track) return null;
  if (track.signal) return track.signal;
  if (track.id === "vybz-ambient-pad") return ambientSignal();
  if (/^(blob:|data:)/i.test(track.url)) return localSignal();
  return catalogSignal();
}
