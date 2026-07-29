import type { FindingSeverity, ReleaseStatus } from "@vybz/domain/releases";
import type { BadgeTone } from "@/components/ui/Badge";

export function severityTone(severity: FindingSeverity): BadgeTone {
  switch (severity) {
    case "blocking":
      return "danger";
    case "warning":
      return "warning";
    default:
      return "info";
  }
}

export function statusTone(status: ReleaseStatus): BadgeTone {
  switch (status) {
    case "ready":
      return "success";
    case "blocked":
      return "danger";
    case "scanning":
      return "info";
    case "archived":
      return "neutral";
    default:
      return "accent";
  }
}

export function countBySeverity(findings: { severity: FindingSeverity; status: string }[]) {
  const open = findings.filter((f) => f.status === "open");
  return {
    blocking: open.filter((f) => f.severity === "blocking").length,
    warning: open.filter((f) => f.severity === "warning").length,
    info: open.filter((f) => f.severity === "info").length,
    total: open.length,
  };
}
