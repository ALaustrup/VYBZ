/**
 * Finding code → on-platform auto-fix (Tier A ship / Tier B roadmap / Tier C manual).
 * Only `tier: "ship"` may show a Fix button.
 */

export type AutoFixOp = "dc" | "peak" | "balance" | "silence" | "level";
export type AutoFixTier = "ship" | "roadmap" | "manual";

export type AutoFixMapping = {
  op: AutoFixOp;
  label: string;
  tier: AutoFixTier;
  /** Extra honesty line for leveling / destructive assists. */
  disclosure?: string;
};

const SHIP: Record<string, AutoFixMapping> = {
  AUDIO_DC_OFFSET: { op: "dc", label: "Remove DC offset", tier: "ship" },
  AUDIO_PEAK_HOT: { op: "peak", label: "Bring peaks into a safe ceiling", tier: "ship" },
  AUDIO_PEAK_CLIP: { op: "peak", label: "Bring peaks into a safe ceiling", tier: "ship" },
  AUDIO_CLIPPING_SAMPLES: { op: "peak", label: "Bring peaks into a safe ceiling", tier: "ship" },
  AUDIO_TRUE_PEAK_HOT: { op: "peak", label: "Bring peaks into a safe ceiling", tier: "ship" },
  AUDIO_IS_PEAK_RISK: { op: "peak", label: "Bring peaks into a safe ceiling", tier: "ship" },
  AUDIO_MOMENTARY_SPIKE: { op: "peak", label: "Bring peaks into a safe ceiling", tier: "ship" },
  AUDIO_CHANNEL_IMBALANCE: { op: "balance", label: "Balance L/R", tier: "ship" },
  AUDIO_SILENCE_LEAD_IN: { op: "silence", label: "Trim edge silence", tier: "ship" },
  AUDIO_SILENCE_LEAD_OUT: { op: "silence", label: "Trim edge silence", tier: "ship" },
  AUDIO_LOUDNESS_QUIET: {
    op: "level",
    label: "Level toward streaming loudness (−14)",
    tier: "ship",
    disclosure: "On-device level assist — re-check after. Not a distributor certification.",
  },
  AUDIO_LOUDNESS_HOT: {
    op: "level",
    label: "Level toward streaming loudness (−14)",
    tier: "ship",
    disclosure: "On-device level assist — re-check after. Not a distributor certification.",
  },
};

const ROADMAP = new Set([
  "AUDIO_MAINS_HUM",
  "AUDIO_STEREO_NARROW",
  "AUDIO_STEREO_SIDE_HEAVY",
  "AUDIO_STEREO_OUT_OF_PHASE",
  "AUDIO_MONO_COMPAT_LOSS",
  "AUDIO_SPECTRAL_BASS_HEAVY",
  "AUDIO_SPECTRAL_BRIGHT",
  "AUDIO_SPECTRAL_THIN",
  "AUDIO_CLICK_POP",
]);

const MANUAL = new Set([
  "AUDIO_LOSSY_MASTER",
  "AUDIO_SAMPLE_RATE_LOW",
  "AUDIO_DURATION_SHORT",
  "AUDIO_EMPTY",
  "AUDIO_MISSING",
  "AUDIO_FORMAT_UNKNOWN",
  "AUDIO_DYNAMICS_CRUSHED",
  "AUDIO_LRA_LOW",
  "AUDIO_PLR_LOW",
  "AUDIO_LOUDNESS_NOT_MEASURED",
]);

export function autoFixForCode(code: string): AutoFixMapping | null {
  const ship = SHIP[code];
  if (ship) return ship;
  if (ROADMAP.has(code)) {
    return { op: "peak", label: "Roadmap Correct op", tier: "roadmap" };
  }
  if (MANUAL.has(code)) {
    return { op: "peak", label: "Needs a new bounce from your DAW", tier: "manual" };
  }
  return null;
}

/** Ship-tier mapping only — safe to show Fix. */
export function shipAutoFixForCode(code: string): AutoFixMapping | null {
  const m = autoFixForCode(code);
  return m?.tier === "ship" ? m : null;
}

export function shippedAutoFixCodes(): string[] {
  return Object.keys(SHIP);
}
