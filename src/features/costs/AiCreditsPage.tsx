import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import * as api from "@/lib/api";
import {
  AI_LOW_BALANCE_SECONDS,
  AI_MINUTE_PACK_CENTS,
  AI_MINUTE_PACK_ID,
  AI_MINUTE_PACK_SECONDS,
  creditAiSeconds,
  debitAICredits,
  getAiCreditBalance,
  listAiCreditLedger,
  resetAiCreditStore,
  secondsToAiMinutes,
  type AiCreditLedgerRow,
} from "@/platform/costs/aiCredits";

type Props = {
  /** Seed a demo ledger for Playwright. */
  seedDemo?: boolean;
};

/**
 * `/settings/credits` — prepaid AI minute balance, top-up, ledger.
 */
export function AiCreditsPage({ seedDemo = false }: Props) {
  const [searchParams] = useSearchParams();
  const [balance, setBalance] = useState(0);
  const [rows, setRows] = useState<AiCreditLedgerRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const topupStatus = searchParams.get("topup");

  async function refresh() {
    if (seedDemo) {
      setBalance(await getAiCreditBalance());
      setRows(await listAiCreditLedger(40));
      return;
    }
    const remoteBal = await api.fetchAiCreditBalance();
    if (remoteBal != null) {
      setBalance(remoteBal);
      const remoteRows = await api.fetchAiCreditLedger(40);
      setRows(
        remoteRows.map((r) => ({
          id: r.id,
          user_id: null,
          delta_seconds: r.delta_seconds,
          usd: r.usd,
          reason: r.reason,
          created_at: r.created_at,
        }))
      );
      return;
    }
    setBalance(await getAiCreditBalance());
    setRows(await listAiCreditLedger(40));
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (seedDemo) {
        resetAiCreditStore();
        await creditAiSeconds(AI_MINUTE_PACK_SECONDS, {
          usd: AI_MINUTE_PACK_CENTS / 100,
          reason: "purchase",
          meta: { pack_id: AI_MINUTE_PACK_ID },
        });
        await debitAICredits(AI_MINUTE_PACK_SECONDS - 90, {
          reason: "ai_mastering",
          meta: { demo: true },
        });
      }
      if (!cancelled) await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [seedDemo]);

  const onPurchase = async () => {
    setBusy(true);
    setError(null);
    try {
      const url = await api.startAiMinuteTopup(AI_MINUTE_PACK_ID, window.location.origin);
      if (url) {
        window.location.href = url;
        return;
      }
      setError("Checkout unavailable — try again shortly.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  };

  const low = balance < AI_LOW_BALANCE_SECONDS;
  const minutes = secondsToAiMinutes(balance);

  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 pb-28 md:p-8"
      data-testid="ai-credits-page"
    >
      <div>
        <Link to="/settings/costs" className="text-xs text-fog hover:text-snow">
          ← Cost Sentinel
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold text-snow">AI minutes</h1>
        <p className="mt-1 text-sm text-fog">
          Prepaid mastering seconds. Pack: {AI_MINUTE_PACK_SECONDS / 60} min for $
          {(AI_MINUTE_PACK_CENTS / 100).toFixed(0)}.
        </p>
      </div>

      {topupStatus === "success" && (
        <div
          className="suite-accent-wash-success rounded-suite-md border border-suite-success/30 px-4 py-3 text-sm text-snow"
          data-testid="ai-topup-success"
        >
          Payment received — minutes appear after webhook fulfill (refresh if needed).
        </div>
      )}
      {topupStatus === "cancel" && (
        <div className="rounded-suite-md border border-white/10 bg-graphite px-4 py-3 text-sm text-fog">
          Checkout canceled — no charge.
        </div>
      )}

      {low && (
        <div
          className="suite-accent-wash-warning rounded-suite-md border border-suite-warning/40 px-4 py-3 text-sm text-snow"
          data-testid="ai-low-balance-banner"
        >
          Low balance ({Math.floor(balance)}s). Top up to keep mastering without interruption.
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4 rounded-suite-md border border-white/10 bg-graphite/80 px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-fog">Balance</p>
          <p className="mt-1 font-display text-3xl font-semibold text-snow" data-testid="ai-credit-balance">
            {Math.floor(balance)}s
          </p>
          <p className="mt-1 text-xs text-fog" data-testid="ai-credit-minutes">
            ≈ {minutes} AI minute{minutes === 1 ? "" : "s"}
          </p>
        </div>
        <button
          type="button"
          data-testid="ai-topup-btn"
          disabled={busy}
          onClick={() => void onPurchase()}
          className="inline-flex h-10 items-center rounded-suite-md bg-suite-cyan px-4 text-xs font-semibold text-ink disabled:opacity-40"
        >
          Buy {AI_MINUTE_PACK_SECONDS / 60} min · ${(AI_MINUTE_PACK_CENTS / 100).toFixed(0)}
        </button>
      </div>

      {error && (
        <p className="text-sm text-rose-300" data-testid="ai-credits-error">
          {error}
        </p>
      )}

      <div>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-snow">Ledger</h2>
          <Badge tone="info">append-only</Badge>
        </div>
        <div
          className="overflow-hidden rounded-suite-md border border-white/10"
          data-testid="ai-credit-ledger"
        >
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-fog">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Reason</th>
                <th className="px-3 py-2 font-medium">Δ seconds</th>
                <th className="px-3 py-2 font-medium">USD</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-fog">
                    No ledger rows yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-white/5 text-snow"
                    data-testid="ai-credit-row"
                  >
                    <td className="px-3 py-2 text-fog">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">{r.reason}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {r.delta_seconds > 0 ? "+" : ""}
                      {r.delta_seconds}
                    </td>
                    <td className="px-3 py-2 tabular-nums">${r.usd.toFixed(4)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
