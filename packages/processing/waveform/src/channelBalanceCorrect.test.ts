import { describe, expect, it } from "vitest";
import { measureChannelBalance } from "./channelBalance";
import {
  CHANNEL_BALANCE_VERSION,
  applyChannelBalance,
} from "./channelBalanceCorrect";

describe("applyChannelBalance", () => {
  it("is a no-op on mono", () => {
    const ch = new Float32Array(512);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.sin(i / 8) * 0.3;
    const r = applyChannelBalance([ch]);
    expect(r.correctionVersion).toBe(CHANNEL_BALANCE_VERSION);
    expect(r.leftGainLinear).toBe(1);
    expect(r.balanceDeltaDbBefore).toBeNull();
  });

  it("reduces L/R RMS imbalance and is reproducible", () => {
    const n = 8192;
    const left = new Float32Array(n);
    const right = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      left[i] = Math.sin(i / 11) * 0.5;
      right[i] = Math.sin(i / 11) * 0.1;
    }
    const before = measureChannelBalance([left, right])!;
    expect(Math.abs(before.deltaDb)).toBeGreaterThan(3);

    const cloneL = left.slice();
    const a = applyChannelBalance([left, right]);
    const b = applyChannelBalance([left, right]);
    expect(left).toEqual(cloneL);
    expect(a.leftGainLinear).toBe(b.leftGainLinear);
    expect(a.channels[0]).toEqual(b.channels[0]);
    expect(Math.abs(a.balanceDeltaDbAfter!)).toBeLessThan(0.05);
    expect(Math.abs(a.balanceDeltaDbAfter!)).toBeLessThan(Math.abs(a.balanceDeltaDbBefore!));
  });
});
