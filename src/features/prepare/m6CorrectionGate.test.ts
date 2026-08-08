import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CORRECTION_VERSION,
  PEAK_SAFETY_CEILING_LINEAR,
  PEAK_SAFETY_VERSION,
  applyPeakSafety,
  removeDcOffset,
} from "@vybz/processing/waveform";

const ROOT = path.resolve(__dirname, "../../..");

/**
 * M6 exit-gate starter — Masterplan §10 Correction & Mastering.
 * Gate: Users can safely improve audio; every render reproducible; operations
 * reversible; before/after analysis available; no ambiguous credit deduction.
 */
describe("M6 correction gate", () => {
  it("cites the M6 gate and ships versioned correction ops", () => {
    const masterplan = readFileSync(path.join(ROOT, "VYBZ_MASTERPLAN.md"), "utf8");
    expect(masterplan).toMatch(/M6.*Correction|Correction & Mastering/s);
    expect(CORRECTION_VERSION).toMatch(/^m6\./);
    expect(PEAK_SAFETY_VERSION).toMatch(/^m6\./);
  });

  it("DC remove is reproducible and bypassable (original buffer unchanged)", () => {
    const n = 8192;
    const original = new Float32Array(n);
    for (let i = 0; i < n; i++) original[i] = 0.04 + Math.sin(i / 11) * 0.1;
    const clone = original.slice();
    const first = removeDcOffset([original]);
    const second = removeDcOffset([original]);
    expect(original).toEqual(clone);
    expect(first.removedMean).toBe(second.removedMean);
    expect(first.channels[0]).toEqual(second.channels[0]);
    expect(first.before.peakDbfs).toBeTypeOf("number");
    expect(first.after.peakDbfs).toBeTypeOf("number");
    expect(Math.abs(first.after.dc!.mean)).toBeLessThan(Math.abs(first.before.dc!.mean));
  });

  it("peak safety is reproducible, non-destructive, and respects the ceiling", () => {
    const n = 4096;
    const original = new Float32Array(n);
    for (let i = 0; i < n; i++) original[i] = Math.sin(i / 4) * 0.98;
    const clone = original.slice();
    const first = applyPeakSafety([original]);
    const second = applyPeakSafety([original]);
    expect(original).toEqual(clone);
    expect(first.gainLinear).toBe(second.gainLinear);
    expect(first.channels[0]).toEqual(second.channels[0]);
    expect(first.after.peakLinear).toBeLessThanOrEqual(PEAK_SAFETY_CEILING_LINEAR + 1e-5);
  });

  it("surfaces Correct tool ops including peak safety", () => {
    const page = readFileSync(
      path.join(ROOT, "src/features/correction/DcOffsetCorrectPage.tsx"),
      "utf8"
    );
    const app = readFileSync(path.join(ROOT, "src/App.tsx"), "utf8");
    expect(page).toContain("dc-offset-correct");
    expect(page).toContain("correct-op-peak");
    expect(page).toContain("bypass");
    expect(app).toContain("/tools/correct");
  });
});
