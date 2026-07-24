import { useCallback, useEffect, useState } from "react";
import { Download, GitMerge, GitBranch, Loader2 } from "lucide-react";
import * as api from "@/lib/api";
import { formatBytes } from "@/lib/repoSync";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";
import type { ProjectDetail, RepoMergeRequest } from "@/types";

/** Branches, merge requests, and tip pull for Music Repo collaborators. */
export function RepoCollabPanel({
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
  const { showToast, userId } = useSession();
  const [mrs, setMrs] = useState<RepoMergeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchName, setBranchName] = useState("");
  const [fromBranch, setFromBranch] = useState(detail.defaultBranch ?? "main");
  const [mrTitle, setMrTitle] = useState("");
  const [mrSource, setMrSource] = useState("");
  const [mrTarget, setMrTarget] = useState(detail.defaultBranch ?? "main");
  const [busy, setBusy] = useState(false);
  const [pullBusy, setPullBusy] = useState(false);
  const [pullBranch, setPullBranch] = useState(detail.defaultBranch ?? "main");

  const branches = detail.branches?.length
    ? detail.branches
    : [{ name: detail.defaultBranch ?? "main", commitId: detail.tip?.id ?? "", updatedAt: 0 }];

  const loadMrs = useCallback(async () => {
    setLoading(true);
    setMrs(await api.listRepoMrs(projectId, "open"));
    setLoading(false);
  }, [projectId]);

  useEffect(() => { void loadMrs(); }, [loadMrs]);

  async function createBranch() {
    const name = branchName.trim().toLowerCase();
    if (!name) return;
    setBusy(true);
    try {
      const ok = await api.createRepoBranch(projectId, name, fromBranch);
      if (ok) {
        showToast(`Branch ${name} created.`);
        setBranchName("");
        onRefresh();
      } else showToast("Couldn't create branch.");
    } catch {
      showToast("Couldn't create branch.");
    } finally {
      setBusy(false);
    }
  }

  async function openMr() {
    if (!mrTitle.trim() || !mrSource) return;
    setBusy(true);
    try {
      const id = await api.openRepoMr({
        projectId,
        title: mrTitle.trim(),
        source: mrSource,
        target: mrTarget,
      });
      if (id) {
        showToast("Merge request opened.");
        setMrTitle("");
        await loadMrs();
      } else showToast("Couldn't open merge request.");
    } catch {
      showToast("Couldn't open merge request.");
    } finally {
      setBusy(false);
    }
  }

  async function merge(mrId: string, strategy: "theirs" | "ours") {
    setBusy(true);
    try {
      const ok = await api.mergeRepoMr(mrId, strategy);
      if (ok) {
        showToast(strategy === "theirs" ? "Merged (took source tip)." : "Closed keeping target.");
        await loadMrs();
        onRefresh();
      } else showToast("Merge failed.");
    } catch {
      showToast("Merge failed.");
    } finally {
      setBusy(false);
    }
  }

  async function closeMr(mrId: string) {
    setBusy(true);
    try {
      await api.closeRepoMr(mrId);
      await loadMrs();
      showToast("Merge request closed.");
    } catch {
      showToast("Couldn't close.");
    } finally {
      setBusy(false);
    }
  }

  async function pullTip() {
    setPullBusy(true);
    try {
      const files = await api.pullRepoTipUrls(projectId, pullBranch);
      if (!files.length) {
        showToast("Nothing to pull on this branch.");
        return;
      }

      const picker = (window as unknown as {
        showDirectoryPicker?: (opts?: { mode?: string }) => Promise<FileSystemDirectoryHandle>;
      }).showDirectoryPicker;

      if (typeof picker === "function") {
        const root = await picker({ mode: "readwrite" });
        let written = 0;
        for (const f of files) {
          const parts = f.path.replace(/\\/g, "/").split("/").filter(Boolean);
          if (!parts.length) continue;
          let dir = root;
          for (let i = 0; i < parts.length - 1; i++) {
            dir = await dir.getDirectoryHandle(parts[i], { create: true });
          }
          const fileHandle = await dir.getFileHandle(parts[parts.length - 1], { create: true });
          const res = await fetch(f.url);
          if (!res.ok) continue;
          const buf = await res.arrayBuffer();
          const writable = await fileHandle.createWritable();
          await writable.write(buf);
          await writable.close();
          written++;
        }
        showToast(`Pulled ${written} files · ${formatBytes(files.reduce((s, x) => s + x.size, 0))}`);
      } else {
        // Fallback: download tip manifest + first file
        const blob = new Blob(
          [JSON.stringify({ branch: pullBranch, files: files.map((f) => ({ path: f.path, url: f.url, size: f.size })) }, null, 2)],
          { type: "application/json" },
        );
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `vybz-tip-${pullBranch}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        showToast(`Tip manifest (${files.length} files). Use Chrome/Edge for folder pull.`);
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      showToast("Pull failed.");
    } finally {
      setPullBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="eyebrow mb-2 flex items-center gap-1.5">
          <GitBranch className="h-3 w-3" /> Branches
        </p>
        <ul className="mb-3 divide-y divide-[var(--hairline)]">
          {branches.map((b) => (
            <li key={b.name} className="flex items-center justify-between py-2.5 text-sm">
              <span className={cx("font-mono text-[13px]", b.name === detail.defaultBranch ? "text-veil-100" : "text-white/80")}>
                {b.name}
                {b.name === detail.defaultBranch && (
                  <span className="ml-2 font-sans text-[10px] uppercase tracking-wider text-white/35">default</span>
                )}
              </span>
              <span className="font-mono text-[10px] text-white/30">{b.commitId ? b.commitId.slice(0, 8) : "—"}</span>
            </li>
          ))}
        </ul>
        {canUpload && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-[7rem] flex-1 text-[11px] text-white/45">
              New branch
              <input
                value={branchName}
                onChange={(e) => setBranchName(e.target.value.slice(0, 64))}
                placeholder="mix / vocal-pass"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-veil-400/60 focus:outline-none"
              />
            </label>
            <label className="text-[11px] text-white/45">
              From
              <select
                value={fromBranch}
                onChange={(e) => setFromBranch(e.target.value)}
                className="mt-1 block rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white"
              >
                {branches.map((b) => (
                  <option key={b.name} value={b.name} className="bg-ink-900">{b.name}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={busy || !branchName.trim()}
              onClick={() => void createBranch()}
              className="btn btn-primary h-10 px-3 text-xs disabled:opacity-40"
            >
              Create
            </button>
          </div>
        )}
      </section>

      <section>
        <p className="eyebrow mb-2 flex items-center gap-1.5">
          <Download className="h-3 w-3" /> Pull tip
        </p>
        <p className="mb-2 text-[12px] text-white/40">
          Write the branch tip into a local folder (Chrome/Edge). Structure merge only — no DAW XML merge.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={pullBranch}
            onChange={(e) => setPullBranch(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white"
          >
            {branches.map((b) => (
              <option key={b.name} value={b.name} className="bg-ink-900">{b.name}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={pullBusy}
            onClick={() => void pullTip()}
            className="btn btn-primary h-10 px-3.5 text-xs disabled:opacity-40"
          >
            {pullBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Pull tip
          </button>
        </div>
      </section>

      <section>
        <p className="eyebrow mb-2 flex items-center gap-1.5">
          <GitMerge className="h-3 w-3" /> Merge requests
        </p>
        {canUpload && branches.length >= 2 && (
          <div className="mb-4 space-y-2 rounded-2xl border border-white/8 bg-white/[0.02] p-3">
            <input
              value={mrTitle}
              onChange={(e) => setMrTitle(e.target.value.slice(0, 120))}
              placeholder="Title — e.g. Vocal pass ready"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-veil-400/60 focus:outline-none"
            />
            <div className="flex flex-wrap gap-2">
              <select
                value={mrSource}
                onChange={(e) => setMrSource(e.target.value)}
                className="min-w-[6rem] flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white"
              >
                <option value="" className="bg-ink-900">Source…</option>
                {branches.map((b) => (
                  <option key={b.name} value={b.name} className="bg-ink-900">{b.name}</option>
                ))}
              </select>
              <span className="self-center text-white/30">→</span>
              <select
                value={mrTarget}
                onChange={(e) => setMrTarget(e.target.value)}
                className="min-w-[6rem] flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white"
              >
                {branches.map((b) => (
                  <option key={b.name} value={b.name} className="bg-ink-900">{b.name}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy || !mrTitle.trim() || !mrSource || mrSource === mrTarget}
                onClick={() => void openMr()}
                className="btn btn-primary h-10 px-3 text-xs disabled:opacity-40"
              >
                Open
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-veil-300" /></div>
        ) : mrs.length === 0 ? (
          <p className="text-sm text-white/40">No open merge requests.</p>
        ) : (
          <ul className="space-y-3">
            {mrs.map((m) => (
              <li key={m.id} className="border-b border-[var(--hairline)] pb-3">
                <p className="text-[13px] font-medium text-white/90">{m.title}</p>
                <p className="mt-0.5 font-mono text-[11px] text-white/40">
                  {m.sourceBranch} → {m.targetBranch} · {m.author ?? "member"} ·{" "}
                  {new Date(m.createdAt).toLocaleDateString()}
                </p>
                {(detail.isOwner || canUpload || m.authorId === userId) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(detail.isOwner || canUpload) && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void merge(m.id, "theirs")}
                          className="rounded-lg bg-feel/15 px-2.5 py-1 text-[11px] font-semibold text-feel ring-1 ring-feel/25 disabled:opacity-40"
                        >
                          Take theirs
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void merge(m.id, "ours")}
                          className="rounded-lg bg-white/8 px-2.5 py-1 text-[11px] font-semibold text-white/70 disabled:opacity-40"
                        >
                          Keep ours
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void closeMr(m.id)}
                      className="rounded-lg px-2.5 py-1 text-[11px] text-white/40 hover:text-white/70 disabled:opacity-40"
                    >
                      Close
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
