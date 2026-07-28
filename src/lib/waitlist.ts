import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase";

export type WaitlistJoinResult =
  | { ok: true; status: "joined" | "already" }
  | { ok: false; error: string };

/** Public alpha waitlist signup via waitlist-join Edge Function. */
export async function joinAlphaWaitlist(
  email: string,
  source = "landing",
): Promise<WaitlistJoinResult> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, error: "Backend not configured" };
  }
  const trimmed = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false, error: "Enter a valid email" };
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/waitlist-join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email: trimmed, source }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      status?: string;
      error?: string;
    };
    if (!res.ok || !body.ok) {
      return { ok: false, error: body.error === "invalid_email" ? "Enter a valid email" : "Couldn’t join — try again" };
    }
    return {
      ok: true,
      status: body.status === "already" ? "already" : "joined",
    };
  } catch {
    return { ok: false, error: "Network error — try again" };
  }
}
