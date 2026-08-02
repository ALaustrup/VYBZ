import { useEffect, useState } from "react";
import { Heart, Loader2, X } from "lucide-react";
import * as api from "@/lib/api";
import { FLAGS } from "@/lib/flags";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";

const PRESETS = [3, 5, 10, 20];

/**
 * Tip a creator (Stripe Connect, Phase O3b). Renders nothing unless the creator
 * has enabled payouts. Opens a small amount sheet, then redirects to Stripe's
 * hosted Checkout. Optional — never gates anything.
 */
export function TipButton({ userId, username, className }: { userId: string; username: string | null; className?: string }) {
  const { showToast } = useSession();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(5);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!FLAGS.tips) return;
    let on = true;
    api.creatorTipsEnabled(userId).then((e) => { if (on) setEnabled(e); }).catch(() => {});
    return () => { on = false; };
  }, [userId]);

  if (!FLAGS.tips || !enabled) return null;

  const dollars = custom.trim() ? Number(custom) : amount;

  async function tip() {
    if (!Number.isFinite(dollars) || dollars < 1 || dollars > 500) { showToast("Enter an amount between $1 and $500."); return; }
    setBusy(true);
    try {
      const url = await api.startTip(userId, Math.round(dollars * 100), window.location.origin, message.trim() || undefined);
      if (url) { window.location.href = url; return; }
      setBusy(false); showToast("Could not start tip.");
    } catch (e) { setBusy(false); showToast((e as Error).message); }
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className={cx("flex shrink-0 items-center gap-1.5 rounded-full bg-feel/20 px-3 py-1.5 text-xs font-semibold text-feel active:scale-95", className)}>
        <Heart className="h-3.5 w-3.5" /> Tip
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center" onClick={() => setOpen(false)}>
          <div className="forge-glass-edge w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-2">
              <Heart className="h-4 w-4 text-feel" />
              <h2 className="nexus-headline flex-1 text-lg">Tip @{username ?? "musician"}</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="forge-chip flex h-8 w-8 items-center justify-center !p-0"><X className="h-4 w-4" /></button>
            </div>
            <p className="mb-3 text-[13px] text-white/55">Support their next track, mix, or stem pack — goes straight via Stripe.</p>
            <div className="mb-3 grid grid-cols-4 gap-2">
              {PRESETS.map((p) => (
                <button key={p} onClick={() => { setAmount(p); setCustom(""); }}
                  className={cx("forge-chip justify-center !px-0",
                    (!custom && amount === p) ? "forge-chip--active" : "")}>
                  ${p}
                </button>
              ))}
            </div>
            <div className="forge-field mb-3">
              <input value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal"
                placeholder="Custom amount ($)" />
            </div>
            <div className="forge-field mb-3">
              <input value={message} onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                placeholder="Add a note (optional)" />
            </div>
            <button onClick={tip} disabled={busy} className="forge-cta w-full disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Tip $${custom.trim() || amount}`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
