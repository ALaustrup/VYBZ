// Supabase Edge Function: watermark — per-recipient forensic watermark on
// delivery (§8.7). Verifies the download permission, fetches the private
// original, embeds a spread-spectrum watermark keyed to (recipient, asset,
// watermark id), records the issuance in the provenance ledger, and returns the
// uniquely-watermarked WAV. Non-WAV formats fall back to a gated signed URL
// (still logged) until format-specific embedding lands.
//
// Secret: WM_SECRET (server-side only). Deploy with --verify-jwt (default).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// deno-lint-ignore-file
import { deriveKey, embedChannel, parseWav, encodeWav } from "../_shared/watermark.mjs";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const WM_SECRET = Deno.env.get("WM_SECRET") ?? "";
const BUCKET = "audio-assets";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!WM_SECRET) return json({ error: "watermark not configured" }, 500);

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: userData } = await admin.auth.getUser(jwt);
  const uid = userData?.user?.id;
  if (!uid) return json({ error: "unauthorized" }, 401);

  const { assetId } = await req.json().catch(() => ({ assetId: null }));
  if (!assetId) return json({ error: "assetId required" }, 400);

  // Permission gate (mirrors request_asset_download).
  const { data: asset } = await admin.from("assets").select("*").eq("id", assetId).single();
  if (!asset || !asset.downloadable) return json({ error: "not available" }, 403);
  if ((asset.kind === "project" || asset.kind === "preset") && asset.owner_id !== uid)
    return json({ error: "forbidden" }, 403);

  await admin.from("asset_downloads").upsert({ asset_id: assetId, user_id: uid, license: asset.license });

  // Fetch the original.
  const { data: blob, error: dlErr } = await admin.storage.from(BUCKET).download(asset.url);
  if (dlErr || !blob) return json({ error: "fetch failed" }, 500);
  const bytes = new Uint8Array(await blob.arrayBuffer());

  const wav = parseWav(bytes);
  if (!wav) {
    // Non-WAV: gate + log a plain download, hand back a signed URL.
    await admin.rpc("ledger_append", { p_event: "download", p_asset: assetId, p_actor: uid, p_payload: { license: asset.license } });
    const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(asset.url, 60 * 60 * 2, { download: true });
    return json({ watermarked: false, url: signed?.signedUrl ?? null });
  }

  const wmId = crypto.randomUUID();
  const key = await deriveKey(WM_SECRET, `${uid}|${assetId}|${wmId}`);
  for (const ch of wav.channels) embedChannel(ch, key);
  const out = encodeWav({ channels: wav.channels, sampleRate: wav.sampleRate });
  const outHash = await sha256Hex(out);

  await admin.rpc("ledger_append", {
    p_event: "watermark", p_asset: assetId, p_actor: uid,
    p_payload: { wm_id: wmId, license: asset.license, delivered_sha256: outHash },
  });

  return new Response(out, {
    status: 200,
    headers: {
      ...CORS,
      "Content-Type": "audio/wav",
      "Content-Disposition": `attachment; filename="${(asset.title || "drop").replace(/[^\w.-]+/g, "_")}.wav"`,
      "X-VYBZ-Watermark": wmId,
    },
  });
});
