// Supabase Edge Function: weekly-digest
//
// Cron-triggered (or manual) job: email opted-in creators their week-in-review
// (listens, feels, tips, credits) + new opportunities + top Connect matches.
// Deploy with --no-verify-jwt; auth is DIGEST_CRON_SECRET.
import { admin, CORS, json } from "../_shared/edge.ts";

const BATCH = 40;

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

type OppRow = {
  id: string;
  title: string | null;
  kind: string | null;
  budget: string | null;
  roleLabel: string | null;
  fit: number | null;
  authorUsername: string | null;
};

type WeekBundle = {
  weekStart: string;
  username: string | null;
  listens: number;
  feels: number;
  wilds: number;
  tipsCents: number;
  tipsCount: number;
  creditsBalance: number;
  creditsBought: number;
  matches: MatchRow[];
  opportunities: OppRow[];
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

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function hasEngagement(b: WeekBundle): boolean {
  return (
    (b.listens ?? 0) > 0 ||
    (b.feels ?? 0) > 0 ||
    (b.wilds ?? 0) > 0 ||
    (b.tipsCount ?? 0) > 0 ||
    (b.creditsBought ?? 0) > 0
  );
}

function shouldSend(b: WeekBundle): boolean {
  const matches = b.matches ?? [];
  const opps = b.opportunities ?? [];
  return matches.length > 0 || opps.length > 0 || hasEngagement(b);
}

function weekStatBits(b: WeekBundle): string[] {
  const bits: string[] = [];
  if (b.listens > 0) bits.push(`${b.listens} listen${b.listens === 1 ? "" : "s"}`);
  if (b.feels > 0) bits.push(`${b.feels} feel${b.feels === 1 ? "" : "s"}`);
  if (b.wilds > 0) bits.push(`${b.wilds} wild${b.wilds === 1 ? "" : "s"}`);
  if (b.tipsCount > 0) {
    bits.push(
      `${b.tipsCount} tip${b.tipsCount === 1 ? "" : "s"} (${formatUsd(b.tipsCents)})`,
    );
  }
  bits.push(`${b.creditsBalance} credit${b.creditsBalance === 1 ? "" : "s"}`);
  if (b.creditsBought > 0) bits.push(`+${b.creditsBought} bought`);
  return bits;
}

function buildEmail(opts: {
  bundle: WeekBundle;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const app = opts.appUrl.replace(/\/$/, "");
  const b = opts.bundle;
  const matches = b.matches ?? [];
  const opps = b.opportunities ?? [];
  const showWeek = hasEngagement(b);
  const weekBits = showWeek ? weekStatBits(b) : [];

  const subject =
    matches.length > 0
      ? `Your VYBZ week · ${matches.length} best fit${matches.length === 1 ? "" : "s"}`
      : "Your VYBZ week";

  const matchRows = matches.map((m) => {
    const handle = m.username ? `@${m.username}` : "creator";
    const fit = m.fit != null ? Math.round(Number(m.fit) * 100) : null;
    const why = whyLine(m);
    return { handle, fit, why, href: `${app}/u/${m.user_id}` };
  });

  const oppRows = opps.map((o) => {
    const title = o.title?.trim() || "Open opportunity";
    const role = o.roleLabel ? ` · ${o.roleLabel}` : "";
    const budget = o.budget ? ` · ${o.budget}` : "";
    const kind = o.kind ? o.kind : "";
    const fit = o.fit != null ? Math.round(Number(o.fit) * 100) : null;
    return {
      title,
      meta: `${kind}${role}${budget}`.replace(/^ · /, ""),
      fit,
      href: `${app}/opportunities`,
    };
  });

  const textLines: string[] = [
    `Hey${b.username ? ` @${b.username}` : ""},`,
    "",
  ];

  if (showWeek && weekBits.length) {
    textLines.push("Your week:", weekBits.join(" · "), "");
  }

  if (oppRows.length) {
    textLines.push("New opportunities:");
    for (const r of oppRows) {
      textLines.push(
        `- ${r.title}${r.meta ? ` (${r.meta})` : ""}${r.fit != null ? ` · ${r.fit}% fit` : ""}`,
      );
    }
    textLines.push(`Browse: ${app}/opportunities`, "");
  }

  if (matchRows.length) {
    textLines.push("Best fits:");
    for (const r of matchRows) {
      textLines.push(
        `- ${r.handle}${r.fit != null ? ` · ${r.fit}% fit` : ""} — ${r.why}\n  ${r.href}`,
      );
    }
    textLines.push(`Open Network: ${app}/connect`, "");
  }

  textLines.push(`Manage digest: ${app}/profile (Settings → Weekly match digest)`);

  const weekHtml = showWeek && weekBits.length
    ? `<p style="color:#e4e4e7;font-size:14px;line-height:1.6;margin:0 0 20px;padding:14px 16px;background:#16161c;border-radius:12px;">
        <span style="display:block;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#a87cf8;margin-bottom:6px;">Your week</span>
        ${esc(weekBits.join(" · "))}
      </p>`
    : "";

  const oppHtml = oppRows.length
    ? `<h2 style="font-size:16px;margin:0 0 8px;color:#fff;">New opportunities</h2>
      <table width="100%" cellpadding="0" cellspacing="0">${
      oppRows.map((r) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #2a2a32;">
            <a href="${r.href}" style="color:#c4a5ff;font-weight:600;text-decoration:none;font-size:15px;">${esc(r.title)}</a>
            ${r.fit != null ? `<span style="color:#8b8b96;font-size:13px;"> · ${r.fit}% fit</span>` : ""}
            ${r.meta ? `<div style="color:#a1a1aa;font-size:13px;margin-top:4px;">${esc(r.meta)}</div>` : ""}
          </td>
        </tr>`).join("")
    }</table>
      <p style="margin:12px 0 24px;">
        <a href="${app}/opportunities" style="color:#a87cf8;font-size:13px;">Browse opportunities →</a>
      </p>`
    : "";

  const matchHtml = matchRows.length
    ? `<h2 style="font-size:16px;margin:0 0 8px;color:#fff;">Best fits</h2>
      <table width="100%" cellpadding="0" cellspacing="0">${
      matchRows.map((r) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #2a2a32;">
            <a href="${r.href}" style="color:#c4a5ff;font-weight:600;text-decoration:none;font-size:16px;">${esc(r.handle)}</a>
            ${r.fit != null ? `<span style="color:#8b8b96;font-size:13px;"> · ${r.fit}% fit</span>` : ""}
            <div style="color:#a1a1aa;font-size:13px;margin-top:4px;">${esc(r.why)}</div>
          </td>
        </tr>`).join("")
    }</table>
      <p style="margin:24px 0 12px;">
        <a href="${app}/connect" style="display:inline-block;background:#7c5cff;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:600;font-size:14px;">Open Network</a>
      </p>`
    : "";

  const html = `<!doctype html><html><body style="margin:0;background:#0c0c10;color:#f4f4f5;font-family:Lexend,Atkinson Hyperlegible,ui-sans-serif,system-ui,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:28px 20px;">
    <p style="letter-spacing:0.12em;text-transform:uppercase;font-size:11px;color:#a87cf8;margin:0 0 8px;">VYBZ</p>
    <h1 style="font-size:22px;margin:0 0 8px;color:#fff;">Your VYBZ week</h1>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.5;margin:0 0 20px;">
      A quick look at your activity, openings, and best Connect fits.
    </p>
    ${weekHtml}
    ${oppHtml}
    ${matchHtml}
    <p style="color:#71717a;font-size:12px;line-height:1.5;margin-top:20px;">
      Unsubscribe anytime: <a href="${app}/profile" style="color:#a1a1aa;">You → Settings → Weekly match digest</a>
    </p>
  </div>
</body></html>`;

  return { subject, html, text: textLines.join("\n") };
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

function parseBundle(raw: unknown): WeekBundle | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const matches = Array.isArray(o.matches) ? (o.matches as MatchRow[]) : [];
  const opportunities = Array.isArray(o.opportunities) ? (o.opportunities as OppRow[]) : [];
  return {
    weekStart: String(o.weekStart ?? ""),
    username: (o.username as string | null) ?? null,
    listens: Number(o.listens ?? 0) || 0,
    feels: Number(o.feels ?? 0) || 0,
    wilds: Number(o.wilds ?? 0) || 0,
    tipsCents: Number(o.tipsCents ?? 0) || 0,
    tipsCount: Number(o.tipsCount ?? 0) || 0,
    creditsBalance: Number(o.creditsBalance ?? 0) || 0,
    creditsBought: Number(o.creditsBought ?? 0) || 0,
    matches,
    opportunities,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST" && req.method !== "GET") return json({ error: "method" }, 405);

  if (!authorized(req)) return json({ error: "unauthorized" }, 401);

  const apiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const from = Deno.env.get("RESEND_FROM") ?? Deno.env.get("RESEND_FROM_EMAIL") ?? "VYBZ <noreply@vybz.cloud>";
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
  const details: { userId: string; status: string; matches?: number; opps?: number }[] = [];

  for (const uid of userIds) {
    try {
      const { data: userData, error: userErr } = await admin.auth.admin.getUserById(uid);
      if (userErr || !userData?.user?.email) {
        skipped++;
        details.push({ userId: uid, status: "no_email" });
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

      const { data: bundleRaw, error: bErr } = await admin.rpc("digest_week_bundle", {
        p_user: uid,
        p_week: week,
      });
      if (bErr) {
        errors++;
        details.push({ userId: uid, status: `bundle_error:${bErr.message}` });
        continue;
      }
      const bundle = parseBundle(bundleRaw);
      if (!bundle) {
        errors++;
        details.push({ userId: uid, status: "bundle_parse_error" });
        continue;
      }

      if (!shouldSend(bundle)) {
        skipped++;
        details.push({ userId: uid, status: "empty_week", matches: 0, opps: 0 });
        if (!dryRun) await admin.rpc("record_digest_send", { p_user: uid, p_week: week, p_match_count: 0 });
        continue;
      }

      const mail = buildEmail({ bundle, appUrl });

      if (dryRun) {
        details.push({
          userId: uid,
          status: "dry_run",
          matches: bundle.matches.length,
          opps: bundle.opportunities.length,
        });
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
        p_match_count: bundle.matches.length,
      });
      sent++;
      details.push({
        userId: uid,
        status: "sent",
        matches: bundle.matches.length,
        opps: bundle.opportunities.length,
      });
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
