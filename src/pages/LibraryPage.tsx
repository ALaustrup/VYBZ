import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Film,
  Image as ImageIcon,
  Layers,
  Loader2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { UploadsLibrary } from "@/components/UploadsLibrary";
import { EmptyState } from "@/components/EmptyState";
import { useSession } from "@/store/session";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import * as api from "@/lib/api";
import { FLAGS } from "@/lib/flags";
import { cx } from "@/lib/utils";
import type { Drop, FeedPost } from "@/types";

type Tab = "drops" | "posts" | "stages";

/**
 * Uploader Library — one place to manage drops, project posts, and stage
 * backdrops attached to drops. Profile still shows a drops preview; full
 * management lives here.
 */
export function LibraryPage() {
  const { userId, profile, refreshProfile, showToast } = useSession();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("drops");
  const [drops, setDrops] = useState<Drop[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [d, p] = await Promise.all([api.dropsBy(userId, 80), api.myProjectPosts(80)]);
    setDrops(d);
    setPosts(p);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  useRegisterAppBar({
    title: "Library",
    subtitle: "Manage your media",
  }, []);

  const staged = useMemo(
    () => drops.filter((d) => !!d.playbackCustomization?.backdropUrl),
    [drops],
  );

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col px-4 pb-4 pt-2">
      <p className="mb-3 text-[13px] leading-relaxed text-white/45">
        Everything you&apos;ve uploaded — drops, project posts, and stage backdrops — in one place.
        {FLAGS.storefront && (
          <>
            {" "}
            Selling sample packs?{" "}
            <button type="button" className="text-veil-300 underline-offset-2 hover:underline" onClick={() => navigate("/tools/packs")}>
              Open Storefront
            </button>
          </>
        )}
      </p>

      <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto">
        <TabBtn on={tab === "drops"} onClick={() => setTab("drops")} label={`Drops (${drops.length})`} />
        <TabBtn on={tab === "posts"} onClick={() => setTab("posts")} label={`Posts (${posts.length})`} />
        <TabBtn on={tab === "stages"} onClick={() => setTab("stages")} label={`Stages (${staged.length})`} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-veil-300" /></div>
      ) : tab === "drops" ? (
        <UploadsLibrary
          initialDrops={drops}
          featuredId={profile?.featuredDropId}
          onFeaturedChange={() => { void refreshProfile(); void load(); }}
        />
      ) : tab === "posts" ? (
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
          <StagesLibrary drops={staged} onOpenDrop={() => setTab("drops")} />
        </div>
      )}
    </div>
  );
}

function TabBtn({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold transition active:scale-95",
        on ? "border-[rgb(var(--accent-rgb)/0.45)] bg-[rgb(var(--accent-rgb)/0.12)] text-white" : "border border-white/10 bg-white/[0.04] text-white/55 hover:text-white/85",
      )}
    >
      {label}
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
        title="No project posts yet"
        body="Posts you publish to a Project space show up here for rename and delete."
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
        title="No stage backdrops yet"
        body="When you attach a video or still backdrop to a drop in Compose, it appears here."
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
                <p className="truncate text-sm font-medium text-white/90">{d.title || "Untitled drop"}</p>
                <p className="text-[11px] text-white/40">Stage backdrop</p>
              </div>
              <button
                type="button"
                onClick={onOpenDrop}
                className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:text-white active:scale-95"
              >
                Manage drop
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
