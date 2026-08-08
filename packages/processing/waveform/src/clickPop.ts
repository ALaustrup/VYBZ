/**
 * Click/pop heuristic from time-domain PCM (Law 1 — measured samples only).
 * Flags short impulsive sample-to-sample jumps that stand above the local
 * RMS envelope. Not a broadcast click detector — labelled as a VYBZ heuristic.
 */

export type ClickPopResult = {
  /** Distinct impulsive events after refractory merging. */
  count: number;
  /** Largest jump vs local RMS, dB (20·log10). */
  peakProminenceDb: number;
};

/** Warn when at least this many distinct clicks are measured. */
export const CLICK_POP_COUNT_WARN = 1;

/** Warn when the strongest click stands this many dB above local RMS. */
export const CLICK_POP_PROMINENCE_WARN_DB = 20;

/**
 * Measure impulsive click/pop candidates on a mono (or downmixed) PCM buffer.
 */
export function measureClickPop(
  samples: Float32Array,
  sampleRate: number
): ClickPopResult | null {
  if (samples.length < 2048 || sampleRate < 8000) return null;

  const win = Math.max(32, Math.floor(sampleRate * 0.005));
  const refractory = Math.max(8, Math.floor(sampleRate * 0.002));
  const minJump = 0.06;
  const ratioFloor = 8; // ≈ 18 dB

  const hist = new Float32Array(win);
  let histLen = 0;
  let histWrite = 0;
  let sumSq = 0;
  let count = 0;
  let peakProminenceDb = 0;
  let nextAllowed = 0;

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1]!;
    if (histLen === win) {
      sumSq -= hist[histWrite]!;
    } else {
      histLen++;
    }
    hist[histWrite] = prev * prev;
    sumSq += hist[histWrite]!;
    if (sumSq < 0) sumSq = 0;
    histWrite = (histWrite + 1) % win;

    const jump = Math.abs(samples[i]! - prev);
    if (jump < minJump || i < nextAllowed) continue;

    const localRms = Math.sqrt(Math.max(sumSq / histLen, 1e-12));
    const ratio = jump / localRms;
    if (ratio < ratioFloor) continue;

    const prominenceDb = 20 * Math.log10(ratio);
    count++;
    if (prominenceDb > peakProminenceDb) peakProminenceDb = prominenceDb;
    nextAllowed = i + refractory;
  }

  return { count, peakProminenceDb };
}
