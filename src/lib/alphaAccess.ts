import type { Profile } from "@/types";

/**
 * OR-023 hard alpha gate — Masterplan delivery honesty / invite-only cohort.
 * Access = profiles.alpha_access_at set, or platform admin.
 */
export function hasAlphaAccess(profile: Pick<Profile, "alphaAccessAt" | "isAdmin" | "platformRole"> | null | undefined): boolean {
  if (!profile) return false;
  if (profile.isAdmin || profile.platformRole === "admin") return true;
  return !!profile.alphaAccessAt;
}

export function normalizeInviteCode(raw: string): string {
  return raw.trim().replace(/\s+/g, "").toUpperCase();
}

export type RedeemInviteReason =
  | "not_signed_in"
  | "account_unavailable"
  | "invalid_code"
  | "revoked"
  | "expired"
  | "already_used"
  | string;

export function redeemInviteErrorMessage(reason: RedeemInviteReason): string {
  switch (reason) {
    case "not_signed_in":
      return "Sign in to redeem an invite key.";
    case "account_unavailable":
      return "This account cannot redeem invites.";
    case "invalid_code":
      return "That invite key is not valid.";
    case "revoked":
      return "That invite key was revoked.";
    case "expired":
      return "That invite key has expired.";
    case "already_used":
      return "That invite key has already been used.";
    default:
      return "Could not redeem that invite key.";
  }
}
