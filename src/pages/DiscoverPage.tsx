import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MapPin, Search, SlidersHorizontal, Sparkles, Target, UserPlus, Users, X } from "lucide-react";
import * as api from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { useSession } from "@/store/session";
import { ROLES, GENRES, DAWS, PLUGINS, MUSICAL_KEYS } from "@/lib/profileFields";
import { Avatar } from "@/components/Avatar";
import { cx } from "@/lib/utils";
import type { CreatorSearchResult } from "@/types";

const selCls = "min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/85 focus:border-veil-400/60 focus:outline-none";

// Faceted creator finder: name + role/genre/DAW/plugin/key/BPM/location/remote.
export function DiscoverPage() {
  const navigate = useNavigate();
  const { showToast } = useSession();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [genre, setGenre] = useState("");
  const [daw, setDaw] = useState("");
  const [plugin, setPlugin] = useState("");
  const [musicalKey, setMusicalKey] = useState("");
  const [bpm, setBpm] = useState("");
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [results, setResults] = useState<CreatorSearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  const activeCount = useMemo(
    () => [role, genre, daw, plugin, musicalKey, bpm, location].filter(Boolean).length + (remote ? 1 : 0),
    [role, genre, daw, plugin, musicalKey, bpm, location, remote],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api.searchCreators(query, {
        role, genre, daw, plugin, key: musicalKey,
        bpm: bpm ? Number(bpm) : null, location, remote: remote ? true : null,
      }).then((r) => { setResults(r); setLoading(false); });
    }, 250);
    return () => clearTimeout(t);
  }, [query, role, genre, daw, plugin, musicalKey, bpm, location, remote]);

  function clearAll() {
    setRole(""); setGenre(""); setDaw(""); setPlugin(""); setMusicalKey(""); setBpm(""); setLocation(""); setRemote(false);
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader icon={Search} title="Discover creators" subtitle="Search & filter the network by role, genre, gear, tempo & place" />
      <div className="space-y-2.5 px-4 pt-2">
        <label className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 focus-within:border-veil-400/60">
          <Search className="h-4 w-4 text-white/40" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search creators by name…"
            className="w-full bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none" />
        </label>
        <div className="flex gap-2">
          <select value={role} onChange={(e) => setRole(e.target.value)} className={selCls}>
            <option value="">Any role</option>
            {ROLES.map((r) => <option key={r.id} value={r.id} className="bg-ink-900">{r.label}</option>)}
          </select>
          <select value={genre} onChange={(e) => setGenre(e.target.value)} className={selCls}>
            <option value="">Any genre</option>
            {GENRES.map((g) => <option key={g} value={g} className="bg-ink-900">{g}</option>)}
          </select>
          <button onClick={() => setShowFilters((s) => !s)}
            className={cx("flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition active:scale-95",
              showFilters || activeCount > 0 ? "border-veil-400/50 bg-veil-500/20 text-veil-100" : "border-white/10 bg-white/[0.03] text-white/70")}>
            <SlidersHorizontal className="h-4 w-4" />{activeCount > 0 ? activeCount : ""}
          </button>
        </div>

        {showFilters && (
          <div className="space-y-2.5 rounded-2xl border border-veil-400/20 bg-veil-500/[0.05] p-3">
            <div className="flex gap-2">
              <select value={daw} onChange={(e) => setDaw(e.target.value)} className={selCls}>
                <option value="">Any DAW</option>
                {DAWS.map((d) => <option key={d.id} value={d.id} className="bg-ink-900">{d.label}</option>)}
              </select>
              <select value={plugin} onChange={(e) => setPlugin(e.target.value)} className={selCls}>
                <option value="">Any plugin</option>
                {PLUGINS.map((p) => <option key={p.id} value={p.id} className="bg-ink-900">{p.label}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <select value={musicalKey} onChange={(e) => setMusicalKey(e.target.value)} className={selCls}>
                <option value="">Any key</option>
                {MUSICAL_KEYS.map((k) => <option key={k} value={k} className="bg-ink-900">{k}</option>)}
              </select>
              <input value={bpm} onChange={(e) => setBpm(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                inputMode="numeric" placeholder="BPM" className="w-24 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
            </div>
            <label className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 focus-within:border-veil-400/60">
              <MapPin className="h-4 w-4 text-white/40" />
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location — e.g. Berlin, LA…"
                className="w-full bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none" />
            </label>
            <div className="flex items-center justify-between">
              <button onClick={() => setRemote((r) => !r)} className="flex items-center gap-2 text-[13px] font-semibold text-white/75">
                <span className={cx("relative h-5 w-9 rounded-full transition", remote ? "bg-veil-500" : "bg-white/15")}>
                  <span className={cx("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", remote ? "left-[18px]" : "left-0.5")} />
                </span>
                Remote-friendly only
              </button>
              {activeCount > 0 && (
                <button onClick={clearAll} className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-[12px] font-semibold text-white/60 hover:text-white active:scale-95">
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-3">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
          : results.length === 0 ? <EmptyState icon={Users} title="No creators found" body="Loosen a filter or try a different name, role, or gear." />
          : <div className="space-y-2">{results.map((c) => (
              <div key={c.userId} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                <button onClick={() => navigate(`/u/${c.userId}`)} className="shrink-0">
                  <Avatar name={c.username} id={c.userId} size="md" />
                </button>
                <div className="min-w-0 flex-1">
                  <button onClick={() => navigate(`/u/${c.userId}`)} className="truncate font-display font-semibold text-white">{c.username}</button>
                  {c.location && <p className="flex items-center gap-1 text-[11px] text-white/45"><MapPin className="h-2.5 w-2.5" />{c.location}</p>}
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
    </div>
  );
}
