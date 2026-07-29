import type { WaveformPeaks } from "./types";
import type { DecodedPcm } from "./pcm";

/** Downsample absolute peaks into `bucketCount` buckets (0..1). */
export function computePeaks(pcm: DecodedPcm, bucketCount = 800): WaveformPeaks {
  const n = Math.max(1, Math.min(bucketCount, 8192));
  const peaks = new Array<number>(n).fill(0);
  const { samples } = pcm;
  if (samples.length === 0) {
    return {
      peaks,
      bucketCount: n,
      sampleRate: pcm.sampleRate,
      channels: pcm.channels,
      durationSeconds: 0,
    };
  }
  const step = samples.length / n;
  for (let i = 0; i < n; i++) {
    const start = Math.floor(i * step);
    const end = Math.min(samples.length, Math.floor((i + 1) * step));
    let peak = 0;
    for (let j = start; j < end; j++) {
      const a = Math.abs(samples[j]!);
      if (a > peak) peak = a;
    }
    peaks[i] = Math.min(1, peak);
  }
  return {
    peaks,
    bucketCount: n,
    sampleRate: pcm.sampleRate,
    channels: pcm.channels,
    durationSeconds: pcm.durationSeconds,
  };
}
