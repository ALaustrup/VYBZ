import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Bug, Layers, Loader2, ShieldCheck, SlidersHorizontal, Users } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { cx } from "@/lib/utils";
import type { AdminMember, BugReport, BugStatus, DisciplineCategory, MatchWeights, PendingDiscipline, WeightDef } from "@/types";

const WEIGHTS: WeightDef[] = [
  { key: "shared_discipline", label: "Shared discipline", def: 4.0 },
  { key: "offers", label: "Has a role you seek", def: 3.0 },
  { key: "seeks", label: "Wants a role you offer", def: 3.0 },
  { key: "mutual", label: "Mutual match bonus", def: 4.0 },
  { key: "attr", label: "Shared attributes", def: 0.7 },
  { key: "intent", label: "Aligned intent", def: 0.5 },
  { key: "affinity", label: "Role affinity", def: 1.5 },
  { key: "skill", label: "Skill on sought role", def: 0.4 },
  { key: "genre", label: "Shared genres", def: 1.4 },
  { key: "daw", label: "Shared DAWs", def: 1.2 },
  { key: "plugin", label: "Shared plugins", def: 0.9 },
  { key: "lang", label: "Shared languages", def: 0.5 },
  { key: "tempo", label: "Tempo fit", def: 0.6 },
  { key: "resonance", label: "Semantic resonance", def: 3.0 },
  { key: "reputation", label: "Reputation", def: 1.5 },
  { key: "open", label: "Open to work", def: 1.0 },
  { key: "divisor", label: "Score divisor (fit normaliser)", def: 28.0 },
];

type Tab = "members" | "disciplines" | "matchmaking" | "bugs";

export function AdminPage() {
  const { profile } = useSession();
  const [tab, setTab] = useState<Tab>("members");
  if (profile && !profile.isAdmin) return <Navigate to="/profile" replace />;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 pb-1 pt-3 max-lg:pr-14">
        <ShieldCheck className="h-5 w-5 text-veil-300" />
        <h1 className="font-display text-xl font-bold text-gradient">Admin console</h1>
      </div>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pt-2">
        <TabBtn on={tab === "members"} onClick={() => setTab("members")} icon={<Users className="h-3.5 w-3.5" />} label="Members" />
        <TabBtn on={tab === "disciplines"} onClick={() => setTab("disciplines")} icon={<Layers className="h-3.5 w-3.5" />} label="Disciplines" />
        <TabBtn on={tab === "matchmaking"} onClick={() => setTab("matchmaking")} icon={<SlidersHorizontal className="h-3.5 w-3.5" />} label="Matchmaking" />
        <TabBtn on={tab === "bugs"} onClick={() => setTab("bugs")} icon={<Bug className="h-3.5 w-3.5" />} label="Bug reports" />
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-10 pt-4">
        {tab === "members" && <MembersTab />}
        {tab === "disciplines" && <DisciplinesTab />}
        {tab === "matchmaking" && <MatchmakingTab />}
        {tab === "bugs" && <BugsTab />}
      </div>
    </div>
  );
}

function TabBtn({ on, onClick, icon, label }: { on: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={cx("flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold transition active:scale-95",
        on ? "bg-veil-500/25 text-white ring-1 ring-veil-400/50" : "bg-white/[0.04] text-white/55 hover:text-white/85")}>
      {icon}{label}
    </button>
  );
}

