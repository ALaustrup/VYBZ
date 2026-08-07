import { describe, expect, it } from "vitest";
import { analyzeWavBuffer, computePeaks, decodeWavPcm, PORTABLE_FFT_MAX_BYTES } from "@vybz/processing/waveform";

/** Deterministic mono 16-bit PCM WAV (1 second of 440 Hz sine @ 8 kHz). */
function makeSineWav(opts?: { seconds?: number; sampleRate?: number; amp?: number }): ArrayBuffer {
  const sampleRate = opts?.sampleRate ?? 8000;
  const seconds = opts?.seconds ?? 1;
  const amp = opts?.amp ?? 0.5;
  const n = sampleRate * seconds;
  const dataSize = n * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < n; i++) {
    const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * amp;
    view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, Math.round(sample * 32767))), true);
  }
  return buffer;
}

describe("waveform golden fixtures", () => {
  it("decodes deterministic sine WAV peaks/loudness/spectrum", () => {
    const buf = makeSineWav({ amp: 0.5 });
    const result = analyzeWavBuffer(buf, { bucketCount: 16, includeSpectrum: true });
    expect(result.sampleRate).toBe(8000);
    expect(result.channels).toBe(1);
    expect(result.durationSeconds).toBeCloseTo(1, 2);
    expect(result.peaks).toHaveLength(16);
    expect(result.peaks.every((p) => p > 0.3 && p <= 1)).toBe(true);
    expect(result.peakDbfs).toBeGreaterThan(-8);
    expect(result.peakDbfs).toBeLessThan(-4);
    expect(result.rmsDbfs).toBeGreaterThan(-12);
    expect(result.integratedLufsApprox).toBeGreaterThan(-20);
    expect(result.spectrum?.fftSize).toBe(1024);
    expect(result.spectrum?.magnitudes.length).toBe(512);
    expect(result.processingVersion).toMatch(/^m5\.waveform/);
    expect(result.engine).toBe("portable");
  });

  it("is deterministic across runs (golden checksum)", () => {
    const buf = makeSineWav();
    const a = analyzeWavBuffer(buf, { bucketCount: 8, includeSpectrum: false });
    const b = analyzeWavBuffer(buf, { bucketCount: 8, includeSpectrum: false });
    expect(a.peaks).toEqual(b.peaks);
    expect(a.peakDbfs).toBe(b.peakDbfs);
    expect(a.rmsDbfs).toBe(b.rmsDbfs);
    expect(a.integratedLufsApprox).toBe(b.integratedLufsApprox);
  });

  it("enforces portable 10 MB FFT gate", () => {
    const pcm = decodeWavPcm(makeSineWav({ seconds: 0.1 }));
    expect(computePeaks(pcm, 4).peaks).toHaveLength(4);
    expect(() =>
      analyzeWavBuffer(makeSineWav({ seconds: 0.1 }), {
        sizeBytes: PORTABLE_FFT_MAX_BYTES + 1,
        enforcePortableLimit: true,
      })
    ).toThrow(/Portable FFT limited/);
  });
});
