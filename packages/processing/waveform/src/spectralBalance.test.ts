import { describe, expect, it } from "vitest";
import { computeSpectrum } from "./fft";
import {
  SPECTRAL_BASS_HEAVY_SHARE,
  measureSpectralBalance,
} from "./spectralBalance";

describe("measureSpectralBalance", () => {
  it("returns null on empty magnitudes", () => {
    expect(measureSpectralBalance([], 1024, 48000)).toBeNull();
  });

  it("is deterministic for a fixed mid-file sine", () => {
    const n = 48000;
    const buf = new Float32Array(n);
    for (let i = 0; i < n; i++) buf[i] = Math.sin((2 * Math.PI * 1000 * i) / 48000) * 0.5;
    const spec = computeSpectrum(buf, 1024);
    const a = measureSpectralBalance(spec.magnitudes, spec.fftSize, 48000);
    const b = measureSpectralBalance(spec.magnitudes, spec.fftSize, 48000);
    expect(a).toEqual(b);
    expect(a!.midShare + a!.lowShare + a!.highShare).toBeCloseTo(1, 5);
  });

  it("assigns most energy of a 80 Hz sine to the low band", () => {
    const n = 48000;
    const buf = new Float32Array(n);
    for (let i = 0; i < n; i++) buf[i] = Math.sin((2 * Math.PI * 80 * i) / 48000) * 0.5;
    const spec = computeSpectrum(buf, 1024);
    const bal = measureSpectralBalance(spec.magnitudes, spec.fftSize, 48000)!;
    expect(bal.lowShare).toBeGreaterThan(SPECTRAL_BASS_HEAVY_SHARE);
  });
});
