// Supabase Edge Function: cost-alert
// Daily Cost Sentinel: aggregate month spend → Resend owner when ≥ 90% cap.
// Auth: COST_ALERT_SECRET (or DIGEST_CRON_SECRET) via x-cost-alert-secret / Bearer.
// Deploy with --no-verify-jwt. Dry-run: ?dry_run=1
import { admin, CORS, json } from "../_shared/edge.ts";

function authorized(req: Request): boolean {
  const secret =
    Deno.env.get("COST_ALERT_SECRET") ??
    Deno.env.get("DIGEST_CRON_SECRET") ??
    "";
  if (!secret) return false;
  const header =
    req.headers.get("x-cost-alert-secret") ??
    req.headers.get("x-digest-secret") ??
    "";
  if (header && header === secret) return true;
  const auth = req.headers.get("Authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  return !!(m && m[1] === secret);
}

function parseCap(): number {
  const raw = Deno.env.get("COST_SENTINEL_MONTHLY_CAP_USD") ?? "0";
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function parseFreeTier(): number {
  const raw = Deno.env.get("COST_SENTINEL_FREE_TIER_UNITS") ?? "30";
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 30;
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
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }
  if (!authorized(req)) return json({ error: "unauthorized" }, 401);

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "1";
  const cap = parseCap();
  const freeTier = parseFreeTier();
  const ownerEmail =
    Deno.env.get("COST_ALERT_EMAIL") ??
    Deno.env.get("RESEND_OWNER_EMAIL") ??
    "";

  const sb = admin();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { data, error } = await sb
    .from("cost_events")
    .select("units, usd_estimate")
    .gte("created_at", monthStart.toISOString());

  if (error) {
    console.error("cost_events", error);
    return json({ error: "query_failed", detail: error.message }, 500);
  }

  const rows = data ?? [];
  let spend = 0;
  let units = 0;
  for (const r of rows) {
    spend += Number(r.usd_estimate) || 0;
    units += Number(r.units) || 0;
  }

  const ratio = cap > 0 ? spend / cap : null;
  const atAlert = ratio != null && ratio >= 0.9;
  const freeExceeded = units > freeTier;

  if (!atAlert && !freeExceeded) {
    return json({
      ok: true,
      dry_run: dryRun,
      message: "No alert required",
      spend_usd: spend,
      units,
      cap_usd: cap,
    });
  }

  const pct = ratio != null ? Math.round(ratio * 100) : 0;
  const subject = atAlert
    ? `VYBZ Cost Sentinel — ${pct}% of monthly cap`
    : "VYBZ Cost Sentinel — free-tier units exceeded";
  const text = `Month spend: $${spend.toFixed(2)}\nCap: $${cap.toFixed(2)}\nUnits: ${units} / free-tier ${freeTier}\n`;
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#0a0c12;color:#eee;padding:24px">
  <h1 style="margin:0 0 8px">VYBZ Cost Sentinel</h1>
  <p style="opacity:.85">${subject}</p>
  <pre style="background:#111;padding:12px;border-radius:8px">${text}</pre>
  <p style="opacity:.5;font-size:12px">Soft-limit only — no auto-spend.</p>
  </body></html>`;

  if (dryRun || !ownerEmail) {
    return json({
      ok: true,
      dry_run: true,
      message: dryRun ? "Dry-run: alert would send" : "No alert required (missing COST_ALERT_EMAIL)",
      would_send_to: ownerEmail || null,
      subject,
      spend_usd: spend,
      units,
      cap_usd: cap,
    });
  }

  const sent = await sendResend({ to: ownerEmail, subject, html, text });
  return json({
    ok: sent,
    message: sent ? "Alert sent" : "Alert send failed",
    spend_usd: spend,
    units,
    cap_usd: cap,
  });
});
