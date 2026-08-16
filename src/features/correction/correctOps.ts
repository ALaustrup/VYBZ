/**
 * Correct desk op ids + deep-link resolution.
 * Analyzer/Translate AutoFix fine ops map onto the nine Correct chips.
 */

export type CorrectOp =
  | "dc"
  | "peak"
  | "balance"
  | "silence"
  | "hum"
  | "width"
  | "eq"
  | "click"
  | "loudness";

export const CORRECT_OP_SUBTITLE: Record<CorrectOp, string> = {
  dc: "DC offset",
  peak: "Peak safety",
  balance: "Channel balance",
  silence: "Silence trim",
  hum: "Mains hum",
  width: "Stereo width",
  eq: "EQ assist",
  click: "Click soften",
  loudness: "Loudness gain",
};

const AUTOFIX_TO_CORRECT: Record<string, CorrectOp> = {
  dc: "dc",
  peak: "peak",
  balance: "balance",
  silence: "silence",
  hum: "hum",
  click: "click",
  loudness: "loudness",
  level: "loudness",
  widthWiden: "width",
  widthNarrow: "width",
  eqCutBass: "eq",
  eqCutBright: "eq",
  eqBoostLow: "eq",
};

export function isCorrectOp(value: string | null | undefined): value is CorrectOp {
  return value != null && Object.prototype.hasOwnProperty.call(CORRECT_OP_SUBTITLE, value);
}

/**
 * Resolve `?op=` from Correct chips or AutoFix fine-grained ids.
 * Unknown values fall back to DC only after mapping is attempted.
 */
export function resolveCorrectOpFromQuery(value: string | null | undefined): CorrectOp {
  if (!value) return "dc";
  if (isCorrectOp(value)) return value;
  const mapped = AUTOFIX_TO_CORRECT[value];
  return mapped ?? "dc";
}
