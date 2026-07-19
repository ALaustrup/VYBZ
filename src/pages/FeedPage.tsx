import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Plus, AudioLines, Shuffle, Sparkles, LayoutGrid, Rows3 } from "lucide-react";
import { TrackCard } from "@/components/TrackCard";
import { FeedPostCard } from "@/components/FeedPostCard";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { FeedHero } from "@/components/FeedHero";
import * as api from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";
import { isAdjacentClass } from "@/lib/profileFields";
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

function defaultScope(profession?: string | null, intents?: string[], roleClass?: string | null): string {
  if (isAdjacentClass(roleClass)) return "all";
  switch (profession) {
    case "music": return "sounds";
    case "visual_art": return "art";
    case "film_video": return "video";
    case "game_dev": return "all";
  }
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
  const [params, setParams] = useSearchParams();
  const intent = profile?.profile?.intents?.[0];
  const [scope, setScope] = useState<string>(() => defaultScope(profile?.profile?.profession, profile?.profile?.intents, profile?.profile?.roleClass));

  // Post-onboarding “Share a drop” lands here with ?compose=1
  const wantsCompose = params.get("compose") === "1";
  useEffect(() => {
    if (!wantsCompose) return;
    onCompose();
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("compose");
      return next;
    }, { replace: true });
    // intentionally only when the query flag appears
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsCompose]);
  const [mode, setMode] = useState<Mode>("discovery");
  const [layout, setLayout] = useState<Layout>(() => {
    try { return (localStorage.getItem("vybz.feedLayout") as Layout) || "comfortable"; } catch { return "comfortable"; }
  });
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [forYouMode, setForYouMode] = useState<"foryou" | "undiscovered">("foryou");
  const [drops, setDrops] = useState<FeedItem[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const setLayoutPersist = (l: Layout) => { setLayout(l); try { localStorage.setItem("vybz.feedLayout", l); } catch { /* ignore */ } };
  const isSounds = scope === "sounds";
  const isForYou = scope === "all";

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (scope === "sounds") setDrops(mode === "discovery" ? await api.listDiscovery(seed, 50) : await api.listDrops(50));
    else if (scope === "all") setPosts(forYouMode === "foryou" ? await api.feedForYou(50) : await api.feedUndiscovered(50));
    else setPosts(await api.feedPosts(scope, 50));
    setLoading(false);
  }, [scope, mode, seed, forYouMode]);
  useEffect(() => { void load(); }, [load]);

  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => {
    const sb = supabase;
    if (!sb) return;
    const table = isSounds ? "drops" : "project_posts";
    let t: ReturnType<typeof setTimeout> | null = null;
    const bump = () => { if (t) clearTimeout(t); t = setTimeout(() => void loadRef.current(true), 500); };
    const ch = sb
      .channel(`feed:${table}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table }, bump)
      .subscribe();
    return () => { if (t) clearTimeout(t); void sb.removeChannel(ch); };
  }, [isSounds]);

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
        title="Feed"
        subtitle={intent ? `Curated for “${intent}”` : "Fresh from the network"}
        actions={
          <button type="button" onClick={onCompose} className="btn btn-primary h-9 px-3.5 py-0 text-xs">
            <Plus className="h-3.5 w-3.5" /> Drop
          </button>
        }
      />

      <div className="no-scrollbar flex items-end gap-5 overflow-x-auto px-5 pb-0">
        {SCOPES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setScope(s.id)}
            className={cx(
              "relative shrink-0 pb-2.5 text-[13px] font-medium transition",
              scope === s.id ? "text-white" : "text-white/40 hover:text-white/70",
            )}
          >
            {s.label}
            {scope === s.id && (
              <span className="absolute inset-x-0 bottom-0 h-px bg-veil-400/70" />
            )}
          </button>
        ))}
      </div>
      <div className="mx-5 h-px bg-[var(--hairline)]" />

      <div className="flex items-center gap-3 px-5 py-2.5">
        {isForYou && (
          <div className="flex gap-3 text-[12px]">
            <ModeLink active={forYouMode === "foryou"} onClick={() => setForYouMode("foryou")} label="For you" />
            <ModeLink active={forYouMode === "undiscovered"} onClick={() => setForYouMode("undiscovered")} label="Undiscovered" />
          </div>
        )}
        {isSounds && (
          <div className="flex items-center gap-3 text-[12px]">
            <ModeLink active={mode === "discovery"} onClick={() => setMode("discovery")} label="Explore" />
            <ModeLink active={mode === "latest"} onClick={() => setMode("latest")} label="Latest" />
            {mode === "discovery" && (
              <button
                type="button"
                onClick={() => setSeed(Math.floor(Math.random() * 1e9))}
                aria-label="Shuffle"
                className="flex items-center gap-1 text-white/40 hover:text-white/75"
              >
                <Shuffle className="h-3 w-3" /> Shuffle
              </button>
            )}
          </div>
        )}
        <div className="ml-auto flex items-center gap-1 text-white/35">
          <button type="button" onClick={() => setLayoutPersist("comfortable")} aria-label="Comfortable layout" className={cx("rounded-lg p-1.5 transition", layout === "comfortable" ? "text-white" : "hover:text-white/70")}><Rows3 className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={() => setLayoutPersist("grid")} aria-label="Grid layout" className={cx("rounded-lg p-1.5 transition", layout === "grid" ? "text-white" : "hover:text-white/70")}><LayoutGrid className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-6 pt-1">
        <FeedHero />
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
        ) : isSounds ? (
          drops.length === 0 ? (
            <EmptyState
              icon={AudioLines}
              title="No drops yet"
              body="Share a sound — a loop, a stem, a work-in-progress — and let complementary creators find it."
              action={
                <button type="button" onClick={onCompose} className="btn btn-primary mt-1 h-9 px-4 py-0 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Drop
                </button>
              }
            />
          ) : (
            <div className={cx("mx-auto gap-5", gridCls)}>
              {drops.map((d, i) => (
                <div key={d.id} style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }} className="reveal relative">
                  {mode === "discovery" && (d.popularity ?? 1) < 0.2 && (
                    <span className="absolute left-3 top-3 z-10 text-[10px] font-medium uppercase tracking-[0.14em] text-white/55">Under-exposed</span>
                  )}
                  <TrackCard drop={d} queue={drops} onReact={(r) => react(d, r)} onRate={(s) => rate(d, s)}
                    onOpenAuthor={() => userId && d.authorId !== userId ? navigate(`/u/${d.authorId}`) : navigate("/profile")} />
                </div>
              ))}
            </div>
          )
        ) : posts.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={scope === "following" ? "Nothing from your follows yet" : "No posts here yet"}
            body={
              scope === "following"
                ? "Follow creators and their posts show up here."
                : "Share a drop — a sketch, a loop, a clip — and it lands on the Feed."
            }
            action={
              scope !== "following" ? (
                <button type="button" onClick={onCompose} className="btn btn-primary mt-1 h-9 px-4 py-0 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Drop
                </button>
              ) : (
                <button type="button" onClick={() => navigate("/discover")} className="btn btn-ghost mt-1 h-9 px-4 py-0 text-xs">
                  Discover creators
                </button>
              )
            }
          />
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

function ModeLink({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className={cx("font-medium transition", active ? "text-white" : "text-white/35 hover:text-white/65")}>
      {label}
    </button>
  );
}
