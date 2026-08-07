/**
 * PCM integrity helpers — clipping sample counts and edge silence.
 * Heuristics on measured samples only (Law 1). Not a broadcast standard.
 */

export type ClipIntegrity = {
  /** Samples with |x| ≥ clip threshold. */
  clippedSamples: number;
  /** Longest run of consecutive clipped samples. */
  maxClipRun: number;
  totalSamples: number;
};

export type EdgeSilence = {
  /** Leading silence duration (seconds). */
  leadInSeconds: number;
  /** Trailing silence duration (seconds). */
  leadOutSeconds: number;
};

/** Linear amplitude treated as full-scale clip. */
export const CLIP_LINEAR_THRESHOLD = 0.999;
/** Absolute level treated as silence for edge scans (−60 dBFS ≈ 0.001). */
export const SILENCE_LINEAR_THRESHOLD = 0.001;
/** Warn when clipped sample count exceeds this share of the file. */
export const CLIP_SHARE_WARN = 0.0001;
/** Info when lead-in silence exceeds this many seconds. */
export const SILENCE_LEAD_IN_WARN_SEC = 2;
/** Info when lead-out silence exceeds this many seconds. */
export const SILENCE_LEAD_OUT_WARN_SEC = 3;

export function measureClipIntegrity(channels: Float32Array[]): ClipIntegrity {
  let clippedSamples = 0;
  let maxClipRun = 0;
  let run = 0;
  let totalSamples = 0;
  const n = channels[0]?.length ?? 0;
  for (let i = 0; i < n; i++) {
    let peak = 0;
    for (let c = 0; c < channels.length; c++) {
      const a = Math.abs(channels[c]![i] ?? 0);
      if (a > peak) peak = a;
    }
    totalSamples += 1;
    if (peak >= CLIP_LINEAR_THRESHOLD) {
      clippedSamples += 1;
      run += 1;
      if (run > maxClipRun) maxClipRun = run;
    } else {
      run = 0;
    }
  }
  return { clippedSamples, maxClipRun, totalSamples };
}

export function measureEdgeSilence(
  channels: Float32Array[],
  sampleRate: number
): EdgeSilence | null {
  if (sampleRate <= 0) return null;
  const n = channels[0]?.length ?? 0;
  if (n === 0) return { leadInSeconds: 0, leadOutSeconds: 0 };

  const isSilent = (i: number) => {
    for (let c = 0; c < channels.length; c++) {
      if (Math.abs(channels[c]![i] ?? 0) >= SILENCE_LINEAR_THRESHOLD) return false;
    }
    return true;
  };

  let lead = 0;
  while (lead < n && isSilent(lead)) lead += 1;
  let trail = 0;
  while (trail < n - lead && isSilent(n - 1 - trail)) trail += 1;

  return {
    leadInSeconds: lead / sampleRate,
    leadOutSeconds: trail / sampleRate,
  };
}
