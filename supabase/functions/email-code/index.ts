// Supabase Edge Function: email-code — custom 4-letter email verification.
//
// MYVYB signup: pick a username → enter email → we email a 4-letter code →
// verify in-app → claim the (reserved) username + mint a session. No app-switch.
//
// Actions (POST { action }):
//   request { email, username } → reserve username, store a hashed code, email it
//   verify  { email, code }     → check code, mint session token, return tokenHash
//
// Deploy with --no-verify-jwt. Uses RESEND_API_KEY / RESEND_FROM for delivery.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
// Sender. Default points at the production domain (astramatrix.xyz); once that
// domain is verified in Resend (SPF/DKIM/DMARC DNS records added), delivery is
// authenticated. Override per-environment via the RESEND_FROM secret. NOTE: a
// *.vercel.app address can never be verified by Resend — always use a real
// domain you control.
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "MYVYB <noreply@astramatrix.xyz>";
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

// Unambiguous uppercase alphabet (no I, L, O to avoid 1/0 confusion).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ";
function makeCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return s;
}
async function sha256(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const USERNAME_RE = /^[A-Za-z]+(?: [A-Za-z]+){0,2}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function usernameTaken(name: string): Promise<boolean> {
  const lower = name.trim().toLowerCase();
  const { data: prof } = await admin
    .from("profiles")
    .select("id")
    .ilike("username", lower)
    .maybeSingle();
  if (prof) return true;
  const { data: resv } = await admin
    .from("email_codes")
    .select("email")
    .ilike("username", lower)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return !!resv;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad request" }, 400);
  }
  const action = String(body.action ?? "");

  try {
    if (action === "request") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const username = String(body.username ?? "").trim();
      if (!EMAIL_RE.test(email)) return json({ error: "invalid email" }, 400);
      if (!USERNAME_RE.test(username) || username.length > 24)
        return json({ error: "invalid username" }, 400);
      if (await usernameTaken(username)) return json({ error: "username taken" }, 409);

      if (!RESEND_API_KEY) {
        console.error("email-code: RESEND_API_KEY is not set");
        return json({ error: "email not configured" }, 500);
      }

      const code = makeCode();
      const code_hash = await sha256(code);
      const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await admin
        .from("email_codes")
        .upsert({ email, code_hash, username, expires_at, attempts: 0 }, { onConflict: "email" });

      const html = `<div style="font-family:system-ui,sans-serif;background:#0b0b0f;color:#fff;padding:32px;border-radius:16px;max-width:420px;margin:auto;text-align:center">
        <h1 style="font-size:22px;margin:0 0 8px">Welcome to MYVYB</h1>
        <p style="color:#9aa0b5;margin:0 0 20px">Your verification code for <b>${username}</b>:</p>
        <div style="font-size:44px;font-weight:800;letter-spacing:14px;color:#34f5a0">${code}</div>
        <p style="color:#6b7280;font-size:12px;margin-top:20px">Expires in 10 minutes. If you didn't request this, ignore it.</p>
      </div>`;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: RESEND_FROM, to: email, subject: `${code} is your MYVYB code`, html }),
      });
      if (!r.ok) {
        // Surface Resend's actual reason (e.g. "domain not verified") to logs +
        // caller so delivery problems are diagnosable instead of silent.
        const detail = await r.text().catch(() => "");
        console.error("email-code: Resend send failed", r.status, detail);
        return json({ error: "send failed", detail: detail.slice(0, 500) }, 502);
      }
      return json({ ok: true });
    }

    if (action === "verify") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const code = String(body.code ?? "").trim().toUpperCase();
      const { data: row } = await admin
        .from("email_codes")
        .select("email,code_hash,username,expires_at,attempts")
        .eq("email", email)
        .maybeSingle();
      if (!row) return json({ ok: false, error: "expired" }, 400);
      if (new Date(row.expires_at as string).getTime() < Date.now())
        return json({ ok: false, error: "expired" }, 400);
      if ((row.attempts as number) >= 5) return json({ ok: false, error: "locked" }, 429);
      const ok = (await sha256(code)) === row.code_hash;
      if (!ok) {
        await admin.from("email_codes").update({ attempts: (row.attempts as number) + 1 }).eq("email", email);
        return json({ ok: false, error: "wrong code" });
      }
      // Mint a session: magic-link token the client exchanges via verifyOtp.
      const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
      const tokenHash = link.data.properties?.hashed_token;
      if (!tokenHash) return json({ ok: false, error: "mint failed" }, 500);
      await admin.from("email_codes").delete().eq("email", email);
      return json({ ok: true, tokenHash, username: row.username });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
