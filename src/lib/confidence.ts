// Human-readable confidence read for a match's evidence strength (§5.4k).
// Confidence (0..1) blends how many independent signals corroborate a match
// with the fit magnitude — a higher read means more reasons to trust it.

export interface ConfidenceRead {
  label: string;
  /** Tailwind text colour token for the label + dot. */
  tone: string;
  /** Rounded 0–100 percentage for tooltips / labels. */
  pct: number;
}

export function confidenceRead(c: number): ConfidenceRead {
  const pct = Math.round((c ?? 0) * 100);
  if (c >= 0.7) return { label: "High confidence", tone: "text-emerald-300", pct };
  if (c >= 0.45) return { label: "Solid confidence", tone: "text-aqua-200", pct };
  if (c >= 0.25) return { label: "Emerging", tone: "text-amber-300", pct };
  return { label: "Exploratory", tone: "text-white/45", pct };
}
