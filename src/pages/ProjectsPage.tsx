import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderGit2, Loader2, Plus, Upload, X, Users, GitBranch, CheckCircle2,
  AlertCircle, Disc3,
} from "lucide-react";
import * as api from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { useSession } from "@/store/session";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { GENRES } from "@/lib/profileFields";
import { cx } from "@/lib/utils";
import type { ProjectSummary, ProjectStatus, ReleaseBatchSummary } from "@/types";

const STATUS_TONE: Record<ProjectStatus, string> = {
  open: "text-white/50",
  "in-progress": "text-white/70",
  released: "text-feel",
  archived: "text-white/35",
};

function actionFor(p: ProjectSummary): string | null {
  if (p.status === "released" || p.status === "archived") return null;
  if (!p.myAgreed) return "Agree your split";
  if (p.versions === 0) return "Upload first version";
  if (p.isOwner && p.pendingAgrees > 0) {
    return p.pendingAgrees === 1 ? "1 split pending" : `${p.pendingAgrees} splits pending`;
  }
  if (p.isOwner && p.members > 1 && p.pendingAgrees === 0) return "Ready to release";
  return null;
}

function needsAttention(p: ProjectSummary): boolean {
  if (p.status === "released" || p.status === "archived") return false;
  if (!p.myAgreed) return true;
  if (p.versions === 0) return true;
  if (p.isOwner && p.pendingAgrees > 0) return true;
  return false;
}

export function ProjectsPage({ onBulkUpload }: { onBulkUpload?: () => void }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<ProjectSummary[]>([]);
  const [batches, setBatches] = useState<ReleaseBatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);

  async function load() {
    setLoading(true);
    const [projects, releaseBatches] = await Promise.all([
      api.myProjects(),
      api.myReleaseBatches(8),
    ]);
    setItems(projects);
    setBatches(releaseBatches);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  useRegisterAppBar({
    actions: (
      <>
        {onBulkUpload && (
          <button type="button" onClick={onBulkUpload} className="btn btn-ghost h-9 px-3 py-0 text-xs">
            <Upload className="h-3.5 w-3.5" /> Upload
          </button>
        )}
        <button type="button" onClick={() => setComposing(true)} className="btn btn-primary h-9 px-3.5 py-0 text-xs">
          <Plus className="h-3.5 w-3.5" /> New
        </button>
      </>
    ),
  }, [onBulkUpload]);

  const { needsYou, active, released } = useMemo(() => {
    const open = items.filter((p) => p.status !== "released" && p.status !== "archived");
    const needs = open.filter(needsAttention);
    const rest = open.filter((p) => !needsAttention(p));
    return {
      needsYou: needs,
      active: rest,
      released: items.filter((p) => p.status === "released"),
    };
  }, [items]);

  return (
    <div className="flex h-full flex-col">
      <div className="no-scrollbar flex-1 overflow-y-auto px-1 pb-6 pt-2">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
        ) : items.length === 0 && batches.length === 0 ? (
          <EmptyState
            icon={FolderGit2}
            title="Studio is empty"
            body="Start a collab room or upload a release batch — AppBar Upload and New are the only doors."
          />
        ) : (
          <div className="space-y-6">
            {needsYou.length > 0 && (
              <section>
                <p className="eyebrow mb-2 flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3 text-amber-300/80" /> Needs you
                </p>
                <div className="divide-y divide-[var(--hairline)]">
                  {needsYou.map((p) => (
                    <ProjectRow key={p.id} p={p} action={actionFor(p)} onOpen={() => navigate(`/projects/${p.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {active.length > 0 && (
              <section>
                <p className="eyebrow mb-2">In progress</p>
                <div className="divide-y divide-[var(--hairline)]">
                  {active.map((p) => (
                    <ProjectRow key={p.id} p={p} onOpen={() => navigate(`/projects/${p.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {(batches.length > 0 || released.length > 0) && (
              <section>
                <p className="eyebrow mb-2">Recent releases</p>
                <div className="divide-y divide-[var(--hairline)]">
                  {batches.map((b) => (
                    <div key={b.id} className="flex items-center gap-3 py-3.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-white/50">
                        <Disc3 className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-white/90">
                          {b.title?.trim() || "Release batch"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-white/40">
                          {b.creditedArtist ? `${b.creditedArtist} · ` : ""}
                          catalog upload · {new Date(b.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {released.map((p) => (
                    <ProjectRow key={p.id} p={p} onOpen={() => navigate(`/projects/${p.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {items.length > 0 && needsYou.length === 0 && active.length === 0 && released.length === 0 && batches.length === 0 && (
              <EmptyState icon={FolderGit2} title="No open collabs" body="Archived rooms stay out of the way — start a new one from the AppBar." />
            )}
          </div>
        )}
      </div>
      {composing && <CreateForm onClose={() => setComposing(false)} onCreated={(id) => navigate(`/projects/${id}`)} />}
    </div>
  );
}

function ProjectRow({
  p,
  action,
  onOpen,
}: {
  p: ProjectSummary;
  action?: string | null;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full py-4 text-left transition hover:bg-white/[0.02] active:scale-[0.995]"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate font-display text-[15px] font-semibold text-white">{p.title}</p>
        <span className={cx("shrink-0 text-[10px] font-medium uppercase tracking-wider", STATUS_TONE[p.status])}>
          {p.status === "released" ? (
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> released</span>
          ) : (
            p.status
          )}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/40">
        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{p.members}</span>
        <span className="flex items-center gap-1">
          <GitBranch className="h-3.5 w-3.5" />
          {p.versions} {p.versions === 1 ? "version" : "versions"}
        </span>
        {p.isOwner && <span className="text-white/55">owner</span>}
        {action && (
          <span className="font-medium text-amber-200/90">{action}</span>
        )}
      </div>
    </button>
  );
}

function CreateForm({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { showToast } = useSession();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bpm, setBpm] = useState("");
  const [musicalKey, setMusicalKey] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function toggleGenre(g: string) {
    setGenres((x) => (x.includes(g) ? x.filter((y) => y !== g) : [...x, g].slice(0, 4)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) return;
    setBusy(true);
    try {
      const id = await api.createProject({
        title: title.trim(),
        description: description.trim() || undefined,
        bpm: bpm ? Number(bpm) : undefined,
        musicalKey: musicalKey.trim() || undefined,
        genres,
      });
      if (id) onCreated(id);
      else {
        setBusy(false);
        showToast("Couldn't create the project.");
      }
    } catch {
      setBusy(false);
      showToast("Couldn't create the project.");
    }
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-900/95 p-5 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-white">New project</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full glass">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            placeholder="Project title"
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 400))}
            rows={2}
            placeholder="What are we making?"
            className="resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
          />
          <div className="flex gap-2">
            <input
              value={bpm}
              onChange={(e) => setBpm(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
              inputMode="numeric"
              placeholder="BPM"
              className="w-24 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
            />
            <input
              value={musicalKey}
              onChange={(e) => setMusicalKey(e.target.value.slice(0, 8))}
              placeholder="Key (e.g. F#m)"
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {GENRES.slice(0, 12).map((g) => (
              <button
                type="button"
                key={g}
                onClick={() => toggleGenre(g)}
                className={cx(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                  genres.includes(g) ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50" : "bg-white/[0.04] text-white/55",
                )}
              >
                {g}
              </button>
            ))}
          </div>
          <button type="submit" disabled={busy || title.trim().length < 2} className="btn btn-primary mt-1 w-full py-3">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create project"}
          </button>
        </form>
      </div>
    </div>
  );
}
