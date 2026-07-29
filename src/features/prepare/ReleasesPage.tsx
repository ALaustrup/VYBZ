import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/states/EmptyState";
import { StateView } from "@/components/states/StateView";
import { useSession } from "@/store/session";
import { flushPrepareQueue, getPrepareOwnerId, listReleases } from "@/features/prepare/service";
import { statusTone } from "@/features/prepare/severity";
import type { ReleaseProject, ReleaseStatus } from "@vybz/domain/releases";

const FILTERS: Array<{ id: "all" | ReleaseStatus; label: string }> = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "blocked", label: "Blocked" },
  { id: "ready", label: "Ready" },
];

export function ReleasesPage() {
  const { userId } = useSession();
  const ownerId = getPrepareOwnerId(userId);
  const navigate = useNavigate();
  const [rows, setRows] = useState<ReleaseProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | ReleaseStatus>("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await flushPrepareQueue(ownerId);
        const list = await listReleases(ownerId);
        if (!cancelled) setRows(list);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load releases");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  const visible = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter]
  );

  if (loading) {
    return <StateView variant="loading" title="Loading releases" body="Fetching Prepare projects…" />;
  }

  if (error) {
    return <StateView variant="error" title="Could not load releases" body={error} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 pb-28 md:p-8" data-testid="prepare-releases">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-suite-cyan">Prepare</p>
          <h1 className="font-display text-2xl font-semibold text-snow">Releases</h1>
          <p className="mt-1 text-sm text-fog">Know what is ready. Fix what is not.</p>
        </div>
        <Button
          data-testid="prepare-new-release"
          onClick={() => navigate("/releases/new")}
          className="gap-2"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New release
        </Button>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={`rounded-suite-sm border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
              filter === f.id
                ? "border-suite-cyan/40 bg-suite-cyan/15 text-suite-cyan"
                : "border-white/10 text-fog hover:text-snow"
            }`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No releases yet"
          body="Create a release, import audio or artwork, and run a free browser readiness scan."
          action={
            <Button onClick={() => navigate("/releases/new")} data-testid="prepare-empty-cta">
              Start a release
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((row) => (
            <li key={row.id}>
              <Link
                to={`/release/${row.id}`}
                className="flex items-center justify-between gap-3 rounded-suite border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-suite-cyan/30 hover:bg-white/[0.05]"
                data-testid={`prepare-release-row-${row.id}`}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-snow">{row.title}</p>
                  <p className="truncate text-xs text-fog">
                    {row.artistName || "Artist TBD"} · updated {new Date(row.updatedAt).toLocaleString()}
                  </p>
                </div>
                <Badge tone={statusTone(row.status)}>{row.status}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
