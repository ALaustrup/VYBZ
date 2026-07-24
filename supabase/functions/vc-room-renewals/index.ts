// Supabase Edge Function: vc-room-renewals
// Hourly cron target for Unified Social Live V¢ room subscriptions.
// Auth: service role Bearer OR header x-cron-secret == VC_RENEWALS_SECRET.
// Deploy with --no-verify-jwt.

import { CORS, json, admin } from "../_shared/edge.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const cronSecret = Deno.env.get("VC_RENEWALS_SECRET") ?? "";
  const headerSecret = req.headers.get("x-cron-secret") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    ?? Deno.env.get("SERVICE_ROLE_KEY")
    ?? "";

  const okService = serviceKey && auth === `Bearer ${serviceKey}`;
  const okCron = cronSecret && headerSecret === cronSecret;
  if (!okService && !okCron) return json({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const limit = Math.max(1, Math.min(Number(body.limit) || 200, 500));

  const { data, error } = await admin.rpc("process_vc_room_renewals", { p_limit: limit });
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, result: data });
});
