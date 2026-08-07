/**
 * Three-band spectral balance from a half-spectrum magnitude snapshot.
 * Band edges: low &lt; 250 Hz, mid 250–4000 Hz, high &gt; 4000 Hz.
 * Shares are power-weighted (mag²). Heuristic — not an EQ curve guarantee.
 */

export type SpectralBalance = {
  lowShare: number;
  midShare: number;
  highShare: number;
  fftSize: number;
  sampleRate: number;
};

export const SPECTRAL_LOW_HZ = 250;
export const SPECTRAL_HIGH_HZ = 4000;
/** Bass-heavy when low band power share exceeds this. */
export const SPECTRAL_BASS_HEAVY_SHARE = 0.55;
/** Bright when high band power share exceeds this. */
export const SPECTRAL_BRIGHT_SHARE = 0.45;
/** Thin when low+mid share falls below this. */
export const SPECTRAL_THIN_LOW_MID_SHARE = 0.35;

export function measureSpectralBalance(
  magnitudes: number[],
  fftSize: number,
  sampleRate: number
): SpectralBalance | null {
  if (!magnitudes.length || fftSize < 2 || sampleRate <= 0) return null;
  const binHz = sampleRate / fftSize;
  let low = 0;
  let mid = 0;
  let high = 0;
  for (let i = 0; i < magnitudes.length; i++) {
    const hz = i * binHz;
    const p = magnitudes[i]! * magnitudes[i]!;
    if (hz < SPECTRAL_LOW_HZ) low += p;
    else if (hz <= SPECTRAL_HIGH_HZ) mid += p;
    else high += p;
  }
  const total = low + mid + high;
  if (total <= 1e-20) {
    return { lowShare: 0, midShare: 0, highShare: 0, fftSize, sampleRate };
  }
  return {
    lowShare: low / total,
    midShare: mid / total,
    highShare: high / total,
    fftSize,
    sampleRate,
  };
}
