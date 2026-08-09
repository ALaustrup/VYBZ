/**
 * Finding code → on-platform auto-fix (Tier A ship / Tier B roadmap / Tier C manual).
 * Only `tier: "ship"` may show a Fix button.
 */

export type AutoFixOp =
  | "dc"
  | "peak"
  | "balance"
  | "silence"
  | "level"
  | "hum"
  | "widthWiden"
  | "widthNarrow"
  | "eqCutBass"
  | "eqCutBright"
  | "eqBoostLow"
  | "click"
  | "loudness";
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
  AUDIO_MAINS_HUM: {
    op: "hum",
    label: "Reduce mains hum (50/60 Hz)",
    tier: "ship",
    disclosure: "Narrow notch assist at measured mains + light harmonics — re-check after.",
  },
  AUDIO_STEREO_NARROW: {
    op: "widthWiden",
    label: "Widen stereo (gentle)",
    tier: "ship",
    disclosure: "Mid/side widen assist with mono-compat guard — re-check after.",
  },
  AUDIO_STEREO_SIDE_HEAVY: {
    op: "widthNarrow",
    label: "Reduce stereo width",
    tier: "ship",
    disclosure: "Mid/side narrow assist — re-check after.",
  },
  AUDIO_STEREO_OUT_OF_PHASE: {
    op: "widthNarrow",
    label: "Reduce stereo width",
    tier: "ship",
    disclosure: "Mid/side narrow assist for phase risk — re-check after. Not a polarity flip.",
  },
  AUDIO_MONO_COMPAT_LOSS: {
    op: "widthNarrow",
    label: "Improve mono compatibility",
    tier: "ship",
    disclosure: "Mid/side narrow assist — re-check after.",
  },
  AUDIO_SPECTRAL_BASS_HEAVY: {
    op: "eqCutBass",
    label: "Ease low end (gentle shelf)",
    tier: "ship",
    disclosure: "Soft low-shelf assist — re-check after. Not a mix rewrite.",
  },
  AUDIO_SPECTRAL_BRIGHT: {
    op: "eqCutBright",
    label: "Ease brightness (gentle shelf)",
    tier: "ship",
    disclosure: "Soft high-shelf assist — re-check after. Not a mix rewrite.",
  },
  AUDIO_SPECTRAL_THIN: {
    op: "eqBoostLow",
    label: "Add low support (gentle shelf)",
    tier: "ship",
    disclosure: "Soft low-shelf assist — re-check after. Not a mix rewrite.",
  },
  AUDIO_LOUDNESS_QUIET: {
    op: "loudness",
    label: "Level toward −14 LUFS (BS.1770)",
    tier: "ship",
    disclosure: "BS.1770 gain-to-target + peak ceiling — re-check after. Not a distributor certification.",
  },
  AUDIO_LOUDNESS_HOT: {
    op: "loudness",
    label: "Level toward −14 LUFS (BS.1770)",
    tier: "ship",
    disclosure: "BS.1770 gain-to-target + peak ceiling — re-check after. Not a distributor certification.",
  },
  AUDIO_CLICK_POP: {
    op: "click",
    label: "Soften clicks / pops",
    tier: "ship",
    disclosure: "Short interpolation assist — high false-positive risk; re-check by ear.",
  },
};

const ROADMAP = new Set<string>();

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
