import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, Loader2, Send, Wallet } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import {
  formatVc, vcToUsd, VC_USD, VC_NAME, VC_SYMBOL, VC_TICKER_FUTURE,
  formatVcAddress, parseVcAddress,
} from "@/lib/vc";
import { cx } from "@/lib/utils";

/**
 * Full-featured Vc wallet — balance, send/receive (~username), ledger.
 * Closed-loop social currency; peg 1 Vc = $0.05; future ticker VYBZ (2027).
 */
export function WalletPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { profile, showToast, refreshProfile, userId } = useSession();
  const [ledger, setLedger] = useState<api.VcLedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toUser, setToUser] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);

  useRegisterAppBar(embedded ? {} : { title: "Wallet", subtitle: VC_NAME }, [embedded]);

  const bal = Number(profile?.modPoints ?? 0);
  const myAddr = formatVcAddress(profile?.username);

  const load = useCallback(async () => {
    const rows = await api.listVcLedger(50);
    setLedger(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!userId) return;
    void api.ensureVcSignupGrant().then(() => refreshProfile());
    void load();
  }, [userId, load, refreshProfile]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    const peer = parseVcAddress(toUser);
    if (!peer || !Number.isFinite(amt) || amt < 0.01) {
      showToast("Enter ~username and amount ≥ 0.01");
      return;
    }
    setBusy(true);
    const res = await api.transferVc(peer, amt, memo || undefined);
    setBusy(false);
    if (!res.ok) {
      showToast(res.error || "Transfer failed");
      return;
    }
    showToast(`Sent ${formatVc(amt)} Vc to ${formatVcAddress(peer)}`);
    setAmount("");
    setMemo("");
    await refreshProfile();
    await load();
  }

  async function copyReceive() {
    if (!myAddr) return;
    try {
      await navigator.clipboard.writeText(myAddr);
      showToast("Address copied");
    } catch {
      showToast(myAddr);
    }
  }

  return (
    <div className={cx("no-scrollbar space-y-4", embedded ? "pb-4" : "h-full overflow-y-auto pb-8 pt-1")}>
      <section className="forge-card relative overflow-hidden">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[rgb(var(--neon-cyan)/0.15)] blur-3xl" />
        <div className="flex items-start gap-3">
          <span className="forge-card-icon flex h-12 w-12 items-center justify-center text-[rgb(var(--neon-cyan))]">
            <Wallet className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="nexus-eyebrow !text-[0.65rem]">{VC_NAME}</p>
            <p className="font-display text-3xl font-bold text-white">
              {formatVc(bal, 4)} <span className="text-lg text-cyan-200">{VC_SYMBOL}</span>
            </p>
            <p className="mt-1 text-sm text-white/50">
              ≈ ${vcToUsd(bal).toFixed(2)} USD · 1 {VC_SYMBOL} = ${VC_USD.toFixed(2)}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-white/35">
              Closed-loop social credit. Future exchange ticker {VC_TICKER_FUTURE} planned for 2027 — no cash-out today.{" "}
              <Link to="/legal/vc" className="text-cyan-200/80 underline-offset-2 hover:underline">Whitepaper</Link>
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="forge-card">
          <p className="mb-2 flex items-center gap-1.5 nexus-eyebrow !text-[0.65rem]">
            <ArrowDownLeft className="h-3.5 w-3.5 text-[rgb(var(--neon-mint))]" /> Receive
          </p>
          <p className="font-display text-lg font-mono text-white">
            {myAddr || "Set a username"}
          </p>
          <button type="button" onClick={() => void copyReceive()} className="forge-cta-ghost mt-3 h-9 w-full !text-xs">
            Copy address
          </button>
        </div>

        <form onSubmit={(e) => void send(e)} className="forge-card space-y-2">
          <p className="mb-1 flex items-center gap-1.5 nexus-eyebrow !text-[0.65rem]">
            <ArrowUpRight className="h-3.5 w-3.5 text-[rgb(var(--neon-cyan))]" /> Send
          </p>
          <div className="forge-field !py-2">
            <input value={toUser} onChange={(e) => setToUser(e.target.value)} placeholder="~username" />
          </div>
          <div className="forge-field !py-2">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (Vc)" inputMode="decimal" />
          </div>
          <div className="forge-field !py-2">
            <input value={memo} onChange={(e) => setMemo(e.target.value.slice(0, 120))} placeholder="Memo (optional)" />
          </div>
          <button type="submit" disabled={busy} className="forge-cta w-full disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Send Vc</>}
          </button>
        </form>
      </section>

      <section>
        <p className="nexus-eyebrow mb-2">Ledger</p>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-veil-300" /></div>
        ) : ledger.length === 0 ? (
          <p className="forge-card py-6 text-center text-sm text-white/40">
            No transactions yet — listen and leave feedback to earn Vc.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {ledger.map((row) => {
              const inflow = row.toId === userId;
              return (
                <li
                  key={row.id}
                  className="forge-card flex items-center gap-3 !py-2.5"
                >
                  <span className={cx(
                    "flex h-8 w-8 items-center justify-center rounded-xl",
                    inflow ? "bg-[rgb(var(--neon-mint)/0.15)] text-[rgb(var(--neon-mint))]" : "bg-white/8 text-white/60",
                  )}>
                    {inflow ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white/85">
                      {row.memo || row.kind}
                    </span>
                    <span className="block text-[11px] text-white/35">
                      {new Date(row.createdAt).toLocaleString()} · {row.kind}
                    </span>
                  </span>
                  <span className={cx("shrink-0 font-mono text-sm font-semibold", inflow ? "text-[rgb(var(--neon-mint))]" : "text-white/70")}>
                    {inflow ? "+" : "−"}{formatVc(row.amount, 4)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
