// Supabase Edge Function: audio-play
//
// Playback backend after Bunny CDN trial exhaustion:
//   POST { paths: string[] }  →  { urls: Record<path, streamUrl> }  (auth required)
//   GET  ?t=<ticket>          →  streams audio bytes (ticket auth, no Bearer needed)
//
// Secure Bunny paths (`drops/…`) are fetched via Storage AccessKey (bypasses CDN).
// Legacy Supabase `audio-assets` paths are redirected to a short-lived signed URL.
//
// Deploy: supabase functions deploy audio-play --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SEC_ZONE = Deno.env.get("BUNNY_SECURE_STORAGE_ZONE") ?? "";
const SEC_PASS = Deno.env.get("BUNNY_SECURE_STORAGE_PASSWORD") ?? "";
const SEC_HOST = Deno.env.get("BUNNY_SECURE_STORAGE_HOST") ?? "storage.bunnycdn.com";
const TICKET_SECRET = Deno.env.get("AUDIO_PLAY_TICKET_SECRET")
  || Deno.env.get("BUNNY_SECURE_TOKEN_KEY")
  || SERVICE_KEY.slice(0, 48);
const AUDIO_BUCKET = "audio-assets";
const TTL = 60 * 60 * 2;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function isSecureBunnyPath(p: string): boolean {
  return /^(drops|projects|repo-blobs)\//.test(p);
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  const pad = "=".repeat((4 - (str.length % 4)) % 4);
  const b64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(TICKET_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return b64url(new Uint8Array(sig));
}

async function mintTicket(path: string, uid: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + TTL;
  const body = JSON.stringify({ p: path, u: uid, e: exp });
  const payload = b64url(new TextEncoder().encode(body));
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

async function readTicket(ticket: string): Promise<{ path: string; uid: string } | null> {
  const [payload, sig] = ticket.split(".");
  if (!payload || !sig) return null;
  const expect = await hmac(payload);
  if (expect !== sig) return null;
  try {
    const raw = new TextDecoder().decode(b64urlDecode(payload));
    const j = JSON.parse(raw) as { p?: string; u?: string; e?: number };
    if (!j.p || !j.u || !j.e || j.e < Math.floor(Date.now() / 1000)) return null;
    return { path: j.p, uid: j.u };
  } catch {
    return null;
  }
}

function guessContentType(path: string): string {
  const ext = (path.split(".").pop() || "").toLowerCase();
  if (ext === "wav") return "audio/wav";
  if (ext === "flac") return "audio/flac";
  if (ext === "ogg" || ext === "opus") return "audio/ogg";
  if (ext === "m4a" || ext === "mp4" || ext === "aac") return "audio/mp4";
  if (ext === "mp3" || ext === "mpeg") return "audio/mpeg";
  return "application/octet-stream";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // ── Stream by ticket (no Bearer — safe for <audio src>) ───────────────────
  if (req.method === "GET") {
    const t = new URL(req.url).searchParams.get("t");
    if (!t) return json({ error: "ticket required" }, 400);
    const ticket = await readTicket(t);
    if (!ticket) return json({ error: "invalid or expired ticket" }, 401);

    if (isSecureBunnyPath(ticket.path)) {
      if (!SEC_ZONE || !SEC_PASS) return json({ error: "bunny storage not configured" }, 503);
      const upstream = await fetch(`https://${SEC_HOST}/${SEC_ZONE}/${ticket.path}`, {
        headers: { AccessKey: SEC_PASS },
      });
      if (!upstream.ok || !upstream.body) {
        return json({ error: `bunny storage ${upstream.status}` }, 502);
      }
      return new Response(upstream.body, {
        status: 200,
        headers: {
          ...CORS,
          "Content-Type": upstream.headers.get("Content-Type") || guessContentType(ticket.path),
          "Cache-Control": "private, max-age=300",
          "Accept-Ranges": "bytes",
        },
      });
    }

    // Supabase storage path → redirect to signed URL
    const { data, error } = await admin.storage.from(AUDIO_BUCKET).createSignedUrl(ticket.path, TTL);
    if (error || !data?.signedUrl) return json({ error: "sign failed" }, 502);
    return Response.redirect(data.signedUrl, 302);
  }

  // ── Mint tickets ──────────────────────────────────────────────────────────
  // Auth required in general. Curated pre-login featured paths may mint without
  // a session via { guestFeatured: true } + strict path allowlist.
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const body = await req.json().catch(() => ({}));
  const paths: string[] = Array.isArray(body.paths) ? body.paths : (body.path ? [body.path] : []);
  const guestFeatured = body?.guestFeatured === true;

  // Keep in sync with src/features/featured/featuredTracks.ts GUEST_FEATURED_ASSET_PATHS.
  const GUEST_FEATURED_PATHS = new Set([
    "9e45224c-f5f0-4af1-960c-8f9b178a4933/drops/1786459395365-7dd06077.mp3",
  ]);

  let uid = "guest-featured";
  if (guestFeatured) {
    if (!paths.length || paths.some((p) => typeof p !== "string" || !GUEST_FEATURED_PATHS.has(p))) {
      return json({ error: "featured path not allowed" }, 403);
    }
  } else {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "unauthorized" }, 401);
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    const authed = userData?.user?.id;
    if (userErr || !authed) return json({ error: "unauthorized" }, 401);
    uid = authed;
  }

  const base = `${SUPABASE_URL}/functions/v1/audio-play`;
  const urls: Record<string, string> = {};

  for (const p of paths) {
    if (typeof p !== "string" || !p) continue;
    if (/^(https?:|blob:|data:)/i.test(p)) {
      urls[p] = p;
      continue;
    }
    const ticket = await mintTicket(p, uid);
    // apikey helps some gateways; ticket carries auth for the stream itself.
    urls[p] = `${base}?t=${encodeURIComponent(ticket)}${ANON_KEY ? `&apikey=${encodeURIComponent(ANON_KEY)}` : ""}`;
  }

  return json({ urls, backend: "supabase-stream" });
});
