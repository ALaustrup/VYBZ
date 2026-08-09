import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateReadiness } from "@vybz/domain/releases";
import {
  PROCESSING_VERSION,
  analyzeWavBuffer,
  measureClickPop,
  measureCrestFactorDb,
  measureStereoCorrelation,
} from "@vybz/processing/waveform";
import { getFindingGuide } from "@/features/prepare/findingGuide";

const ROOT = path.resolve(__dirname, "../../..");

const M5_CODES = [
  "AUDIO_DYNAMICS_CRUSHED",
  "AUDIO_LRA_LOW",
  "AUDIO_STEREO_NARROW",
  "AUDIO_STEREO_OUT_OF_PHASE",
  "AUDIO_SPECTRAL_BASS_HEAVY",
  "AUDIO_SPECTRAL_BRIGHT",
  "AUDIO_SPECTRAL_THIN",
  "AUDIO_CLIPPING_SAMPLES",
  "AUDIO_SILENCE_LEAD_IN",
  "AUDIO_SILENCE_LEAD_OUT",
  "AUDIO_DC_OFFSET",
  "AUDIO_MONO_COMPAT_LOSS",
  "AUDIO_CHANNEL_IMBALANCE",
  "AUDIO_MOMENTARY_SPIKE",
  "AUDIO_PLR_LOW",
  "AUDIO_STEREO_SIDE_HEAVY",
  "AUDIO_IS_PEAK_RISK",
  "AUDIO_MAINS_HUM",
  "AUDIO_CLICK_POP",
  "AUDIO_FINISH_OVERPROCESSED",
] as const;

/** Minimal mono 16-bit PCM WAV. */
function makeSineWav(seconds = 1, sampleRate = 8000, amp = 0.5): ArrayBuffer {
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

/**
 * M5 exit-gate starter — Masterplan §10 Advanced Analysis Suite.
 * Gate: Analysis provides value beyond basic readiness; findings reproducible,
 * understandable, actionable; performance acceptable on supported files and devices.
 */
describe("M5 advanced analysis gate", () => {
  it("cites the M5 gate and ships m5 waveform analysis", () => {
    expect(PROCESSING_VERSION).toMatch(/^m5\.waveform/);
    const readiness = readFileSync(
      path.join(ROOT, "packages/domain/releases/src/readiness.ts"),
      "utf8"
    );
    for (const code of M5_CODES) {
      expect(readiness).toContain(code);
    }
  });

  it("is reproducible for crest, correlation, and click/pop helpers", () => {
    expect(measureCrestFactorDb(-6, -12)).toBe(measureCrestFactorDb(-6, -12));
    const a = new Float32Array(128);
    for (let i = 0; i < a.length; i++) a[i] = Math.sin(i / 7);
    expect(measureStereoCorrelation([a, a.slice()])).toBe(
      measureStereoCorrelation([a, a.slice()])
    );
    const pcm = new Float32Array(4800);
    for (let i = 0; i < pcm.length; i++) pcm[i] = Math.sin((2 * Math.PI * 440 * i) / 48000) * 0.2;
    pcm[2400] = 0.95;
    expect(measureClickPop(pcm, 48000)).toEqual(measureClickPop(pcm, 48000));
  });

  it("emits actionable findings beyond basic readiness", () => {
    const findings = evaluateReadiness({
      title: "Song",
      artistName: "Artist",
      hasAudio: true,
      hasArtwork: false,
      audio: {
        fileName: "x.wav",
        mimeType: "audio/wav",
        sizeBytes: 100,
        sampleRate: 48000,
        durationSeconds: 60,
        loudnessMeasured: true,
        peakDbfs: -2,
        rmsDbfs: -5,
        crestFactorDb: 3,
        stereoCorrelation: 0.99,
        loudnessRangeLu: 1.5,
        spectralBalance: { lowShare: 0.1, midShare: 0.2, highShare: 0.7 },
        integratedLufs: -14,
      },
    });
    const codes = findings.map((f) => f.code);
    expect(codes).toEqual(expect.arrayContaining(["AUDIO_DYNAMICS_CRUSHED", "AUDIO_STEREO_NARROW"]));
    expect(codes).toEqual(expect.arrayContaining(["AUDIO_SPECTRAL_BRIGHT", "AUDIO_LRA_LOW"]));
  });

  it("provides why + fix guides for every M5 finding code", () => {
    for (const code of M5_CODES) {
      const guide = getFindingGuide(code);
      expect(guide?.why?.length).toBeGreaterThan(10);
      expect(guide?.fix?.length).toBeGreaterThan(10);
    }
  });

  it("analyzes a short WAV under a generous performance budget", () => {
    const buf = makeSineWav(2, 16000, 0.4);
    const t0 = Date.now();
    const result = analyzeWavBuffer(buf, { includeSpectrum: true, bucketCount: 64 });
    const ms = Date.now() - t0;
    expect(result.crestFactorDb).toBeTypeOf("number");
    expect(result.spectralBalance).toBeTruthy();
    expect(result.clippedSamples).toBeTypeOf("number");
    expect(result.silenceLeadInSeconds).toBeTypeOf("number");
    expect(result.clickPopCount).toBeTypeOf("number");
    expect(result.clickPopProminenceDb).toBeTypeOf("number");
    expect(ms).toBeLessThan(2000);
  });

  it("surfaces an Advanced Analysis panel component for measured probes", () => {
    const panel = readFileSync(
      path.join(ROOT, "src/features/prepare/AdvancedAnalysisPanel.tsx"),
      "utf8"
    );
    const detail = readFileSync(
      path.join(ROOT, "src/features/prepare/ReleaseDetailPage.tsx"),
      "utf8"
    );
    expect(panel).toContain("prepare-advanced-analysis");
    expect(panel).toContain("Not measured");
    expect(detail).toContain("AdvancedAnalysisPanel");
  });
});
