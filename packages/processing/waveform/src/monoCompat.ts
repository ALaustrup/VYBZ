/**
 * DC offset and mono fold-down compatibility from measured PCM (Law 1).
 * Heuristics only — not a broadcast standard.
 */

export type DcOffsetResult = {
  /** Mean sample value of the downmix (−1…+1). */
  mean: number;
  /** Absolute mean as dBFS-like: 20*log10(|mean|) when mean ≠ 0. */
  meanAbsDbfs: number;
};

export type MonoCompatResult = {
  /** Stereo (or multi) RMS of downmix vs mean of per-channel RMS — simplified: */
  stereoRms: number;
  monoRms: number;
  /** Mono RMS − stereo RMS in dB (negative = mono quieter / cancellation). */
  monoLossDb: number;
};

/** Warn when |DC mean| exceeds this linear amplitude (~−40 dBFS). */
export const DC_OFFSET_LINEAR_WARN = 0.01;
/** Warn when mono fold-down is this many dB quieter than stereo RMS. */
export const MONO_LOSS_WARN_DB = -6;

function dbFromLinear(x: number): number {
  if (x <= 1e-12) return -120;
  return 20 * Math.log10(x);
}

function downmixFrame(channels: Float32Array[], i: number): number {
  let sum = 0;
  for (let c = 0; c < channels.length; c++) sum += channels[c]![i] ?? 0;
  return sum / channels.length;
}

export function measureDcOffset(channels: Float32Array[]): DcOffsetResult | null {
  const n = channels[0]?.length ?? 0;
  if (n === 0 || channels.length === 0) return null;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += downmixFrame(channels, i);
  const mean = sum / n;
  return { mean, meanAbsDbfs: dbFromLinear(Math.abs(mean)) };
}

/**
 * Compare RMS of channel-average mono vs RMS of a power-average of channels
 * (stereo energy). Large negative monoLossDb indicates phase cancellation in mono.
 */
export function measureMonoCompat(channels: Float32Array[]): MonoCompatResult | null {
  if (channels.length < 2) return null;
  const n = channels[0]?.length ?? 0;
  if (n < 32) return null;

  let sumSqStereo = 0;
  let sumSqMono = 0;
  for (let i = 0; i < n; i++) {
    let power = 0;
    let sum = 0;
    for (let c = 0; c < channels.length; c++) {
      const s = channels[c]![i] ?? 0;
      power += s * s;
      sum += s;
    }
    const mono = sum / channels.length;
    sumSqStereo += power / channels.length;
    sumSqMono += mono * mono;
  }
  const stereoRms = Math.sqrt(sumSqStereo / n);
  const monoRms = Math.sqrt(sumSqMono / n);
  const monoLossDb = dbFromLinear(monoRms) - dbFromLinear(stereoRms);
  return { stereoRms, monoRms, monoLossDb };
}
