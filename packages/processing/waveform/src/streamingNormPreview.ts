/**
 * M7 kickoff — streaming-oriented loudness normalisation preview.
 * Law 1: gain from measured BS.1770 integrated LUFS. Not platform emulation.
 */

import { measureBs1770 } from "./bs1770";
import { applyPeakSafety, PEAK_SAFETY_CEILING_LINEAR } from "./peakSafety";
import { snapshotLevels, type LevelSnapshot } from "./correctionLevels";

export const STREAMING_NORM_PREVIEW_VERSION = "m7.streaming-norm.1";
export const STREAMING_NORM_TARGET_LUFS = -14;

export type StreamingNormPreviewResult = {
  channels: Float32Array[];
  before: LevelSnapshot;
  after: LevelSnapshot;
  integratedLufsBefore: number;
  integratedLufsAfter: number;
  gainDb: number;
  targetLufs: number;
  correctionVersion: typeof STREAMING_NORM_PREVIEW_VERSION;
  disclosure: string;
};

/**
 * Simple gain-to-target preview of how a master may sit after streaming-style
 * loudness normalisation. Not Spotify/Apple/YouTube exact processing.
 */
export function applyStreamingNormPreview(
  channels: Float32Array[],
  sampleRate: number,
  opts?: { targetLufs?: number },
): StreamingNormPreviewResult {
  const before = snapshotLevels(channels);
  const targetLufs = opts?.targetLufs ?? STREAMING_NORM_TARGET_LUFS;
  const disclosure =
    "Approximate streaming loudness preview (BS.1770 gain-to-target). Not an exact emulation of any platform.";

  if (!channels[0]?.length) {
    return {
      channels: channels.map((c) => c.slice()),
      before,
      after: before,
      integratedLufsBefore: -70,
      integratedLufsAfter: -70,
      gainDb: 0,
      targetLufs,
      correctionVersion: STREAMING_NORM_PREVIEW_VERSION,
      disclosure,
    };
  }

  const measured = measureBs1770(channels, sampleRate, "portable");
  let gainDb = targetLufs - measured.integratedLufs;
  gainDb = Math.max(-24, Math.min(24, gainDb));
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
    integratedLufsBefore: measured.integratedLufs,
    integratedLufsAfter: afterMeasure.integratedLufs,
    gainDb: gainDb + peaked.gainDb,
    targetLufs,
    correctionVersion: STREAMING_NORM_PREVIEW_VERSION,
    disclosure,
  };
}
