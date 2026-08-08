/**
 * M6 — reversible edge-silence trim (Law 1: measured samples only).
 * Uses the same silence threshold as analysis edge scans. Keeps a short pad
 * so the first/last hit is not clipped. Non-destructive.
 */

import { SILENCE_LINEAR_THRESHOLD, measureEdgeSilence } from "./integrity";
import { snapshotLevels, type LevelSnapshot } from "./correctionLevels";

export const SILENCE_TRIM_VERSION = "m6.silence-trim.1";

/** Keep this much silence (seconds) at each edge after trim. */
export const SILENCE_TRIM_PAD_SEC = 0.05;

export type SilenceTrimResult = {
  channels: Float32Array[];
  before: LevelSnapshot;
  after: LevelSnapshot;
  sampleRate: number;
  durationBeforeSec: number;
  durationAfterSec: number;
  trimmedLeadSec: number;
  trimmedTrailSec: number;
  leadInBeforeSec: number;
  leadOutBeforeSec: number;
  correctionVersion: typeof SILENCE_TRIM_VERSION;
};

function isSilentFrame(channels: Float32Array[], i: number): boolean {
  for (let c = 0; c < channels.length; c++) {
    if (Math.abs(channels[c]![i] ?? 0) >= SILENCE_LINEAR_THRESHOLD) return false;
  }
  return true;
}

/**
 * Trim leading/trailing digital silence, retaining SILENCE_TRIM_PAD_SEC at each edge.
 */
export function applySilenceTrim(
  channels: Float32Array[],
  sampleRate: number
): SilenceTrimResult {
  const before = snapshotLevels(channels);
  const n = channels[0]?.length ?? 0;
  const durationBeforeSec = sampleRate > 0 ? n / sampleRate : 0;
  const edges = measureEdgeSilence(channels, sampleRate);
  const leadInBeforeSec = edges?.leadInSeconds ?? 0;
  const leadOutBeforeSec = edges?.leadOutSeconds ?? 0;

  if (!channels.length || n === 0 || sampleRate <= 0) {
    const copy = channels.map((c) => c.slice());
    return {
      channels: copy,
      before,
      after: snapshotLevels(copy),
      sampleRate,
      durationBeforeSec,
      durationAfterSec: durationBeforeSec,
      trimmedLeadSec: 0,
      trimmedTrailSec: 0,
      leadInBeforeSec,
      leadOutBeforeSec,
      correctionVersion: SILENCE_TRIM_VERSION,
    };
  }

  let lead = 0;
  while (lead < n && isSilentFrame(channels, lead)) lead += 1;
  let trail = 0;
  while (trail < n - lead && isSilentFrame(channels, n - 1 - trail)) trail += 1;

  const pad = Math.max(0, Math.floor(SILENCE_TRIM_PAD_SEC * sampleRate));
  const start = Math.max(0, lead - pad);
  const endExclusive = Math.min(n, n - trail + pad);
  const safeEnd = Math.max(start + 1, endExclusive);

  const out = channels.map((ch) => ch.slice(start, safeEnd));
  const trimmedLeadSec = start / sampleRate;
  const trimmedTrailSec = (n - safeEnd) / sampleRate;
  const durationAfterSec = out[0]!.length / sampleRate;

  return {
    channels: out,
    before,
    after: snapshotLevels(out),
    sampleRate,
    durationBeforeSec,
    durationAfterSec,
    trimmedLeadSec,
    trimmedTrailSec,
    leadInBeforeSec,
    leadOutBeforeSec,
    correctionVersion: SILENCE_TRIM_VERSION,
  };
}
