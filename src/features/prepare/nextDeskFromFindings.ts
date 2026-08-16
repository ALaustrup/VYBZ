/**
 * OR-035 — measured “What next” desks from open finding codes only.
 * No invented readiness scores. Reuses AutoFix ship map for Correct deep links.
 */

import { shipAutoFixForCode } from "@/features/prepare/autoFixMap";
import type { FindingLike } from "@/features/prepare/analyzerReady";

export type NextDeskId = "correct" | "translate" | "metadata" | "art-check" | "release";

export type NextDeskStep = {
  desk: NextDeskId;
  href: string;
  label: string;
  code: string;
  severity: string;
};

const SEVERITY_RANK: Record<string, number> = {
  blocking: 0,
  warning: 1,
  info: 2,
};

function openFindings(findings: readonly FindingLike[]): FindingLike[] {
  return findings.filter((f) => f.status === "open");
}

function deskForCode(
  code: string,
  releaseId: string | null | undefined,
): { desk: NextDeskId; href: string; label: string } | null {
  if (code.startsWith("ARTWORK_")) {
    return { desk: "art-check", href: "/tools/art-check", label: "Cover" };
  }
  if (code.startsWith("METADATA_")) {
    return { desk: "metadata", href: "/tools/metadata", label: "Names" };
  }

  const ship = shipAutoFixForCode(code);
  if (ship) {
    const correctHref = `/tools/correct?op=${encodeURIComponent(ship.op)}`;
    if (ship.op === "loudness") {
      // Loudness ship → Correct primary; Translation Lab as travel preview is separate.
      return { desk: "correct", href: correctHref, label: `Fix · ${ship.label}` };
    }
    return { desk: "correct", href: correctHref, label: `Fix · ${ship.label}` };
  }

  if (code.startsWith("AUDIO_")) {
    if (releaseId) {
      return {
        desk: "release",
        href: `/release/${releaseId}`,
        label: "Open report",
      };
    }
    return { desk: "correct", href: "/tools/correct", label: "Open Fix" };
  }

  return null;
}

/** Optional second step for loudness ship codes — Translation Lab preview only. */
function translationCompanion(code: string): NextDeskStep | null {
  const ship = shipAutoFixForCode(code);
  if (!ship || ship.op !== "loudness") return null;
  return {
    desk: "translate",
    href: "/tools/translate",
    label: "Listen check",
    code,
    severity: "info",
  };
}

/**
 * Ordered, deduped next-desk steps from open findings.
 * Blocking first; at most one step per desk; cap 5.
 */
export function nextDeskStepsFromFindings(
  findings: readonly FindingLike[],
  opts?: { releaseId?: string | null; limit?: number },
): NextDeskStep[] {
  const limit = opts?.limit ?? 5;
  const releaseId = opts?.releaseId ?? null;
  const open = openFindings(findings).slice().sort((a, b) => {
    const ra = SEVERITY_RANK[a.severity] ?? 9;
    const rb = SEVERITY_RANK[b.severity] ?? 9;
    if (ra !== rb) return ra - rb;
    return a.code.localeCompare(b.code);
  });

  const steps: NextDeskStep[] = [];
  const seenDesk = new Set<NextDeskId>();

  for (const f of open) {
    if (steps.length >= limit) break;
    const mapped = deskForCode(f.code, releaseId);
    if (!mapped) continue;
    if (seenDesk.has(mapped.desk)) continue;
    seenDesk.add(mapped.desk);
    steps.push({
      desk: mapped.desk,
      href: mapped.href,
      label: mapped.label,
      code: f.code,
      severity: f.severity,
    });

    if (steps.length < limit && !seenDesk.has("translate")) {
      const companion = translationCompanion(f.code);
      if (companion) {
        seenDesk.add("translate");
        steps.push(companion);
      }
    }
  }

  return steps;
}

/** Single finding → one primary CTA (for FindingReportCard). */
export function nextDeskForFinding(
  finding: FindingLike,
  opts?: { releaseId?: string | null },
): NextDeskStep | null {
  if (finding.status !== "open") return null;
  return nextDeskStepsFromFindings([finding], { releaseId: opts?.releaseId, limit: 1 })[0] ?? null;
}
