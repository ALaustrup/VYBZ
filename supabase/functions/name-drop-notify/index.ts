// Supabase Edge Function: "name drop" heads-up for the watchlist.
//
// Run hourly by pg_cron. It finds watched emoji names whose current holder is
// within ~1 hour of the 7-day inactivity reset (i.e. the name is about to free),
// then emails each watcher a one-time heads-up via Resend and stamps
// name_watchers.notified_at so nobody gets spammed.
//
// The live "claim it now" alert and the first-to-claim race happen client-side
// the instant the name actually frees — this function only handles the email
// heads-up. (SMS can be added here once an SMS provider is configured.)
//
// Uses only `fetch` against PostgREST + the Auth admin API (no module imports)
// for fast, reliable cold starts. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
// injected by the platform; set RESEND_API_KEY (and optionally RESEND_FROM,
// APP_URL, MOD_SECRET) as function secrets.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "MYVYB <noreply@astramatrix.com>";
const APP_URL = Deno.env.get("APP_URL") ?? "https://myvyb.astramatrix.com";

// The reset fires at last_active_at + 7d. We notify in the final hour before it.
const RESET_DAYS = 7;
const HEADS_UP_MIN = 60; // minutes of advance warning

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function restHeaders(): Record<string, string> {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };
}

/** Holder profiles whose name is within the heads-up window of resetting. */
async function namesDroppingSoon(): Promise<string[]> {
  const now = Date.now();
  const dayMs = 86_400_000;
  // Still held (reset hasn't fired): last_active_at > now - 7d.
  const lower = new Date(now - RESET_DAYS * dayMs).toISOString();
  // Within the heads-up window: last_active_at <= now - (7d - 60m).
  const upper = new Date(now - RESET_DAYS * dayMs + HEADS_UP_MIN * 60_000).toISOString();
  const url =
    `${SUPABASE_URL}/rest/v1/profiles?select=emoji_key` +
    `&emoji_key=not.is.null` +
    `&last_active_at=gt.${lower}` +
    `&last_active_at=lte.${upper}`;
  const res = await fetch(url, { headers: restHeaders() });
  if (!res.ok) return [];
  const rows = (await res.json()) as { emoji_key: string }[];
  return [...new Set(rows.map((r) => r.emoji_key))];
}

/** Watchers of a name who haven't been emailed yet. */
async function pendingWatchers(key: string): Promise<string[]> {
  const url =
    `${SUPABASE_URL}/rest/v1/name_watchers?select=user_id` +
    `&emoji_key=eq.${encodeURIComponent(key)}&notified_at=is.null`;
  const res = await fetch(url, { headers: restHeaders() });
  if (!res.ok) return [];
  const rows = (await res.json()) as { user_id: string }[];
  return rows.map((r) => r.user_id);
}

async function emailFor(userId: string): Promise<string | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    headers: restHeaders(),
  });
  if (!res.ok) return null;
  const user = (await res.json()) as { email?: string };
  return user?.email ?? null;
}

async function markNotified(userId: string, key: string): Promise<void> {
  const url =
    `${SUPABASE_URL}/rest/v1/name_watchers?user_id=eq.${userId}` +
    `&emoji_key=eq.${encodeURIComponent(key)}`;
  await fetch(url, {
    method: "PATCH",
    headers: { ...restHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify({ notified_at: new Date().toISOString() }),
  });
}

async function sendEmail(to: string, name: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#09090b;color:#e5e5e5;padding:32px;border-radius:16px">
      <h1 style="font-size:22px;margin:0 0 8px">A name you're watching frees soon</h1>
      <p style="font-size:16px;line-height:1.5;color:#a1a1aa">
        <b style="color:#fff;font-size:20px">${name}</b> is about to become available on Veiled —
        in roughly an hour.
      </p>
      <p style="font-size:15px;line-height:1.5;color:#a1a1aa">
        The moment it frees, the first person to claim it wins. Open Veiled and be ready.
      </p>
      <a href="${APP_URL}/profile" style="display:inline-block;margin-top:12px;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">
        Open Veiled
      </a>
      <p style="font-size:12px;color:#52525b;margin-top:24px">
        You're receiving this because you're watching this name. VEILED by Astra Matrix, Inc.
      </p>
    </div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to,
      subject: `${name} frees soon — be ready to claim it`,
      html,
    }),
  });
  return res.ok;
}

Deno.serve(async (req: Request) => {
  const secret = Deno.env.get("DROP_SECRET");
  if (secret && req.headers.get("x-drop-secret") !== secret) {
    return json({ error: "unauthorized" }, 401);
  }

  const keys = await namesDroppingSoon();
  let sent = 0;
  for (const key of keys) {
    const watchers = await pendingWatchers(key);
    for (const userId of watchers) {
      const email = await emailFor(userId);
      // Stamp regardless of email delivery to avoid retro-spamming on the next
      // hourly run; users without a linked email still get the in-app alert.
      await markNotified(userId, key);
      if (email && (await sendEmail(email, key))) sent++;
    }
  }

  return json({ checked: keys.length, sent });
});
