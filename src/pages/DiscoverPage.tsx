import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, Sparkles, Target, UserPlus, Users } from "lucide-react";
import * as api from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { useSession } from "@/store/session";
import { ROLES, GENRES } from "@/lib/profileFields";
import { avatarGradient, cx } from "@/lib/utils";
import type { CreatorSearchResult } from "@/types";

export function DiscoverPage() {
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
    <div className="flex h-full flex-col">
      <div className="px-4 pb-1 pt-3"><h1 className="font-display text-xl font-bold text-gradient">Discover</h1></div>
      <div className="space-y-2.5 px-4 pt-2">
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
    </div>
  );
}
