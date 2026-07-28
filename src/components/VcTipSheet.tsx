import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Coins, Loader2, Send, Target, Wallet } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { formatVc, formatVcAddress } from "@/lib/vc";
import { OverlayPortal } from "@/lib/overlayPortal";
import { cx } from "@/lib/utils";

const PRESETS = [0.5, 1, 2, 5, 10];

/**
 * Tip with Vc — live host or track artist.
 * Low balance → prompt to top up via Store packs (credits mint into Vc wallet).
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
  const navigate = useNavigate();
  const { showToast, refreshProfile, userId, profile } = useSession();
  const [amount, setAmount] = useState("1");
  const [busy, setBusy] = useState(false);
  const [needTopup, setNeedTopup] = useState(false);

  if (!open) return null;

  const addr = formatVcAddress(username);
  const label = displayName || username || "artist";
  const self = !!hostId && hostId === userId;
  const goal = tipGoal > 0 ? tipGoal : 0;
  const raised = tipRaised;
  const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
  const balance = Number(profile?.modPoints ?? 0);
  const amt = parseFloat(amount);
  const shortfall = Number.isFinite(amt) && amt > balance;

  async function send(e?: FormEvent) {
    e?.preventDefault();
    setNeedTopup(false);
    if (self) {
      showToast("Can't tip yourself");
      return;
    }
    if (!username) {
      showToast("Artist has no username");
      return;
    }
    if (!Number.isFinite(amt) || amt < 0.01) {
      showToast("Amount must be ≥ 0.01 Vc");
      return;
    }
    if (amt > balance) {
      setNeedTopup(true);
      return;
    }
    setBusy(true);
    if (sessionId) {
      const res = await api.liveTip(sessionId, amt, `Live tip → ${addr}`);
      setBusy(false);
      if (!res.ok) {
        const msg = res.error || "Tip failed";
        if (/insufficient|balance|funds/i.test(msg)) setNeedTopup(true);
        showToast(msg);
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
      const msg = res.error || "Tip failed";
      if (/insufficient|balance|funds/i.test(msg)) setNeedTopup(true);
      showToast(msg);
      return;
    }
    showToast(`Tipped ${formatVc(amt)} Vc to ${addr}`);
    await refreshProfile();
    onClose();
  }

  function goTopup() {
    onClose();
    navigate("/store");
  }

  return (
    <OverlayPortal>
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center p-4"
        style={{ paddingBottom: "max(1rem, calc(var(--dock-reserve, 6.25rem) + 0.75rem))" }}
      >
        <button type="button" className="absolute inset-0 bg-ink-950/75 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
        <form
          onSubmit={(e) => void send(e)}
          className="relative z-10 max-h-[min(85dvh,calc(100dvh-var(--dock-reserve,6.25rem)-2rem))] w-full max-w-md overflow-y-auto rounded-[1.75rem] border border-white/20 p-4 shadow-[0_28px_80px_-24px_rgba(20,80,140,0.55)]"
          style={{
            background: "linear-gradient(165deg, rgba(255,255,255,0.16), rgba(180,220,255,0.08) 40%, rgba(10,22,42,0.88))",
            backdropFilter: "blur(28px) saturate(1.5)",
            WebkitBackdropFilter: "blur(28px) saturate(1.5)",
          }}
        >
        <p className="font-display text-lg font-semibold text-white">Tip {label}</p>
        <p className="mt-1 text-[12px] text-white/45">
          Send Vc to <span className="font-mono text-cyan-200/90">{addr || "—"}</span>
        </p>

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-white/65">
          <Wallet className="h-3.5 w-3.5 text-cyan-200" />
          Your balance · <span className="font-mono font-semibold text-white">{formatVc(balance, 4)} Vc</span>
        </div>

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
              onClick={() => { setAmount(String(p)); setNeedTopup(false); }}
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
          onChange={(e) => { setAmount(e.target.value); setNeedTopup(false); }}
          inputMode="decimal"
          placeholder="Custom amount"
          className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
        />

        {(needTopup || shortfall) && (
          <div className="mt-3 rounded-2xl border border-amber-300/30 bg-amber-500/10 p-3">
            <p className="text-[13px] font-medium text-amber-50">
              Not enough Vc to send that tip.
            </p>
            <p className="mt-1 text-[12px] text-white/55">
              Top up your wallet so you can keep supporting {label}.
            </p>
            <button
              type="button"
              onClick={goTopup}
              className="btn btn-primary mt-3 w-full gap-2 py-2.5 text-sm"
            >
              <Coins className="h-4 w-4" /> Top up Vc
            </button>
          </div>
        )}

        <button type="submit" disabled={busy || self} className="btn btn-primary mt-3 w-full py-2.5 text-sm disabled:opacity-40">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Tip with Vc</>}
        </button>
        </form>
      </div>
    </OverlayPortal>
  );
}
