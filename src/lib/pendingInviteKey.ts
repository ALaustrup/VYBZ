const STORAGE_KEY = "vybz.pendingInviteKey";

/** Stash an invite key across the sign-in hop (landing → /enter → redeem). */
export function stashPendingInviteKey(code: string): void {
  const normalized = code.trim().replace(/\s+/g, "").toUpperCase();
  if (normalized.length < 10) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, normalized);
  } catch {
    /* private mode / quota — ignore */
  }
}

export function peekPendingInviteKey(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function takePendingInviteKey(): string | null {
  const value = peekPendingInviteKey();
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return value;
}
