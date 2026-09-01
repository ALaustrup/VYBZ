import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Check,
  Film,
  Image as ImageIcon,
  Layers,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { UploadsLibrary } from "@/components/UploadsLibrary";
import { MixesLibrary } from "@/features/livingMix/MixesLibrary";
import { EmptyState } from "@/components/EmptyState";
import { ToolWorkbench } from "@/components/ToolWorkbench";
import { LocalAssetsLibrary } from "@/components/library/LocalAssetsLibrary";
import { useSession } from "@/store/session";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import * as api from "@/lib/api";
import type { Drop, FeedPost } from "@/types";
import { getPrepareOwnerId, listReleases } from "@/features/prepare/service";
import type { ReleaseProject } from "@vybz/domain/releases";
import { listVisibleCatalog } from "@/features/assetNode/catalog";
import { cx } from "@/lib/utils";

const LIBRARY_TABS = ["tracks", "device", "mixes", "projects", "stages"] as const;
type Tab = (typeof LIBRARY_TABS)[number];

function isLibraryTab(value: string | null): value is Tab {
  return !!value && (LIBRARY_TABS as readonly string[]).includes(value);
}

/** Tracks stream in a page at a time so the first screen is fast and nothing is capped. */
const PAGE_SIZE = 100;

/**
 * Library — works, project posts, stage backdrops, plus Analyzer scan strip.
 * Counts come from measured drops / posts / listReleases only (Law 1).
 */
export function LibraryPage({ onCompose }: { onCompose?: () => void }) {
  const { userId, profile, refreshProfile, showToast } = useSession();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const rawTab = params.get("tab");
  const tab: Tab = isLibraryTab(rawTab) ? rawTab : "tracks";
  function setTab(next: Tab) {
    setParams((prev) => {
      const n = new URLSearchParams(prev);
      if (next === "tracks") n.delete("tab");
      else n.set("tab", next);
      return n;
    }, { replace: true });
  }
  const [drops, setDrops] = useState<Drop[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [scans, setScans] = useState<ReleaseProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [trackTotal, setTrackTotal] = useState(0);
  const [localCount, setLocalCount] = useState(0);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const ownerId = getPrepareOwnerId(userId);
    const [firstPage, total, p, releases, catalog] = await Promise.all([
      api.dropsBy(userId, PAGE_SIZE),
      api.countDropsBy(userId),
      api.myProjectPosts(200),
      listReleases(ownerId).catch(() => [] as ReleaseProject[]),
      listVisibleCatalog().catch(() => ({ nodes: [], assets: [] })),
    ]);
    setDrops(firstPage);
    setTrackTotal(total);
    setPosts(p);
    setScans(releases.slice(0, 6));
    setLocalCount(catalog.assets.length);
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
  }, []);

  const staged = useMemo(
    () => drops.filter((d) => !!d.playbackCustomization?.backdropUrl),
    [drops],
  );

  return (
    <ToolWorkbench
      wide
      wave={false}
      testId="library-desk"
      className="library-desk flex h-full !max-w-none min-h-0 flex-col !px-3 !pb-[calc(var(--dock-reserve,6.25rem)+0.75rem)] !pt-2 sm:!px-5"
    >
      <header data-library-chrome className="flex items-center gap-2">
        <div
          className="no-scrollbar flex min-w-0 flex-1 gap-1 overflow-x-auto"
          data-testid="library-tabs"
          role="tablist"
          aria-label="Library sections"
        >
          <QuietTab active={tab === "tracks"} onClick={() => setTab("tracks")} testId="library-tab-tracks">
            Works
            <span className="ml-1 font-mono text-white/35">
              {loadingMore ? `${drops.length} of ${trackTotal}` : trackTotal || drops.length}
            </span>
          </QuietTab>
          <QuietTab active={tab === "device"} onClick={() => setTab("device")} testId="library-tab-device">
            This device
            <span className="ml-1 font-mono text-white/35">{localCount}</span>
          </QuietTab>
        </div>
        <LibraryMore
          tab={tab}
          postsCount={posts.length}
          scanCount={scans.length}
          onMixes={() => setTab("mixes")}
          onProjects={() => setTab("projects")}
          onScans={() => navigate("/releases")}
        />
        {onCompose ? (
          <button
            type="button"
            onClick={onCompose}
            data-testid="library-upload-header"
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-white/[0.06] px-3 text-[12px] font-medium text-white/80"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </button>
        ) : null}
      </header>

      {tab === "device" ? (
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-6">
          <LocalAssetsLibrary onChanged={() => { void listVisibleCatalog().then((c) => setLocalCount(c.assets.length)); }} />
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-[rgb(var(--app-accent-rgb))]" />
        </div>
      ) : tab === "tracks" ? (
        <UploadsLibrary
          initialDrops={drops}
          featuredId={profile?.featuredDropId}
          onFeaturedChange={() => { void refreshProfile(); void load(); }}
          onCompose={onCompose}
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

function LibraryMore({
  tab,
  postsCount,
  scanCount,
  onMixes,
  onProjects,
  onScans,
}: {
  tab: Tab;
  postsCount: number;
  scanCount: number;
  onMixes: () => void;
  onProjects: () => void;
  onScans: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const secondary = tab === "mixes" || tab === "projects";

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(next: () => void) {
    next();
    setOpen(false);
  }

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        data-testid="library-more-sections"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={tab === "mixes" ? "Mixes" : tab === "projects" ? "Projects" : "More library sections"}
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "flex h-8 items-center justify-center rounded-full px-2.5 text-[12px] font-medium transition",
          secondary ? "bg-white/[0.1] text-white" : "text-white/40 hover:text-white/70",
        )}
      >
        {tab === "mixes" ? "Mixes" : tab === "projects" ? "Projects" : <MoreHorizontal className="h-4 w-4" />}
      </button>
      <div
        hidden={!open}
        role="menu"
        className="absolute left-0 top-full z-50 mt-1 min-w-[11rem] rounded-2xl bg-ink-950/95 p-1 ring-1 ring-white/10 backdrop-blur"
      >
        <button
          type="button"
          role="menuitem"
          data-testid="library-tab-mixes"
          onClick={() => pick(onMixes)}
          className={cx(
            "flex w-full items-center rounded-xl px-3 py-2 text-left text-[12px] font-medium",
            tab === "mixes" ? "bg-white/[0.08] text-white" : "text-white/70 hover:bg-white/[0.06] hover:text-white",
          )}
        >
          Mixes
        </button>
        <button
          type="button"
          role="menuitem"
          data-testid="library-tab-projects"
          onClick={() => pick(onProjects)}
          className={cx(
            "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[12px] font-medium",
            tab === "projects" ? "bg-white/[0.08] text-white" : "text-white/70 hover:bg-white/[0.06] hover:text-white",
          )}
        >
          Projects
          <span className="font-mono text-white/35">{postsCount}</span>
        </button>
        {scanCount > 0 ? (
          <button
            type="button"
            role="menuitem"
            data-testid="library-scan-strip"
            onClick={() => pick(onScans)}
            className="flex w-full items-center rounded-xl px-3 py-2 text-left text-[12px] font-medium text-white/70 hover:bg-white/[0.06] hover:text-white"
          >
            {scanCount} {scanCount === 1 ? "scan" : "scans"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function QuietTab({
  active,
  onClick,
  testId,
  children,
}: {
  active: boolean;
  onClick: () => void;
  testId: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-testid={testId}
      onClick={onClick}
      className={cx(
        "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition",
        active ? "bg-white/[0.1] text-white" : "text-white/40 hover:text-white/70",
      )}
    >
      {children}
    </button>
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
