import { ATC_POLICY } from "@/product/invariants";
import { canStartHost, totalAtc, type AtcBalances } from "./atcAccounting";

/** Seconds the host may still play when a full burn chunk no longer fits. */
export function leftoverPlaySeconds(total: number, chunkSeconds: number = ATC_POLICY.hostBurnChunkSeconds): number {
  if (!Number.isInteger(total) || total <= 0) return 0;
  if (total < chunkSeconds) return total;
  return 0;
}

export function planAfterBurn(input: {
  ok: boolean;
  total: number;
  error?: string;
  chunkSeconds?: number;
}): "burn" | "buffer" | "end" {
  const chunk = input.chunkSeconds ?? ATC_POLICY.hostBurnChunkSeconds;
  const left = leftoverPlaySeconds(input.total, chunk);
  if (input.ok && input.total <= 0) return "end";
  if (!input.ok && input.error === "insufficient") return left > 0 ? "buffer" : "end";
  if (input.ok && left > 0) return "buffer";
  return "burn";
}

export function startBlockedReason(b: AtcBalances | null): string | null {
  if (!b) return null;
  if (canStartHost(b)) return null;
  return `Need ${ATC_POLICY.hostStartMinimumAtc} ATC (${Math.floor(ATC_POLICY.hostStartMinimumAtc / 60)}m) to go live.`;
}

export function hostAirtimeSplit(b: AtcBalances) {
  return {
    daily: b.dailyFreeRemaining,
    earned: b.earnedBalance,
    total: totalAtc(b),
  };
}
