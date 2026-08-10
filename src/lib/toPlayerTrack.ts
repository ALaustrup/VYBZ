import type { PlayerTrack } from "@/lib/audioBus";
import { catalogSignal } from "@/lib/vdock/playbackSignal";
import { qualityLabel } from "@/lib/waveform";
import { paletteFor } from "@/lib/utils";
import type { Drop } from "@/types";

const KIND_FALLBACK: Record<string, string> = {
  sample: "Sample",
  loop: "Loop",
  oneshot: "One-shot",
  stem: "Stem",
  acapella: "Acapella",
  midi: "MIDI",
  preset: "Preset",
  project: "Project",
  track: "Track",
};

/**
 * Map a catalog `Drop` onto the player's track shape. Lives outside any component so
 * both the card and the action menu can use it without an import cycle.
 */
export function toPlayerTrack(d: Drop): PlayerTrack {
  const accent = paletteFor(d.seed)[0];
  const playback = d.playbackCustomization ?? undefined;
  return {
    id: d.id,
    url: d.audioUrl ?? "",
    authorId: d.authorId,
    artistUsername: d.authorUsername ?? undefined,
    earnEligible: true,
    title: d.title?.trim() || KIND_FALLBACK[d.assetKind ?? "track"] || "Untitled",
    artist: d.creditedArtist?.trim() || d.authorUsername || "Creator",
    album: d.album?.trim() || undefined,
    waveform: d.waveform,
    durationSec: d.durationSec,
    quality: qualityLabel(d.audioFormat ?? undefined, d.sampleRate ?? undefined, d.lossless),
    lossless: d.lossless,
    seed: d.seed,
    accent,
    fx: playback?.reactiveStyle ?? d.fx ?? "glow",
    playback,
    signal: catalogSignal(),
  };
}
