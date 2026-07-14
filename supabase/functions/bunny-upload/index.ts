// Supabase Edge Function: bunny-upload
//
// Securely proxies a signed-in creator's media upload to Bunny.net Storage — the
// Bunny write key never touches the browser. Stores the object under the user's
// own folder and returns the public Bunny CDN URL (CORS-enabled, range-friendly,
// so the WebAudio analyser + audio-reactive effects work on playback).
//
// Deploy with --no-verify-jwt (we verify the caller's JWT ourselves so CORS
// preflight and our own auth handling work cleanly).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// Public zone — post media (avatars, images, public audio/video). Served openly.
const SZONE = Deno.env.get("BUNNY_STORAGE_ZONE") ?? "";
const SPASS = Deno.env.get("BUNNY_STORAGE_PASSWORD") ?? "";
const SHOST = Deno.env.get("BUNNY_STORAGE_HOST") ?? "storage.bunnycdn.com";
const CDN = Deno.env.get("BUNNY_CDN_HOST") ?? "";

// Secure zone — protected drop originals (§8 exchange). Isolated storage behind a
// token-authenticated pull zone: objects are NOT publicly reachable, and previews
// require a short-lived signed token (minted by the `bunny-sign` function). The
// raw original is only ever fetched server-side (watermark/download) via AccessKey.
const SEC_ZONE = Deno.env.get("BUNNY_SECURE_STORAGE_ZONE") ?? "";
const SEC_PASS = Deno.env.get("BUNNY_SECURE_STORAGE_PASSWORD") ?? "";
const SEC_HOST = Deno.env.get("BUNNY_SECURE_STORAGE_HOST") ?? "storage.bunnycdn.com";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-file-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
function sanitizeExt(name: string): string {
  const e = (name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  return e.slice(0, 5) || "bin";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!SZONE || !SPASS || !CDN) return json({ error: "bunny not configured" }, 500);

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "unauthorized" }, 401);
  const { data, error } = await admin.auth.getUser(jwt);
  const uid = data?.user?.id;
  if (error || !uid) return json({ error: "unauthorized" }, 401);

  const url = new URL(req.url);
  const name = url.searchParams.get("name") ?? "file";
  const kind = url.searchParams.get("kind") ?? "post";
  const ct = req.headers.get("content-type") ?? "application/octet-stream";
  const ext = sanitizeExt(name);

  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.byteLength === 0) return json({ error: "empty" }, 400);
  if (bytes.byteLength > 200 * 1024 * 1024) return json({ error: "too large (200MB max)" }, 413);

  // Protected drop/project original → isolated, token-authed secure zone. Returns
  // ONLY the storage path (no public URL); previews are signed on demand.
  if (kind === "drop" || kind === "project") {
    if (!SEC_ZONE || !SEC_PASS) return json({ error: "secure bunny not configured" }, 500);
    const path = `${kind}s/${uid}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const put = await fetch(`https://${SEC_HOST}/${SEC_ZONE}/${path}`, {
      method: "PUT",
      headers: { AccessKey: SEC_PASS, "Content-Type": ct },
      body: bytes,
    });
    if (!put.ok) return json({ error: `bunny ${put.status}` }, 502);
    return json({ path });
  }

  // Public post media → open pull zone, returns the CDN URL.
  const path = `${uid}/posts/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const put = await fetch(`https://${SHOST}/${SZONE}/${path}`, {
    method: "PUT",
    headers: { AccessKey: SPASS, "Content-Type": ct },
    body: bytes,
  });
  if (!put.ok) return json({ error: `bunny ${put.status}` }, 502);

  return json({ url: `https://${CDN}/${path}`, path });
});
