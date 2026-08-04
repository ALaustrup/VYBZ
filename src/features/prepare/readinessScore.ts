import type { FindingSeverity, ReleaseFinding, ReleaseStatus } from "@vybz/domain/releases";

export type ReadinessLevel = "hold" | "caution" | "ready";

export type ReadinessSummary = {
  level: ReadinessLevel;
  headline: string;
  subline: string;
  /** Display score 0–100 derived from open findings only. */
  score: number;
};

function openFindings(findings: ReleaseFinding[]): ReleaseFinding[] {
  return findings.filter((f) => f.status === "open");
}

/** Color-measure readiness — derived from measured findings, never fabricated. */
export function summarizeReadiness(
  findings: ReleaseFinding[],
  status: ReleaseStatus
): ReadinessSummary {
  const open = openFindings(findings);
  const blocking = open.filter((f) => f.severity === "blocking").length;
  const warning = open.filter((f) => f.severity === "warning").length;
  const info = open.filter((f) => f.severity === "info").length;

  let score = 100;
  score -= blocking * 28;
  score -= warning * 12;
  score -= info * 4;
  score = Math.max(0, Math.min(100, score));

  if (status === "ready" || (blocking === 0 && warning === 0 && open.length === 0)) {
    return {
      level: "ready",
      headline: "Release ready",
      subline: "Your track and artwork passed every check we could measure.",
      score,
    };
  }

  if (blocking > 0) {
    return {
      level: "hold",
      headline: "Hold before you release",
      subline:
        blocking === 1
          ? "One critical issue needs your attention first."
          : `${blocking} critical issues need fixing before release.`,
      score,
    };
  }

  return {
    level: "caution",
    headline: "Almost there",
    subline:
      warning === 1
        ? "One item could hold up distribution — review when you're ready."
        : `${warning} items could hold up distribution — review when you're ready.`,
    score,
  };
}

export function levelTone(level: ReadinessLevel): "danger" | "warning" | "success" {
  switch (level) {
    case "hold":
      return "danger";
    case "caution":
      return "warning";
    default:
      return "success";
  }
}

export function severityLabel(severity: FindingSeverity): string {
  switch (severity) {
    case "blocking":
      return "Fix first";
    case "warning":
      return "Review";
    default:
      return "Note";
  }
}
