import { useEffect, useMemo, useState } from "react";
import { GitCommitHorizontal, Loader2 } from "lucide-react";
import * as api from "@/lib/api";
import { analyzeTreePaths, formatBytes } from "@/lib/repoSync";
import { NewRepoSheet } from "@/components/repos/NewRepoSheet";
import { RepoExportHints } from "@/components/repos/RepoExportHints";
import type { ProjectDetail, RepoCommitSummary, RepoTreeView } from "@/types";

/** Commit history + file tree for Music Repos. */
export function RepoHistoryPanel({
  detail,
  projectId,
  canUpload,
  onRefresh,
}: {
  detail: ProjectDetail;
  projectId: string;
  canUpload: boolean;
  onRefresh: () => void;
}) {
  const [commits, setCommits] = useState<RepoCommitSummary[]>([]);
  const [tree, setTree] = useState<RepoTreeView | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const branch = detail.defaultBranch ?? "main";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [h, t] = await Promise.all([
        api.repoHistory(projectId, branch),
        api.repoTreeAt(projectId, null, branch),
      ]);
      if (cancelled) return;
      setCommits(h);
      setTree(t);
      setSelected(h[0]?.id ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [projectId, branch, detail.tip?.id]);

  useEffect(() => {
    if (!selected) return;
    void api.repoTreeAt(projectId, selected, branch).then(setTree);
  }, [selected, projectId, branch]);

  const pack = useMemo(
    () => analyzeTreePaths((tree?.entries ?? []).map((e) => e.path)),
    [tree],
  );

  const selectedCommit = commits.find((c) => c.id === selected) ?? null;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-veil-300" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="eyebrow">Branch · {branch}</p>
          {detail.tip ? (
            <p className="mt-1 text-sm text-white/70">
              Tip · {detail.tip.fileCount} files · {formatBytes(detail.tip.totalBytes)}
            </p>
          ) : (
            <p className="mt-1 text-sm text-white/45">No commits yet — connect a project folder.</p>
          )}
        </div>
        {canUpload && (
          <button type="button" onClick={() => setSyncOpen(true)} className="btn btn-primary h-9 px-3 text-xs">
            Commit folder
          </button>
        )}
      </div>

      {tree?.entries?.length ? (
        <section>
          <p className="eyebrow mb-2">Handoff</p>
          <RepoExportHints pack={pack} />
        </section>
      ) : null}

      <section>
        <p className="eyebrow mb-2">History</p>
        {commits.length === 0 ? (
          <p className="text-sm text-white/40">Empty history.</p>
        ) : (
          <ul className="space-y-0 divide-y divide-[var(--hairline)]">
            {commits.map((c) => {
              const meta = (c.meta ?? {}) as Record<string, unknown>;
              const badges: string[] = [];
              if (meta.has_dawproject) badges.push("DAWproject");
              if (meta.has_stem_pack) badges.push("stems");
              if (meta.has_bounce) badges.push("bounce");
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(c.id)}
                    className={
                      "flex w-full items-start gap-3 py-3 text-left transition " +
                      (selected === c.id ? "bg-white/[0.03]" : "hover:bg-white/[0.02]")
                    }
                  >
                    <GitCommitHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-veil-300" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-white/90">{c.message}</span>
                      <span className="mt-0.5 block text-[11px] text-white/40">
                        {c.author ?? "unknown"} · {new Date(c.createdAt).toLocaleString()} ·{" "}
                        {c.fileCount} files
                        {badges.length > 0 ? ` · ${badges.join(" · ")}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <p className="eyebrow mb-2">
          Files{selectedCommit ? " at commit" : ""}
          {pack.hasStemPack ? " · stems highlighted" : ""}
        </p>
        {!tree?.entries?.length ? (
          <p className="text-sm text-white/40">No tree.</p>
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto font-mono text-[11px] text-white/55">
            {tree.entries.slice(0, 200).map((e) => {
              const lower = e.path.toLowerCase();
              const isStem = pack.stemPaths.includes(e.path);
              const isBounce = pack.bouncePaths.includes(e.path);
              const isDaw = lower.endsWith(".dawproject");
              return (
                <li
                  key={e.hash + e.path}
                  className={
                    "flex justify-between gap-2 truncate " +
                    (isDaw || isStem || isBounce ? "text-veil-100" : "text-white/75")
                  }
                >
                  <span className="truncate">
                    {isDaw ? "◆ " : isStem ? "▤ " : isBounce ? "▷ " : ""}
                    {e.path}
                  </span>
                  <span className="shrink-0 text-white/35">{formatBytes(e.size)}</span>
                </li>
              );
            })}
            {tree.entries.length > 200 && (
              <li className="text-white/35">…and {tree.entries.length - 200} more</li>
            )}
          </ul>
        )}
      </section>

      {syncOpen && (
        <NewRepoSheet
          existingProjectId={projectId}
          onClose={() => setSyncOpen(false)}
          onCreated={() => {
            setSyncOpen(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
