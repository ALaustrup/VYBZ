/**
 * Analyzer-surface readiness — audio check only.
 * Artwork findings never block the Ready badge on the intake desk.
 */

export type FindingLike = {
  code: string;
  severity: "blocking" | "warning" | "info" | string;
  status: "open" | "resolved" | "dismissed" | string;
  title?: string;
};

export function isArtworkFindingCode(code: string): boolean {
  return code.startsWith("ARTWORK_");
}

/** True when no open blocking *audio* (non-artwork) findings remain. */
export function isAnalyzerAudioReady(findings: readonly FindingLike[]): boolean {
  return !findings.some(
    (f) => f.status === "open" && f.severity === "blocking" && !isArtworkFindingCode(f.code),
  );
}

/** Highest-priority open non-artwork issue for triage subtitle (blocking first). */
export function topAnalyzerIssue(findings: readonly FindingLike[]): FindingLike | null {
  const open = findings.filter((f) => f.status === "open" && !isArtworkFindingCode(f.code));
  const blocking = open.filter((f) => f.severity === "blocking");
  const pool = blocking.length > 0 ? blocking : open.filter((f) => f.severity === "warning");
  return pool[0] ?? open[0] ?? null;
}

/** Integrated loudness for batch consistency (prefer BS.1770, else approx). */
export function loudnessFromProbe(probe: Record<string, unknown> | null | undefined): number | null {
  if (!probe) return null;
  const lufs = probe.integratedLufs;
  if (typeof lufs === "number" && Number.isFinite(lufs)) return lufs;
  const approx = probe.integratedLufsApprox;
  if (typeof approx === "number" && Number.isFinite(approx)) return approx;
  return null;
}

export function batchLoudnessSpreadLu(values: readonly number[]): number | null {
  if (values.length < 2) return null;
  let min = values[0]!;
  let max = values[0]!;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return max - min;
}
