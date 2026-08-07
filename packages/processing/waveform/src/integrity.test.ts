import { describe, expect, it } from "vitest";
import {
  CLIP_LINEAR_THRESHOLD,
  measureClipIntegrity,
  measureEdgeSilence,
} from "./integrity";

describe("measureClipIntegrity", () => {
  it("counts full-scale samples and max run", () => {
    const ch = [new Float32Array([0, 1, 1, 1, 0, CLIP_LINEAR_THRESHOLD])];
    const m = measureClipIntegrity(ch);
    expect(m.clippedSamples).toBe(4);
    expect(m.maxClipRun).toBe(3);
    expect(m.totalSamples).toBe(6);
  });
});

describe("measureEdgeSilence", () => {
  it("measures lead-in and lead-out silence", () => {
    const ch = [new Float32Array([0, 0, 0, 0.5, 0, 0, 0, 0, 0])];
    const m = measureEdgeSilence(ch, 4)!;
    expect(m.leadInSeconds).toBeCloseTo(0.75, 5); // 3/4
    expect(m.leadOutSeconds).toBeCloseTo(1.25, 5); // 5/4
  });

  it("returns zeros when the file is never silent at the edges", () => {
    const ch = [new Float32Array([0.2, 0.3, 0.1])];
    const m = measureEdgeSilence(ch, 48000)!;
    expect(m.leadInSeconds).toBe(0);
    expect(m.leadOutSeconds).toBe(0);
  });
});
