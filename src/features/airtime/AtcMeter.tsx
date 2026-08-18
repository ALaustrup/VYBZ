import { Timer } from "lucide-react";
import { NOT_MEASURED } from "@/product/invariants";
import { formatAtcClock } from "./atcHeartbeat";
import { useAtcBalance } from "./useAtcBalance";

/** Header clock of remaining ATC. Displays only what the server returned. */
export function AtcMeter() {
  const balance = useAtcBalance();
  if (balance === undefined) return null;

  const clock = balance ? formatAtcClock(balance.total) : NOT_MEASURED;
  const title = balance
    ? `Daily ${formatAtcClock(balance.dailyFreeRemaining)} · Earned ${formatAtcClock(balance.earnedBalance)}. Hosting burns this. Listening is free.`
    : "Airtime remaining is not measured.";

  return (
    <span
      data-testid="atc-meter"
      title={title}
      className="flex h-9 items-center gap-1 rounded-full px-2 font-mono text-[11px] text-cyan-100/90"
    >
      <Timer className="h-3.5 w-3.5 shrink-0 text-cyan-200/80" aria-hidden />
      <span>{clock}</span>
      {balance && (
        <span className="hidden font-sans text-[10px] text-white/40 sm:inline">
          {formatAtcClock(balance.dailyFreeRemaining)} daily · {formatAtcClock(balance.earnedBalance)} earned
        </span>
      )}
      <span className="sr-only">Airtime remaining</span>
    </span>
  );
}
