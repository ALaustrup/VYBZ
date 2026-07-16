import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Shield, Flag, Award, Loader2, EyeOff, Trash2, AlertTriangle, Bell, Check, Crown, Medal,
} from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { cx } from "@/lib/utils";
import type { ContentReport, ModAction, ModStats } from "@/types";

type Tab = "queue" | "rewards";

const REASON_LABEL: Record<string, string> = {
  spam: "Spam", harassment: "Harassment", hate: "Hate", nsfw: "NSFW",
  illegal: "Illegal", impersonation: "Impersonation", misinformation: "Misinformation", other: "Other",
};

export function ModPage() {
  const { profile } = useSession();
  const [tab, setTab] = useState<Tab>("queue");
  const isStaff = profile && (profile.platformRole === "moderator" || profile.platformRole === "admin" || profile.isAdmin);
  if (profile && !isStaff) return <Navigate to="/profile" replace />;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 pb-1 pt-3 max-lg:pr-14">
        <Shield className="h-5 w-5 text-aqua-300" />
        <h1 className="font-display text-xl font-bold text-gradient">Moderator console</h1>
      </div>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pt-2">
        <TabBtn on={tab === "queue"} onClick={() => setTab("queue")} icon={<Flag className="h-3.5 w-3.5" />} label="Report queue" />
        <TabBtn on={tab === "rewards"} onClick={() => setTab("rewards")} icon={<Award className="h-3.5 w-3.5" />} label="My rewards" />
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-10 pt-4">
        {tab === "queue" && <QueueTab />}
        {tab === "rewards" && <RewardsTab />}
      </div>
    </div>
  );
}

