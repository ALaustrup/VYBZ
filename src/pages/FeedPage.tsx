import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, AudioLines, Compass, Clock, Shuffle, Sparkles, LayoutGrid, Rows3 } from "lucide-react";
import { TrackCard } from "@/components/TrackCard";
import { FeedPostCard } from "@/components/FeedPostCard";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";
import type { Drop, Reaction, FeedPost } from "@/types";

type FeedItem = Drop & { myReaction?: Reaction; myRating?: number; popularity?: number; visibility?: number };
type Mode = "discovery" | "latest";
type Layout = "comfortable" | "grid";

const SCOPES = [
  { id: "all", label: "For you" },
  { id: "following", label: "Following" },
  { id: "music", label: "Music" },
  { id: "art", label: "Art" },
  { id: "video", label: "Video" },
  { id: "writing", label: "Writing" },
  { id: "sounds", label: "Sounds" },
];

function defaultScope(intents?: string[]): string {
  const s = (intents ?? []).join(" ").toLowerCase();
  if (/art|paint|illustr|design|photo/.test(s)) return "art";
  if (/video|youtube|film|stream/.test(s)) return "video";
  if (/writ|author|book|poet|story|script/.test(s)) return "writing";
  if (/music|musician|sign|beat|produc|sound|dj|rap|sing/.test(s)) return "sounds";
  return "all";
}

export function FeedPage({ onCompose }: { onCompose: () => void }) {
  const { userId, profile } = useSession();
  const navigate = useNavigate();
  const intent = profile?.profile?.intents?.[0];
  const [scope, setScope] = useState<string>(() => defaultScope(profile?.profile?.intents));
  const [mode, setMode] = useState<Mode>("discovery");
  const [layout, setLayout] = useState<Layout>(() => {
    try { return (localStorage.getItem("vybz.feedLayout") as Layout) || "comfortable"; } catch { return "comfortable"; }
  });
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [drops, setDrops] = useState<FeedItem[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const setLayoutPersist = (l: Layout) => { setLayout(l); try { localStorage.setItem("vybz.feedLayout", l); } catch { /* ignore */ } };
  const isSounds = scope === "sounds";

  const load = useCallback(async () => {
    setLoading(true);
    if (scope === "sounds") setDrops(mode === "discovery" ? await api.listDiscovery(seed, 50) : await api.listDrops(50));
    else setPosts(await api.feedPosts(scope, 50));
    setLoading(false);
  }, [scope, mode, seed]);
  useEffect(() => { void load(); }, [load]);

  function react(d: FeedItem, r: Reaction) {
    const next = d.myReaction === r ? undefined : r;
    setDrops((list) => list.map((x) => {
      if (x.id !== d.id) return x;
      let feels = x.feels, wilds = x.wilds;
      if (x.myReaction === "feel") feels--; if (x.myReaction === "wild") wilds--;
      if (next === "feel") feels++; if (next === "wild") wilds++;
      return { ...x, feels, wilds, myReaction: next };
    }));
    if (next) void api.react(d.id, next);
  }
  function rate(d: FeedItem, stars: number) {
    setDrops((list) => list.map((x) => (x.id === d.id ? { ...x, myRating: stars } : x)));
    void api.rateTrack(d.id, stars);
  }
  function likePost(p: FeedPost, on: boolean) {
    setPosts((list) => list.map((x) => x.id === p.id ? { ...x, liked: on, likes: x.likes + (on ? 1 : -1) } : x));
    void api.likePost(p.id, on);
  }

  const gridCls = useMemo(() => layout === "grid" ? "grid w-full sm:grid-cols-2 xl:grid-cols-3" : "flex max-w-2xl flex-col", [layout]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        icon={AudioLines}
        title="Your feed"
        subtitle={intent ? `Curated for “${intent}”` : "Fresh from the community"}
        className="pb-1 max-lg:pr-14"
        actions={
          <button onClick={onCompose} className="flex h-10 items-center gap-1.5 rounded-full bg-veil-500 px-4 text-sm font-semibold text-white shadow-glow active:scale-95">
            <Plus className="h-4 w-4" /> Drop
          </button>
        }
      />

      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-5 pb-2 pt-1">
        {SCOPES.map((s) => (
          <button key={s.id} onClick={() => setScope(s.id)}
            className={cx("shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition active:scale-95",
              scope === s.id ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50" : "bg-white/[0.04] text-white/55 hover:text-white/85")}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 px-5 pb-3">
        {isSounds && (
          <>
            <div className="flex gap-1 rounded-full border border-white/8 bg-white/[0.02] p-1">
              <ModeBtn active={mode === "discovery"} onClick={() => setMode("discovery")} icon={Compass} label="Discovery" />
              <ModeBtn active={mode === "latest"} onClick={() => setMode("latest")} icon={Clock} label="Latest" />
            </div>
            {mode === "discovery" && (
              <button onClick={() => setSeed(Math.floor(Math.random() * 1e9))} aria-label="Shuffle" className="flex items-center gap-1 rounded-full bg-white/8 px-3 py-2 text-xs font-semibold text-white/80 active:scale-95">
                <Shuffle className="h-3.5 w-3.5" /> Shuffle
              </button>
            )}
          </>
        )}
        <div className="ml-auto flex gap-1 rounded-full border border-white/8 bg-white/[0.02] p-1">
          <button onClick={() => setLayoutPersist("comfortable")} aria-label="Comfortable layout" className={cx("rounded-full p-1.5 transition", layout === "comfortable" ? "bg-veil-500/25 text-white" : "text-white/45 hover:text-white/80")}><Rows3 className="h-4 w-4" /></button>
          <button onClick={() => setLayoutPersist("grid")} aria-label="Grid layout" className={cx("rounded-full p-1.5 transition", layout === "grid" ? "bg-veil-500/25 text-white" : "text-white/45 hover:text-white/80")}><LayoutGrid className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-6 pt-1">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
        ) : isSounds ? (
          drops.length === 0 ? (
            <EmptyState icon={AudioLines} title="No drops yet" body="Share a sound — a loop, a stem, a work-in-progress — and let complementary creators find it." />
          ) : (
            <div className={cx("mx-auto gap-5", gridCls)}>
              {drops.map((d, i) => (
                <div key={d.id} style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }} className="reveal relative">
                  {mode === "discovery" && (d.popularity ?? 1) < 0.2 && (
                    <span className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-aqua-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-aqua-200 backdrop-blur"><Sparkles className="h-2.5 w-2.5" /> Under-exposed</span>
                  )}
                  <TrackCard drop={d} queue={drops} onReact={(r) => react(d, r)} onRate={(s) => rate(d, s)}
                    onOpenAuthor={() => userId && d.authorId !== userId ? navigate(`/u/${d.authorId}`) : navigate("/profile")} />
                </div>
              ))}
            </div>
          )
        ) : posts.length === 0 ? (
          <EmptyState icon={Sparkles} title={scope === "following" ? "Nothing from your follows yet" : "No posts here yet"}
            body={scope === "following" ? "Follow creators' projects and their posts show up here." : "Be the first to post — head to your profile and share something to a project."} />
        ) : (
          <div className={cx("mx-auto gap-5", gridCls)}>
            {posts.map((p, i) => (
              <div key={p.id} style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }} className="reveal">
                <FeedPostCard post={p} onLike={(on) => likePost(p, on)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ModeBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Compass; label: string }) {
  return (
    <button onClick={onClick} className={cx("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
      active ? "bg-veil-500/25 text-white ring-1 ring-veil-400/40" : "text-white/55 hover:text-white/85")}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
