// Supabase Edge Function: oauth-start
// Begins OAuth for a connector provider. Returns { url } for the authorize redirect.
// Deploy with --no-verify-jwt (self-verifies caller JWT).
import { CORS, json, callerId } from "../_shared/edge.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

function b64url(data: Uint8Array | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(new Uint8Array(sig));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const uid = await callerId(req);
  if (!uid) return json({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const provider = String(body.provider ?? "");
  const projectId = body.projectId ? String(body.projectId) : null;

  if (provider === "facebook_page" || provider === "tiktok") {
    return json({ error: "provider_not_configured", message: "This connector needs API credentials." }, 501);
  }
  if (provider !== "spotify_artist") return json({ error: "unknown_provider" }, 400);

  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
  const stateSecret = Deno.env.get("OAUTH_STATE_SECRET") ?? Deno.env.get("SPOTIFY_CLIENT_SECRET");
  if (!clientId || !stateSecret) {
    return json({ error: "spotify_not_configured", message: "Set SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET." }, 503);
  }

  const redirectUri = `${SUPABASE_URL}/functions/v1/oauth-callback`;
  const statePayload = JSON.stringify({
    uid,
    provider,
    projectId,
    exp: Date.now() + 10 * 60_000,
  });
  const stateBody = b64url(statePayload);
  const sig = await hmacSign(stateSecret, stateBody);
  const state = `${stateBody}.${sig}`;

  const scopes = [
    "user-read-email",
    "user-read-private",
    "user-read-currently-playing",
    "user-top-read",
  ].join(" ");

  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("state", state);
  url.searchParams.set("show_dialog", "true");

  return json({ url: url.toString() });
});
