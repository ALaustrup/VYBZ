/**
 * Pure ATC accounting. The database is the authority; this module is the
 * spec the RPCs and tests share so a rate change cannot drift in one place.
 */
import { ATC_POLICY } from "@/product/invariants";

export type AtcBalances = {
  dailyFreeRemaining: number;
  earnedBalance: number;
};

export type ListenQuality = {
  spark: boolean;
  stay: boolean;
  discovery: boolean;
  firstListen: boolean;
};

export function totalAtc(b: AtcBalances): number {
  return Math.max(0, b.dailyFreeRemaining) + Math.max(0, b.earnedBalance);
}

export function applyDailyGrant(b: AtcBalances): AtcBalances {
  return { ...b, dailyFreeRemaining: ATC_POLICY.dailyFreeGrantAtc };
}

export function consumeAtc(b: AtcBalances, seconds: number): AtcBalances | null {
  if (!Number.isInteger(seconds) || seconds < 1) return null;
  let daily = Math.max(0, b.dailyFreeRemaining);
  let earned = Math.max(0, b.earnedBalance);
  if (daily + earned < seconds) return null;
  const fromDaily = Math.min(daily, seconds);
  daily -= fromDaily;
  earned -= seconds - fromDaily;
  return { dailyFreeRemaining: daily, earnedBalance: earned };
}

export function canStartHost(b: AtcBalances): boolean {
  return totalAtc(b) >= ATC_POLICY.hostStartMinimumAtc;
}

export function shouldWarnHost(b: AtcBalances): boolean {
  return totalAtc(b) <= ATC_POLICY.hostWarningRemainingAtc;
}

export function qualityMultiplier(q: ListenQuality): number {
  let m = 1;
  if (q.spark) m *= ATC_POLICY.sparkMultiplier;
  if (q.stay) m *= ATC_POLICY.stayMultiplier;
  if (q.discovery) m *= ATC_POLICY.discoveryMultiplier;
  if (q.firstListen) m *= ATC_POLICY.firstListenMultiplier;
  return Math.min(ATC_POLICY.maxQualityMultiplier, m);
}

/** Floor of verified seconds × 50 ATC / 60s × quality. Never invents seconds. */
export function listenEarnAtc(verifiedSeconds: number, q: ListenQuality): number | null {
  if (!Number.isInteger(verifiedSeconds) || verifiedSeconds < 1) return null;
  const raw = (verifiedSeconds * ATC_POLICY.baseAtcPerVerifiedMinute * qualityMultiplier(q)) / 60;
  return Math.floor(raw);
}

export function creditEarned(b: AtcBalances, amount: number): AtcBalances | null {
  if (!Number.isInteger(amount) || amount < 1) return null;
  return { ...b, earnedBalance: b.earnedBalance + amount };
}
