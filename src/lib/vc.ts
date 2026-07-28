/**
 * VYBZ Credits (Vc) — closed-loop social currency.
 * Peg: 1 Vc = $0.05 USD. Future token ticker VYBZ planned for 2027 exchanges.
 * No cash-out / no on-chain in this product generation.
 */

export const VC_USD = 0.05;
export const VC_STARTER_GRANT = 20;
export const VC_TICKER_FUTURE = "VYBZ";
export const VC_NAME = "VYBZ Credits";
export const VC_SYMBOL = "Vc";

export function formatVc(amount: number, digits = 2): string {
  if (!Number.isFinite(amount)) return "0";
  const n = Math.max(0, amount);
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: digits });
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

export function vcToUsd(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return amount * VC_USD;
}

export function usdToVc(usd: number): number {
  if (!Number.isFinite(usd) || VC_USD <= 0) return 0;
  return usd / VC_USD;
}

/** Social earn event ids — amounts enforced server-side. */
export type VcEarnEvent =
  | "daily_login"
  | "connection_accept"
  | "spark_match"
  | "dm_send"
  | "room_message"
  | "cam_call"
  | "video_message"
  | "listen_together"
  | "drop_react"
  | "track_feedback"
  | "track_feedback_note"
  | "go_live"
  | "intent_mix"
  | "profile_complete";

/** Display wallet address: ~Andrew */
export function formatVcAddress(username: string | null | undefined): string {
  const u = (username ?? "").trim().replace(/^[@~]+/, "");
  return u ? `~${u}` : "";
}

/** Normalize pasted @user / ~user / user → bare username for RPCs. */
export function parseVcAddress(input: string): string {
  return input.trim().replace(/^[@~]+/, "").trim();
}