import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Film,
  Image as ImageIcon,
  Layers,
  ListChecks,
  Loader2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { UploadsLibrary } from "@/components/UploadsLibrary";
import { MixesLibrary } from "@/features/livingMix/MixesLibrary";
import { EmptyState } from "@/components/EmptyState";
import { ForgeChip, ToolWorkbench } from "@/components/ToolWorkbench";
import { useSession } from "@/store/session";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import * as api from "@/lib/api";
import { FLAGS } from "@/lib/flags";
import type { Drop, FeedPost } from "@/types";
import { getPrepareOwnerId, listReleases } from "@/features/prepare/service";
import type { ReleaseProject } from "@vybz/domain/releases";

type Tab = "tracks" | "mixes" | "projects" | "stages";

/** Tracks stream in a page at a time so the first screen is fast and nothing is capped. */
const PAGE_SIZE = 100;

/**
 * Media Library — tracks, project posts, stage backdrops, plus Analyzer scan strip.
 * Counts come from measured drops / posts / listReleases only (Law 1).
 */
export function LibraryPage() {
  const { userId, profile, refreshProfile, showToast } = useSession();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("tracks");
  const [drops, setDrops] = useState<Drop[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [scans, setScans] = useState<ReleaseProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [trackTotal, setTrackTotal] = useState(0);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const ownerId = getPrepareOwnerId(userId);
    const [firstPage, total, p, releases] = await Promise.all([
      api.dropsBy(userId, PAGE_SIZE),
      api.countDropsBy(userId),
      api.myProjectPosts(200),
      listReleases(ownerId).catch(() => [] as ReleaseProject[]),
    ]);
    setDrops(firstPage);
    setTrackTotal(total);
    setPosts(p);
    setScans(releases.slice(0, 6));
    setLoading(false);

    // The first page renders immediately; the rest streams in so a large library
    // is never silently truncated to one page.
    if (total > firstPage.length) {
      setLoadingMore(true);
      for (let offset = firstPage.length; offset < total; offset += PAGE_SIZE) {
        const page = await api.dropsBy(userId, PAGE_SIZE, offset);
        if (!page.length) break;
        setDrops((prev) => {
          const seen = new Set(prev.map((d) => d.id));
          return [...prev, ...page.filter((d) => !seen.has(d.id))];
        });
      }
      setLoadingMore(false);
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  useRegisterAppBar({
    title: "Library",
    subtitle: "Your files",
  }, []);

  const staged = useMemo(
    () => drops.filter((d) => !!d.playbackCustomization?.backdropUrl),
    [drops],
  );

  return (
    <ToolWorkbench
      wide
      eyebrow="Library"
      title="Your files"
      subtitle="Drop audio anywhere to add it."
      testId="library-desk"
      className="library-desk flex h-full !max-w-5xl min-h-0 flex-col !pb-4 !pt-2"
    >
      {FLAGS.storefront && (
        <p className="-mt-2 text-[12px] text-white/40">
          Selling packs?{" "}
          <button
            type="button"
            className="text-[rgb(var(--app-accent-rgb))] underline-offset-2 hover:underline"
            onClick={() => navigate("/tools/packs")}
          >
            Your packs
          </button>
        </p>
      )}

      {scans.length > 0 && (
        <section className="forge-glass relative !rounded-2xl p-3" aria-label="Analyzer scans" data-testid="library-scan-strip">
          <span className="forge-glass-edge pointer-events-none" aria-hidden />
          <div className="relative z-[1] mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
              <ListChecks className="h-3.5 w-3.5 text-[rgb(var(--app-accent-rgb))]" /> Scans
            </p>
            <button
              type="button"
              onClick={() => navigate("/releases")}
              className="text-[11px] font-semibold text-white/50 hover:text-white/80"
            >
              Open scan
            </button>
          </div>
          <div className="relative z-[1] no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
            {scans.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => navigate(`/release/${r.id}`)}
                className="forge-card min-w-[10.5rem] shrink-0 !p-3 text-left active:scale-[0.99]"
              >
                <p className="truncate text-[13px] font-medium text-white/90">{r.title || "Untitled scan"}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/35">{r.status}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="no-scrollbar flex gap-1.5 overflow-x-auto" data-testid="library-tabs" role="tablist" aria-label="Library sections">
        <ForgeChip active={tab === "tracks"} onClick={() => setTab("tracks")} testId="library-tab-tracks">
          {/* While paging, show progress rather than a total that is still growing. */}
          Tracks ({loadingMore ? `${drops.length} of ${trackTotal}` : trackTotal || drops.length})
        </ForgeChip>
        <ForgeChip active={tab === "mixes"} onClick={() => setTab("mixes")} testId="library-tab-mixes">
          Mixes
        </ForgeChip>
        <ForgeChip active={tab === "projects"} onClick={() => setTab("projects")} testId="library-tab-projects">
          Projects ({posts.length})
        </ForgeChip>
        <ForgeChip active={tab === "stages"} onClick={() => setTab("stages")} testId="library-tab-stages">
          Stages ({staged.length})
        </ForgeChip>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-[rgb(var(--app-accent-rgb))]" />
        </div>
      ) : tab === "tracks" ? (
        <UploadsLibrary
          initialDrops={drops}
          featuredId={profile?.featuredDropId}
          onFeaturedChange={() => { void refreshProfile(); void load(); }}
        />
      ) : tab === "mixes" ? (
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-6">
          <MixesLibrary />
        </div>
      ) : tab === "projects" ? (
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-6">
          <PostsLibrary
            posts={posts}
            onChanged={load}
            onOpenProject={(id) => navigate(`/p/${id}`)}
            showToast={showToast}
          />
        </div>
      ) : (
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-6">
          <StagesLibrary drops={staged} onOpenDrop={() => setTab("tracks")} />
        </div>
      )}
    </ToolWorkbench>
  );
}

function PostsLibrary({
  posts,
  onChanged,
  onOpenProject,
  showToast,
}: {
  posts: FeedPost[];
  onChanged: () => void;
  onOpenProject: (id: string) => void;
  showToast: (msg: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [list, setList] = useState(posts);
  useEffect(() => { setList(posts); }, [posts]);

  if (!list.length) {
    return (
      <EmptyState
        icon={Layers}
        title="No project posts"
        body="Posts you put in a project show up here."
      />
    );
  }

  async function saveTitle(p: FeedPost) {
    setBusy(p.id);
    const t = editTitle.trim();
    const ok = await api.updatePostTitle(p.id, t);
    setBusy(null);
    if (ok) {
      setList((l) => l.map((x) => (x.id === p.id ? { ...x, title: t || null } : x)));
      setEditing(null);
      showToast("Renamed");
    } else showToast("Couldn't rename");
  }

  async function remove(p: FeedPost) {
    setBusy(p.id);
    const ok = await api.deleteMyPost(p.id);
    setBusy(null);
    setConfirmDel(null);
    if (ok) {
      setList((l) => l.filter((x) => x.id !== p.id));
      showToast("Post deleted");
      onChanged();
    } else showToast("Couldn't delete");
  }

  return (
    <ul className="space-y-3">
      {list.map((p) => {
        const working = busy === p.id;
        const media = p.mediaUrl || p.linkUrl;
        const isVid = p.kind === "video" || (!!media && /\.(mp4|webm|mov)(\?|$)/i.test(media));
        const isImg = p.kind === "image" || (!!media && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(media));
        return (
          <li key={p.id} className="forge-card">
            <div className="flex gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-ink-950/80">
                {isImg && media ? (
                  <img src={media} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : isVid && media ? (
                  <div className="flex h-full w-full items-center justify-center text-white/40"><Film className="h-5 w-5" /></div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/35"><Layers className="h-5 w-5" /></div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onOpenProject(p.projectId)}
                  className="text-[11px] font-semibold uppercase tracking-wider text-white/40 hover:text-white/70"
                >
                  {p.projectName}
                </button>
                <p className="truncate font-medium text-white/90">{p.title || p.body || "Untitled post"}</p>
                <p className="mt-0.5 text-[11px] capitalize text-white/35">{p.kind}</p>
              </div>
            </div>

            {confirmDel === p.id ? (
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-wild/30 bg-wild/[0.06] px-3 py-2">
                <span className="mr-auto text-[12px] text-white/80">Delete this post permanently?</span>
                <button type="button" onClick={() => void remove(p)} disabled={working}
                  className="flex items-center gap-1 rounded-full bg-wild/80 px-3 py-1 text-[12px] font-semibold text-white active:scale-95">
                  {working ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Trash2 className="h-3 w-3" /> Delete</>}
                </button>
                <button type="button" onClick={() => setConfirmDel(null)}
                  className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold text-white/70 active:scale-95">Cancel</button>
              </div>
            ) : editing === p.id ? (
              <div className="mt-2 flex items-center gap-2">
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value.slice(0, 80))}
                  placeholder="Post title…"
                  className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
                />
                <button type="button" onClick={() => void saveTitle(p)} disabled={working} aria-label="Save"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-veil-500/30 text-white active:scale-95">
                  {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button type="button" onClick={() => setEditing(null)} aria-label="Cancel"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/60 active:scale-95">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setEditing(p.id); setEditTitle(p.title ?? ""); }}
                  className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:text-white active:scale-95"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDel(p.id)}
                  className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/60 hover:text-wild active:scale-95"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function StagesLibrary({ drops, onOpenDrop }: { drops: Drop[]; onOpenDrop: () => void }) {
  if (!drops.length) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="No backdrops yet"
        body="Attach a still or video to a track and it shows here."
      />
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {drops.map((d) => {
        const url = d.playbackCustomization?.backdropUrl ?? "";
        const looksLikeImage = /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);
        return (
          <li key={d.id} className="forge-card overflow-hidden !p-0">
            <div className="relative aspect-video bg-ink-950/80">
              {looksLikeImage ? (
                <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <video src={url} muted playsInline loop className="h-full w-full object-cover" />
              )}
            </div>
            <div className="flex items-center gap-2 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white/90">{d.title || "Untitled track"}</p>
                <p className="text-[11px] text-white/40">Stage backdrop</p>
              </div>
              <button
                type="button"
                onClick={onOpenDrop}
                className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:text-white active:scale-95"
              >
                Manage track
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
