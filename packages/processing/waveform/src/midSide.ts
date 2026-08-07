/**
 * Mid/side energy from measured stereo PCM (Law 1).
 * mid = (L+R)/2, side = (L−R)/2; ratio is side RMS − mid RMS (dB).
 */

export type MidSideBalance = {
  midRmsDbfs: number;
  sideRmsDbfs: number;
  /** sideRms − midRms (dB). Typical music is strongly negative. */
  sideToMidDb: number;
};

/** Warn when side approaches mid energy (very wide / phasey). */
export const SIDE_HEAVY_WARN_DB = -6;

function rmsFromSumSq(sumSq: number, n: number): number {
  if (n <= 0) return -120;
  const rms = Math.sqrt(sumSq / n);
  if (rms <= 1e-12) return -120;
  return 20 * Math.log10(rms);
}

export function measureMidSide(channels: Float32Array[]): MidSideBalance | null {
  if (channels.length < 2) return null;
  const left = channels[0]!;
  const right = channels[1]!;
  const n = Math.min(left.length, right.length);
  if (n < 32) return null;

  let midSumSq = 0;
  let sideSumSq = 0;
  for (let i = 0; i < n; i++) {
    const l = left[i]!;
    const r = right[i]!;
    const mid = (l + r) * 0.5;
    const side = (l - r) * 0.5;
    midSumSq += mid * mid;
    sideSumSq += side * side;
  }
  const midRmsDbfs = rmsFromSumSq(midSumSq, n);
  const sideRmsDbfs = rmsFromSumSq(sideSumSq, n);
  return {
    midRmsDbfs,
    sideRmsDbfs,
    sideToMidDb: sideRmsDbfs - midRmsDbfs,
  };
}
