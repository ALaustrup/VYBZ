// Supabase Edge Function: watermark-detect — forensic attribution (§8.7).
// Admin-only. Given a suspect WAV + asset id, recompute each issued recipient's
// watermark (from the provenance ledger) and correlate; return the ranked
// matches so a leaked file can be traced to the recipient who received it.
//
// Secret: WM_SECRET. Deploy with --verify-jwt (default).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// deno-lint-ignore-file
import { deriveKey, detectChannel, parseWav } from "../_shared/watermark.mjs";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const WM_SECRET = Deno.env.get("WM_SECRET") ?? "";
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!WM_SECRET) return json({ error: "watermark not configured" }, 500);

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: userData } = await admin.auth.getUser(jwt);
  const uid = userData?.user?.id;
  if (!uid) return json({ error: "unauthorized" }, 401);
  const { data: me } = await admin.from("profiles").select("is_admin").eq("id", uid).single();
  if (!me?.is_admin) return json({ error: "forbidden (admin only)" }, 403);

  const { assetId, wavBase64 } = await req.json().catch(() => ({}));
  if (!assetId || !wavBase64) return json({ error: "assetId + wavBase64 required" }, 400);

  const bin = atob(wavBase64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const wav = parseWav(bytes);
  if (!wav) return json({ error: "unparseable WAV" }, 400);
  const signal = wav.channels[0];

  const { data: issues } = await admin
    .from("provenance_ledger")
    .select("actor_id, payload")
    .eq("asset_id", assetId)
    .eq("event_type", "watermark");
  if (!issues?.length) return json({ ok: true, matches: [], note: "no watermark issuances for this asset" });

  const actorIds = [...new Set(issues.map((r: any) => r.actor_id).filter(Boolean))];
  const { data: profs } = await admin.from("profiles").select("id, username").in("id", actorIds);
  const nameOf = new Map((profs ?? []).map((p: any) => [p.id, p.username]));

  const results = [];
  for (const r of issues as any[]) {
    const wmId = r.payload?.wm_id;
    if (!wmId || !r.actor_id) continue;
    const key = await deriveKey(WM_SECRET, `${r.actor_id}|${assetId}|${wmId}`);
    const score = detectChannel(Float64Array.from(signal), key);
    results.push({ recipientId: r.actor_id, recipient: nameOf.get(r.actor_id) ?? null, wmId, score: Number(score.toFixed(6)) });
  }
  results.sort((a, b) => b.score - a.score);
  // Attribution: the top score, if well above the rest, identifies the leaker.
  const top = results[0];
  const second = results[1]?.score ?? 0;
  const attributed = top && top.score > 0.004 && top.score > second * 4 ? top : null;

  return json({ ok: true, attributed, matches: results });
});
