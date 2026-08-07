/**
 * L/R channel balance from measured RMS per channel (Law 1).
 * Positive deltaDb means left louder than right.
 */

export type ChannelBalance = {
  leftRmsDbfs: number;
  rightRmsDbfs: number;
  /** leftRms − rightRms (dB). */
  deltaDb: number;
};

/** Warn when |L−R| RMS exceeds this many dB. */
export const CHANNEL_IMBALANCE_WARN_DB = 3;

function rmsDbfs(samples: Float32Array): number {
  if (!samples.length) return -120;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]!;
    sum += s * s;
  }
  const rms = Math.sqrt(sum / samples.length);
  if (rms <= 1e-12) return -120;
  return 20 * Math.log10(rms);
}

export function measureChannelBalance(channels: Float32Array[]): ChannelBalance | null {
  if (channels.length < 2) return null;
  const left = channels[0]!;
  const right = channels[1]!;
  if (left.length < 32 || right.length < 32) return null;
  const leftRmsDbfs = rmsDbfs(left);
  const rightRmsDbfs = rmsDbfs(right);
  return {
    leftRmsDbfs,
    rightRmsDbfs,
    deltaDb: leftRmsDbfs - rightRmsDbfs,
  };
}