function Spinner() { return <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-veil-300" /></div>; }

// ── Members ──────────────────────────────────────────────────────────────────
function MembersTab() {
  const { showToast, userId } = useSession();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<AdminMember[] | null>(null);

  const load = useCallback(() => { api.adminListMembers(q).then(setRows); }, [q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  async function toggleBan(m: AdminMember) {
    await api.adminSetBanned(m.userId, !m.banned); showToast(m.banned ? "Unbanned" : "Banned"); load();
  }
  async function toggleAdmin(m: AdminMember) {
    await api.adminSetAdmin(m.userId, !m.isAdmin); showToast(m.isAdmin ? "Admin revoked" : "Admin granted"); load();
  }

  return (
    <div className="space-y-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members by username…"
        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
      {rows === null ? <Spinner /> : rows.length === 0 ? <p className="py-10 text-center text-sm text-white/45">No members.</p> : (
        <div className="space-y-2">
          {rows.map((m) => (
            <div key={m.userId} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-display font-semibold text-white">{m.username ?? "—"}
                  {m.userId === userId && <span className="ml-1.5 text-[10px] font-normal text-white/40">(you)</span>}
                </span>
                {m.isAdmin && <Badge tone="bg-veil-500/25 text-veil-100">Admin</Badge>}
                {m.banned && <Badge tone="bg-wild/25 text-wild">Banned</Badge>}
              </div>
              <p className="mt-0.5 text-[11px] text-white/40">{m.modules} disciplines · {m.drops} drops · joined {new Date(m.createdAt).toLocaleDateString()}</p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => toggleBan(m)} className={cx("rounded-full px-3 py-1.5 text-[12px] font-semibold active:scale-95", m.banned ? "bg-feel/20 text-feel" : "bg-wild/20 text-wild")}>{m.banned ? "Unban" : "Ban"}</button>
                <button onClick={() => toggleAdmin(m)} disabled={m.userId === userId} className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[12px] font-semibold text-white/80 active:scale-95 disabled:opacity-40">{m.isAdmin ? "Revoke admin" : "Make admin"}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: string }) {
  return <span className={cx("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", tone)}>{children}</span>;
}

// ── Disciplines (pending custom requests) ────────────────────────────────────
function DisciplinesTab() {
  const { showToast } = useSession();
  const [rows, setRows] = useState<PendingDiscipline[] | null>(null);
  const [cats, setCats] = useState<DisciplineCategory[]>([]);
  const [pick, setPick] = useState<Record<string, string>>({});

  const load = useCallback(() => { api.adminPendingDisciplines().then(setRows); }, []);
  useEffect(() => { load(); api.listDisciplines().then(setCats); }, [load]);

  async function promote(r: PendingDiscipline) {
    const category = pick[r.id] ?? cats[0]?.id ?? null;
    await api.adminPromoteDiscipline(r.id, { category });
    showToast(`Promoted “${r.rawLabel}”`); load();
  }
  async function reject(r: PendingDiscipline) { await api.adminRejectDiscipline(r.id); showToast("Rejected"); load(); }

  if (rows === null) return <Spinner />;
  if (rows.length === 0) return <p className="py-10 text-center text-sm text-white/45">No pending discipline requests.</p>;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
          <p className="font-display font-semibold text-white">{r.rawLabel}</p>
          <p className="mt-0.5 text-[11px] text-white/40">Requested by {r.requestedBy ?? "—"} · {new Date(r.createdAt).toLocaleDateString()}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select value={pick[r.id] ?? cats[0]?.id ?? ""} onChange={(e) => setPick((p) => ({ ...p, [r.id]: e.target.value }))}
              className="rounded-xl border border-white/10 bg-ink-900 px-3 py-1.5 text-[12px] text-white focus:outline-none">
              {cats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <button onClick={() => promote(r)} className="rounded-full bg-veil-500/25 px-3 py-1.5 text-[12px] font-semibold text-veil-100 active:scale-95">Promote as discipline</button>
            <button onClick={() => reject(r)} className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[12px] font-semibold text-white/70 active:scale-95">Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Matchmaking weights ──────────────────────────────────────────────────────
function MatchmakingTab() {
  const { showToast } = useSession();
  const [cfg, setCfg] = useState<MatchWeights | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.getMatchmakingConfig().then(setCfg); }, []);
  const val = (w: WeightDef) => (cfg && cfg[w.key] != null ? cfg[w.key] : w.def);

  async function save() {
    if (!cfg) return;
    setBusy(true);
    try { await api.setMatchmakingConfig(cfg); showToast("Matchmaking weights saved"); }
    catch { showToast("Couldn't save weights"); }
    finally { setBusy(false); }
  }
  function reset() { setCfg({}); showToast("Reset to defaults — remember to Save"); }

  if (cfg === null) return <Spinner />;
  return (
    <div className="space-y-3">
      <p className="text-[12px] text-white/50">Tune how much each signal contributes to a match's fit score. Higher = stronger influence. The divisor normalises the final 0–100% fit.</p>
      <div className="space-y-1.5">
        {WEIGHTS.map((w) => (
          <div key={w.key} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm text-white/80">{w.label}</span>
            {cfg[w.key] != null && cfg[w.key] !== w.def && <span className="text-[10px] text-veil-200">changed</span>}
            <input type="number" step="0.1" value={val(w)}
              onChange={(e) => setCfg((c) => ({ ...(c ?? {}), [w.key]: e.target.value === "" ? w.def : Number(e.target.value) }))}
              className="w-20 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-right text-sm text-white focus:border-veil-400/60 focus:outline-none" />
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={save} disabled={busy} className="btn btn-primary h-10 flex-1 py-0 text-sm">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save weights"}</button>
        <button onClick={reset} className="rounded-xl bg-white/[0.06] px-4 text-sm font-semibold text-white/75 active:scale-95">Reset</button>
      </div>
    </div>
  );
}

// ── Bug reports ──────────────────────────────────────────────────────────────
const BUG_STATUSES: BugStatus[] = ["open", "reviewing", "resolved", "wontfix"];

function BugsTab() {
  const { showToast } = useSession();
  const [status, setStatus] = useState<string | null>(null);
  const [rows, setRows] = useState<BugReport[] | null>(null);

  const load = useCallback(() => { api.adminListBugReports(status).then(setRows); }, [status]);
  useEffect(() => { load(); }, [load]);

  async function setBug(b: BugReport, s: BugStatus) { await api.adminSetBugStatus(b.id, s); showToast(`Marked ${s}`); load(); }

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        <FilterChip on={status === null} onClick={() => setStatus(null)} label="All" />
        {BUG_STATUSES.map((s) => <FilterChip key={s} on={status === s} onClick={() => setStatus(s)} label={s} />)}
      </div>
      {rows === null ? <Spinner /> : rows.length === 0 ? <p className="py-10 text-center text-sm text-white/45">No bug reports.</p> : (
        <div className="space-y-2">
          {rows.map((b) => (
            <div key={b.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 font-display font-semibold text-white">{b.title}</p>
                <Badge tone={b.status === "resolved" ? "bg-feel/20 text-feel" : b.status === "open" ? "bg-amber-400/20 text-amber-300" : "bg-white/10 text-white/60"}>{b.status}</Badge>
              </div>
              {b.body && <p className="mt-1 text-[13px] text-white/70">{b.body}</p>}
              <p className="mt-1 text-[11px] text-white/40">
                {b.reportedBy ?? "—"} · {new Date(b.createdAt).toLocaleString()}
                {b.context?.page ? ` · ${String(b.context.page)}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {BUG_STATUSES.filter((s) => s !== b.status).map((s) => (
                  <button key={s} onClick={() => setBug(b, s)} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/70 active:scale-95">Mark {s}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return <button onClick={onClick} className={cx("rounded-full px-3 py-1.5 text-[12px] font-semibold capitalize transition active:scale-95", on ? "bg-veil-500/25 text-white ring-1 ring-veil-400/50" : "bg-white/[0.04] text-white/55 hover:text-white/85")}>{label}</button>;
}
