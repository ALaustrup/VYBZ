// Supabase Edge Function: waitlist-notify
// Admin blast: email pending alpha_waitlist rows that VYBZ is live.
// Auth: WAITLIST_NOTIFY_SECRET (or DIGEST_CRON_SECRET fallback) via x-waitlist-secret / Bearer.
// Deploy with --no-verify-jwt.
import { admin, CORS, json } from "../_shared/edge.ts";

const BATCH = 40;

function authorized(req: Request): boolean {
  const secret =
    Deno.env.get("WAITLIST_NOTIFY_SECRET") ??
    Deno.env.get("DIGEST_CRON_SECRET") ??
    "";
  if (!secret) return false;
  const header = req.headers.get("x-waitlist-secret") ?? req.headers.get("x-digest-secret") ?? "";
  if (header && header === secret) return true;
  const auth = req.headers.get("Authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  return !!(m && m[1] === secret);
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildLaunchEmail(opts: {
  appUrl: string;
  unsubUrl: string;
}): { subject: string; html: string; text: string } {
  const app = opts.appUrl.replace(/\/$/, "");
  const subject = "VYBZ is live — Find Yours.";
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#0a0c12;color:#eee;padding:32px;max-width:520px">
  <h1 style="font-size:28px;margin:0 0 8px;letter-spacing:0.04em">VYBZ</h1>
  <p style="font-size:18px;margin:0 0 16px;opacity:.9">Find Yours.</p>
  <p style="opacity:.8;line-height:1.55;margin:0 0 20px">The platform is open. Upload your catalog, stream on VDock, tip artists with Vc, and go live — real identity, no ads, messaging free.</p>
  <p style="margin:0 0 28px"><a href="${esc(app)}/enter" style="display:inline-block;background:#22d3ee;color:#0a0c12;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:999px">Enter VYBZ</a></p>
  <p style="opacity:.45;font-size:12px;line-height:1.4">You received this because you joined the VYBZ alpha waitlist.
  <a href="${esc(opts.unsubUrl)}" style="color:#94a3b8">Unsubscribe</a>.</p>
  </body></html>`;
  const text =
    `VYBZ is live — Find Yours.\n\nEnter: ${app}/enter\n\nUnsubscribe: ${opts.unsubUrl}`;
  return { subject, html, text };
}

async function sendResend(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY") ?? "";
  const from = Deno.env.get("RESEND_FROM") ?? Deno.env.get("RESEND_FROM_EMAIL") ?? "";
  if (!key || !from) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  });
  if (!res.ok) {
    console.error("resend", opts.to, await res.text());
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const url = new URL(req.url);
  const unsubToken = url.searchParams.get("unsub");
  if (unsubToken && (req.method === "GET" || req.method === "POST")) {
    const { error } = await admin
      .from("alpha_waitlist")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("unsub_token", unsubToken);
    if (error) return json({ error: "unsub_failed" }, 500);
    return new Response(
      "<!DOCTYPE html><html><body style=\"font-family:system-ui;background:#0a0c12;color:#eee;padding:48px;text-align:center\"><h1>Unsubscribed</h1><p>You won't get VYBZ launch emails.</p></body></html>",
      { status: 200, headers: { ...CORS, "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!authorized(req)) return json({ error: "unauthorized" }, 401);

  const dryRun = url.searchParams.get("dry_run") === "1";
  const appUrl = Deno.env.get("APP_URL") ?? "https://vybz.cloud";
  const { data: rows, error } = await admin
    .from("alpha_waitlist")
    .select("id, email, unsub_token")
    .is("notified_at", null)
    .is("unsubscribed_at", null)
    .order("created_at", { ascending: true })
    .limit(BATCH);

  if (error) {
    console.error(error);
    return json({ error: "db_error" }, 500);
  }

  const list = rows ?? [];
  if (dryRun) {
    return json({ ok: true, dry_run: true, pending: list.length });
  }

  let sent = 0;
  let failed = 0;
  for (const row of list) {
    const unsubFn =
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/waitlist-notify?unsub=${row.unsub_token}`;
    const mail = buildLaunchEmail({
      appUrl,
      unsubUrl: unsubFn,
    });
    const ok = await sendResend({ to: row.email, ...mail });
    if (ok) {
      await admin
        .from("alpha_waitlist")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", row.id);
      sent++;
    } else {
      failed++;
    }
  }

  return json({
    ok: true,
    sent,
    failed,
    remaining_hint: list.length === BATCH ? "more_batches" : "done",
  });
});
