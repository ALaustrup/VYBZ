/**
 * Shared before/after level snapshots for M6 correction ops (Law 1).
 */

import { measureDcOffset, type DcOffsetResult } from "./monoCompat";
import { dbFromLinear } from "./pcm";

export type LevelSnapshot = {
  peakLinear: number;
  rmsLinear: number;
  peakDbfs: number;
  rmsDbfs: number;
  dc: DcOffsetResult | null;
};

export { dbFromLinear };

export function snapshotLevels(channels: Float32Array[]): LevelSnapshot {
  const n = channels[0]?.length ?? 0;
  let peak = 0;
  let sumSq = 0;
  let count = 0;
  for (let c = 0; c < channels.length; c++) {
    const ch = channels[c]!;
    for (let i = 0; i < n; i++) {
      const s = ch[i]!;
      const a = Math.abs(s);
      if (a > peak) peak = a;
      sumSq += s * s;
      count++;
    }
  }
  const rms = count > 0 ? Math.sqrt(sumSq / count) : 0;
  return {
    peakLinear: peak,
    rmsLinear: rms,
    peakDbfs: dbFromLinear(peak),
    rmsDbfs: dbFromLinear(rms),
    dc: measureDcOffset(channels),
  };
}
