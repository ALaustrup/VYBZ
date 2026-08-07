import { describe, expect, it } from "vitest";
import { CHANNEL_IMBALANCE_WARN_DB, measureChannelBalance } from "./channelBalance";

describe("measureChannelBalance", () => {
  it("returns null for mono", () => {
    expect(measureChannelBalance([new Float32Array(64)])).toBeNull();
  });

  it("is near zero for matched channels", () => {
    const a = new Float32Array(128);
    for (let i = 0; i < a.length; i++) a[i] = Math.sin(i / 9) * 0.5;
    const m = measureChannelBalance([a, a.slice()])!;
    expect(Math.abs(m.deltaDb)).toBeLessThan(0.1);
  });

  it("flags a louder left channel", () => {
    const l = new Float32Array(128);
    const r = new Float32Array(128);
    for (let i = 0; i < l.length; i++) {
      l[i] = Math.sin(i / 9) * 0.5;
      r[i] = Math.sin(i / 9) * 0.1;
    }
    const m = measureChannelBalance([l, r])!;
    expect(m.deltaDb).toBeGreaterThan(CHANNEL_IMBALANCE_WARN_DB);
  });
});
