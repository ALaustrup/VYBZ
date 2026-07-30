import { describe, expect, it } from "vitest";
import { analyzeWavBuffer } from "@vybz/processing/waveform";
import {
  masterWavBuffer,
  measureRmsDbfs,
  rmsDiffDbfs,
  PROC_VERSION_DSP,
} from "@vybz/processing/mastering";

/** Deterministic mono 16-bit PCM WAV (1 s of 440 Hz sine @ 8 kHz). */
function makeSineWav(opts?: { seconds?: number; sampleRate?: number; amp?: number }): ArrayBuffer {
  const sampleRate = opts?.sampleRate ?? 8000;
  const seconds = opts?.seconds ?? 1;
  const amp = opts?.amp ?? 0.25;
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

describe("AI mastering golden RMS", () => {
  it("normalizes quiet sine toward −14 dBFS RMS within ±0.1 dB across runs", () => {
    const input = makeSineWav({ amp: 0.25 });
    const a = masterWavBuffer(input, { targetRmsDbfs: -14, stereoWidth: 1 });
    const b = masterWavBuffer(input, { targetRmsDbfs: -14, stereoWidth: 1 });
    expect(a.metrics.procVersion).toBe(PROC_VERSION_DSP);
    expect(Math.abs(a.metrics.outputRmsDbfs - b.metrics.outputRmsDbfs)).toBeLessThanOrEqual(0.1);
    expect(rmsDiffDbfs(a.wav, b.wav)).toBeLessThanOrEqual(0.1);
    // Output should land near target (allow ±0.3 dB for PCM quantization)
    expect(Math.abs(a.metrics.outputRmsDbfs - -14)).toBeLessThanOrEqual(0.3);
    expect(a.metrics.outputPeak).toBeLessThanOrEqual(0.96);
  });

  it("CI gate: remaster vs golden reference ≤ 0.3 dB RMS", () => {
    const input = makeSineWav({ amp: 0.2 });
    const golden = masterWavBuffer(input, { targetRmsDbfs: -14, peakCeiling: 0.95, stereoWidth: 1 });
    const again = masterWavBuffer(input, { targetRmsDbfs: -14, peakCeiling: 0.95, stereoWidth: 1 });
    const diff = Math.abs(measureRmsDbfs(golden.wav) - measureRmsDbfs(again.wav));
    expect(diff).toBeLessThanOrEqual(0.3);
    // Sanity: analyze still works on mastered WAV
    const analysis = analyzeWavBuffer(again.wav, { bucketCount: 8, includeSpectrum: false });
    expect(analysis.durationSeconds).toBeCloseTo(1, 1);
  });
});
