import * as api from "@/lib/api";
import { establishSession } from "@/lib/passkey";
import { stashPendingInviteKey } from "@/lib/pendingInviteKey";
import { requestAlphaKey, type AlphaKeyFailure } from "@/features/alpha/alphaKeyRequest";

export type ClaimAlphaStatus = "signed_in" | "needs_login";

export type ClaimAlphaResult =
  | { ok: true; status: ClaimAlphaStatus; code: string }
  | { ok: false; reason: AlphaKeyFailure };

function randomPassword(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `Vy${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}!`;
}

function isExistingAccountError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /already registered|already been registered|user already exists|email_exists/i.test(msg);
}

/**
 * Issue a key bound to this email, create the account when the address is new,
 * redeem the key, and start a session. Existing accounts are not signed in —
 * anyone who knows an email must not inherit that session.
 */
export async function claimAlphaAccess(email: string): Promise<ClaimAlphaResult> {
  const issued = await requestAlphaKey(email);
  if (!issued.ok) return issued;
  stashPendingInviteKey(issued.code);

  if (issued.tokenHash) {
    try {
      const ok = await establishSession(issued.tokenHash);
      if (ok) {
        await api.redeemInviteKey(issued.code).catch(() => undefined);
        return { ok: true, status: "signed_in", code: issued.code };
      }
    } catch {
      /* fall through to client signup or login */
    }
  }

  if (issued.account === "exists") {
    return { ok: true, status: "needs_login", code: issued.code };
  }

  try {
    const data = await api.signUp(email.trim(), randomPassword());
    if (data.session) {
      await api.redeemInviteKey(issued.code).catch(() => undefined);
      return { ok: true, status: "signed_in", code: issued.code };
    }
  } catch (err) {
    if (isExistingAccountError(err)) {
      return { ok: true, status: "needs_login", code: issued.code };
    }
  }

  return { ok: true, status: "needs_login", code: issued.code };
}
