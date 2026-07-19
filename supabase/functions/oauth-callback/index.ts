// Supabase Edge Function: oauth-callback
// Handles provider redirect, exchanges code, upserts oauth_connections, redirects to app.
// Deploy with --no-verify-jwt (browser redirect has no Authorization header).
import { admin } from "../_shared/edge.ts";

const APP_URL = Deno.env.get("APP_URL") ?? "https://vybz.cloud";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  return atob(b64);
}

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

function redirect(path: string): Response {
  return new Response(null, { status: 302, headers: { Location: path } });
}

Deno.serve(async (req: Request) => {
  const u = new URL(req.url);
  const err = u.searchParams.get("error");
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state") ?? "";

  const fail = (reason: string) =>
    redirect(`${APP_URL}/profile?oauth=spotify_artist&ok=0&reason=${encodeURIComponent(reason)}`);

  if (err) return fail(err);
  if (!code || !state.includes(".")) return fail("invalid_state");

  const stateSecret = Deno.env.get("OAUTH_STATE_SECRET") ?? Deno.env.get("SPOTIFY_CLIENT_SECRET");
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  if (!stateSecret || !clientId || !clientSecret) return fail("not_configured");

  const [stateBody, sig] = state.split(".");
  const expect = await hmacSign(stateSecret, stateBody);
  if (sig !== expect) return fail("bad_signature");

  let parsed: { uid: string; provider: string; projectId: string | null; exp: number };
  try {
    parsed = JSON.parse(b64urlDecode(stateBody));
  } catch {
    return fail("bad_state");
  }
  if (!parsed.uid || parsed.exp < Date.now()) return fail("expired");
  if (parsed.provider !== "spotify_artist") return fail("unknown_provider");

  const redirectUri = `${SUPABASE_URL}/functions/v1/oauth-callback`;
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!tokenRes.ok) return fail("token_exchange");
  const tokens = await tokenRes.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  const meRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const me = meRes.ok ? await meRes.json() : {};
  const meta = {
    display_name: me.display_name ?? null,
    followers: me.followers?.total ?? null,
    product: me.product ?? null,
    images: Array.isArray(me.images) ? me.images.slice(0, 1) : [],
    external_url: me.external_urls?.spotify ?? null,
  };

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  const { error } = await admin.from("oauth_connections").upsert({
    user_id: parsed.uid,
    provider: "spotify_artist",
    external_id: me.id ?? null,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    scopes: (tokens.scope ?? "").split(" ").filter(Boolean),
    meta,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,provider" });

  if (error) return fail("persist");

  const q = new URLSearchParams({ oauth: "spotify_artist", ok: "1" });
  if (parsed.projectId) q.set("project", parsed.projectId);
  return redirect(`${APP_URL}/profile?${q.toString()}`);
});
