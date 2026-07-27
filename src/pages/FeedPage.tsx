import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, AudioLines, Shuffle, LayoutGrid, Rows3, SlidersHorizontal } from "lucide-react";
import { TrackCard } from "@/components/TrackCard";
import { FeedHero } from "@/components/FeedHero";
import { VibeCardView } from "@/components/VibeCard";
import { EmptyState } from "@/components/EmptyState";
import * as api from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/store/session";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { cx } from "@/lib/utils";
import type { Drop, Reaction, VibeCard } from "@/types";

type FeedItem = Drop & { myReaction?: Reaction; myRating?: number; popularity?: number; visibility?: number };
type Mode = "discovery" | "latest";
type Layout = "comfortable" | "grid";

/** Drops feed — vibe discovery cards + network sound. */
export function FeedPage({ onCompose }: { onCompose: () => void }) {
  const { userId } = useSession();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>("discovery");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [layout, setLayout] = useState<Layout>(() => {
    try { return (localStorage.getItem("vybz.feedLayout") as Layout) || "comfortable"; } catch { return "comfortable"; }
  });
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [drops, setDrops] = useState<FeedItem[]>([]);
  const [vibeCards, setVibeCards] = useState<VibeCard[]>([]);
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
    const [nextDrops, nextVibes] = await Promise.all([
      mode === "discovery" ? api.listDiscovery(seed, 50) : api.listDrops(50),
      userId ? api.feedVibeCards(8).catch(() => [] as VibeCard[]) : Promise.resolve([] as VibeCard[]),
    ]);
    setDrops(nextDrops);
    setVibeCards(nextVibes);
    setLoading(false);
  }, [mode, seed, userId]);
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
    actions: (
      <div className="flex items-center gap-0.5 text-paper-900/45">
        <button type="button" onClick={() => setFiltersOpen((v) => !v)} aria-label="Feed options" aria-expanded={filtersOpen}
          className={cx("rounded-xl p-2 transition hover:text-paper-900/80", filtersOpen && "bg-paper-900/[0.06] text-paper-900")}>
          <SlidersHorizontal className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => setLayoutPersist("comfortable")} aria-label="Comfortable layout"
          className={cx("rounded-xl p-2 transition", layout === "comfortable" ? "text-paper-900" : "hover:text-paper-900/70")}>
          <Rows3 className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => setLayoutPersist("grid")} aria-label="Grid layout"
          className={cx("rounded-xl p-2 transition", layout === "grid" ? "text-paper-900" : "hover:text-paper-900/70")}>
          <LayoutGrid className="h-4 w-4" />
        </button>
      </div>
    ),
  }, [filtersOpen, layout]);

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
        <div className="mb-2 mt-2 flex flex-wrap items-center gap-3 rounded-2xl border border-paper-900/10 bg-white/70 px-3 py-2.5 text-[12px] text-paper-900">
          <button type="button" onClick={() => setMode("discovery")} className={cx("font-medium", mode === "discovery" ? "text-paper-900" : "text-paper-900/40")}>Explore</button>
          <button type="button" onClick={() => setMode("latest")} className={cx("font-medium", mode === "latest" ? "text-paper-900" : "text-paper-900/40")}>Latest</button>
          {mode === "discovery" && (
            <button type="button" onClick={() => setSeed(Math.floor(Math.random() * 1e9))} className="ml-auto flex items-center gap-1 text-paper-900/40 hover:text-paper-900/75">
              <Shuffle className="h-3 w-3" /> Shuffle
            </button>
          )}
        </div>
      )}

      <div className="no-scrollbar flex-1 overflow-y-auto pb-3 pt-1.5">
        <div className="mx-auto max-w-2xl px-0.5">
          <FeedHero />
        </div>
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
        ) : drops.length === 0 && vibeCards.length === 0 ? (
          <EmptyState
            icon={AudioLines}
            title="Your feed is waking up"
            body="Add interests on your profile to get vibe matches — or share a drop from the dock."
          />
        ) : (
          <div className={cx("mx-auto", gridCls)}>
            {vibeCards.map((card, i) => (
              <div key={`vibe-${card.userId}-${card.cardType}`} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }} className="reveal sm:col-span-1">
                <VibeCardView card={card} />
              </div>
            ))}
            {drops.map((d, i) => (
              <div key={d.id} style={{ animationDelay: `${Math.min(i + vibeCards.length, 16) * 45}ms` }} className="reveal">
                <TrackCard
                  drop={d}
                  queue={drops}
                  onReact={(r) => react(d, r)}
                  onRate={(s) => rate(d, s)}
                  onOpenAuthor={() => userId && d.authorId !== userId ? navigate(`/u/${d.authorId}`) : navigate("/profile")}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
