import type { StreamingNormPreviewResult } from "./streamingNormPreview";

export const TRANSLATION_FINDINGS_VERSION = "m7.translation-findings.1";
export const TRANSLATION_ACTION_GAIN_DB = 1;

export type TranslationFindingCode =
  | "AUDIO_LOUDNESS_HOT"
  | "AUDIO_LOUDNESS_QUIET";

export type TranslationFinding = {
  code: TranslationFindingCode;
  severity: "warning" | "info";
  title: string;
  detail: string;
};

type TranslationFindingInput = Pick<
  StreamingNormPreviewResult,
  "integratedLufsBefore" | "gainDb" | "targetLufs"
>;

function formatSigned(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

/**
 * Turn measured streaming-preview deltas into deterministic findings.
 * The 1 dB action threshold is a versioned VYBZ rule, not a platform claim.
 */
export function evaluateTranslationFindings(
  input: TranslationFindingInput,
): TranslationFinding[] {
  const { integratedLufsBefore, gainDb, targetLufs } = input;
  if (
    !Number.isFinite(integratedLufsBefore) ||
    !Number.isFinite(gainDb) ||
    !Number.isFinite(targetLufs) ||
    integratedLufsBefore <= -70
  ) {
    return [];
  }

  const deltaDb = integratedLufsBefore - targetLufs;
  if (deltaDb >= TRANSLATION_ACTION_GAIN_DB) {
    return [{
      code: "AUDIO_LOUDNESS_HOT",
      severity: "warning",
      title: "Streaming preview turns this master down",
      detail: `${integratedLufsBefore.toFixed(1)} LUFS is ${deltaDb.toFixed(1)} dB above the ${targetLufs.toFixed(1)} LUFS preview target; measured preview gain is ${formatSigned(gainDb)} dB.`,
    }];
  }

  if (deltaDb <= -TRANSLATION_ACTION_GAIN_DB) {
    return [{
      code: "AUDIO_LOUDNESS_QUIET",
      severity: "info",
      title: "Streaming preview turns this master up",
      detail: `${integratedLufsBefore.toFixed(1)} LUFS is ${Math.abs(deltaDb).toFixed(1)} dB below the ${targetLufs.toFixed(1)} LUFS preview target; measured preview gain is ${formatSigned(gainDb)} dB.`,
    }];
  }

  return [];
}
