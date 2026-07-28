// Supabase Edge Function: waitlist-join
// Public POST { email, source? } — insert into alpha_waitlist; optional confirm email via Resend.
// Deploy with --no-verify-jwt.
import { admin, CORS, json } from "../_shared/edge.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendConfirm(opts: {
  to: string;
  appUrl: string;
}): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY") ?? "";
  const from = Deno.env.get("RESEND_FROM") ?? Deno.env.get("RESEND_FROM_EMAIL") ?? "";
  if (!key || !from) return;
  const app = opts.appUrl.replace(/\/$/, "");
  const subject = "You're on the VYBZ alpha list";
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#0a0c12;color:#eee;padding:32px">
  <h1 style="font-size:22px;margin:0 0 12px">VYBZ</h1>
  <p style="opacity:.85;line-height:1.5">Thanks for joining the alpha waitlist. We'll email you when VYBZ is ready — tip, live, and catalog for indie artists.</p>
  <p style="opacity:.55;font-size:13px;margin-top:24px"><a href="${esc(app)}" style="color:#22d3ee">vybz.cloud</a></p>
  </body></html>`;
  const text = `You're on the VYBZ alpha list. We'll notify you at launch. ${app}`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [opts.to], subject, html, text }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: { email?: string; source?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const email = (body.email ?? "").trim();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json({ error: "invalid_email" }, 400);
  }
  const source = ((body.source ?? "landing") + "").slice(0, 64) || "landing";

  const { error } = await admin.from("alpha_waitlist").insert({ email, source });

  if (error) {
    if (error.code === "23505") {
      return json({ ok: true, status: "already" });
    }
    console.error("waitlist-join", error);
    return json({ error: "db_error" }, 500);
  }

  const appUrl = Deno.env.get("APP_URL") ?? "https://vybz.cloud";
  void sendConfirm({ to: email, appUrl }).catch((e) => console.error("confirm", e));

  return json({ ok: true, status: "joined" });
});
