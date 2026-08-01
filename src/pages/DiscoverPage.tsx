import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MapPin, Search, SlidersHorizontal, UserPlus, Users, X } from "lucide-react";
import * as api from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { NetworkModes } from "@/components/network/NetworkModes";
import { useSession } from "@/store/session";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { ROLES, GENRES, DAWS, PLUGINS, MUSICAL_KEYS, PROFESSIONS, PROFESSION_LABEL, SOFTWARE, STYLES, ENGINES, PRIMARY_PROFESSION } from "@/lib/profileFields";
import { Avatar } from "@/components/Avatar";
import { cx } from "@/lib/utils";
import type { CreatorSearchResult } from "@/types";

const selCls = "min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/85 focus:border-[rgb(var(--accent-rgb)/0.55)] focus:outline-none";

// Faceted creator finder: name + role/genre/DAW/plugin/key/BPM/location/remote.
export function DiscoverPage() {
  const navigate = useNavigate();
  const { showToast } = useSession();
  const [query, setQuery] = useState("");
  const [profession, setProfession] = useState(PRIMARY_PROFESSION);
  const [role, setRole] = useState("");
  const [genre, setGenre] = useState("");
  const [daw, setDaw] = useState("");
  const [plugin, setPlugin] = useState("");
  const [musicalKey, setMusicalKey] = useState("");
  const [bpm, setBpm] = useState("");
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState(false);
  const [software, setSoftware] = useState("");
  const [styles, setStyles] = useState("");
  const [engines, setEngines] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [results, setResults] = useState<CreatorSearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  const activeCount = useMemo(
    () => [profession, role, genre, daw, plugin, musicalKey, bpm, location, software, styles, engines].filter(Boolean).length + (remote ? 1 : 0),
    [profession, role, genre, daw, plugin, musicalKey, bpm, location, software, styles, engines, remote],
  );

  useRegisterAppBar({
    actions: (
      <button type="button" onClick={() => setShowFilters((s) => !s)} aria-label="Filters" aria-expanded={showFilters}
        className={cx("forge-chip gap-1.5 !min-h-9 px-3 text-xs font-semibold",
          showFilters || activeCount > 0 ? "forge-chip--active" : "")}>
        <SlidersHorizontal className="h-3.5 w-3.5" />
        {activeCount > 0 ? activeCount : "Filters"}
      </button>
    ),
  }, [showFilters, activeCount]);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api.searchCreators(query, {
        profession, role, genre, daw, plugin, key: musicalKey,
        bpm: bpm ? Number(bpm) : null, location, remote: remote ? true : null,
        software, styles, engines,
      }).then((r) => { setResults(r); setLoading(false); });
    }, 250);
    return () => clearTimeout(t);
  }, [query, profession, role, genre, daw, plugin, musicalKey, bpm, location, remote, software, styles, engines]);

  function clearAll() {
    setProfession(PRIMARY_PROFESSION); setRole(""); setGenre(""); setDaw(""); setPlugin(""); setMusicalKey(""); setBpm(""); setLocation(""); setRemote(false);
    setSoftware(""); setStyles(""); setEngines("");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2.5 px-1 pt-2">
        <NetworkModes />
        <label className="forge-field">
          <Search className="forge-field-icon h-4 w-4" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name…" />
        </label>
        <div className="flex gap-2">
          <select value={profession} onChange={(e) => setProfession(e.target.value)} className={selCls}>
            <option value="">Any craft</option>
            {PROFESSIONS.map((p) => <option key={p.id} value={p.id} className="bg-ink-900">{p.label}</option>)}
          </select>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={selCls}>
            <option value="">Any role</option>
            {ROLES.map((r) => <option key={r.id} value={r.id} className="bg-ink-900">{r.label}</option>)}
          </select>
        </div>

        {showFilters && (
          <div className="space-y-2.5 rounded-2xl border border-[var(--hairline)] bg-white/[0.02] p-3">
            <select value={genre} onChange={(e) => setGenre(e.target.value)} className={selCls}>
              <option value="">Any genre</option>
              {GENRES.map((g) => <option key={g} value={g} className="bg-ink-900">{g}</option>)}
            </select>
            <div className="flex gap-2">
              <select value={software} onChange={(e) => setSoftware(e.target.value)} className={selCls}>
                <option value="">Any software</option>
                {SOFTWARE.map((s) => <option key={s} value={s} className="bg-ink-900">{s}</option>)}
              </select>
              <select value={styles} onChange={(e) => setStyles(e.target.value)} className={selCls}>
                <option value="">Any style</option>
                {STYLES.map((s) => <option key={s} value={s} className="bg-ink-900">{s}</option>)}
              </select>
            </div>
            <select value={engines} onChange={(e) => setEngines(e.target.value)} className={selCls}>
              <option value="">Any engine</option>
              {ENGINES.map((s) => <option key={s} value={s} className="bg-ink-900">{s}</option>)}
            </select>
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

      <div className="no-scrollbar flex-1 overflow-y-auto px-1 pb-6 pt-3">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
          : results.length === 0 ? <EmptyState icon={Users} title="No musicians found" body="Loosen a filter or try a different name, role, or gear." />
          : <div className="divide-y divide-[var(--hairline)]">{results.map((c) => (
              <div key={c.userId} className="flex items-center gap-3 py-3.5">
                <button type="button" onClick={() => navigate(`/u/${c.userId}`)} className="shrink-0">
                  <Avatar name={c.username} id={c.userId} size="md" />
                </button>
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => navigate(`/u/${c.userId}`)} className="truncate font-display font-semibold text-white">{c.username}</button>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-white/40">
                    {c.profession && <span className="text-veil-200/90">{PROFESSION_LABEL[c.profession] ?? c.profession}</span>}
                    {c.location && <span className="inline-flex items-center gap-1"><MapPin className="h-2.5 w-2.5" />{c.location}</span>}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-white/35">
                    {[...c.offers.slice(0, 2).map((o) => o), ...c.seeks.slice(0, 2).map((s) => `seeks ${s}`)].join(" · ")}
                  </p>
                </div>
                <button type="button" onClick={async () => { await api.connect(c.userId); showToast(`Connection sent to ${c.username ?? "creator"}`); }}
                  className="btn btn-primary h-9 w-9 shrink-0 p-0" aria-label="Connect"><UserPlus className="h-3.5 w-3.5" /></button>
              </div>
            ))}</div>}
      </div>
    </div>
  );
}
