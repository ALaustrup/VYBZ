import { useState, type FormEvent } from "react";
import { Loader2, Send, Target } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { formatVc, formatVcAddress } from "@/lib/vc";
import { cx } from "@/lib/utils";

const PRESETS = [0.5, 1, 2, 5, 10];

/**
 * Tip a live host with Vc. When sessionId is set, tips count toward the live goal.
 */
export function VcTipSheet({
  open,
  onClose,
  username,
  displayName,
  hostId,
  sessionId,
  tipGoal = 0,
  tipRaised = 0,
  onTipped,
}: {
  open: boolean;
  onClose: () => void;
  username: string | null;
  displayName?: string | null;
  hostId?: string | null;
  sessionId?: string | null;
  tipGoal?: number;
  tipRaised?: number;
  onTipped?: (next: { tipGoal: number; tipRaised: number; tipCount: number }) => void;
}) {
  const { showToast, refreshProfile, userId } = useSession();
  const [amount, setAmount] = useState("1");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const addr = formatVcAddress(username);
  const label = displayName || username || "host";
  const self = !!hostId && hostId === userId;
  const goal = tipGoal > 0 ? tipGoal : 0;
  const raised = tipRaised;
  const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;

  async function send(e?: FormEvent) {
    e?.preventDefault();
    if (self) {
      showToast("Can't tip yourself");
      return;
    }
    if (!username) {
      showToast("Host has no username");
      return;
    }
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt < 0.01) {
      showToast("Amount must be ≥ 0.01 Vc");
      return;
    }
    setBusy(true);
    if (sessionId) {
      const res = await api.liveTip(sessionId, amt, `Live tip → ${addr}`);
      setBusy(false);
      if (!res.ok) {
        showToast(res.error || "Tip failed");
        return;
      }
      showToast(`Tipped ${formatVc(amt)} Vc to ${addr}`);
      onTipped?.({
        tipGoal: res.tipGoal ?? goal,
        tipRaised: res.tipRaised ?? raised + amt,
        tipCount: res.tipCount ?? 0,
      });
      await refreshProfile();
      onClose();
      return;
    }
    const res = await api.transferVc(username, amt, `Tip → ${addr}`);
    setBusy(false);
    if (!res.ok) {
      showToast(res.error || "Tip failed");
      return;
    }
    showToast(`Tipped ${formatVc(amt)} Vc to ${addr}`);
    await refreshProfile();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <form
        onSubmit={(e) => void send(e)}
        className="relative z-10 w-full max-w-md rounded-t-3xl border border-white/10 bg-ink-900/95 p-4 shadow-card backdrop-blur-2xl sm:rounded-3xl"
      >
        <p className="font-display text-lg font-semibold text-white">Tip {label}</p>
        <p className="mt-1 text-[12px] text-white/45">
          Send Vc to <span className="font-mono text-cyan-200/90">{addr || "—"}</span>
        </p>

        {goal > 0 && (
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">
              <Target className="h-3.5 w-3.5 text-[rgb(var(--neon-mint))]" /> Tip goal
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[rgb(var(--neon-cyan))] to-[rgb(var(--neon-mint))] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1.5 font-mono text-[12px] text-white/60">
              {formatVc(raised)} / {formatVc(goal)} Vc · {pct}%
            </p>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(String(p))}
              className={cx(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                parseFloat(amount) === p
                  ? "bg-[rgb(var(--neon-cyan)/0.25)] text-cyan-100 ring-1 ring-cyan-300/40"
                  : "bg-white/8 text-white/70",
              )}
            >
              {p} Vc
            </button>
          ))}
        </div>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="Custom amount"
          className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
        />
        <button type="submit" disabled={busy || self} className="btn btn-primary mt-3 w-full py-2.5 text-sm disabled:opacity-40">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Tip with Vc</>}
        </button>
      </form>
    </div>
  );
}
