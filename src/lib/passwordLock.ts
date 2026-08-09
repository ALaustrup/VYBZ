import type { Profile } from "@/types";

/** Sole master account after alpha wipe — one-time password lock UI. */
export const MASTER_EMAIL = "andrewiguess@gmail.com";

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/** True when this session must set + lock a password before the suite shell. */
export function needsPasswordLock(
  email: string | null | undefined,
  profile: Pick<Profile, "passwordLockedAt"> | null | undefined,
): boolean {
  if (!profile) return false;
  if (normalizeEmail(email) !== normalizeEmail(MASTER_EMAIL)) return false;
  return !profile.passwordLockedAt;
}

export function passwordLockErrorMessage(reason: string): string {
  switch (reason) {
    case "not_signed_in":
      return "Sign in again to lock your password.";
    case "account_unavailable":
      return "This account cannot lock a password.";
    case "profile_missing":
      return "Profile not found. Refresh and try again.";
    case "mismatch":
      return "Passwords do not match.";
    case "too_short":
      return "Use at least 10 characters.";
    default:
      return reason || "Could not lock password.";
  }
}
