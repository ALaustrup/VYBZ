/**
 * M6 kickoff — reversible DC offset removal (Law 1: measured mean only).
 * Non-destructive: caller keeps the original buffer; this returns a new planar copy.
 */

import { measureDcOffset, type DcOffsetResult } from "./monoCompat";

export const CORRECTION_VERSION = "m6.dc-remove.1";

export type LevelSnapshot = {
  peakLinear: number;
  rmsLinear: number;
  peakDbfs: number;
  rmsDbfs: number;
  dc: DcOffsetResult | null;
};

export type DcRemoveResult = {
  /** Corrected planar channels (new arrays). */
  channels: Float32Array[];
  before: LevelSnapshot;
  after: LevelSnapshot;
  /** Mean subtracted from every channel (same DC for all). */
  removedMean: number;
  correctionVersion: typeof CORRECTION_VERSION;
};

function dbFromLinear(x: number): number {
  if (x <= 1e-12) return -120;
  return 20 * Math.log10(x);
}

function snapshotLevels(channels: Float32Array[]): LevelSnapshot {
  const n = channels[0]?.length ?? 0;
  let peak = 0;
  let sumSq = 0;
  let count = 0;
  for (let c = 0; c < channels.length; c++) {
    const ch = channels[c]!;
    for (let i = 0; i < n; i++) {
      const s = ch[i]!;
      const a = Math.abs(s);
      if (a > peak) peak = a;
      sumSq += s * s;
      count++;
    }
  }
  const rms = count > 0 ? Math.sqrt(sumSq / count) : 0;
  return {
    peakLinear: peak,
    rmsLinear: rms,
    peakDbfs: dbFromLinear(peak),
    rmsDbfs: dbFromLinear(rms),
    dc: measureDcOffset(channels),
  };
}

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
