import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CODEC_TRANSLATION_VERSION,
  STREAMING_NORM_PREVIEW_VERSION,
  applyCodecTranslationPreview,
  applyStreamingNormPreview,
} from "@vybz/processing/waveform";

const ROOT = path.resolve(__dirname, "../../..");

/**
 * M7 exit-gate starter — Masterplan §10 Translation Lab.
 * Gate: Simulations clearly labelled; claims technically honest; original / master /
 * preview comparable; translation findings lead to actionable corrections.
 */
describe("M7 translation gate", () => {
  it("cites the M7 gate and ships a versioned streaming-norm preview", () => {
    const masterplan = readFileSync(path.join(ROOT, "VYBZ_MASTERPLAN.md"), "utf8");
    expect(masterplan).toMatch(/M7.*Translation|Translation Lab/s);
    expect(STREAMING_NORM_PREVIEW_VERSION).toMatch(/^m7\./);
  });

  it("surfaces Translation Lab with disclosure and original/preview compare", () => {
    const page = readFileSync(
      path.join(ROOT, "src/features/translation/TranslationLabPage.tsx"),
      "utf8"
    );
    const app = readFileSync(path.join(ROOT, "src/App.tsx"), "utf8");
    expect(page).toContain("translation-lab");
    expect(page).toContain("translate-disclosure");
    expect(page).toContain("translate-mode-original");
    expect(page).toContain("translate-mode-streaming");
    expect(page).toContain("translate-mode-phone");
    expect(page).toContain("translate-mode-car");
    expect(page).toContain("translate-mode-lossy");
    expect(page).toContain("translate-play-vdock");
    expect(page).toContain("playTrack");
    expect(page).toContain("simulationSignal");
    expect(page).not.toContain("<audio");
    expect(page.toLowerCase()).toMatch(/not exact[\s\S]*platform/);
    const dsp = readFileSync(
      path.join(ROOT, "packages/processing/waveform/src/streamingNormPreview.ts"),
      "utf8"
    );
    expect(dsp.toLowerCase()).toContain("not an exact emulation");
    const device = readFileSync(
      path.join(ROOT, "packages/processing/waveform/src/deviceTranslationPreview.ts"),
      "utf8"
    );
    expect(device.toLowerCase()).toContain("not a measured");
    const codec = readFileSync(
      path.join(ROOT, "packages/processing/waveform/src/codecTranslationPreview.ts"),
      "utf8"
    );
    expect(codec.toLowerCase()).toContain("not a measured");
    expect(CODEC_TRANSLATION_VERSION).toMatch(/^m7\./);
    expect(app).toContain("/tools/translate");
  });

  it("streaming preview is reproducible and non-destructive", () => {
    const sr = 48000;
    const n = Math.floor(3 * sr);
    const original = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      original[i] = Math.sin((2 * Math.PI * 1000 * i) / sr) * 0.03;
    }
    const clone = original.slice();
    const first = applyStreamingNormPreview([original], sr);
    const second = applyStreamingNormPreview([original], sr);
    expect(original).toEqual(clone);
    expect(first.channels[0]).toEqual(second.channels[0]);
    expect(first.disclosure.toLowerCase()).toContain("not an exact emulation");
  });

  it("codec preview is reproducible and non-destructive", () => {
    const sr = 48000;
    const n = Math.floor(1 * sr);
    const original = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      original[i] = Math.sin((2 * Math.PI * 1000 * i) / sr) * 0.2;
    }
    const clone = original.slice();
    const first = applyCodecTranslationPreview([original], sr);
    const second = applyCodecTranslationPreview([original], sr);
    expect(original).toEqual(clone);
    expect(first.channels[0]).toEqual(second.channels[0]);
    expect(first.disclosure.toLowerCase()).toContain("not a measured");
  });
});
