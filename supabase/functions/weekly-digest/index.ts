// Supabase Edge Function: weekly-digest
//
// Cron-triggered (or manual) job: email opted-in creators their top Connect
// matches via Resend. Deploy with --no-verify-jwt; auth is DIGEST_CRON_SECRET.
import { admin, CORS, json } from "../_shared/edge.ts";

const BATCH = 40;
const MATCH_LIMIT = 5;

type MatchRow = {
  user_id: string;
  username: string | null;
  offers_you_seek: string[] | null;
  seeks_you_offer: string[] | null;
  mutual: boolean | null;
  fit: number | null;
  confidence: number | null;
  shared_genres: string[] | null;
};

function authorized(req: Request): boolean {
  const secret = Deno.env.get("DIGEST_CRON_SECRET") ?? "";
  if (!secret) return false;
  const header = req.headers.get("x-digest-secret") ?? "";
  if (header && header === secret) return true;
  const auth = req.headers.get("Authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  return !!(m && m[1] === secret);
}

function weekStartISO(d = new Date()): string {
  // Monday UTC (ISO week start), YYYY-MM-DD
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = utc.getUTCDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + diff);
  return utc.toISOString().slice(0, 10);
}

function whyLine(m: MatchRow): string {
  const bits: string[] = [];
  if (m.mutual) bits.push("mutual fit");
  const offers = (m.offers_you_seek ?? []).slice(0, 2);
  const seeks = (m.seeks_you_offer ?? []).slice(0, 2);
  if (offers.length) bits.push(`brings ${offers.join(", ")}`);
  if (seeks.length) bits.push(`wants ${seeks.join(", ")}`);
  const genres = (m.shared_genres ?? []).slice(0, 2);
  if (genres.length) bits.push(`shared ${genres.join(", ")}`);
  return bits.slice(0, 3).join(" · ") || "strong collab signal";
}

