// push-send — unified push fan-out.
//
// Accepts a list of user ids + a calm notification payload, looks up every
// device subscription for those users, and delivers via Web Push (VAPID). Native
// (APNs/FCM) rows can be handled here later by branching on `platform`.
//
// Auth: requires header `x-push-secret` == env PUSH_SEND_SECRET (so DB triggers
// / trusted callers can invoke it; never exposed to clients).
//
// Required secrets (set with `supabase secrets set ...`):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (e.g. mailto:ops@astramatrix.xyz)
//   PUSH_SEND_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy: supabase functions deploy push-send --no-verify-jwt

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

interface Payload {
  users: string[];
  notification: { title: string; body: string; url?: string; tag?: string };
  category?: "vyb" | "match" | "pulse";
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:ops@astramatrix.xyz";
const PUSH_SECRET = Deno.env.get("PUSH_SEND_SECRET")!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (req.headers.get("x-push-secret") !== PUSH_SECRET)
    return json({ error: "unauthorized" }, 401);

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }
  const users = (payload.users ?? []).filter(Boolean);
  if (users.length === 0 || !payload.notification?.title)
    return json({ error: "users + notification required" }, 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth,platform,preferences")
    .in("user_id", users);

  const category = payload.category;
  const body = JSON.stringify(payload.notification);
  let sent = 0;
  const dead: string[] = [];

  await Promise.all(
    (subs ?? []).map(async (s) => {
      // Respect per-category opt-outs.
      if (category && s.preferences && s.preferences[category] === false) return;
      if (s.platform !== "web" || !s.p256dh || !s.auth) return; // native handled elsewhere
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body
        );
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s.endpoint); // expired
      }
    })
  );

  // Prune dead subscriptions + stamp activity.
  if (dead.length) {
    await supabase.from("push_subscriptions").delete().in("endpoint", dead);
  }
  if (sent > 0) {
    await supabase
      .from("push_subscriptions")
      .update({ last_sent_at: new Date().toISOString() })
      .in("user_id", users);
  }

  return json({ sent, pruned: dead.length });
});
