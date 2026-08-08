/**
 * M6 — reversible DC offset removal (Law 1: measured mean only).
 * Non-destructive: caller keeps the original buffer; this returns a new planar copy.
 */

import { snapshotLevels, type LevelSnapshot } from "./correctionLevels";

export const CORRECTION_VERSION = "m6.dc-remove.1";

export type { LevelSnapshot };

export type DcRemoveResult = {
  /** Corrected planar channels (new arrays). */
  channels: Float32Array[];
  before: LevelSnapshot;
  after: LevelSnapshot;
  /** Mean subtracted from every channel (same DC for all). */
  removedMean: number;
  correctionVersion: typeof CORRECTION_VERSION;
};

/**
 * Subtract the measured downmix DC mean from every sample in every channel.
 * Deterministic and bypassable (keep the input).
 */
export function removeDcOffset(channels: Float32Array[]): DcRemoveResult {
  if (!channels.length || !(channels[0]?.length)) {
    return {
      channels: channels.map((c) => c.slice()),
      before: snapshotLevels(channels),
      after: snapshotLevels(channels),
      removedMean: 0,
      correctionVersion: CORRECTION_VERSION,
    };
  }
  const before = snapshotLevels(channels);
  const mean = before.dc?.mean ?? 0;
  const out = channels.map((ch) => {
    const next = new Float32Array(ch.length);
    for (let i = 0; i < ch.length; i++) next[i] = ch[i]! - mean;
    return next;
  });
  return {
    channels: out,
    before,
    after: snapshotLevels(out),
    removedMean: mean,
    correctionVersion: CORRECTION_VERSION,
  };
}
