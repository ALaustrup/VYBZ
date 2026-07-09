import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, Sparkles, Target, UserPlus, Users, Compass, Shuffle, Rocket } from "lucide-react";
import * as api from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { TrackCard } from "@/components/TrackCard";
import { useSession } from "@/store/session";
import { ROLES, GENRES } from "@/lib/profileFields";
import { avatarGradient, cx } from "@/lib/utils";
import type { CreatorSearchResult, Reaction } from "@/types";

type Tab = "discovery" | "creators";

export function DiscoverPage() {
  const [tab, setTab] = useState<Tab>("discovery");
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-2 pt-3"><h1 className="font-display text-xl font-bold text-gradient">Discover</h1></div>
      <div className="mx-4 mb-2 flex gap-1.5 rounded-2xl border border-white/8 bg-white/[0.02] p-1">
        <TabBtn active={tab === "discovery"} onClick={() => setTab("discovery")} icon={Compass} label="Discovery" />
        <TabBtn active={tab === "creators"} onClick={() => setTab("creators")} icon={Users} label="Creators" />
      </div>
      {tab === "discovery" ? <DiscoveryFeed /> : <CreatorSearch />}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Compass; label: string }) {
  return (
    <button onClick={onClick} className={cx("flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition",
      active ? "bg-veil-500/20 text-white ring-1 ring-veil-400/40" : "text-white/50 hover:text-white/80")}>
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

// ── Anti-popularity discovery feed ───────────────────────────────────────────
function DiscoveryFeed() {
  const [drops, setDrops] = useState<api.DiscoveryDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));

  const load = useCallback(async (s: number) => {
    setLoading(true);
    setDrops(await api.listDiscovery(s, 40));
    setLoading(false);
  }, []);
  useEffect(() => { void load(seed); }, [load, seed]);

  function react(id: string, r: Reaction) {
    setDrops((list) => list.map((x) => {
      if (x.id !== id) return x;
      const next = x.myReaction === r ? undefined : r;
      let feels = x.feels, wilds = x.wilds;
      if (x.myReaction === "feel") feels--; if (x.myReaction === "wild") wilds--;
      if (next === "feel") feels++; if (next === "wild") wilds++;
      if (next) void api.react(id, next);
      return { ...x, feels, wilds, myReaction: next };
    }));
  }
  function rate(id: string, stars: number) {
    setDrops((list) => list.map((x) => (x.id === id ? { ...x, myRating: stars } : x)));
    void api.rateTrack(id, stars);
  }

  return (
    <>
      <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl border border-aqua-400/20 bg-aqua-400/[0.06] px-3 py-2">
        <Rocket className="h-4 w-4 shrink-0 text-aqua-300" />
        <p className="min-w-0 flex-1 text-[11px] leading-snug text-white/70">Under-exposed artists first. The more plays, followers, and engagement an artist has, the <span className="font-semibold text-white">lower</span> they rank — real discovery over popularity.</p>
        <button onClick={() => setSeed(Math.floor(Math.random() * 1e9))} aria-label="Shuffle" className="flex shrink-0 items-center gap-1 rounded-full bg-white/8 px-2.5 py-1 text-xs font-semibold text-white/85 active:scale-95"><Shuffle className="h-3.5 w-3.5" /> Shuffle</button>
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-1">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
        ) : drops.length === 0 ? (
          <EmptyState icon={Compass} title="Nothing to discover yet" body="As creators share sounds, the least-heard rise to the top here." />
        ) : (
          <div className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-2">
            {drops.map((d) => (
              <div key={d.id} className="relative">
                {d.popularity < 0.2 && (
                  <span className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-aqua-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-aqua-200 backdrop-blur">
                    <Sparkles className="h-2.5 w-2.5" /> Under-exposed
                  </span>
                )}
                <TrackCard drop={d} queue={drops} onReact={(r) => react(d.id, r)} onRate={(s) => rate(d.id, s)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ── Creator search (unchanged) ───────────────────────────────────────────────
function CreatorSearch() {
  const navigate = useNavigate();
  const { showToast } = useSession();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [genre, setGenre] = useState("");
  const [results, setResults] = useState<CreatorSearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api.searchCreators(query, role, genre).then((r) => { setResults(r); setLoading(false); });
    }, 250);
    return () => clearTimeout(t);
  }, [query, role, genre]);

  return (
    <>
      <div className="space-y-2.5 px-4 pt-1">
        <label className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 focus-within:border-veil-400/60">
          <Search className="h-4 w-4 text-white/40" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search creators by name…"
            className="w-full bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none" />
        </label>
        <div className="flex gap-2">
          <select value={role} onChange={(e) => setRole(e.target.value)} className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/85">
            <option value="">Any role</option>
            {ROLES.map((r) => <option key={r.id} value={r.id} className="bg-ink-900">{r.label}</option>)}
          </select>
          <select value={genre} onChange={(e) => setGenre(e.target.value)} className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/85">
            <option value="">Any genre</option>
            {GENRES.map((g) => <option key={g} value={g} className="bg-ink-900">{g}</option>)}
          </select>
        </div>
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-3">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
          : results.length === 0 ? <EmptyState icon={Users} title="No creators found" body="Try a different name, role, or genre." />
          : <div className="space-y-2">{results.map((c) => (
              <div key={c.userId} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                <button onClick={() => navigate(`/u/${c.userId}`)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display font-bold text-white" style={{ background: `linear-gradient(150deg, ${avatarGradient(c.username || c.userId)[0]}, ${avatarGradient(c.username || c.userId)[1]})` }}>
                  {(c.username || "?").charAt(0).toUpperCase()}
                </button>
                <div className="min-w-0 flex-1">
                  <button onClick={() => navigate(`/u/${c.userId}`)} className="truncate font-display font-semibold text-white">{c.username}</button>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {c.offers.slice(0, 2).map((o) => <span key={o} className="flex items-center gap-0.5 rounded-full bg-feel/15 px-1.5 py-0.5 text-[10px] text-feel"><Sparkles className="h-2.5 w-2.5" />{o}</span>)}
                    {c.seeks.slice(0, 2).map((s) => <span key={s} className="flex items-center gap-0.5 rounded-full bg-aqua-400/15 px-1.5 py-0.5 text-[10px] text-aqua-200"><Target className="h-2.5 w-2.5" />{s}</span>)}
                  </div>
                </div>
                <button onClick={async () => { await api.connect(c.userId); showToast(`Connection sent to ${c.username ?? "creator"}`); }}
                  className={cx("flex shrink-0 items-center gap-1.5 rounded-full bg-veil-500/20 px-3 py-1.5 text-xs font-semibold text-veil-100 active:scale-95")}><UserPlus className="h-3.5 w-3.5" /></button>
              </div>
            ))}</div>}
      </div>
    </>
  );
}