function buildEmail(opts: {
  toUsername: string | null;
  matches: MatchRow[];
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const app = opts.appUrl.replace(/\/$/, "");
  const subject = `Your VYBZ matches this week (${opts.matches.length})`;
  const rows = opts.matches.map((m) => {
    const handle = m.username ? `@${m.username}` : "creator";
    const fit = m.fit != null ? Math.round(Number(m.fit) * 100) : null;
    const why = whyLine(m);
    return { handle, fit, why, href: `${app}/u/${m.user_id}` };
  });

  const textLines = [
    `Hey${opts.toUsername ? ` @${opts.toUsername}` : ""},`,
    "",
    "Here are creators who look like a strong fit on VYBZ this week:",
    "",
    ...rows.map((r) => `- ${r.handle}${r.fit != null ? ` · ${r.fit}% fit` : ""} — ${r.why}\n  ${r.href}`),
    "",
    `Open Network: ${app}/connect`,
    "",
    `Manage digest: ${app}/profile (Settings → Weekly match digest)`,
  ];

  const htmlItems = rows.map((r) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #2a2a32;">
        <a href="${r.href}" style="color:#c4a5ff;font-weight:600;text-decoration:none;font-size:16px;">${r.handle}</a>
        ${r.fit != null ? `<span style="color:#8b8b96;font-size:13px;"> · ${r.fit}% fit</span>` : ""}
        <div style="color:#a1a1aa;font-size:13px;margin-top:4px;">${whyEscape(r.why)}</div>
      </td>
    </tr>`).join("");

  const html = `<!doctype html><html><body style="margin:0;background:#0c0c10;color:#f4f4f5;font-family:ui-sans-serif,system-ui,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:28px 20px;">
    <p style="letter-spacing:0.12em;text-transform:uppercase;font-size:11px;color:#a87cf8;margin:0 0 8px;">VYBZ</p>
    <h1 style="font-size:22px;margin:0 0 8px;color:#fff;">Your best fits this week</h1>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.5;margin:0 0 20px;">
      Opt-in digest of creators ranked for you — same engine as Network.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">${htmlItems}</table>
    <p style="margin:24px 0 12px;">
      <a href="${app}/connect" style="display:inline-block;background:#7c5cff;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:600;font-size:14px;">Open Network</a>
    </p>
    <p style="color:#71717a;font-size:12px;line-height:1.5;">
      Unsubscribe anytime: <a href="${app}/profile" style="color:#a1a1aa;">You → Settings → Weekly match digest</a>
    </p>
  </div>
</body></html>`;

  return { subject, html, text: textLines.join("\n") };
}

function whyEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendResend(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  from: string;
  apiKey: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `${res.status} ${body.slice(0, 240)}` };
  }
  return { ok: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST" && req.method !== "GET") return json({ error: "method" }, 405);

  if (!authorized(req)) return json({ error: "unauthorized" }, 401);

  const apiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const from = Deno.env.get("RESEND_FROM") ?? Deno.env.get("RESEND_FROM_EMAIL") ?? "VYBZ <noreply@astramatrix.xyz>";
  const appUrl = Deno.env.get("APP_URL") ?? "https://vybz.cloud";
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "1";

  if (!apiKey && !dryRun) return json({ error: "RESEND_API_KEY not configured" }, 503);

  const week = weekStartISO();
  const { data: due, error: dueErr } = await admin.rpc("list_digest_due", {
    p_week: week,
    p_limit: BATCH,
  });
  if (dueErr) return json({ error: dueErr.message }, 500);

  const userIds: string[] = (due ?? []).map((r: { user_id: string }) => r.user_id);
  let sent = 0;
  let skipped = 0;
  let errors = 0;
  const details: { userId: string; status: string; matches?: number }[] = [];

  for (const uid of userIds) {
    try {
      const { data: userData, error: userErr } = await admin.auth.admin.getUserById(uid);
      if (userErr || !userData?.user?.email) {
        skipped++;
        details.push({ userId: uid, status: "no_email" });
        // Still record so we don't spin forever on unverified accounts
        if (!dryRun) await admin.rpc("record_digest_send", { p_user: uid, p_week: week, p_match_count: 0 });
        continue;
      }
      const email = userData.user.email;
      const confirmed = !!(userData.user.email_confirmed_at || userData.user.confirmed_at);
      if (!confirmed) {
        skipped++;
        details.push({ userId: uid, status: "unconfirmed" });
        if (!dryRun) await admin.rpc("record_digest_send", { p_user: uid, p_week: week, p_match_count: 0 });
        continue;
      }

      const { data: matches, error: mErr } = await admin.rpc("collab_matches_for", {
        p_user: uid,
        p_limit: MATCH_LIMIT,
      });
      if (mErr) {
        errors++;
        details.push({ userId: uid, status: `match_error:${mErr.message}` });
        continue;
      }
      const list = (matches ?? []) as MatchRow[];
      if (list.length === 0) {
        skipped++;
        details.push({ userId: uid, status: "no_matches", matches: 0 });
        if (!dryRun) await admin.rpc("record_digest_send", { p_user: uid, p_week: week, p_match_count: 0 });
        continue;
      }

      const { data: prof } = await admin.from("profiles").select("username").eq("id", uid).maybeSingle();
      const mail = buildEmail({
        toUsername: prof?.username ?? null,
        matches: list,
        appUrl,
      });

      if (dryRun) {
        details.push({ userId: uid, status: "dry_run", matches: list.length });
        sent++;
        continue;
      }

      const result = await sendResend({
        to: email,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        from,
        apiKey,
      });
      if (!result.ok) {
        errors++;
        details.push({ userId: uid, status: `send_error:${result.error}` });
        continue;
      }

      await admin.rpc("record_digest_send", {
        p_user: uid,
        p_week: week,
        p_match_count: list.length,
      });
      sent++;
      details.push({ userId: uid, status: "sent", matches: list.length });
    } catch (e) {
      errors++;
      details.push({ userId: uid, status: `error:${(e as Error).message}` });
    }
  }

  return json({
    week,
    dryRun,
    due: userIds.length,
    sent,
    skipped,
    errors,
    details: details.slice(0, 60),
  });
});
