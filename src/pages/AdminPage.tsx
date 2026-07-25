import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Bug, Layers, Loader2, Radio, ShieldCheck, SlidersHorizontal, Users, UserPlus, Award, ScrollText, Check, X, Sparkles, Wifi } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { cx } from "@/lib/utils";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import type { AdminMember, BugReport, BugStatus, DisciplineCategory, MatchWeights, MatchLearningReport, PendingDiscipline, WeightDef, StaffMember, StaffAction, ModApplicationRow, PlatformRole } from "@/types";

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
  { key: "divisor", label: "Score divisor (fit normaliser)", def: 30.0 },
];

const WEIGHT_LABELS: Record<string, string> = Object.fromEntries(WEIGHTS.map((w) => [w.key, w.label]));

type Tab = "members" | "staff" | "applications" | "disciplines" | "matchmaking" | "bugs" | "infra";

export function AdminPage() {
  const { profile } = useSession();
  const [tab, setTab] = useState<Tab>("members");
  useRegisterAppBar({ title: "Admin console" }, []);
  if (profile && !profile.isAdmin) return <Navigate to="/profile" replace />;

  return (
    <div className="flex h-full flex-col">
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pt-2">
        <TabBtn on={tab === "members"} onClick={() => setTab("members")} icon={<Users className="h-3.5 w-3.5" />} label="Members" />
        <TabBtn on={tab === "staff"} onClick={() => setTab("staff")} icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Staff" />
        <TabBtn on={tab === "applications"} onClick={() => setTab("applications")} icon={<UserPlus className="h-3.5 w-3.5" />} label="Applications" />
        <TabBtn on={tab === "disciplines"} onClick={() => setTab("disciplines")} icon={<Layers className="h-3.5 w-3.5" />} label="Disciplines" />
        <TabBtn on={tab === "matchmaking"} onClick={() => setTab("matchmaking")} icon={<SlidersHorizontal className="h-3.5 w-3.5" />} label="Matchmaking" />
        <TabBtn on={tab === "bugs"} onClick={() => setTab("bugs")} icon={<Bug className="h-3.5 w-3.5" />} label="Bug reports" />
        <TabBtn on={tab === "infra"} onClick={() => setTab("infra")} icon={<Wifi className="h-3.5 w-3.5" />} label="Infra" />
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-10 pt-4">
        {tab === "members" && <MembersTab />}
        {tab === "staff" && <StaffTab />}
        {tab === "applications" && <ApplicationsTab />}
        {tab === "disciplines" && <DisciplinesTab />}
        {tab === "matchmaking" && <MatchmakingTab />}
        {tab === "bugs" && <BugsTab />}
        {tab === "infra" && <InfraTab />}
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
  async function setRole(m: AdminMember, role: "member" | "moderator" | "admin") {
    try { await api.adminSetRole(m.userId, role); showToast(`Role → ${role}`); load(); }
    catch (e) { showToast((e as Error).message); }
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
                {m.role === "admin" && <Badge tone="bg-veil-500/25 text-veil-100">Admin</Badge>}
                {m.role === "moderator" && <Badge tone="bg-aqua-400/20 text-aqua-200">Mod</Badge>}
                {m.banned && <Badge tone="bg-wild/25 text-wild">Banned</Badge>}
              </div>
              <p className="mt-0.5 text-[11px] text-white/40">{m.modules} disciplines · {m.drops} drops · joined {new Date(m.createdAt).toLocaleDateString()}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <RolePicker value={m.role} disabled={m.userId === userId} onChange={(r) => setRole(m, r)} />
                <button onClick={() => toggleBan(m)} className={cx("rounded-full px-3 py-1.5 text-[12px] font-semibold active:scale-95", m.banned ? "bg-feel/20 text-feel" : "bg-wild/20 text-wild")}>{m.banned ? "Unban" : "Ban"}</button>
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

const ROLES: PlatformRole[] = ["member", "moderator", "admin"];
function RolePicker({ value, disabled, onChange }: { value: PlatformRole; disabled?: boolean; onChange: (r: PlatformRole) => void }) {
  return (
    <div className={cx("inline-flex overflow-hidden rounded-full ring-1 ring-white/10", disabled && "opacity-40")}>
      {ROLES.map((r) => (
        <button key={r} disabled={disabled || r === value} onClick={() => onChange(r)}
          className={cx("px-2.5 py-1 text-[11px] font-semibold capitalize transition",
            r === value ? "bg-veil-500/30 text-white" : "bg-white/[0.04] text-white/55 hover:text-white/85 disabled:cursor-default")}>
          {r === "moderator" ? "mod" : r}
        </button>
      ))}
    </div>
  );
}

// ── Staff (current team + rewards + audit) ───────────────────────────────────
function StaffTab() {
  const { showToast, userId } = useSession();
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [audit, setAudit] = useState<StaffAction[] | null>(null);

  const load = useCallback(() => { api.adminListStaff().then(setStaff); api.staffAudit(40).then(setAudit); }, []);
  useEffect(() => { load(); }, [load]);

  async function setRole(s: StaffMember, role: PlatformRole) {
    try { await api.adminSetRole(s.userId, role); showToast(`@${s.username} → ${role}`); load(); }
    catch (e) { showToast((e as Error).message); }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[11px] uppercase tracking-wider text-white/40">Team ({staff?.length ?? 0})</p>
        {staff === null ? <Spinner /> : staff.length === 0 ? <p className="py-6 text-center text-sm text-white/45">No staff yet.</p> : (
          <div className="space-y-2">
            {staff.map((s) => (
              <div key={s.userId} className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                {s.role === "admin" ? <ShieldCheck className="h-4 w-4 shrink-0 text-veil-200" /> : <Award className="h-4 w-4 shrink-0 text-aqua-200" />}
                <span className="min-w-0 flex-1 truncate font-semibold text-white">@{s.username ?? "—"}
                  {s.userId === userId && <span className="ml-1.5 text-[10px] font-normal text-white/40">(you)</span>}
                </span>
                <span className="shrink-0 text-[11px] text-white/45">{s.points} credits · {s.resolved} resolved</span>
                <RolePicker value={s.role} disabled={s.userId === userId} onChange={(r) => setRole(s, r)} />
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/40"><ScrollText className="h-3.5 w-3.5" /> Audit log</p>
        {audit === null ? <Spinner /> : audit.length === 0 ? <p className="py-4 text-center text-xs text-white/40">No actions yet.</p> : (
          <div className="space-y-1">
            {audit.map((a) => (
              <div key={a.id} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px]">
                <span className="min-w-0 flex-1 truncate text-white/65"><span className="text-white/85">@{a.actor ?? "—"}</span> {a.action.replace(/_/g, " ")} {a.targetKind ? `· ${a.targetKind}` : ""}</span>
                <span className="shrink-0 text-white/35">{new Date(a.at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Moderator applications ───────────────────────────────────────────────────
function ApplicationsTab() {
  const { showToast } = useSession();
  const [rows, setRows] = useState<ModApplicationRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => { api.adminListModApplications("pending").then(setRows); }, []);
  useEffect(() => { load(); }, [load]);

  async function review(a: ModApplicationRow, approve: boolean) {
    setBusy(a.id);
    try { await api.adminReviewModApplication(a.id, approve); showToast(approve ? `@${a.username} is now a moderator` : "Application declined"); load(); }
    catch (e) { showToast((e as Error).message); }
    finally { setBusy(null); }
  }

  if (rows === null) return <Spinner />;
  if (rows.length === 0) return <p className="py-10 text-center text-sm text-white/45">No pending applications.</p>;

  return (
    <div className="space-y-3">
      {rows.map((a) => (
        <div key={a.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate font-display font-semibold text-white">@{a.username ?? "—"}</span>
            {a.hoursPerWeek != null && <span className="shrink-0 text-[11px] text-white/45">{a.hoursPerWeek}h/wk</span>}
            {a.timezone && <span className="shrink-0 text-[11px] text-white/45">· {a.timezone}</span>}
          </div>
          <p className="mb-1 whitespace-pre-wrap text-[13px] leading-relaxed text-white/80">{a.pitch}</p>
          {a.experience && <p className="mb-2 text-[12px] text-white/50"><span className="text-white/40">Experience:</span> {a.experience}</p>}
          <p className="mb-3 text-[11px] text-white/35">Applied {new Date(a.createdAt).toLocaleDateString()}</p>
          <div className="flex gap-2">
            <button onClick={() => review(a, true)} disabled={busy === a.id} className="flex items-center gap-1 rounded-full bg-feel/20 px-3.5 py-1.5 text-[12px] font-semibold text-feel active:scale-95 disabled:opacity-50">
              {busy === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Approve
            </button>
            <button onClick={() => review(a, false)} disabled={busy === a.id} className="flex items-center gap-1 rounded-full bg-white/[0.06] px-3.5 py-1.5 text-[12px] font-semibold text-white/70 active:scale-95 disabled:opacity-50">
              <X className="h-3.5 w-3.5" /> Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
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
          <p className="mt-2 mb-1 text-[10px] uppercase tracking-wide text-white/35">Promote into category</p>
          <div className="flex flex-wrap gap-1.5">
            {cats.map((c) => {
              const sel = (pick[r.id] ?? cats[0]?.id) === c.id;
              return (
                <button key={c.id} onClick={() => setPick((p) => ({ ...p, [r.id]: c.id }))}
                  className={cx("rounded-full px-2.5 py-1 text-[11px] font-medium transition active:scale-95",
                    sel ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50" : "bg-white/[0.05] text-white/60 hover:text-white/85")}>
                  {c.label}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
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
      <p className="pt-1 text-[11px] text-white/40">Manual weights above always win; where a key is left at default, the learned weight below applies; otherwise the coded default.</p>
      <LearningPanel />
    </div>
  );
}

// ── Learning-to-rank — outcome-driven weight tuning (§5.4h) ──────────────────
function LearningPanel() {
  const { showToast } = useSession();
  const [report, setReport] = useState<MatchLearningReport | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.getMatchLearning().then(setReport); }, []);

  async function run() {
    setBusy(true);
    try {
      const r = await api.runMatchLearning();
      setReport(r);
      showToast(`Learned from ${r.feedbackCount} outcomes`);
    } catch { showToast("Couldn't run learning"); }
    finally { setBusy(false); }
  }

  const signals = report?.signals ?? [];
  return (
    <div className="mt-4 rounded-2xl border border-veil-400/25 bg-veil-500/[0.06] p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-display text-sm font-bold text-white"><Sparkles className="h-4 w-4 text-veil-200" /> Learning-to-rank</p>
          <p className="mt-0.5 text-[11px] text-white/50">
            Tunes each signal from real connect/pass/accept/decline outcomes.
            {report ? ` ${report.feedbackCount} outcomes · ${report.runs} run${report.runs === 1 ? "" : "s"}.` : ""}
          </p>
        </div>
        <button onClick={run} disabled={busy} className="btn btn-primary h-9 shrink-0 px-3 py-0 text-xs">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run learning"}
        </button>
      </div>
      {signals.length > 0 && (
        <div className="mt-3 space-y-1">
          <div className="flex items-center gap-2 px-1 text-[10px] uppercase tracking-wider text-white/35">
            <span className="flex-1">Signal</span>
            <span className="w-14 text-right">Base</span>
            <span className="w-14 text-right">Learned</span>
            <span className="w-12 text-right">×</span>
            <span className="w-12 text-right">Data</span>
          </div>
          {signals.map((s) => {
            const up = s.multiplier > 1.001, down = s.multiplier < 0.999;
            return (
              <div key={s.key} className="flex items-center gap-2 rounded-lg bg-white/[0.02] px-2.5 py-1.5 text-sm">
                <span className="min-w-0 flex-1 truncate text-white/80">{WEIGHT_LABELS[s.key] ?? s.key}</span>
                <span className="w-14 text-right text-white/45">{s.base}</span>
                <span className={cx("w-14 text-right font-semibold", up ? "text-emerald-300" : down ? "text-rose-300" : "text-white/70")}>{s.learned}</span>
                <span className={cx("w-12 text-right text-[11px]", up ? "text-emerald-300" : down ? "text-rose-300" : "text-white/40")}>{up ? "↑" : down ? "↓" : ""}{s.multiplier}</span>
                <span className="w-12 text-right text-[11px] text-white/40" title={`+${s.pos} vs −${s.neg} avg signal in positive vs negative outcomes`}>{s.support}</span>
              </div>
            );
          })}
        </div>
      )}
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

/** Live readiness for TURN + Bunny Stream — secrets stay server-side. */
function InfraTab() {
  const [gates, setGates] = useState<api.InfraGatesStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setGates(await api.fetchInfraGates());
    setBusy(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold text-white">Infra gates</p>
          <p className="mt-1 text-[13px] text-white/45">
            Production blockers from the hardening checklist. Provision secrets on Edge — never invent credentials.
          </p>
        </div>
        <button type="button" onClick={() => void load()} disabled={busy}
          className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[12px] font-semibold text-white/70 active:scale-95">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}
        </button>
      </div>

      {!gates ? <Spinner /> : (
        <div className="space-y-2">
          <GateRow
            icon={<Wifi className="h-4 w-4" />}
            title="TURN (ice-servers)"
            ok={gates.turnConfigured}
            detail={gates.turnConfigured
              ? "TURN_URLS + TURN_USERNAME + TURN_CREDENTIAL present."
              : "STUN-only. Set TURN_* Edge secrets — see docs/INFRA_GATES.md."}
          />
          <GateRow
            icon={<Radio className="h-4 w-4" />}
            title="Bunny Stream live ingest"
            ok={gates.bunnyLiveConfigured}
            detail={gates.bunnyLiveConfigured
              ? "BUNNY_STREAM_LIBRARY_ID + BUNNY_STREAM_API_KEY present."
              : "LiveKit SFU still works; OBS RTMP/HLS gated until Stream secrets exist."}
          />
          <p className="pt-1 text-[11px] text-white/35">
            Checked {new Date(gates.checkedAt).toLocaleString()}. Docs: INFRA_GATES.md · PRODUCTION_HARDENING.md
          </p>
        </div>
      )}
    </div>
  );
}

function GateRow({
  icon, title, ok, detail,
}: {
  icon: React.ReactNode;
  title: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
      <div className="flex items-center gap-2">
        <span className="text-white/50">{icon}</span>
        <p className="min-w-0 flex-1 font-medium text-white/90">{title}</p>
        <Badge tone={ok ? "bg-feel/20 text-feel" : "bg-amber-400/20 text-amber-300"}>
          {ok ? "ready" : "blocked"}
        </Badge>
      </div>
      <p className="mt-1.5 text-[13px] text-white/55">{detail}</p>
    </div>
  );
}
