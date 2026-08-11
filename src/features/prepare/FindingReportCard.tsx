import type { ReleaseFinding } from "@vybz/domain/releases";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { getFindingGuide } from "@/features/prepare/findingGuide";
import { nextDeskForFinding } from "@/features/prepare/nextDeskFromFindings";
import { severityTone } from "@/features/prepare/severity";

export function FindingReportCard({
  finding,
  releaseId,
}: {
  finding: ReleaseFinding;
  releaseId?: string | null;
}) {
  const guide = getFindingGuide(finding.code);
  const next = nextDeskForFinding(finding, { releaseId });

  return (
    <li className="forge-card" data-testid={`prepare-finding-${finding.code}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={severityTone(finding.severity)}>{finding.severity}</Badge>
        <Badge tone="neutral">{finding.category}</Badge>
        <span className="font-medium text-snow">{finding.title}</span>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-fog">{finding.detail}</p>

      {guide ? (
        <div className="mt-4 space-y-3 border-t border-white/[0.06] pt-3 text-sm">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Why it matters</p>
            <p className="mt-1 leading-relaxed text-white/55">{guide.why}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">How to fix</p>
            <p className="mt-1 leading-relaxed text-white/70">{guide.fix}</p>
          </div>
          {guide.target ? (
            <p className="font-mono text-[11px] text-suite-cyan/80">Target: {guide.target}</p>
          ) : null}
        </div>
      ) : null}

      {next ? (
        <div className="mt-3 border-t border-white/[0.06] pt-3">
          <Link
            to={next.href}
            className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--app-accent-rgb)/0.35)] bg-[rgb(var(--app-accent-rgb)/0.1)] px-3 py-1.5 text-[12px] text-white/85 transition hover:border-[rgb(var(--app-accent-rgb)/0.55)] hover:text-white"
            data-testid={`finding-next-desk-${finding.code}`}
          >
            {next.label}
            <ArrowRight className="h-3 w-3 opacity-70" aria-hidden />
          </Link>
        </div>
      ) : null}
    </li>
  );
}
