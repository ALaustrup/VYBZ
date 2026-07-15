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
import { signBunnyUrl, isSecureBunnyPath } from "../_shared/bunnyToken.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const WM_SECRET = Deno.env.get("WM_SECRET") ?? "";
// Optional C2PA worker (Node/container; can't run in this Deno edge). When both are
// set, the watermarked WAV is forwarded for Content-Credentials signing before
// delivery. If unset or unreachable, we deliver the watermarked-only file (safe).
const C2PA_WORKER_URL = Deno.env.get("C2PA_WORKER_URL") ?? "";
const C2PA_WORKER_TOKEN = Deno.env.get("C2PA_WORKER_TOKEN") ?? "";
const BUCKET = "audio-assets";
// Secure Bunny zone for migrated drop originals (§8). Raw bytes fetched server-side
// via AccessKey; non-WAV fallback delivery uses a short-lived token-signed URL.
const SEC_ZONE = Deno.env.get("BUNNY_SECURE_STORAGE_ZONE") ?? "";
const SEC_PASS = Deno.env.get("BUNNY_SECURE_STORAGE_PASSWORD") ?? "";
const SEC_HOST = Deno.env.get("BUNNY_SECURE_STORAGE_HOST") ?? "storage.bunnycdn.com";
const SEC_CDN = Deno.env.get("BUNNY_SECURE_CDN_HOST") ?? "";
const SEC_TOKEN_KEY = Deno.env.get("BUNNY_SECURE_TOKEN_KEY") ?? "";

/** Fetch the raw original — from the secure Bunny zone (migrated) or Supabase (legacy). */
async function fetchOriginal(path: string): Promise<Uint8Array | null> {
  if (isSecureBunnyPath(path)) {
    if (!SEC_ZONE || !SEC_PASS) return null;
    const r = await fetch(`https://${SEC_HOST}/${SEC_ZONE}/${path}`, { headers: { AccessKey: SEC_PASS } });
    if (!r.ok) return null;
    return new Uint8Array(await r.arrayBuffer());
  }
  const { data: blob, error } = await admin.storage.from(BUCKET).download(path);
  if (error || !blob) return null;
  return new Uint8Array(await blob.arrayBuffer());
}

/** UTF-8-safe base64 (btoa is Latin1-only). */
function b64(s: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(s)));
}

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

  // Fetch the original (secure Bunny zone for migrated drops, Supabase for legacy).
  const bytes = await fetchOriginal(asset.url);
  if (!bytes) return json({ error: "fetch failed" }, 500);

  const wav = parseWav(bytes);
  if (!wav) {
    // Non-WAV: gate + log a plain download, hand back a short-lived signed URL.
    await admin.rpc("ledger_append", { p_event: "download", p_asset: assetId, p_actor: uid, p_payload: { license: asset.license } });
    let url: string | null = null;
    if (isSecureBunnyPath(asset.url) && SEC_CDN && SEC_TOKEN_KEY) {
      url = await signBunnyUrl(SEC_CDN, SEC_TOKEN_KEY, asset.url, 60 * 60 * 2);
    } else {
      const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(asset.url, 60 * 60 * 2, { download: true });
      url = signed?.signedUrl ?? null;
    }
    return json({ watermarked: false, url });
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

  // Optional: attach C2PA Content Credentials via the Node worker. Best-effort —
  // the watermark alone is already a complete provenance/attribution artifact.
  let delivered = out;
  let c2pa = false;
  if (C2PA_WORKER_URL && C2PA_WORKER_TOKEN) {
    try {
      const { data: names } = await admin.from("public_profiles").select("id,username").in("id", [uid, asset.owner_id]);
      const nameOf = (id: string) => names?.find((n: { id: string }) => n.id === id)?.username ?? null;
      const meta = {
        assetId, recipient: nameOf(uid) ?? uid, watermarkId: wmId,
        license: asset.license, title: asset.title ?? "VYBZ drop", author: nameOf(asset.owner_id),
      };
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 15000);
      const r = await fetch(`${C2PA_WORKER_URL.replace(/\/+$/, "")}/sign`, {
        method: "POST",
        headers: { Authorization: `Bearer ${C2PA_WORKER_TOKEN}`, "x-vybz-meta": b64(JSON.stringify(meta)), "Content-Type": "audio/wav" },
        body: out, signal: ac.signal,
      });
      clearTimeout(timer);
      if (r.ok && (r.headers.get("content-type") ?? "").includes("audio")) {
        delivered = new Uint8Array(await r.arrayBuffer());
        c2pa = true;
        await admin.rpc("ledger_append", {
          p_event: "c2pa", p_asset: assetId, p_actor: uid,
          p_payload: { wm_id: wmId, delivered_sha256: await sha256Hex(delivered), signer: "vybz-alpha" },
        });
      }
    } catch (_e) { /* worker down/slow → deliver watermarked-only */ }
  }

  return new Response(delivered, {
    status: 200,
    headers: {
      ...CORS,
      "Content-Type": "audio/wav",
      "Content-Disposition": `attachment; filename="${(asset.title || "drop").replace(/[^\w.-]+/g, "_")}.wav"`,
      "X-VYBZ-Watermark": wmId,
      "X-VYBZ-C2PA": c2pa ? "1" : "0",
    },
  });
});
