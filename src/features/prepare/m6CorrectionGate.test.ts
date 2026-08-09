import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CHANNEL_BALANCE_VERSION,
  CLICK_ATTENUATE_VERSION,
  CORRECTION_VERSION,
  LOUDNESS_GAIN_VERSION,
  LOUDNESS_MATCH_COMPARE_VERSION,
  MAINS_HUM_CORRECT_VERSION,
  PEAK_SAFETY_CEILING_LINEAR,
  PEAK_SAFETY_VERSION,
  SILENCE_TRIM_VERSION,
  applyChannelBalance,
  applyClickAttenuate,
  applyLoudnessGain,
  applyMainsHumReduce,
  applyPeakSafety,
  applySilenceTrim,
  applyStereoWidth,
  matchLoudnessForCompare,
  SPECTRAL_EQ_VERSION,
  STEREO_WIDTH_VERSION,
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
    expect(CHANNEL_BALANCE_VERSION).toMatch(/^m6\./);
    expect(SILENCE_TRIM_VERSION).toMatch(/^m6\./);
    expect(MAINS_HUM_CORRECT_VERSION).toMatch(/^m6\./);
    expect(STEREO_WIDTH_VERSION).toMatch(/^m6\./);
    expect(SPECTRAL_EQ_VERSION).toMatch(/^m6\./);
    expect(CLICK_ATTENUATE_VERSION).toMatch(/^m6\./);
    expect(LOUDNESS_GAIN_VERSION).toMatch(/^m6\./);
    expect(LOUDNESS_MATCH_COMPARE_VERSION).toMatch(/^m6\./);
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

  it("channel balance is reproducible and reduces L/R delta", () => {
    const n = 4096;
    const left = new Float32Array(n);
    const right = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      left[i] = Math.sin(i / 7) * 0.6;
      right[i] = Math.sin(i / 7) * 0.15;
    }
    const clone = left.slice();
    const first = applyChannelBalance([left, right]);
    const second = applyChannelBalance([left, right]);
    expect(left).toEqual(clone);
    expect(first.leftGainLinear).toBe(second.leftGainLinear);
    expect(Math.abs(first.balanceDeltaDbAfter!)).toBeLessThan(0.05);
  });

  it("silence trim is reproducible and shortens padded edges", () => {
    const sr = 48000;
    const lead = sr;
    const tone = Math.floor(0.25 * sr);
    const trail = sr;
    const ch = new Float32Array(lead + tone + trail);
    for (let i = 0; i < tone; i++) ch[lead + i] = Math.sin(i / 9) * 0.4;
    const clone = ch.slice();
    const first = applySilenceTrim([ch], sr);
    const second = applySilenceTrim([ch], sr);
    expect(ch).toEqual(clone);
    expect(first.durationAfterSec).toBe(second.durationAfterSec);
    expect(first.durationAfterSec).toBeLessThan(first.durationBeforeSec);
  });

  it("surfaces Correct tool ops including peak, balance, silence, and hum", () => {
    const page = readFileSync(
      path.join(ROOT, "src/features/correction/DcOffsetCorrectPage.tsx"),
      "utf8"
    );
    const app = readFileSync(path.join(ROOT, "src/App.tsx"), "utf8");
    expect(page).toContain("dc-offset-correct");
    expect(page).toContain("correct-op-peak");
    expect(page).toContain("correct-op-balance");
    expect(page).toContain("correct-op-silence");
    expect(page).toContain("correct-op-hum");
    expect(page).toContain("correct-op-width");
    expect(page).toContain("correct-op-eq");
    expect(page).toContain("correct-op-click");
    expect(page).toContain("correct-op-loudness");
    expect(page).toContain("correct-ab-a");
    expect(page).toContain("correct-ab-b");
    expect(page).toContain("correct-match-loudness");
    expect(page).toContain("bypass");
    expect(app).toContain("/tools/correct");
  });

  it("loudness-matched A/B is reproducible and lowers the louder side", () => {
    const sr = 48000;
    const n = Math.floor(3 * sr);
    const quiet = new Float32Array(n);
    const loud = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const s = Math.sin((2 * Math.PI * 1000 * i) / sr);
      quiet[i] = s * 0.02;
      loud[i] = s * 0.25;
    }
    const first = matchLoudnessForCompare([quiet], [loud], sr);
    const second = matchLoudnessForCompare([quiet], [loud], sr);
    expect(first.b).toEqual(second.b);
    expect(first.bGainDb).toBeLessThan(0);
  });

  it("click attenuate is reproducible and non-destructive", () => {
    const sr = 48000;
    const n = Math.floor(0.5 * sr);
    const original = new Float32Array(n);
    for (let i = 0; i < n; i++) original[i] = Math.sin(i / 19) * 0.05;
    original[Math.floor(n / 2)] = 0.9;
    const clone = original.slice();
    const first = applyClickAttenuate([original], sr);
    const second = applyClickAttenuate([original], sr);
    expect(original).toEqual(clone);
    expect(first.channels[0]).toEqual(second.channels[0]);
    expect(first.eventsFixed).toBeGreaterThanOrEqual(1);
  });

  it("loudness gain moves quiet tone toward target and is reproducible", () => {
    const sr = 48000;
    const n = Math.floor(3 * sr);
    const original = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      original[i] = Math.sin((2 * Math.PI * 1000 * i) / sr) * 0.02;
    }
    const clone = original.slice();
    const first = applyLoudnessGain([original], sr, { targetLufs: -14 });
    const second = applyLoudnessGain([original], sr, { targetLufs: -14 });
    expect(original).toEqual(clone);
    expect(first.channels[0]).toEqual(second.channels[0]);
    expect(first.integratedLufsAfter!).toBeGreaterThan(first.integratedLufsBefore!);
  });

  it("stereo width widen is reproducible and changes correlation", () => {
    const n = 8192;
    const L = new Float32Array(n);
    const R = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = Math.sin(i / 19) * 0.4;
      L[i] = t;
      R[i] = t * 0.99;
    }
    const clone = L.slice();
    const first = applyStereoWidth([L, R], { mode: "widen" });
    const second = applyStereoWidth([L, R], { mode: "widen" });
    expect(L).toEqual(clone);
    expect(first.channels[0]).toEqual(second.channels[0]);
    expect(first.modeApplied).toBe("widen");
    expect(first.correlationAfter!).toBeLessThan(first.correlationBefore!);
  });

  it("mains-hum reduce is reproducible and lowers prominence", () => {
    const sr = 48000;
    const n = Math.floor(1.2 * sr);
    const original = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      original[i] = Math.sin(2 * Math.PI * 440 * t) * 0.3 + Math.sin(2 * Math.PI * 60 * t) * 0.2;
    }
    const clone = original.slice();
    const first = applyMainsHumReduce([original], sr, { frequencyHz: 60 });
    const second = applyMainsHumReduce([original], sr, { frequencyHz: 60 });
    expect(original).toEqual(clone);
    expect(first.channels[0]).toEqual(second.channels[0]);
    expect(first.binPowerRatio!).toBeLessThan(0.25);
  });
});
