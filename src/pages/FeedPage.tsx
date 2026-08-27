import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, AudioLines, Shuffle, LayoutGrid, Rows3, SlidersHorizontal } from "lucide-react";
import { TrackCard } from "@/components/TrackCard";
import { FeedTrackRow } from "@/components/FeedTrackRow";
import { FeedHero } from "@/components/FeedHero";
import { EmptyState } from "@/components/EmptyState";
import { HubActivity } from "@/components/home/HubActivity";
import { WhosLivePanel } from "@/features/live/WhosLivePanel";
import { listFollowedCreatorIds } from "@/features/network/followApi";
import * as api from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/store/session";
import { ownerProfilePath } from "@/shell/navModel";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { cx } from "@/lib/utils";
import type { Drop, Reaction } from "@/types";

type FeedItem = Drop & { myReaction?: Reaction; myRating?: number; popularity?: number; visibility?: number };
type Mode = "discovery" | "latest" | "following";
type Layout = "comfortable" | "grid";

/** Network stream — public works, latest first. `home` variant is the signed-in `/` landing. */
export function FeedPage({
  onCompose,
  variant = "feed",
}: {
  onCompose: () => void;
  variant?: "feed" | "home";
}) {
  const { userId } = useSession();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>("latest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [layout, setLayout] = useState<Layout>(() => {
    try { return (localStorage.getItem("vybz.feedLayout") as Layout) || "comfortable"; } catch { return "comfortable"; }
  });
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [drops, setDrops] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const setLayoutPersist = (l: Layout) => { setLayout(l); try { localStorage.setItem("vybz.feedLayout", l); } catch { /* ignore */ } };

  const wantsCompose = params.get("compose") === "1";
  useEffect(() => {
    if (!wantsCompose) return;
    onCompose();
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("compose");
      return next;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsCompose]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const nextDrops =
      mode === "discovery"
        ? await api.listDiscovery(seed, 50)
        : mode === "following"
          ? await api.listDropsFromAuthors(await listFollowedCreatorIds(), 50)
          : await api.listDrops(50);
    setDrops(nextDrops);
    setLoading(false);
  }, [mode, seed]);
  useEffect(() => { void load(); }, [load]);

  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => {
    const sb = supabase;
    if (!sb) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const bump = () => { if (t) clearTimeout(t); t = setTimeout(() => void loadRef.current(true), 500); };
    const ch = sb.channel("feed:drops").on("postgres_changes", { event: "INSERT", schema: "public", table: "drops" }, bump).subscribe();
    return () => { if (t) clearTimeout(t); void sb.removeChannel(ch); };
  }, []);

  useRegisterAppBar({
    ...(variant === "home" ? { title: "Home" } : {}),
    actions: (
      <div className="flex items-center gap-0.5">
        <button type="button" onClick={() => setFiltersOpen((v) => !v)} aria-label="Network options" aria-expanded={filtersOpen}
          className={cx("forge-chip h-9 w-9", filtersOpen && "forge-chip--active")}>
          <SlidersHorizontal className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => setLayoutPersist("comfortable")} aria-label="Comfortable layout"
          className={cx("forge-chip h-9 w-9", layout === "comfortable" && "forge-chip--active")}>
          <Rows3 className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => setLayoutPersist("grid")} aria-label="Grid layout"
          className={cx("forge-chip h-9 w-9", layout === "grid" && "forge-chip--active")}>
          <LayoutGrid className="h-4 w-4" />
        </button>
      </div>
    ),
  }, [filtersOpen, layout, variant]);

  const isHome = variant === "home";

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

  const gridCls = useMemo(() => layout === "grid" ? "grid w-full sm:grid-cols-2 xl:grid-cols-3 gap-3" : "flex max-w-2xl flex-col gap-3.5", [layout]);

  return (
    <div className="flex h-full flex-col">
      {filtersOpen && (
        <div className="forge-glass relative mb-2 mt-2 flex flex-wrap items-center gap-3 p-3 text-[12px]">
          <span className="forge-glass-edge" aria-hidden />
          <button type="button" onClick={() => setMode("discovery")} className={cx("rounded-full px-3 py-1 font-semibold transition", mode === "discovery" ? "bg-[rgb(var(--accent-rgb)/0.12)] text-white" : "text-white/45 hover:text-white/75")}>Explore</button>
          <button type="button" onClick={() => setMode("latest")} className={cx("rounded-full px-3 py-1 font-semibold transition", mode === "latest" ? "bg-[rgb(var(--accent-rgb)/0.12)] text-white" : "text-white/45 hover:text-white/75")}>Latest</button>
          <button type="button" onClick={() => setMode("following")} className={cx("rounded-full px-3 py-1 font-semibold transition", mode === "following" ? "bg-[rgb(var(--accent-rgb)/0.12)] text-white" : "text-white/45 hover:text-white/75")}>Following</button>
          {mode === "discovery" && (
            <button type="button" onClick={() => setSeed(Math.floor(Math.random() * 1e9))} className="forge-cta-ghost ml-auto !min-h-8 !px-3 !text-xs">
              <Shuffle className="h-3 w-3" /> Shuffle
            </button>
          )}
        </div>
      )}

      <div className="no-scrollbar flex-1 overflow-y-auto pb-3 pt-1.5">
        <div className="mx-auto mb-4 max-w-2xl px-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
            {isHome ? "Home" : "Network"}
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {isHome ? "People & live" : "New work"}
          </h1>
          <p className="mt-1 text-[13px] text-white/45">
            {isHome
              ? "Connections, live rooms, and work from people you follow."
              : "Public works the moment they are shared."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setMode("latest")} className={cx("rounded-full px-3 py-1 text-[12px] font-semibold transition", mode === "latest" ? "bg-white/10 text-white" : "text-white/45 hover:text-white/75")}>Latest</button>
            <button type="button" onClick={() => setMode("following")} data-testid="network-following" className={cx("rounded-full px-3 py-1 text-[12px] font-semibold transition", mode === "following" ? "bg-white/10 text-white" : "text-white/45 hover:text-white/75")}>Following</button>
            <div className="ml-auto flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-white/45">
              <Link to="/live" className="hover:text-white/80">Live</Link>
              <Link to="/connect" className="hover:text-white/80">People</Link>
              <Link to="/messages" className="hover:text-white/80">Messages</Link>
            </div>
          </div>
        </div>
        <div className="mx-auto mb-5 max-w-2xl px-0.5">
          <WhosLivePanel variant="shelf" />
        </div>
        <div className="mx-auto max-w-2xl px-0.5">
          <FeedHero />
        </div>
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
        ) : drops.length === 0 ? (
          <EmptyState
            icon={AudioLines}
            title={mode === "following" ? "No followed work yet" : "Nothing here yet"}
            body={
              mode === "following"
                ? "Follow a creator from their profile. Their public work lands here. VYB a piece when it resonates."
                : "Public work lands here for everyone, and on the creator's profile."
            }
          />
        ) : layout === "grid" ? (
          <div className={cx("mx-auto", gridCls)}>
            {drops.map((d, i) => (
              <div key={d.id} style={{ animationDelay: `${Math.min(i, 16) * 45}ms` }} className="reveal">
                <TrackCard
                  drop={d}
                  queue={drops}
                  onReact={(r) => react(d, r)}
                  onRate={(s) => rate(d, s)}
                  onOpenAuthor={() => userId && d.authorId !== userId ? navigate(`/u/${d.authorId}`) : navigate(ownerProfilePath(userId))}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-2">
            {drops.map((d) => (
              <FeedTrackRow
                key={d.id}
                drop={d}
                queue={drops}
                onReact={(r) => react(d, r)}
                onOpenAuthor={() => userId && d.authorId !== userId ? navigate(`/u/${d.authorId}`) : navigate(ownerProfilePath(userId))}
              />
            ))}
          </div>
        )}
        <div className="mx-auto mt-8 max-w-2xl px-0.5 pb-4">
          <HubActivity />
        </div>
      </div>
    </div>
  );
}
