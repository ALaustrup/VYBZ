/**
 * Pearson correlation of left/right PCM (−1…+1).
 * Returns null when fewer than two channels or insufficient samples.
 * Heuristic stereo integrity — not a width meter in LU.
 */
export function measureStereoCorrelation(channels: Float32Array[]): number | null {
  if (channels.length < 2) return null;
  const left = channels[0]!;
  const right = channels[1]!;
  const n = Math.min(left.length, right.length);
  if (n < 32) return null;

  let sumL = 0;
  let sumR = 0;
  for (let i = 0; i < n; i++) {
    sumL += left[i]!;
    sumR += right[i]!;
  }
  const meanL = sumL / n;
  const meanR = sumR / n;

  let num = 0;
  let denL = 0;
  let denR = 0;
  for (let i = 0; i < n; i++) {
    const dL = left[i]! - meanL;
    const dR = right[i]! - meanR;
    num += dL * dR;
    denL += dL * dL;
    denR += dR * dR;
  }
  const den = Math.sqrt(denL * denR);
  if (den <= 1e-20) return 1; // identical silence / DC → treat as fully correlated
  return Math.max(-1, Math.min(1, num / den));
}

/** Near-mono when correlation exceeds this. */
export const STEREO_NARROW_THRESHOLD = 0.95;
/** Polarity / side cancellation risk below this. */
export const STEREO_OUT_OF_PHASE_THRESHOLD = -0.3;
