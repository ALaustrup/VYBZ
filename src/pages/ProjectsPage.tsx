import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderGit2, Loader2, Plus, Upload, Users, GitBranch, CheckCircle2,
  AlertCircle, Disc3, ShoppingBag,
} from "lucide-react";
import * as api from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { NewRepoSheet } from "@/components/repos/NewRepoSheet";
import { useSession } from "@/store/session";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { FLAGS } from "@/lib/flags";
import { cx } from "@/lib/utils";
import type { ProjectSummary, ProjectStatus, ReleaseBatchSummary, RepoListingCard } from "@/types";

const STATUS_TONE: Record<ProjectStatus, string> = {
  open: "text-white/50",
  "in-progress": "text-white/70",
  released: "text-feel",
  archived: "text-white/35",
};

function actionFor(p: ProjectSummary): string | null {
  if (p.status === "released" || p.status === "archived") return null;
  if (!p.myAgreed) return "Agree your split";
  if ((p.commitCount ?? 0) === 0 && p.versions === 0) {
    return p.repoKind === "repo" ? "Connect folder" : "Upload first version";
  }
  if (p.isOwner && p.pendingAgrees > 0) {
    return p.pendingAgrees === 1 ? "1 split pending" : `${p.pendingAgrees} splits pending`;
  }
  if (p.isOwner && p.members > 1 && p.pendingAgrees === 0) return "Ready to release";
  return null;
}

function needsAttention(p: ProjectSummary): boolean {
  if (p.status === "released" || p.status === "archived") return false;
  if (!p.myAgreed) return true;
  if ((p.commitCount ?? 0) === 0 && p.versions === 0) return true;
  if (p.isOwner && p.pendingAgrees > 0) return true;
  return false;
}

export function ProjectsPage({ onBulkUpload }: { onBulkUpload?: () => void }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<ProjectSummary[]>([]);
  const [batches, setBatches] = useState<ReleaseBatchSummary[]>([]);
  const [listed, setListed] = useState<RepoListingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const { showToast, refreshProfile, profile } = useSession();

  async function load() {
    setLoading(true);
    const [projects, releaseBatches, feed] = await Promise.all([
      api.myProjects(),
      api.myReleaseBatches(8),
      FLAGS.repos ? api.listedReposFeed(12) : Promise.resolve([] as RepoListingCard[]),
    ]);
    setItems(projects);
    setBatches(releaseBatches);
    setListed(feed);
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
          <Plus className="h-3.5 w-3.5" /> {FLAGS.repos ? "New Repo" : "New"}
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
        ) : items.length === 0 && batches.length === 0 && listed.length === 0 ? (
          <EmptyState
            icon={FolderGit2}
            title={FLAGS.repos ? "No repos yet" : "Studio is empty"}
            body={
              FLAGS.repos
                ? "Drop your Ableton Project folder — we version the sound, not just the zip. New Repo is in the AppBar."
                : "Start a collab room or upload a release batch — AppBar Upload and New are the only doors."
            }
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

            {FLAGS.repos && listed.length > 0 && (
              <section>
                <p className="eyebrow mb-2 flex items-center gap-1.5">
                  <ShoppingBag className="h-3 w-3" /> Repos for sale
                </p>
                <div className="divide-y divide-[var(--hairline)]">
                  {listed.map((r) => (
                    <ListedRepoRow
                      key={r.projectId}
                      r={r}
                      balance={profile?.modPoints ?? 0}
                      onBuy={async () => {
                        try {
                          const id = await api.purchaseRepo(r.projectId);
                          if (id) {
                            showToast("Purchased with cosmetic credits.");
                            await refreshProfile();
                            await load();
                          } else showToast("Purchase failed.");
                        } catch {
                          showToast("Purchase failed — check your credit balance.");
                        }
                      }}
                      onOpen={() => navigate(`/projects/${r.projectId}`)}
                    />
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
          </div>
        )}
      </div>
      {composing && FLAGS.repos && (
        <NewRepoSheet onClose={() => setComposing(false)} onCreated={(id) => navigate(`/projects/${id}`)} />
      )}
      {composing && !FLAGS.repos && (
        <LegacyCreateForm onClose={() => setComposing(false)} onCreated={(id) => navigate(`/projects/${id}`)} />
      )}
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
  const commits = p.commitCount ?? 0;
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
        {p.repoKind === "repo" && <span className="text-veil-200/70">repo</span>}
        {p.daw && <span className="capitalize">{p.daw}</span>}
        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{p.members}</span>
        <span className="flex items-center gap-1">
          <GitBranch className="h-3.5 w-3.5" />
          {commits > 0
            ? `${commits} ${commits === 1 ? "commit" : "commits"}`
            : `${p.versions} ${p.versions === 1 ? "version" : "versions"}`}
        </span>
        {p.isOwner && <span className="text-white/55">owner</span>}
        {action && <span className="font-medium text-amber-200/90">{action}</span>}
      </div>
    </button>
  );
}

function ListedRepoRow({
  r,
  balance,
  onBuy,
  onOpen,
}: {
  r: RepoListingCard;
  balance: number;
  onBuy: () => Promise<void>;
  onOpen: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-3 py-3.5">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className="truncate font-display text-[15px] font-semibold text-white">{r.title}</p>
        <p className="mt-0.5 text-[11px] text-white/40">
          {r.owner ? `@${r.owner}` : "creator"}
          {r.daw ? ` · ${r.daw}` : ""}
          {" · "}
          {r.grantKind.replace(/_/g, " ")}
          {r.sales > 0 ? ` · ${r.sales} sold` : ""}
        </p>
      </button>
      <span className="shrink-0 text-sm font-semibold text-veil-100">{r.priceCredits}</span>
      <button
        type="button"
        disabled={busy || balance < r.priceCredits}
        onClick={async () => {
          setBusy(true);
          try { await onBuy(); } finally { setBusy(false); }
        }}
        className="btn btn-primary h-8 shrink-0 px-2.5 text-[11px] disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Buy"}
      </button>
    </div>
  );
}

function LegacyCreateForm({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { showToast } = useSession();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) return;
    setBusy(true);
    try {
      const id = await api.createProject({ title: title.trim() });
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
        className="w-full max-w-md rounded-t-3xl border-t border-white/10 bg-ink-900/95 p-5 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            placeholder="Project title"
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
          />
          <button type="submit" disabled={busy || title.trim().length < 2} className="btn btn-primary w-full py-3">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
          </button>
        </form>
      </div>
    </div>
  );
}
