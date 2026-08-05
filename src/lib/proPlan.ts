import { VC_USD } from "@/lib/vc";
import type { ProfileDetails } from "@/types";

/**
 * VYBZ Pro — the hosting entitlement.
 *
 * The product model: **your files stay yours.** Analysis, mastering, readiness and
 * export are on-device compute and cost VYBZ nothing, so they are free forever.
 * Pro pays for the two things that cost real money — storing your audio and
 * serving it to listeners.
 *
 * Purchased with V¢, matching the cosmetics flow: buy a credit pack with Stripe,
 * spend credits on the entitlement. One currency, one ledger.
 *
 * This module is the rule set only. It performs no billing and grants nothing —
 * the server RPC is the sole authority. Everything here is pure so the terms can
 * be reviewed and tested before a single charge is possible.
 */

/** 30 days of hosting. 60 V¢ at the $0.05 peg is exactly $3.00. */
export const PRO_PRICE_VC = 60;
export const PRO_PERIOD_DAYS = 30;

/** Hosting included with Pro. Stated rather than "unlimited", which is not costable. */
export const PRO_STORAGE_GB = 10;

/** Overage above the included allowance, charged per GB per period. */
export const PRO_OVERAGE_VC_PER_GB = 6;

/**
 * After Pro lapses, published audio stays hosted and public for this long, with
 * warnings, before it goes private. Audio is never deleted for non-payment.
 */
export const PRO_GRACE_DAYS = 30;

export const PRO_PRICE_USD = PRO_PRICE_VC * VC_USD;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Capabilities that never require Pro, because they cost VYBZ nothing to run. */
export const ALWAYS_FREE = [
  "Readiness scanning and analysis",
  "Mastering and correction",
  "Translation previews",
  "Distribution reports and export packages",
  "Managing and downloading your own files",
  "Messaging, live and discovery browsing",
] as const;

/** Capabilities Pro pays for, because each consumes storage or bandwidth. */
export const PRO_UNLOCKS = [
  "Hosting your audio on VYBZ",
  "Publishing to the discovery feed",
  "Selling through your storefront",
] as const;

export type ProStatus =
  | { state: "active"; until: number; daysLeft: number }
  | { state: "grace"; until: number; graceEnds: number; daysLeft: number }
  | { state: "lapsed"; until: number | null }
  | { state: "never" };

/**
 * Resolve entitlement from the profile the server issued.
 *
 * `pro === true` is an indefinite grant (staff, comp, founder). Otherwise the
 * period end decides, followed by the grace window.
 */
export function proStatus(profile?: ProfileDetails | null, now: number = Date.now()): ProStatus {
  if (!profile) return { state: "never" };
  if (profile.pro === true) {
    return { state: "active", until: Number.POSITIVE_INFINITY, daysLeft: Number.POSITIVE_INFINITY };
  }
  if (!profile.proUntil) return { state: "never" };

  const until = Date.parse(profile.proUntil);
  if (!Number.isFinite(until)) return { state: "never" };

  if (now < until) {
    return { state: "active", until, daysLeft: Math.ceil((until - now) / DAY_MS) };
  }
  const graceEnds = until + PRO_GRACE_DAYS * DAY_MS;
  if (now < graceEnds) {
    return {
      state: "grace",
      until,
      graceEnds,
      daysLeft: Math.ceil((graceEnds - now) / DAY_MS),
    };
  }
  return { state: "lapsed", until };
}

/** Hosting is live during an active period and throughout the grace window. */
export function canHostAudio(status: ProStatus): boolean {
  return status.state === "active" || status.state === "grace";
}

/**
 * What happens to already-published audio at this status.
 *
 * Non-payment never deletes a user's work. The worst outcome is that it stops
 * being public, and the owner can always download it.
 */
export function publishedAudioOutcome(status: ProStatus): {
  publiclyPlayable: boolean;
  ownerCanDownload: boolean;
  deleted: false;
  explanation: string;
} {
  const base = { ownerCanDownload: true, deleted: false as const };
  switch (status.state) {
    case "active":
      return { ...base, publiclyPlayable: true, explanation: "Your published tracks are live." };
    case "grace":
      return {
        ...base,
        publiclyPlayable: true,
        explanation: `Pro has expired. Your tracks stay public for ${status.daysLeft} more ${
          status.daysLeft === 1 ? "day" : "days"
        }, then become private. Nothing is deleted.`,
      };
    default:
      return {
        ...base,
        publiclyPlayable: false,
        explanation:
          "Your tracks are private because Pro is not active. They are still yours, still stored, and still downloadable. Renew to make them public again.",
      };
  }
}

/** Total V¢ for one period at a given usage, including any overage. */
export function periodCostVc(storageGb: number): {
  base: number;
  overageGb: number;
  overage: number;
  total: number;
} {
  const overageGb = Math.max(0, Math.ceil(storageGb - PRO_STORAGE_GB));
  const overage = overageGb * PRO_OVERAGE_VC_PER_GB;
  return { base: PRO_PRICE_VC, overageGb, overage, total: PRO_PRICE_VC + overage };
}

/** Whether a balance covers a period, and what is missing if not. */
export function affords(balanceVc: number, storageGb = 0): { ok: boolean; shortfall: number } {
  const { total } = periodCostVc(storageGb);
  const shortfall = Math.max(0, total - balanceVc);
  return { ok: shortfall === 0, shortfall };
}

/** Period end for a purchase made now, extending an unexpired period rather than truncating it. */
export function nextPeriodEnd(currentUntil: string | null | undefined, now: number = Date.now()): number {
  const parsed = currentUntil ? Date.parse(currentUntil) : NaN;
  const from = Number.isFinite(parsed) && parsed > now ? parsed : now;
  return from + PRO_PERIOD_DAYS * DAY_MS;
}
