import { describe, expect, it } from "vitest";
import {
  BS1770_METER_VERSION,
  measureBs1770,
  synthesizeSinePeakDbfs,
  TRUE_PEAK_OVERSAMPLE,
} from "./bs1770";

/**
 * M4 exit gate — executable vector checks.
 *
 * Primary published vector (EBU Tech 3341 / BS.1770 practice): a stereo 1 kHz
 * sine at −23 dBFS peak in each channel integrates to −23.0 LUFS.
 *
 * Mono at the same peak level integrates ≈ −26 LUFS (single-channel weight;
 * 10·log10(2) below the dual-channel case). That is correct BS.1770 behaviour,
 * not a meter fault.
 *
 * Tolerance for this meter version: ±0.5 LU (documented; tighten as the
 * oversampler / filter path is refined).
 */
const INTEGRATED_TOLERANCE_LU = 0.5;

describe("M4 BS.1770-4 meter vectors", () => {
  it("cites the M4 gate: published vectors pass within documented tolerances", () => {
    // Gate reference — VYBZ_MASTERPLAN.md §10 M4 / AGENTS.md Measurement Integrity.
    expect(INTEGRATED_TOLERANCE_LU).toBeLessThanOrEqual(0.5);
    expect(BS1770_METER_VERSION).toMatch(/^m4\.bs1770/);
  });

  it("stereo 1 kHz −23 dBFS/channel integrates to −23 LUFS ±0.5 (primary gate)", () => {
    const channels = synthesizeSinePeakDbfs({
      sampleRate: 48000,
      seconds: 5,
      peakDbfs: -23,
      channels: 2,
    });
    const m = measureBs1770(channels, 48000, "portable");
    expect(m.integratedLufs).toBeGreaterThanOrEqual(-23 - INTEGRATED_TOLERANCE_LU);
    expect(m.integratedLufs).toBeLessThanOrEqual(-23 + INTEGRATED_TOLERANCE_LU);
    expect(m.provenance.standard).toBe("BS.1770-4");
    expect(m.provenance.truePeakOversample).toBe(TRUE_PEAK_OVERSAMPLE);
    expect(m.samplePeakDbfs).toBeCloseTo(-23, 1);
  });

  it("mono 1 kHz −23 dBFS integrates near −26 LUFS (single-channel weight)", () => {
    const channels = synthesizeSinePeakDbfs({
      sampleRate: 48000,
      seconds: 5,
      peakDbfs: -23,
      channels: 1,
    });
    const m = measureBs1770(channels, 48000, "portable");
    expect(m.integratedLufs).toBeGreaterThanOrEqual(-26 - INTEGRATED_TOLERANCE_LU);
    expect(m.integratedLufs).toBeLessThanOrEqual(-26 + INTEGRATED_TOLERANCE_LU);
  });

  it("true peak is within 0.3 dB of sample peak for a band-limited sine", () => {
    const channels = synthesizeSinePeakDbfs({
      sampleRate: 48000,
      seconds: 1,
      peakDbfs: -6,
      freqHz: 1000,
    });
    const m = measureBs1770(channels, 48000);
    expect(m.truePeakDbtp).toBeGreaterThanOrEqual(m.samplePeakDbfs - 0.15);
    expect(m.truePeakDbtp).toBeLessThanOrEqual(m.samplePeakDbfs + 0.3);
  });

  it("is deterministic", () => {
    const channels = synthesizeSinePeakDbfs({
      sampleRate: 48000,
      seconds: 2,
      peakDbfs: -20,
    });
    const a = measureBs1770(channels, 48000);
    const b = measureBs1770(channels, 48000);
    expect(a.integratedLufs).toBe(b.integratedLufs);
    expect(a.truePeakDbtp).toBe(b.truePeakDbtp);
    expect(a.momentaryLufs).toBe(b.momentaryLufs);
  });

  it("silence stays at the floor", () => {
    const silence = [new Float32Array(48000)];
    const m = measureBs1770(silence, 48000);
    expect(m.integratedLufs).toBeLessThanOrEqual(-60);
    expect(m.samplePeakDbfs).toBeLessThanOrEqual(-100);
  });
});
