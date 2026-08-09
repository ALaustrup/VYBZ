/**
 * M6 / OR-026 — BS.1770 integrated loudness gain-to-target + peak ceiling.
 * Law 1: gain from measured integrated LUFS. Not store certification.
 */

import { applyPeakSafety, PEAK_SAFETY_CEILING_LINEAR } from "./peakSafety";
import { measureBs1770 } from "./bs1770";
import { dbFromLinear, snapshotLevels, type LevelSnapshot } from "./correctionLevels";

export const LOUDNESS_GAIN_VERSION = "m6.loudness-gain.1";

/** Streaming-oriented target (LUFS). Disclosed assist — not a delivery cert. */
export const LOUDNESS_GAIN_TARGET_LUFS = -14;

export type LoudnessGainResult = {
  channels: Float32Array[];
  before: LevelSnapshot;
  after: LevelSnapshot;
  integratedLufsBefore: number | null;
  integratedLufsAfter: number | null;
  gainDb: number;
  targetLufs: number;
  correctionVersion: typeof LOUDNESS_GAIN_VERSION;
};

export function applyLoudnessGain(
  channels: Float32Array[],
  sampleRate: number,
  opts?: { targetLufs?: number },
): LoudnessGainResult {
  const before = snapshotLevels(channels);
  const targetLufs = opts?.targetLufs ?? LOUDNESS_GAIN_TARGET_LUFS;
  if (!channels[0]?.length) {
    return {
      channels: channels.map((c) => c.slice()),
      before,
      after: before,
      integratedLufsBefore: null,
      integratedLufsAfter: null,
      gainDb: 0,
      targetLufs,
      correctionVersion: LOUDNESS_GAIN_VERSION,
    };
  }

  const measured = measureBs1770(channels, sampleRate, "portable");
  const integratedLufsBefore = measured.integratedLufs;
  let gainDb = targetLufs - integratedLufsBefore;
  // Cap extreme corrections
  gainDb = Math.max(-18, Math.min(18, gainDb));
  const gainLinear = Math.pow(10, gainDb / 20);

  const gained = channels.map((ch) => {
    const out = new Float32Array(ch.length);
    for (let i = 0; i < ch.length; i++) out[i] = ch[i]! * gainLinear;
    return out;
  });

  const peaked = applyPeakSafety(gained, PEAK_SAFETY_CEILING_LINEAR);
  const afterMeasure = measureBs1770(peaked.channels, sampleRate, "portable");

  return {
    channels: peaked.channels,
    before,
    after: peaked.after,
    integratedLufsBefore,
    integratedLufsAfter: afterMeasure.integratedLufs,
    gainDb: dbFromLinear(gainLinear * peaked.gainLinear),
    targetLufs,
    correctionVersion: LOUDNESS_GAIN_VERSION,
  };
}
