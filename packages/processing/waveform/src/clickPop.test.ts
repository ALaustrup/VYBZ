import { describe, expect, it } from "vitest";
import {
  CLICK_POP_PROMINENCE_WARN_DB,
  measureClickPop,
} from "./clickPop";

function sine(seconds: number, hz: number, sampleRate: number, amp = 0.2): Float32Array {
  const n = Math.floor(seconds * sampleRate);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = Math.sin((2 * Math.PI * hz * i) / sampleRate) * amp;
  }
  return out;
}

describe("measureClickPop", () => {
  it("returns null for too-short buffers", () => {
    expect(measureClickPop(new Float32Array(100), 48000)).toBeNull();
  });

  it("stays quiet on a clean sine", () => {
    const pcm = sine(1.0, 440, 48000, 0.25);
    const m = measureClickPop(pcm, 48000)!;
    expect(m.count).toBe(0);
    expect(m.peakProminenceDb).toBeLessThan(CLICK_POP_PROMINENCE_WARN_DB);
  });

  it("detects an injected impulse", () => {
    const pcm = sine(1.0, 440, 48000, 0.08);
    // Near-zero region + hard impulse (edit/glitch style).
    for (let i = 23900; i < 24100; i++) pcm[i] = 0;
    pcm[24000] = 0.95;
    const m = measureClickPop(pcm, 48000)!;
    expect(m.count).toBeGreaterThanOrEqual(1);
    expect(m.peakProminenceDb).toBeGreaterThan(CLICK_POP_PROMINENCE_WARN_DB);
  });

  it("is reproducible for the same PCM", () => {
    const pcm = sine(0.5, 220, 48000, 0.2);
    pcm[10000] = -0.9;
    const a = measureClickPop(pcm, 48000)!;
    const b = measureClickPop(pcm, 48000)!;
    expect(a).toEqual(b);
  });
});
