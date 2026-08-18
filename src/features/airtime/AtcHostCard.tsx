import { Timer } from "lucide-react";
import { ATC_POLICY, NOT_MEASURED } from "@/product/invariants";
import { canStartHost, totalAtc, type AtcBalances } from "./atcAccounting";
import { formatAtcClock } from "./atcHeartbeat";
import { cx } from "@/lib/utils";

/** Host-facing Airtime card — daily free and earned, measured or Not measured. */
export function AtcHostCard({
  balance,
  live = false,
  warn = false,
}: {
  balance: (AtcBalances & { total?: number }) | null;
  live?: boolean;
  warn?: boolean;
}) {
  const split = balance
    ? { daily: balance.dailyFreeRemaining, earned: balance.earnedBalance, total: totalAtc(balance) }
    : null;
  const blocked = balance ? !canStartHost(balance) : false;

  return (
    <section
      data-testid="atc-host-card"
      className={cx(
        "rounded-2xl border px-3.5 py-3",
        warn ? "border-amber-300/35 bg-amber-400/8" : "border-white/10 bg-white/[0.03]",
      )}
    >
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/45">
        <Timer className="h-3.5 w-3.5 text-cyan-200/80" /> Airtime
      </p>
      <p className="mt-1 font-display text-[1.65rem] font-semibold leading-none tracking-tight text-white">
        {split ? formatAtcClock(split.total) : NOT_MEASURED}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-black/25 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wider text-white/35">Daily free</p>
          <p className="font-mono text-[13px] text-cyan-100">
            {split ? formatAtcClock(split.daily) : NOT_MEASURED}
          </p>
        </div>
        <div className="rounded-xl bg-black/25 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wider text-white/35">Earned</p>
          <p className="font-mono text-[13px] text-cyan-100">
            {split ? formatAtcClock(split.earned) : NOT_MEASURED}
          </p>
        </div>
      </div>
      <p className="mt-2.5 text-[11px] leading-snug text-white/45">
        {live
          ? warn
            ? "Airtime low. The session will end when this runs out — no hard cut on the last seconds."
            : "Hosting burns daily free first, then earned. Listening stays free."
          : blocked
            ? `Need ${formatAtcClock(ATC_POLICY.hostStartMinimumAtc)} to go live. Listen to earn more. Listening is free.`
            : "Daily free plus earned. New accounts get a one-time 1h starter on top of the 2h daily. Hosting burns this. Listening is free."}
      </p>
    </section>
  );
}
