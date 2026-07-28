// Supabase Edge Function: bunny-sign
//
// Mints short-lived, token-authenticated Bunny CDN URLs for protected drop/project
// originals stored in the isolated secure zone. Only signed-in creators can request
// signatures; the signing key stays server-side. Paths that aren't secure-zone paths
// (legacy Supabase paths, or already-absolute URLs) are returned untouched so the
// caller can keep its existing handling.
//
// Deploy with --no-verify-jwt (we verify the caller's JWT ourselves).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { signBunnyUrl, isSecureBunnyPath, type BunnyTokenMode } from "../_shared/bunnyToken.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const CDN = Deno.env.get("BUNNY_SECURE_CDN_HOST") ?? "";
const TOKEN_KEY = Deno.env.get("BUNNY_SECURE_TOKEN_KEY") ?? "";
const MODE = ((Deno.env.get("BUNNY_TOKEN_AUTH_MODE") ?? "advanced").toLowerCase() === "basic"
  ? "basic"
  : "advanced") as BunnyTokenMode;
const TTL = 60 * 60 * 2; // 2h — matches the app's SIGN_TTL for preview URLs.

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
  if (!CDN || !TOKEN_KEY) return json({ error: "secure bunny not configured" }, 500);

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "unauthorized" }, 401);
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data?.user?.id) return json({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const paths: string[] = Array.isArray(body.paths) ? body.paths : (body.path ? [body.path] : []);
  const urls: Record<string, string> = {};
  for (const p of paths) {
    if (typeof p !== "string" || !p) continue;
    if (isSecureBunnyPath(p)) urls[p] = await signBunnyUrl(CDN, TOKEN_KEY, p, TTL, MODE);
  }
  return json({ urls, mode: MODE });
});
