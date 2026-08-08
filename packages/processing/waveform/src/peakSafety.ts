/**
 * M6 — reversible peak-safety gain (Law 1: measured sample peak only).
 * Scales so absolute peak ≤ ceiling. Not a true-peak limiter / ISP fix.
 * Non-destructive: caller keeps the original buffer.
 */

import { dbFromLinear, snapshotLevels, type LevelSnapshot } from "./correctionLevels";

export const PEAK_SAFETY_VERSION = "m6.peak-safety.1";

/** Default ceiling ≈ −1 dBFS (common export headroom heuristic). */
export const PEAK_SAFETY_CEILING_DBFS = -1;
export const PEAK_SAFETY_CEILING_LINEAR = Math.pow(10, PEAK_SAFETY_CEILING_DBFS / 20);

export type PeakSafetyResult = {
  channels: Float32Array[];
  before: LevelSnapshot;
  after: LevelSnapshot;
  /** Linear gain applied (1 = already under ceiling). */
  gainLinear: number;
  gainDb: number;
  ceilingLinear: number;
  correctionVersion: typeof PEAK_SAFETY_VERSION;
};

/**
 * Apply uniform peak-safety gain across all channels.
 */
export function applyPeakSafety(
  channels: Float32Array[],
  ceilingLinear: number = PEAK_SAFETY_CEILING_LINEAR
): PeakSafetyResult {
  const before = snapshotLevels(channels);
  const peak = before.peakLinear;
  const ceil = Math.max(1e-6, Math.min(1, ceilingLinear));
  const gainLinear = peak > ceil ? ceil / peak : 1;
  const out = channels.map((ch) => {
    const next = new Float32Array(ch.length);
    for (let i = 0; i < ch.length; i++) next[i] = ch[i]! * gainLinear;
    return next;
  });
  return {
    channels: out,
    before,
    after: snapshotLevels(out),
    gainLinear,
    gainDb: dbFromLinear(gainLinear),
    ceilingLinear: ceil,
    correctionVersion: PEAK_SAFETY_VERSION,
  };
}
