import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Briefcase, Check, Loader2, Plus, X } from "lucide-react";
import * as api from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { useSession } from "@/store/session";
import { ROLES, GENRES } from "@/lib/profileFields";
import { cx } from "@/lib/utils";
import type { Opportunity } from "@/types";

export function OpportunitiesPage() {
  const navigate = useNavigate();
  const { showToast } = useSession();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);

  async function load() { setLoading(true); setItems(await api.listOpportunities(50)); setLoading(false); }
  useEffect(() => { void load(); }, []);

  async function apply(o: Opportunity) {
    try { await api.applyToOpportunity(o.id); showToast("Applied — the poster can see you now."); }
    catch { showToast("Couldn't apply (maybe already applied)."); }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 pb-1 pt-3">
        <button onClick={() => navigate("/connect")} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"><ArrowLeft className="h-4 w-4" /></button>
        <h1 className="flex-1 font-display text-xl font-bold text-gradient">Opportunities</h1>
        <button onClick={() => setComposing(true)} className="flex h-9 items-center gap-1.5 rounded-full bg-veil-500 px-3.5 text-sm font-semibold text-white shadow-glow active:scale-95"><Plus className="h-4 w-4" /> Post</button>
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-2">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
        ) : items.length === 0 ? (
          <EmptyState icon={Briefcase} title="No open roles yet" body="Post what you're looking for — a vocalist, a mix engineer, a guitarist — and reach every creator who fits." />
        ) : (
          <div className="space-y-2.5">
            {items.map((o) => (
              <div key={o.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-white">{o.title}</p>
                    <p className="mt-0.5 text-xs text-white/45">Needs <span className="font-semibold text-aqua-200">{o.roleLabel}</span> · {o.authorUsername ?? "creator"}{o.remoteOk ? " · remote ok" : ""}</p>
                  </div>
                  <button onClick={() => apply(o)} className="shrink-0 rounded-full bg-veil-500/20 px-3 py-1.5 text-xs font-semibold text-veil-100 active:scale-95">Apply</button>
                </div>
                {o.body && <p className="mt-2 text-sm leading-snug text-white/70">{o.body}</p>}
                {(o.genres.length > 0) && <div className="mt-2 flex flex-wrap gap-1.5">{o.genres.slice(0, 4).map((g) => <span key={g} className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/70">{g}</span>)}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
      {composing && <PostForm onClose={() => setComposing(false)} onPosted={() => { setComposing(false); void load(); }} />}
    </div>
  );
}

function PostForm({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const { showToast } = useSession();
  const [role, setRole] = useState(ROLES[0].id);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [remoteOk, setRemoteOk] = useState(true);
  const [busy, setBusy] = useState(false);

  function toggleGenre(g: string) { setGenres((x) => x.includes(g) ? x.filter((y) => y !== g) : [...x, g].slice(0, 5)); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 3) return;
    setBusy(true);
    try { await api.createOpportunity({ roleNeeded: role, title: title.trim(), body: body.trim() || undefined, genres, remoteOk }); onPosted(); }
    catch { setBusy(false); showToast("Couldn't post."); }
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-900/95 p-5 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-gradient">Post an opportunity</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full glass"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-white/60">Role needed</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white">
            {ROLES.map((r) => <option key={r.id} value={r.id} className="bg-ink-900">{r.label}</option>)}
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 80))} placeholder="Title (e.g. Neo-soul EP needs a bassist)" className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
          <textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, 400))} rows={3} placeholder="Details…" className="resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
          <div className="flex flex-wrap gap-1.5">
            {GENRES.slice(0, 12).map((g) => (
              <button type="button" key={g} onClick={() => toggleGenre(g)} className={cx("rounded-full px-2.5 py-1 text-[11px] font-medium transition", genres.includes(g) ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50" : "bg-white/[0.04] text-white/55")}>{g}</button>
            ))}
          </div>
          <button type="button" onClick={() => setRemoteOk((v) => !v)} className="flex items-center gap-2 text-sm text-white/75">
            <span className={cx("flex h-5 w-5 items-center justify-center rounded-md border", remoteOk ? "border-feel bg-feel/20 text-feel" : "border-white/20")}>{remoteOk && <Check className="h-3.5 w-3.5" />}</span> Remote OK
          </button>
          <button type="submit" disabled={busy || title.trim().length < 3} className="btn btn-primary mt-1 w-full py-3">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post opportunity"}</button>
        </form>
      </div>
    </div>
  );
}
