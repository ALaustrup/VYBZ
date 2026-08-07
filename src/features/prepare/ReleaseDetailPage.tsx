import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronDown, Package, SlidersHorizontal, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StateView } from "@/components/states/StateView";
import { useSession } from "@/store/session";
import { useShellMode } from "@/platform/bridge/PlatformProvider";
import { getPrepareOwnerId, getReleaseBundle } from "@/features/prepare/service";
import { FindingsReadOnly } from "@/features/prepare/FindingsReadOnly";
import { FindingReportCard } from "@/features/prepare/FindingReportCard";
import { countBySeverity, statusTone } from "@/features/prepare/severity";
import { ReadinessScoreHero } from "@/features/prepare/ReadinessScoreHero";
import { summarizeReadiness } from "@/features/prepare/readinessScore";
import { PublishToCatalogCard } from "@/features/prepare/PublishToCatalogCard";
import { AdvancedAnalysisPanel } from "@/features/prepare/AdvancedAnalysisPanel";
import { peekPendingAudio, type PendingAudio } from "@/features/prepare/pendingUpload";
import type { AudioProbe, FindingSeverity, ReleaseBundle } from "@vybz/domain/releases";

const SEVERITY_FILTER: Array<"all" | FindingSeverity> = ["all", "blocking", "warning", "info"];

const NEXT_STEPS = [
  { slug: "credits", label: "Credits", hint: "Who made it", icon: Users, testId: "prepare-open-credits" },
  { slug: "master", label: "Master", hint: "Polish the sound", icon: SlidersHorizontal, testId: "prepare-open-master" },
  { slug: "distribution", label: "Package", hint: "Export for release", icon: Package, testId: "prepare-open-distribution" },
] as const;

export function ReleaseDetailPage() {
  const { id } = useParams();
  const { userId } = useSession();
  const shell = useShellMode();
  const ownerId = getPrepareOwnerId(userId);
  const [bundle, setBundle] = useState<ReleaseBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severity, setSeverity] = useState<"all" | FindingSeverity>("all");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [pending, setPending] = useState<PendingAudio | null>(null);
  const [publishedDropId, setPublishedDropId] = useState<string | null>(null);

  useEffect(() => {
    setPending(id ? peekPendingAudio(id) : null);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const next = await getReleaseBundle(ownerId, id);
        if (!cancelled) setBundle(next);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load release");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, ownerId]);

  const counts = useMemo(() => countBySeverity(bundle?.findings ?? []), [bundle]);

  const findings = useMemo(() => {
    const open = (bundle?.findings ?? []).filter((f) => f.status === "open");
    return severity === "all" ? open : open.filter((f) => f.severity === severity);
  }, [bundle, severity]);

  const summary = useMemo(
    () => (bundle ? summarizeReadiness(bundle.findings, bundle.project.status) : null),
    [bundle]
  );

  if (loading) {
    return <StateView variant="loading" title="Loading your release" />;
  }
  if (error) {
    return <StateView variant="error" title="Could not load release" body={error} />;
  }
  if (!bundle || !summary) {
    return (
      <StateView
        variant="empty"
        title="Release not found"
        body="It may have been deleted or belongs to another account."
        action={
          <Link className="text-suite-cyan underline" to="/releases">
            Back to releases
          </Link>
        }
      />
    );
  }

  const { project } = bundle;
  const audioProbe = (bundle.assets.find((a) => a.kind === "audio")?.probe ?? null) as AudioProbe | null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-12 md:pb-16" data-testid="prepare-detail">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <Link to="/releases" className="text-fog hover:text-snow">
          ← Your releases
        </Link>
        <Badge tone={statusTone(project.status)} data-testid="prepare-detail-status">
          {project.status}
        </Badge>
      </div>

      <ReadinessScoreHero summary={summary} title={project.title} artistName={project.artistName} />
      <AdvancedAnalysisPanel probe={audioProbe} />
      <h1 className="sr-only" data-testid="prepare-detail-title">
        {project.title}
      </h1>

      {publishedDropId ? (
        <section className="forge-card flex flex-wrap items-center gap-3" data-testid="published-track">
          <p className="min-w-0 flex-1 text-sm text-white/70">
            Published to your catalog. It is now playable and open to comments.
          </p>
          <Link to={`/track/${publishedDropId}`} className="forge-cta !min-h-9 !px-3 !text-xs">
            Open track
          </Link>
        </section>
      ) : pending ? (
        <PublishToCatalogCard pending={pending} onPublished={setPublishedDropId} />
      ) : (
        <p className="px-1 text-[11px] leading-relaxed text-white/30" data-testid="audio-not-stored">
          This scan measured your audio in the browser and did not upload it, so there is nothing to
          play here. Run a new scan and choose Publish if you want the track in your catalog.
        </p>
      )}

      <nav aria-label="Release workspace" className="grid gap-2 sm:grid-cols-3">
        {NEXT_STEPS.map((step) => (
          <Link
            key={step.slug}
            to={`/release/${project.id}/${step.slug}`}
            className="forge-card flex items-center gap-3 transition hover:border-white/20"
            data-testid={step.testId}
          >
            <span className="forge-card-icon shrink-0">
              <step.icon className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-snow">{step.label}</span>
              <span className="block text-xs text-white/40">{step.hint}</span>
            </span>
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
        <span>{counts.blocking} critical</span>
        <span>·</span>
        <span>{counts.warning} review</span>
        <span>·</span>
        <span>{counts.info} notes</span>
        <span>·</span>
        <span>{bundle.assets.length} files</span>
      </div>

      {!showBreakdown ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <Button
            type="button"
            variant="forge"
            onClick={() => setShowBreakdown(true)}
            data-testid="prepare-view-breakdown"
          >
            View full breakdown
          </Button>
          <p className="max-w-md text-xs text-white/40">
            Every item is measured from your uploaded files — what we found, why it matters, and how to fix it.
          </p>
        </div>
      ) : (
        <>
          <div>
            <p className="nexus-eyebrow">Your report</p>
            <h2 className="nexus-headline mt-1 text-xl">What we measured</h2>
          </div>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter findings">
            {SEVERITY_FILTER.map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={severity === s}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                  severity === s
                    ? "border-[rgb(var(--accent-rgb)/0.45)] bg-[rgb(var(--accent-rgb)/0.12)] text-white"
                    : "border-white/10 text-fog hover:border-white/20 hover:text-snow"
                }`}
                onClick={() => setSeverity(s)}
                data-testid={`prepare-filter-${s}`}
              >
                {s}
              </button>
            ))}
          </div>

          {findings.length === 0 ? (
            <StateView
              variant="empty"
              title="Nothing open in this filter"
              body="Your track looks clear here — try another filter or celebrate."
            />
          ) : shell === "android" ? (
            <div data-testid="prepare-findings-list">
              <FindingsReadOnly findings={findings} title="Measured findings" />
            </div>
          ) : (
            <ul className="flex flex-col gap-2" data-testid="prepare-findings-list">
              {findings.map((f) => (
                <FindingReportCard key={f.id} finding={f} />
              ))}
            </ul>
          )}

          <button
            type="button"
            className="mx-auto flex items-center gap-1 text-xs text-white/35 hover:text-white/55"
            onClick={() => setShowBreakdown(false)}
          >
            <ChevronDown className="h-4 w-4 rotate-180" />
            Collapse report
          </button>
        </>
      )}
    </div>
  );
}
