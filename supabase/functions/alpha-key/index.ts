// Supabase Edge Function: alpha-key
//
// Public POST { email } → issues a one-time alpha key bound to that address,
// emails it, and returns it so the visitor can paste it straight into the
// existing invite input.
//
// The gate this feeds is email-tagged, not invite-only: anyone with an address
// can obtain a key. Throttling lives in issue_self_alpha_key (per email and per
// hashed IP over 24h) rather than here, so it cannot be bypassed by calling the
// RPC another way.
//
// Deploy with --no-verify-jwt. Self-contained (like audio-play and watermark) so
// it bundles identically whether deployed by CLI or by the management API.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Hash the caller IP with a server secret so a raw address is never stored. */
async function hashIp(req: Request): Promise<string | null> {
  const raw =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "";
  if (!raw) return null;
  const salt = Deno.env.get("ALPHA_KEY_IP_SALT") ?? Deno.env.get("WM_SECRET") ?? "vybz";
  const bytes = new TextEncoder().encode(`${salt}|${raw}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendKeyEmail(opts: { to: string; code: string; appUrl: string }): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY") ?? "";
  const from = Deno.env.get("RESEND_FROM") ?? Deno.env.get("RESEND_FROM_EMAIL") ?? "";
  if (!key || !from) return;
  const app = opts.appUrl.replace(/\/$/, "");
  const code = esc(opts.code);
  const subject = "Your VYBZ alpha key";
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#0a0c12;color:#eee;padding:32px">
  <h1 style="font-size:22px;margin:0 0 12px">Welcome to the VYBZ alpha</h1>
  <p style="opacity:.85;line-height:1.6">Here is your access key. Sign in at VYBZ and paste it when you are asked for an invite key.</p>
  <p style="margin:24px 0;padding:16px;border-radius:12px;background:#131722;font-family:ui-monospace,monospace;font-size:18px;letter-spacing:.06em;color:#22d3ee">${code}</p>
  <p style="opacity:.7;line-height:1.6;font-size:14px">It works once, expires in 30 days, and is tied to this email address. Requesting another key replaces this one.</p>
  <p style="opacity:.7;line-height:1.6;font-size:14px">You will pick your artist name right after you sign in — that name is how everyone on VYBZ will see you.</p>
  <p style="opacity:.55;font-size:13px;margin-top:24px"><a href="${esc(app)}" style="color:#22d3ee">vybz.cloud</a></p>
  </body></html>`;
  const text = `Welcome to the VYBZ alpha.

Your access key: ${opts.code}

Sign in at ${app} and paste it when asked for an invite key. It works once, expires in 30 days, and is tied to this email address.`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [opts.to], subject, html, text }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: { email?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const email = (body.email ?? "").trim();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json({ error: "invalid_email" }, 400);
  }

  const ipHash = await hashIp(req);
  const { data, error } = await admin.rpc("issue_self_alpha_key", {
    p_email: email,
    p_ip_hash: ipHash,
  });

  if (error) {
    console.error("alpha-key rpc", error);
    return json({ error: "issue_failed" }, 500);
  }

  const result = data as { ok?: boolean; reason?: string; code?: string; expiresAt?: string } | null;
  if (!result?.ok || !result.code) {
    const reason = result?.reason ?? "issue_failed";
    // Throttling is a client-correctable condition, not a server fault.
    const status = reason.startsWith("rate_limited") ? 429 : reason === "invalid_email" ? 400 : 500;
    return json({ error: reason }, status);
  }

  const appUrl = Deno.env.get("APP_URL") ?? "https://vybz.cloud";
  // Delivery is best-effort: the key is shown on screen, so a mail failure must
  // not cost the visitor their key.
  void sendKeyEmail({ to: email, code: result.code, appUrl }).catch((e) =>
    console.error("alpha-key email", e),
  );

  return json({ ok: true, code: result.code, expiresAt: result.expiresAt ?? null });
});
