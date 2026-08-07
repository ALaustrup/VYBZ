import { describe, expect, it } from "vitest";
import {
  DC_OFFSET_LINEAR_WARN,
  MONO_LOSS_WARN_DB,
  measureDcOffset,
  measureMonoCompat,
} from "./monoCompat";

describe("measureDcOffset", () => {
  it("detects a constant bias", () => {
    const ch = [new Float32Array(64).fill(0.05)];
    const m = measureDcOffset(ch)!;
    expect(m.mean).toBeCloseTo(0.05, 5);
    expect(Math.abs(m.mean)).toBeGreaterThan(DC_OFFSET_LINEAR_WARN);
  });

  it("is near zero for a balanced sine", () => {
    const a = new Float32Array(256);
    for (let i = 0; i < a.length; i++) a[i] = Math.sin(i / 8);
    const m = measureDcOffset([a])!;
    expect(Math.abs(m.mean)).toBeLessThan(0.01);
  });
});

describe("measureMonoCompat", () => {
  it("returns null for mono", () => {
    expect(measureMonoCompat([new Float32Array(64)])).toBeNull();
  });

  it("shows large mono loss for out-of-phase identical content", () => {
    const a = new Float32Array(256);
    const b = new Float32Array(256);
    for (let i = 0; i < a.length; i++) {
      a[i] = Math.sin(i / 8);
      b[i] = -a[i]!;
    }
    const m = measureMonoCompat([a, b])!;
    expect(m.monoLossDb).toBeLessThan(MONO_LOSS_WARN_DB);
  });

  it("shows little mono loss for identical L/R", () => {
    const a = new Float32Array(256);
    for (let i = 0; i < a.length; i++) a[i] = Math.sin(i / 8);
    const m = measureMonoCompat([a, a.slice()])!;
    expect(m.monoLossDb).toBeGreaterThan(-1);
  });
});
