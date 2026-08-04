import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { NexusPageHeader } from "@/components/NexusPageHeader";
import { Badge } from "@/components/ui/Badge";
import { StateView } from "@/components/states/StateView";
import { useSession } from "@/store/session";
import { useShellMode } from "@/platform/bridge/PlatformProvider";
import { getPrepareOwnerId, getReleaseBundle } from "@/features/prepare/service";
import { countBySeverity, severityTone, statusTone } from "@/features/prepare/severity";
import { FindingsReadOnly } from "@/features/prepare/FindingsReadOnly";
import type { FindingSeverity, ReleaseBundle } from "@vybz/domain/releases";

const SEVERITY_FILTER: Array<"all" | FindingSeverity> = ["all", "blocking", "warning", "info"];

export function ReleaseDetailPage() {
  const { id } = useParams();
  const { userId } = useSession();
  const shell = useShellMode();
  const ownerId = getPrepareOwnerId(userId);
  const [bundle, setBundle] = useState<ReleaseBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severity, setSeverity] = useState<"all" | FindingSeverity>("all");

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

  const counts = useMemo(
    () => countBySeverity(bundle?.findings ?? []),
    [bundle]
  );

  const findings = useMemo(() => {
    const open = (bundle?.findings ?? []).filter((f) => f.status === "open");
    return severity === "all" ? open : open.filter((f) => f.severity === severity);
  }, [bundle, severity]);

  if (loading) {
    return <StateView variant="loading" title="Loading release" />;
  }
  if (error) {
    return <StateView variant="error" title="Could not load release" body={error} />;
  }
  if (!bundle) {
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

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 pb-28 md:p-8" data-testid="prepare-detail">
      <NexusPageHeader
        eyebrow="Prepare"
        title={project.title}
        titleTestId="prepare-detail-title"
        subtitle={project.artistName || "Artist TBD"}
        backTo={{ href: "/releases", label: "← Releases" }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={statusTone(project.status)} data-testid="prepare-detail-status">
            {project.status}
          </Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to={`/release/${project.id}/credits`}
            className="forge-cta-ghost !min-h-8 !px-3 !text-xs"
            data-testid="prepare-open-credits"
          >
            Edit credits
          </Link>
          <Link
            to={`/release/${project.id}/distribution`}
            className="forge-cta-ghost !min-h-8 !px-3 !text-xs"
            data-testid="prepare-open-distribution"
          >
            Distribution
          </Link>
          <Link
            to={`/release/${project.id}/master`}
            className="forge-cta-ghost !min-h-8 !px-3 !text-xs"
            data-testid="prepare-open-master"
          >
            Master
          </Link>
        </div>
      </NexusPageHeader>

      <div className="flex flex-wrap gap-2 text-xs text-white/45">
        <span>{counts.blocking} blocking</span>
        <span>·</span>
        <span>{counts.warning} warnings</span>
        <span>·</span>
        <span>{counts.info} info</span>
        <span>·</span>
        <span>{bundle.assets.length} assets</span>
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
          title="No open findings"
          body="This filter is clear — or the release is ready."
        />
      ) : shell === "android" ? (
        <div data-testid="prepare-findings-list">
          <FindingsReadOnly findings={findings} title="Findings (read-only)" />
        </div>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="prepare-findings-list">
          {findings.map((f) => (
            <li
              key={f.id}
              className="forge-card"
              data-testid={`prepare-finding-${f.code}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={severityTone(f.severity)}>{f.severity}</Badge>
                <Badge tone="neutral">{f.category}</Badge>
                <span className="font-medium text-snow">{f.title}</span>
              </div>
              <p className="mt-1 text-sm text-fog">{f.detail}</p>
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}
