import type { Drop } from "@/types";
import { isPlayableMediaUrl } from "@/lib/audioBus";
import type { MixCandidate } from "./engine";

export function dropToCandidate(d: Drop): MixCandidate | null {
  if (!isPlayableMediaUrl(d.audioUrl)) return null;
  const artist = (d.creditedArtist?.trim() || d.authorUsername?.trim() || "").toLowerCase();
  const duration = d.durationSec;
  const plays = d.plays;
  const bpm = d.bpm;
  return {
    id: d.id,
    artistKey: artist,
    durationSec: duration != null && Number.isFinite(duration) && duration > 0 ? duration : null,
    plays: plays != null && Number.isFinite(plays) && plays >= 0 ? plays : null,
    bpm: bpm != null && Number.isFinite(bpm) && bpm > 0 ? bpm : null,
    kind: d.assetKind ?? null,
  };
}

export function playableDrops(drops: Drop[]): Drop[] {
  return drops.filter((d) => isPlayableMediaUrl(d.audioUrl));
}
