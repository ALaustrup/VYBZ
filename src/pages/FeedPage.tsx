import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, AudioLines, Shuffle, LayoutGrid, Rows3 } from "lucide-react";
import { TrackCard } from "@/components/TrackCard";
import { FeedTrackRow } from "@/components/FeedTrackRow";
import { FeedHero } from "@/components/FeedHero";
import { EmptyState } from "@/components/EmptyState";
import { HubActivity } from "@/components/home/HubActivity";
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

/** Network stream — public works, latest first. `home` variant is the Hear board on `/`. */
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

  const isHome = variant === "home";

  useRegisterAppBar(isHome ? {} : {}, [variant]);

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
    <div className={cx("flex flex-col", !isHome && "h-full")}>
      <div className={cx(isHome ? "pb-3 pt-1.5" : "no-scrollbar flex-1 overflow-y-auto pb-3 pt-1.5")}>
        <div className="mx-auto mb-4 max-w-2xl px-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
            {isHome ? "Hear" : "Network"}
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {isHome ? "Public work" : "New work"}
          </h1>
          <p className="mt-1 text-[13px] text-white/45">
            {isHome
              ? "Latest, Following, and Explore. Follow a Stage File so it lands here."
              : "Public works the moment they are shared."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setMode("latest")} className={cx("rounded-full px-3 py-1 text-[12px] font-semibold transition", mode === "latest" ? "bg-white/10 text-white" : "text-white/45 hover:text-white/75")}>Latest</button>
            <button type="button" onClick={() => setMode("following")} data-testid="network-following" className={cx("rounded-full px-3 py-1 text-[12px] font-semibold transition", mode === "following" ? "bg-white/10 text-white" : "text-white/45 hover:text-white/75")}>Following</button>
            <button type="button" onClick={() => setMode("discovery")} data-testid="network-explore" className={cx("rounded-full px-3 py-1 text-[12px] font-semibold transition", mode === "discovery" ? "bg-white/10 text-white" : "text-white/45 hover:text-white/75")}>Explore</button>
            {mode === "discovery" ? (
              <button type="button" onClick={() => setSeed(Math.floor(Math.random() * 1e9))} aria-label="Shuffle explore" className="forge-chip h-8 gap-1 !px-2.5 text-[11px]">
                <Shuffle className="h-3 w-3" />
                Shuffle
              </button>
            ) : null}
            <div className="ml-auto flex items-center gap-0.5">
              <button type="button" onClick={() => setLayoutPersist("comfortable")} aria-label="Comfortable layout"
                className={cx("forge-chip h-8 w-8", layout === "comfortable" && "forge-chip--active")}>
                <Rows3 className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => setLayoutPersist("grid")} aria-label="Grid layout"
                className={cx("forge-chip h-8 w-8", layout === "grid" && "forge-chip--active")}>
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-2xl px-0.5">
          <FeedHero />
        </div>
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
        ) : drops.length === 0 ? (
          <EmptyState
            icon={AudioLines}
            title={
              mode === "following"
                ? "No followed work yet"
                : mode === "discovery"
                  ? "Nothing to explore yet"
                  : "Nothing here yet"
            }
            body={
              mode === "following"
                ? "Follow a creator from their profile. Their public work lands here. VYB a piece when it resonates."
                : mode === "discovery"
                  ? "Public work to hear. Follow a Stage File so it lands in Following."
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
