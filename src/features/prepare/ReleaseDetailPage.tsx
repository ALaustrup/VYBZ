import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
      <div>
        <Link to="/releases" className="text-xs text-fog hover:text-snow">
          ← Releases
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-semibold text-snow" data-testid="prepare-detail-title">
            {project.title}
          </h1>
          <Badge tone={statusTone(project.status)} data-testid="prepare-detail-status">
            {project.status}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-fog">{project.artistName || "Artist TBD"}</p>
        <Link
          to={`/release/${project.id}/credits`}
          className="mt-3 inline-flex h-8 items-center rounded-suite-md border border-white/10 bg-graphite px-3 text-xs font-semibold text-snow hover:border-suite-cyan/40"
          data-testid="prepare-open-credits"
        >
          Edit credits
        </Link>
        <Link
          to={`/release/${project.id}/distribution`}
          className="ml-2 mt-3 inline-flex h-8 items-center rounded-suite-md border border-white/10 bg-graphite px-3 text-xs font-semibold text-snow hover:border-suite-cyan/40"
          data-testid="prepare-open-distribution"
        >
          Distribution
        </Link>
        <Link
          to={`/release/${project.id}/master`}
          className="ml-2 mt-3 inline-flex h-8 items-center rounded-suite-md border border-white/10 bg-graphite px-3 text-xs font-semibold text-snow hover:border-suite-cyan/40"
          data-testid="prepare-open-master"
        >
          Master
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-fog">
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
            className={`rounded-suite-sm border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
              severity === s
                ? "border-suite-cyan/40 bg-suite-cyan/15 text-suite-cyan"
                : "border-white/10 text-fog"
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
              className="rounded-suite border border-white/10 bg-white/[0.03] px-4 py-3"
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
