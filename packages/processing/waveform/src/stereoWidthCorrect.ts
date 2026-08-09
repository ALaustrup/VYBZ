/**
 * M6 / OR-026 — reversible mid/side width assist.
 * Law 1: mode from measured correlation / mid-side (or explicit). Caps + mono guard.
 * Non-destructive: caller keeps the original buffer.
 */

import { snapshotLevels, type LevelSnapshot } from "./correctionLevels";
import { measureMidSide } from "./midSide";
import { measureMonoCompat, MONO_LOSS_WARN_DB } from "./monoCompat";
import {
  measureStereoCorrelation,
  STEREO_NARROW_THRESHOLD,
  STEREO_OUT_OF_PHASE_THRESHOLD,
} from "./stereo";

export const STEREO_WIDTH_VERSION = "m6.stereo-width.1";

export type StereoWidthMode = "auto" | "widen" | "narrow";

export type StereoWidthResult = {
  channels: Float32Array[];
  before: LevelSnapshot;
  after: LevelSnapshot;
  modeApplied: "widen" | "narrow" | "noop";
  sideGain: number;
  correlationBefore: number | null;
  correlationAfter: number | null;
  monoLossDbBefore: number | null;
  monoLossDbAfter: number | null;
  correctionVersion: typeof STEREO_WIDTH_VERSION;
};

const WIDEN_SIDE = 1.22;
const NARROW_SIDE = 0.62;
const WIDEN_SIDE_MAX = 1.35;
const NARROW_SIDE_MIN = 0.45;

function applySideGain(channels: Float32Array[], sideGain: number): Float32Array[] {
  const left = channels[0]!;
  const right = channels[1]!;
  const n = Math.min(left.length, right.length);
  const outL = new Float32Array(n);
  const outR = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const l = left[i]!;
    const r = right[i]!;
    const mid = (l + r) * 0.5;
    const side = (l - r) * 0.5 * sideGain;
    outL[i] = mid + side;
    outR[i] = mid - side;
  }
  return [outL, outR];
}

function chooseMode(channels: Float32Array[]): "widen" | "narrow" | "noop" {
  const corr = measureStereoCorrelation(channels);
  const ms = measureMidSide(channels);
  const mono = measureMonoCompat(channels);
  if (corr != null && corr < STEREO_OUT_OF_PHASE_THRESHOLD) return "narrow";
  if (mono != null && mono.monoLossDb <= MONO_LOSS_WARN_DB) return "narrow";
  if (ms != null && ms.sideToMidDb >= -6) return "narrow";
  if (corr != null && corr >= STEREO_NARROW_THRESHOLD) return "widen";
  return "noop";
}

/**
 * Mid/side width assist. Mono → noop copy. Auto picks widen vs narrow from measures.
 */
export function applyStereoWidth(
  channels: Float32Array[],
  opts?: { mode?: StereoWidthMode },
): StereoWidthResult {
  const before = snapshotLevels(channels);
  const correlationBefore = measureStereoCorrelation(channels);
  const monoBefore = measureMonoCompat(channels);

  if (channels.length < 2 || !(channels[0]?.length)) {
    return {
      channels: channels.map((c) => c.slice()),
      before,
      after: before,
      modeApplied: "noop",
      sideGain: 1,
      correlationBefore,
      correlationAfter: correlationBefore,
      monoLossDbBefore: monoBefore?.monoLossDb ?? null,
      monoLossDbAfter: monoBefore?.monoLossDb ?? null,
      correctionVersion: STEREO_WIDTH_VERSION,
    };
  }

  const requested = opts?.mode ?? "auto";
  const modeApplied =
    requested === "auto" ? chooseMode(channels) : requested === "widen" ? "widen" : "narrow";

  if (modeApplied === "noop") {
    return {
      channels: channels.map((c) => {
        const copy = new Float32Array(c.length);
        copy.set(c);
        return copy;
      }),
      before,
      after: before,
      modeApplied: "noop",
      sideGain: 1,
      correlationBefore,
      correlationAfter: correlationBefore,
      monoLossDbBefore: monoBefore?.monoLossDb ?? null,
      monoLossDbAfter: monoBefore?.monoLossDb ?? null,
      correctionVersion: STEREO_WIDTH_VERSION,
    };
  }

  let sideGain = modeApplied === "widen" ? WIDEN_SIDE : NARROW_SIDE;
  let out = applySideGain(channels, sideGain);

  // If widen harmed mono fold-down, pull side back.
  if (modeApplied === "widen") {
    const mono = measureMonoCompat(out);
    if (mono && mono.monoLossDb <= MONO_LOSS_WARN_DB) {
      sideGain = Math.min(sideGain, 1.08);
      out = applySideGain(channels, sideGain);
    }
  }

  sideGain = Math.max(NARROW_SIDE_MIN, Math.min(WIDEN_SIDE_MAX, sideGain));

  const correlationAfter = measureStereoCorrelation(out);
  const monoAfter = measureMonoCompat(out);

  return {
    channels: out,
    before,
    after: snapshotLevels(out),
    modeApplied,
    sideGain,
    correlationBefore,
    correlationAfter,
    monoLossDbBefore: monoBefore?.monoLossDb ?? null,
    monoLossDbAfter: monoAfter?.monoLossDb ?? null,
    correctionVersion: STEREO_WIDTH_VERSION,
  };
}
