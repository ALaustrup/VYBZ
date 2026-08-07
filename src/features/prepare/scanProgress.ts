/**
 * Shared scan-progress stages for Prepare / Finalize analysis.
 * Percents are authoritative UI bounds; workers may refine within a stage.
 */

export type ScanProgressStage =
  | "idle"
  | "reading"
  | "container"
  | "decoding"
  | "measuring"
  | "artwork"
  | "saving"
  | "done";

export type ScanProgress = {
  stage: ScanProgressStage;
  /** 0–100 determinate progress. */
  percent: number;
  /** Human-readable line for the scanning meter. */
  label: string;
};

export const SCAN_STAGE_LABELS: Record<ScanProgressStage, string> = {
  idle: "Waiting…",
  reading: "Reading your master…",
  container: "Inspecting the container…",
  decoding: "Decoding PCM…",
  measuring: "Measuring loudness and true peak…",
  artwork: "Checking artwork dimensions…",
  saving: "Building your release report…",
  done: "Scan finished",
};

export function scanProgress(
  stage: ScanProgressStage,
  percent: number,
  label?: string
): ScanProgress {
  return {
    stage,
    percent: Math.max(0, Math.min(100, Math.round(percent))),
    label: label ?? SCAN_STAGE_LABELS[stage],
  };
}
