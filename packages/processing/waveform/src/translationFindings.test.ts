import { describe, expect, it } from "vitest";
import {
  TRANSLATION_ACTION_GAIN_DB,
  TRANSLATION_FINDINGS_VERSION,
  evaluateTranslationFindings,
} from "./translationFindings";

describe("M7 translation findings", () => {
  it("emits a reproducible hot finding from measured values", () => {
    const input = {
      integratedLufsBefore: -9,
      targetLufs: -14,
      gainDb: -5,
    };

    const first = evaluateTranslationFindings(input);
    const second = evaluateTranslationFindings(input);

    expect(first).toEqual(second);
    expect(first[0]?.code).toBe("AUDIO_LOUDNESS_HOT");
    expect(first[0]?.detail).toContain("-9.0 LUFS");
    expect(first[0]?.detail).toContain("-5.0 dB");
    expect(TRANSLATION_FINDINGS_VERSION).toMatch(/^m7\./);
  });

  it("emits a quiet finding and preserves measured gain in its detail", () => {
    const findings = evaluateTranslationFindings({
      integratedLufsBefore: -20,
      targetLufs: -14,
      gainDb: 6,
    });

    expect(findings[0]?.code).toBe("AUDIO_LOUDNESS_QUIET");
    expect(findings[0]?.detail).toContain("+6.0 dB");
  });

  it("does not invent a finding inside the versioned action threshold", () => {
    expect(evaluateTranslationFindings({
      integratedLufsBefore: -14 + TRANSLATION_ACTION_GAIN_DB / 2,
      targetLufs: -14,
      gainDb: -TRANSLATION_ACTION_GAIN_DB / 2,
    })).toEqual([]);
  });

  it("does not report non-finite or gated-silence measurements", () => {
    expect(evaluateTranslationFindings({
      integratedLufsBefore: Number.NaN,
      targetLufs: -14,
      gainDb: 0,
    })).toEqual([]);
    expect(evaluateTranslationFindings({
      integratedLufsBefore: -70,
      targetLufs: -14,
      gainDb: 0,
    })).toEqual([]);
  });
});
