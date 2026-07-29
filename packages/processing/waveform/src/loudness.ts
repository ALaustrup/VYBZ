import { dbFromLinear, type DecodedPcm } from "./pcm";
import type { LoudnessMetrics } from "./types";

/**
 * Portable loudness estimate: peak + RMS + windowed gated mean (LUFS-like).
 * Deterministic; not a certified meter.
 */
export function computeLoudness(pcm: DecodedPcm, windowSeconds = 0.4): LoudnessMetrics {
  const { samples, sampleRate } = pcm;
  if (samples.length === 0) {
    return { peakDbfs: -120, rmsDbfs: -120, integratedLufsApprox: -70 };
  }

  let peak = 0;
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]!);
    if (a > peak) peak = a;
    sumSq += samples[i]! * samples[i]!;
  }
  const rms = Math.sqrt(sumSq / samples.length);

  const win = Math.max(1, Math.floor(sampleRate * windowSeconds));
  const gated: number[] = [];
  for (let start = 0; start + win <= samples.length; start += win) {
    let wSum = 0;
    for (let i = start; i < start + win; i++) wSum += samples[i]! * samples[i]!;
    const wRms = Math.sqrt(wSum / win);
    const wDb = dbFromLinear(wRms);
    if (wDb > -70) gated.push(wRms * wRms);
  }

  let integrated = rms;
  if (gated.length) {
    const mean = gated.reduce((a, b) => a + b, 0) / gated.length;
    integrated = Math.sqrt(mean);
  }

  // Rough K-weighting-free LUFS approximation: −0.691 + 10*log10(mean square)
  const integratedLufsApprox = integrated <= 1e-12 ? -70 : -0.691 + 10 * Math.log10(integrated * integrated);

  return {
    peakDbfs: dbFromLinear(peak),
    rmsDbfs: dbFromLinear(rms),
    integratedLufsApprox,
  };
}
