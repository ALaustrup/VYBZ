/**
 * M6 — reversible L/R channel balance (Law 1: measured RMS only).
 * Scales left/right so each RMS matches their arithmetic mean.
 * Mono / single-channel: no-op copy. Extra channels (>2) left unchanged.
 * Non-destructive: caller keeps the original buffer.
 */

import { measureChannelBalance } from "./channelBalance";
import { dbFromLinear, snapshotLevels, type LevelSnapshot } from "./correctionLevels";

export const CHANNEL_BALANCE_VERSION = "m6.channel-balance.1";

export type ChannelBalanceCorrectResult = {
  channels: Float32Array[];
  before: LevelSnapshot;
  after: LevelSnapshot;
  leftGainLinear: number;
  rightGainLinear: number;
  leftGainDb: number;
  rightGainDb: number;
  /** L−R RMS delta before correction (dB); null for mono. */
  balanceDeltaDbBefore: number | null;
  balanceDeltaDbAfter: number | null;
  correctionVersion: typeof CHANNEL_BALANCE_VERSION;
};

function rmsLinear(samples: Float32Array): number {
  if (!samples.length) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i]! * samples[i]!;
  return Math.sqrt(sum / samples.length);
}

function scaleChannel(ch: Float32Array, gain: number): Float32Array {
  const next = new Float32Array(ch.length);
  for (let i = 0; i < ch.length; i++) next[i] = ch[i]! * gain;
  return next;
}

/**
 * Match L/R RMS to their mean. Deterministic and bypassable.
 */
export function applyChannelBalance(channels: Float32Array[]): ChannelBalanceCorrectResult {
  const before = snapshotLevels(channels);
  const balBefore = measureChannelBalance(channels);

  if (channels.length < 2) {
    const copy = channels.map((c) => c.slice());
    return {
      channels: copy,
      before,
      after: snapshotLevels(copy),
      leftGainLinear: 1,
      rightGainLinear: 1,
      leftGainDb: 0,
      rightGainDb: 0,
      balanceDeltaDbBefore: null,
      balanceDeltaDbAfter: null,
      correctionVersion: CHANNEL_BALANCE_VERSION,
    };
  }

  const left = channels[0]!;
  const right = channels[1]!;
  const lRms = rmsLinear(left);
  const rRms = rmsLinear(right);
  const target = (lRms + rRms) / 2;
  const leftGainLinear = lRms > 1e-12 ? target / lRms : 1;
  const rightGainLinear = rRms > 1e-12 ? target / rRms : 1;

  const out: Float32Array[] = [scaleChannel(left, leftGainLinear), scaleChannel(right, rightGainLinear)];
  for (let c = 2; c < channels.length; c++) out.push(channels[c]!.slice());

  const after = snapshotLevels(out);
  const balAfter = measureChannelBalance(out);

  return {
    channels: out,
    before,
    after,
    leftGainLinear,
    rightGainLinear,
    leftGainDb: dbFromLinear(leftGainLinear),
    rightGainDb: dbFromLinear(rightGainLinear),
    balanceDeltaDbBefore: balBefore?.deltaDb ?? null,
    balanceDeltaDbAfter: balAfter?.deltaDb ?? null,
    correctionVersion: CHANNEL_BALANCE_VERSION,
  };
}
