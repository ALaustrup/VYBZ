import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase";

export type AlphaKeyResult =
  | { ok: true; code: string; expiresAt: string | null }
  | { ok: false; reason: AlphaKeyFailure };

export type AlphaKeyFailure =
  | "invalid_email"
  | "rate_limited_email"
  | "rate_limited_ip"
  | "unavailable"
  | "issue_failed";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(raw: string): boolean {
  const email = raw.trim();
  return email.length > 0 && email.length <= 254 && EMAIL_RE.test(email);
}

/** Plain-language reason, written so a visitor knows what to do next. */
export function alphaKeyErrorMessage(reason: AlphaKeyFailure): string {
  switch (reason) {
    case "invalid_email":
      return "That does not look like an email address.";
    case "rate_limited_email":
      return "This address has already requested three keys today. Check your inbox, or try again tomorrow.";
    case "rate_limited_ip":
      return "Too many keys requested from this connection today. Try again tomorrow.";
    case "unavailable":
      return "Key generation is not available in this build.";
    default:
      return "Could not generate a key. Try again in a moment.";
  }
}

/** Request a self-serve alpha key. No session required — visitors call this. */
export async function requestAlphaKey(email: string): Promise<AlphaKeyResult> {
  if (!isValidEmail(email)) return { ok: false, reason: "invalid_email" };
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { ok: false, reason: "unavailable" };

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/alpha-key`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({ email: email.trim() }),
    });
    const body = (await res.json().catch(() => null)) as
      | { ok?: boolean; code?: string; expiresAt?: string | null; error?: string }
      | null;

    if (!res.ok || !body?.ok || !body.code) {
      const reason = (body?.error ?? "issue_failed") as AlphaKeyFailure;
      return { ok: false, reason };
    }
    return { ok: true, code: body.code, expiresAt: body.expiresAt ?? null };
  } catch {
    return { ok: false, reason: "issue_failed" };
  }
}
