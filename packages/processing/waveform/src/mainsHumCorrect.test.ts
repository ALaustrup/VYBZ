import { describe, expect, it } from "vitest";
import { MAINS_HUM_PROMINENCE_WARN_DB, measureMainsHum } from "./mainsHum";
import { MAINS_HUM_CORRECT_VERSION, applyMainsHumReduce } from "./mainsHumCorrect";

function tonePlusHum(
  seconds: number,
  sampleRate: number,
  musicHz: number,
  humHz: 50 | 60,
): Float32Array {
  const n = Math.floor(seconds * sampleRate);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    out[i] =
      Math.sin(2 * Math.PI * musicHz * t) * 0.35 +
      Math.sin(2 * Math.PI * humHz * t) * 0.22;
  }
  return out;
}

describe("applyMainsHumReduce", { timeout: 45_000 }, () => {
  it("is versioned and non-destructive", () => {
    const sr = 48000;
    const original = tonePlusHum(1.2, sr, 440, 60);
    const clone = original.slice();
    const r = applyMainsHumReduce([original], sr);
    expect(original).toEqual(clone);
    expect(r.correctionVersion).toBe(MAINS_HUM_CORRECT_VERSION);
    expect(r.frequencyHz).toBe(60);
  });

  it("cuts absolute 60 Hz bin power", () => {
    const sr = 48000;
    const pcm = tonePlusHum(1.5, sr, 330, 60);
    const before = measureMainsHum(pcm, sr)!;
    expect(before.frequencyHz).toBe(60);
    expect(before.prominenceDb).toBeGreaterThan(MAINS_HUM_PROMINENCE_WARN_DB);
    const r = applyMainsHumReduce([pcm], sr, { frequencyHz: 60 });
    expect(r.binPowerRatio).toBeTypeOf("number");
    expect(r.binPowerRatio!).toBeLessThan(0.25);
  });

  it("is reproducible", () => {
    const sr = 48000;
    const pcm = tonePlusHum(1.0, sr, 220, 50);
    const a = applyMainsHumReduce([pcm], sr, { frequencyHz: 50 });
    const b = applyMainsHumReduce([pcm], sr, { frequencyHz: 50 });
    expect(a.channels[0]).toEqual(b.channels[0]);
    expect(a.frequencyHz).toBe(50);
  });
});