function TabBtn({ on, onClick, icon, label }: { on: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={cx("flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold transition active:scale-95",
        on ? "bg-aqua-400/20 text-white ring-1 ring-aqua-400/50" : "bg-white/[0.04] text-white/55 hover:text-white/85")}>
      {icon}{label}
    </button>
  );
}
function Spinner() { return <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-aqua-300" /></div>; }

// ── Report queue ─────────────────────────────────────────────────────────────
function QueueTab() {
  const { showToast } = useSession();
  const [rows, setRows] = useState<ContentReport[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => { setRows(await api.modReportQueue("open")); }, []);
  useEffect(() => { void load(); }, [load]);

  async function act(r: ContentReport, action: ModAction) {
    setBusy(r.id + action);
    try {
      const res = await api.modResolveReport(r.id, action);
      showToast(res.points > 0 ? `+${res.points} credits · ${action}` : `Report ${res.status}`);
      await load();
    } catch (e) { showToast((e as Error).message); }
    finally { setBusy(null); }
  }

  if (!rows) return <Spinner />;
  if (rows.length === 0)
    return <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8 text-center">
      <Check className="mx-auto mb-2 h-7 w-7 text-feel" />
      <p className="text-sm font-semibold text-white">Queue clear</p>
      <p className="mt-1 text-xs text-white/45">No open reports. Nice work keeping VYBZ real.</p>
    </div>;

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.id} className={cx("rounded-2xl border p-4", r.escalated ? "border-amber-400/30 bg-amber-400/[0.05]" : "border-white/8 bg-white/[0.03]")}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-wild/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-wild">{REASON_LABEL[r.reason] ?? r.reason}</span>
            <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-semibold text-white/70">{r.targetKind}</span>
            {r.reportCount > 1 && <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/55">×{r.reportCount} reports</span>}
            {r.escalated && <span className="flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-semibold text-amber-300"><AlertTriangle className="h-3 w-3" /> Escalated</span>}
          </div>
          {r.snippet && <p className="mb-1.5 line-clamp-3 rounded-lg bg-black/20 px-3 py-2 text-[13px] text-white/80">{r.snippet}</p>}
          <p className="mb-3 text-[11px] text-white/45">
            {r.authorUsername ? <>by <span className="text-white/70">@{r.authorUsername}</span> · </> : null}
            reported by {r.reporter ? `@${r.reporter}` : "someone"}
            {r.detail ? <> · “{r.detail}”</> : null}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <ActBtn label="Dismiss" tone="bg-white/[0.06] text-white/70" busy={busy === r.id + "dismiss"} onClick={() => act(r, "dismiss")} />
            <ActBtn label="Warn" icon={<Bell className="h-3.5 w-3.5" />} tone="bg-amber-400/15 text-amber-200" busy={busy === r.id + "warn"} onClick={() => act(r, "warn")} />
            <ActBtn label="Hide" icon={<EyeOff className="h-3.5 w-3.5" />} tone="bg-veil-500/20 text-veil-100" busy={busy === r.id + "hide"} onClick={() => act(r, "hide")} />
            <ActBtn label="Remove" icon={<Trash2 className="h-3.5 w-3.5" />} tone="bg-wild/20 text-wild" busy={busy === r.id + "remove"} onClick={() => act(r, "remove")} />
            <ActBtn label="Escalate" icon={<AlertTriangle className="h-3.5 w-3.5" />} tone="bg-white/[0.06] text-white/70" busy={busy === r.id + "escalate"} onClick={() => act(r, "escalate")} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActBtn({ label, icon, tone, busy, onClick }: { label: string; icon?: React.ReactNode; tone: string; busy: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={busy}
      className={cx("flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold active:scale-95 disabled:opacity-50", tone)}>
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}{label}
    </button>
  );
}

// ── Rewards ──────────────────────────────────────────────────────────────────
function RewardsTab() {
  const { profile } = useSession();
  const [stats, setStats] = useState<ModStats | null>(null);
  useEffect(() => { api.modStats().then(setStats); }, []);
  if (!stats) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="Credits" value={stats.points} accent="text-aqua-200" />
        <Stat label="Resolved" value={stats.resolved} accent="text-feel" />
        <Stat label="Rank" value={`#${stats.rank}`} accent="text-veil-200" />
      </div>
      <p className="rounded-2xl border border-aqua-400/20 bg-aqua-400/[0.05] px-4 py-3 text-[13px] leading-relaxed text-white/70">
        Every action earns <span className="font-semibold text-aqua-200">credits</span> — spendable in the <a href="/store" className="font-semibold text-aqua-100 underline-offset-2 hover:underline">cosmetic store</a> (accents, flair, and more). Thank you for keeping VYBZ real.
      </p>

      <Section title="Leaderboard">
        <div className="space-y-1.5">
          {stats.leaderboard.map((l, i) => (
            <div key={l.username ?? i} className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2">
              <span className="w-5 text-center text-[13px] font-bold text-white/40">
                {i === 0 ? <Crown className="mx-auto h-4 w-4 text-amber-300" /> : i < 3 ? <Medal className="mx-auto h-4 w-4 text-white/50" /> : i + 1}
              </span>
              <span className={cx("min-w-0 flex-1 truncate text-sm", l.username === profile?.username ? "font-bold text-white" : "text-white/80")}>
                @{l.username ?? "creator"} {l.role === "admin" && <span className="text-[10px] text-veil-200">· admin</span>}
              </span>
              <span className="shrink-0 text-sm font-bold text-aqua-200">{l.points}</span>
            </div>
          ))}
        </div>
      </Section>

      {stats.recent.length > 0 && (
        <Section title="Your recent actions">
          <div className="space-y-1">
            {stats.recent.map((a, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg px-3 py-1.5 text-[12px]">
                <span className="text-white/65">{a.action.replace(/_/g, " ")}</span>
                <span className="text-white/40">{a.points > 0 ? `+${a.points}` : "—"} · {new Date(a.at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3.5 text-center">
      <p className={cx("font-display text-2xl font-bold", accent)}>{value}</p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wider text-white/40">{label}</p>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] uppercase tracking-wider text-white/40">{title}</p>
      {children}
    </div>
  );
}
