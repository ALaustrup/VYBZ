/**
 * M6 close-out — loudness-matched A/B listen buffers.
 * Law 1: gains from measured BS.1770 integrated LUFS. Listen-only; downloads stay dry.
 */

import { measureBs1770 } from "./bs1770";
import { applyPeakSafety, PEAK_SAFETY_CEILING_LINEAR } from "./peakSafety";
export const LOUDNESS_MATCH_COMPARE_VERSION = "m6.loudness-match.1";

export type LoudnessMatchedPair = {
  a: Float32Array[];
  b: Float32Array[];
  aGainDb: number;
  bGainDb: number;
  targetLufs: number;
  aLufsBefore: number;
  bLufsBefore: number;
  correctionVersion: typeof LOUDNESS_MATCH_COMPARE_VERSION;
};

function applyGain(channels: Float32Array[], gainLinear: number): Float32Array[] {
  return channels.map((ch) => {
    const out = new Float32Array(ch.length);
    for (let i = 0; i < ch.length; i++) out[i] = ch[i]! * gainLinear;
    return out;
  });
}

/**
 * Match A and B to the quieter integrated LUFS so A/B compares processing, not level.
 * Peak-safety applied after gain so listen buffers stay under the Correct ceiling.
 */
export function matchLoudnessForCompare(
  a: Float32Array[],
  b: Float32Array[],
  sampleRate: number,
): LoudnessMatchedPair {
  const aLufs = measureBs1770(a, sampleRate, "portable").integratedLufs;
  const bLufs = measureBs1770(b, sampleRate, "portable").integratedLufs;
  const targetLufs = Math.min(aLufs, bLufs);

  let aGainDb = targetLufs - aLufs;
  let bGainDb = targetLufs - bLufs;
  aGainDb = Math.max(-24, Math.min(24, aGainDb));
  bGainDb = Math.max(-24, Math.min(24, bGainDb));

  const aGained = applyGain(a, Math.pow(10, aGainDb / 20));
  const bGained = applyGain(b, Math.pow(10, bGainDb / 20));
  const aSafe = applyPeakSafety(aGained, PEAK_SAFETY_CEILING_LINEAR);
  const bSafe = applyPeakSafety(bGained, PEAK_SAFETY_CEILING_LINEAR);

  return {
    a: aSafe.channels,
    b: bSafe.channels,
    aGainDb: aGainDb + aSafe.gainDb,
    bGainDb: bGainDb + bSafe.gainDb,
    targetLufs,
    aLufsBefore: aLufs,
    bLufsBefore: bLufs,
    correctionVersion: LOUDNESS_MATCH_COMPARE_VERSION,
  };
}

export function describeMatchGains(pair: LoudnessMatchedPair): string {
  const a = `${pair.aGainDb >= 0 ? "+" : ""}${pair.aGainDb.toFixed(1)} dB`;
  const b = `${pair.bGainDb >= 0 ? "+" : ""}${pair.bGainDb.toFixed(1)} dB`;
  return `A ${a} · B ${b} → ${pair.targetLufs.toFixed(1)} LUFS`;
}

/** Exposed for tests — linear→dB of a pure gain (no peak safety). */
export function gainDbBetweenLufs(fromLufs: number, toLufs: number): number {
  return toLufs - fromLufs;
}
