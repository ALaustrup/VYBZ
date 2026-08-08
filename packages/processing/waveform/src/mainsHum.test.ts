import { describe, expect, it } from "vitest";
import { MAINS_HUM_PROMINENCE_WARN_DB, measureMainsHum } from "./mainsHum";

function sine(seconds: number, hz: number, sampleRate: number, amp = 0.2): Float32Array {
  const n = Math.floor(seconds * sampleRate);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = Math.sin((2 * Math.PI * hz * i) / sampleRate) * amp;
  }
  return out;
}

describe("measureMainsHum", () => {
  it("returns null for too-short buffers", () => {
    expect(measureMainsHum(new Float32Array(100), 48000)).toBeNull();
  });

  it("detects a strong 60 Hz tone", () => {
    const pcm = sine(1.0, 60, 48000, 0.3);
    const m = measureMainsHum(pcm, 48000)!;
    expect(m.frequencyHz).toBe(60);
    expect(m.prominenceDb).toBeGreaterThan(MAINS_HUM_PROMINENCE_WARN_DB);
  });

  it("detects a strong 50 Hz tone", () => {
    const pcm = sine(1.0, 50, 48000, 0.3);
    const m = measureMainsHum(pcm, 48000)!;
    expect(m.frequencyHz).toBe(50);
    expect(m.prominenceDb).toBeGreaterThan(MAINS_HUM_PROMINENCE_WARN_DB);
  });
});
