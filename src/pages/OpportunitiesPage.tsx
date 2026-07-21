import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Briefcase, Check, DollarSign, Loader2, Plus, X } from "lucide-react";
import * as api from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { useSession } from "@/store/session";
import { ROLES, GENRES } from "@/lib/profileFields";
import { cx } from "@/lib/utils";
import type { Opportunity } from "@/types";

type Tab = "collab" | "commission";

export function OpportunitiesPage() {
  const navigate = useNavigate();
  const { showToast } = useSession();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [tab, setTab] = useState<Tab>("collab");

  async function load(t: Tab) { setLoading(true); setItems(await api.listOpportunities(50, t)); setLoading(false); }
  useEffect(() => { void load(tab); }, [tab]);

  async function apply(o: Opportunity) {
    try { await api.applyToOpportunity(o.id); showToast(o.kind === "commission" ? "Pitched — the client can see you now." : "Applied — the poster can see you now."); }
    catch { showToast("Couldn't apply (maybe already applied)."); }
  }

  const isCommission = tab === "commission";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-3 pt-4 max-lg:pr-14">
        <button type="button" onClick={() => navigate("/connect")} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[1.65rem] font-semibold tracking-tight text-white">Opportunities</h1>
          <p className="text-[13px] text-white/40">Open roles &amp; paid commissions</p>
        </div>
        <button type="button" onClick={() => setComposing(true)} className="btn btn-primary h-9 px-3.5 py-0 text-xs"><Plus className="h-3.5 w-3.5" /> Post</button>
      </div>
      <div className="mx-5 h-px bg-[var(--hairline)]" />
      <div className="flex gap-5 px-5 pt-3">
        {(["collab", "commission"] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={cx("relative pb-2.5 text-[13px] font-medium transition",
              tab === t ? "text-white" : "text-white/40 hover:text-white/70")}>
            {t === "collab" ? "Open roles" : <span className="inline-flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Commissions</span>}
            {tab === t && <span className="absolute inset-x-0 bottom-0 h-px bg-veil-400/70" />}
          </button>
        ))}
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-6 pt-2">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
        ) : items.length === 0 ? (
          isCommission
            ? <EmptyState icon={DollarSign} title="No open commissions yet" body="Commission a musician for paid work — a track, topline, mix, or stem package. Post a brief and a budget." />
            : <EmptyState icon={Briefcase} title="No open roles yet" body="Post what you're looking for — a vocalist, a mix engineer, a guitarist — and reach every musician who fits." />
        ) : (
          <div className="divide-y divide-[var(--hairline)]">
            {items.map((o) => (
              <div key={o.id} className="py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-white">{o.title}</p>
                    <p className="mt-0.5 text-xs text-white/40">{o.kind === "commission" ? "Seeking" : "Needs"} <span className="font-medium text-white/70">{o.roleLabel}</span> · {o.authorUsername ?? "creator"}{o.remoteOk ? " · remote ok" : ""}</p>
                  </div>
                  <button type="button" onClick={() => apply(o)} className="btn btn-primary h-8 shrink-0 px-3 py-0 text-xs">{o.kind === "commission" ? "Pitch" : "Apply"}</button>
                </div>
                {o.kind === "commission" && o.budget && (
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-200"><DollarSign className="h-3 w-3" /> {o.budget}</p>
                )}
                {o.body && <p className="mt-2 text-sm leading-snug text-white/70">{o.body}</p>}
                {(o.genres.length > 0) && <div className="mt-2 flex flex-wrap gap-1.5">{o.genres.slice(0, 4).map((g) => <span key={g} className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/70">{g}</span>)}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
      {composing && <PostForm initialKind={tab} onClose={() => setComposing(false)} onPosted={(k) => { setComposing(false); setTab(k); if (k === tab) void load(tab); }} />}
    </div>
  );
}

function PostForm({ initialKind, onClose, onPosted }: { initialKind: Tab; onClose: () => void; onPosted: (kind: Tab) => void }) {
  const { showToast } = useSession();
  const [kind, setKind] = useState<Tab>(initialKind);
  const [role, setRole] = useState(ROLES[0].id);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [budget, setBudget] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [remoteOk, setRemoteOk] = useState(true);
  const [busy, setBusy] = useState(false);
  const isCommission = kind === "commission";

  function toggleGenre(g: string) { setGenres((x) => x.includes(g) ? x.filter((y) => y !== g) : [...x, g].slice(0, 5)); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 3) return;
    setBusy(true);
    try {
      await api.createOpportunity({
        roleNeeded: role, title: title.trim(), body: body.trim() || undefined, genres, remoteOk,
        kind, budget: isCommission && budget.trim() ? budget.trim() : undefined,
      });
      onPosted(kind);
    }
    catch { setBusy(false); showToast("Couldn't post."); }
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-900/95 p-5 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-gradient">{isCommission ? "Post a commission" : "Post an opportunity"}</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full glass"><X className="h-4 w-4" /></button>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          {(["collab", "commission"] as Tab[]).map((k) => (
            <button type="button" key={k} onClick={() => setKind(k)}
              className={cx("flex items-center justify-center gap-1.5 rounded-xl border py-2 text-sm font-semibold transition active:scale-[0.98]",
                kind === k ? "border-veil-400/60 bg-veil-500/20 text-white" : "border-white/10 bg-white/[0.03] text-white/60")}>
              {k === "collab" ? <><Briefcase className="h-4 w-4" /> Collab</> : <><DollarSign className="h-4 w-4" /> Commission</>}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-white/60">{isCommission ? "Creator role you need" : "Role needed"}</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white">
            {ROLES.map((r) => <option key={r.id} value={r.id} className="bg-ink-900">{r.label}</option>)}
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 80))} placeholder={isCommission ? "Title (e.g. Album cover illustration)" : "Title (e.g. Neo-soul EP needs a bassist)"} className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
          {isCommission && (
            <div className="relative">
              <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-300/70" />
              <input value={budget} onChange={(e) => setBudget(e.target.value.slice(0, 40))} placeholder="Budget (e.g. $300 fixed, $50/hr, $500–$1,000)" className="w-full rounded-xl border border-amber-400/20 bg-amber-400/[0.04] py-3 pl-9 pr-3.5 text-sm text-white placeholder:text-white/35 focus:border-amber-400/50 focus:outline-none" />
            </div>
          )}
          <textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, 400))} rows={3} placeholder={isCommission ? "The brief — deliverables, timeline, references…" : "Details…"} className="resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
          <div className="flex flex-wrap gap-1.5">
            {GENRES.slice(0, 12).map((g) => (
              <button type="button" key={g} onClick={() => toggleGenre(g)} className={cx("rounded-full px-2.5 py-1 text-[11px] font-medium transition", genres.includes(g) ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50" : "bg-white/[0.04] text-white/55")}>{g}</button>
            ))}
          </div>
          <button type="button" onClick={() => setRemoteOk((v) => !v)} className="flex items-center gap-2 text-sm text-white/75">
            <span className={cx("flex h-5 w-5 items-center justify-center rounded-md border", remoteOk ? "border-feel bg-feel/20 text-feel" : "border-white/20")}>{remoteOk && <Check className="h-3.5 w-3.5" />}</span> Remote OK
          </button>
          <button type="submit" disabled={busy || title.trim().length < 3} className="btn btn-primary mt-1 w-full py-3">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (isCommission ? "Post commission" : "Post opportunity")}</button>
        </form>
      </div>
    </div>
  );
}
