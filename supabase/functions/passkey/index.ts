// Supabase Edge Function: passkey (WebAuthn) registration + authentication.
//
// Free, phishing-resistant, biometric sign-in. A passkey rides on top of an
// email-anchored account: registration binds a credential to the signed-in user;
// authentication verifies a discoverable credential and then MINTS a session via
// admin.generateLink → the client exchanges the token_hash with verifyOtp. No
// SMS, no passwords, no third-party credentials.
//
// Actions (POST body { action }):
//   register-options  (auth required) → WebAuthn creation options
//   register-verify   (auth required) → store the new credential
//   auth-options      (public)        → WebAuthn request options + flowId
//   auth-verify       (public)        → verify assertion, return { tokenHash, email }
//
// Deploy with --no-verify-jwt (we do our own checks). Set RP via the request
// Origin (allow-listed). SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "https://esm.sh/@simplewebauthn/server@13";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Canonical production hosts plus localhost; any *.vercel.app host (previews and
// project aliases) is also accepted so passkey registration never 403s on the
// device the user is actually on. The RP ID is bound to the request hostname.
const ALLOWED_HOSTS = [
  "myvyb.astramatrix.com",
  "astramatrix.com",
  "localhost",
];
function hostAllowed(hostname: string): boolean {
  return (
    ALLOWED_HOSTS.includes(hostname) ||
    hostname.endsWith(".astramatrix.com") ||
    hostname.endsWith(".vercel.app")
  );
}
const RP_NAME = "MYVYB";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function b64urlFromBytes(b: Uint8Array): string {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function bytesFromB64url(input: string): Uint8Array {
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function rpFromOrigin(
  origin: string | null
): { rpID: string; expectedOrigin: string } | null {
  if (!origin) return null;
  try {
    const u = new URL(origin);
    if (!hostAllowed(u.hostname)) return null;
    return { rpID: u.hostname, expectedOrigin: u.origin };
  } catch {
    return null;
  }
}

async function userFromReq(
  req: Request
): Promise<{ id: string; email: string | null } | null> {
  const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!jwt) return null;
  const { data } = await admin.auth.getUser(jwt);
  if (!data.user || data.user.is_anonymous) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const rp = rpFromOrigin(req.headers.get("Origin"));
  if (!rp) return json({ error: "origin not allowed" }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad request" }, 400);
  }
  const action = String(body.action ?? "");

  try {
    // --- Registration (signed-in user) -------------------------------------
    if (action === "register-options") {
      const user = await userFromReq(req);
      if (!user) return json({ error: "sign in (with an email) first" }, 401);
      const existing = await admin
        .from("passkeys")
        .select("credential_id,transports")
        .eq("user_id", user.id);
      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: rp.rpID,
        userID: new TextEncoder().encode(user.id),
        userName: user.email ?? `veiled-${user.id.slice(0, 8)}`,
        attestationType: "none",
        excludeCredentials: (existing.data ?? []).map((c) => ({
          id: c.credential_id as string,
          transports: (c.transports as AuthenticatorTransport[]) ?? undefined,
        })),
        authenticatorSelection: {
          residentKey: "required",
          userVerification: "preferred",
        },
      });
      await admin
        .from("webauthn_challenges")
        .insert({ user_id: user.id, challenge: options.challenge, kind: "register" });
      return json({ options });
    }

    if (action === "register-verify") {
      const user = await userFromReq(req);
      if (!user) return json({ error: "unauthorized" }, 401);
      const ch = await admin
        .from("webauthn_challenges")
        .select("id,challenge")
        .eq("user_id", user.id)
        .eq("kind", "register")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!ch.data) return json({ error: "no challenge" }, 400);
      const verification = await verifyRegistrationResponse({
        response: body.response as Parameters<typeof verifyRegistrationResponse>[0]["response"],
        expectedChallenge: ch.data.challenge as string,
        expectedOrigin: rp.expectedOrigin,
        expectedRPID: rp.rpID,
        requireUserVerification: false,
      });
      if (!verification.verified || !verification.registrationInfo)
        return json({ verified: false });
      const cred = verification.registrationInfo.credential;
      await admin.from("passkeys").upsert({
        credential_id: cred.id,
        user_id: user.id,
        public_key: b64urlFromBytes(cred.publicKey),
        counter: cred.counter ?? 0,
        transports:
          (body.response as { response?: { transports?: string[] } })?.response
            ?.transports ?? null,
        label: (body.label as string) ?? null,
      });
      await admin.from("webauthn_challenges").delete().eq("id", ch.data.id);
      return json({ verified: true });
    }

    // --- Authentication (public, usernameless) -----------------------------
    if (action === "auth-options") {
      const options = await generateAuthenticationOptions({
        rpID: rp.rpID,
        userVerification: "preferred",
        allowCredentials: [],
      });
      const ins = await admin
        .from("webauthn_challenges")
        .insert({ challenge: options.challenge, kind: "auth" })
        .select("id")
        .single();
      return json({ options, flowId: ins.data?.id });
    }

    if (action === "auth-verify") {
      const response = body.response as { id: string };
      const flowId = body.flowId as string;
      if (!response?.id || !flowId) return json({ error: "bad request" }, 400);
      const ch = await admin
        .from("webauthn_challenges")
        .select("id,challenge")
        .eq("id", flowId)
        .eq("kind", "auth")
        .maybeSingle();
      if (!ch.data) return json({ error: "expired" }, 400);
      const pk = await admin
        .from("passkeys")
        .select("credential_id,user_id,public_key,counter,transports")
        .eq("credential_id", response.id)
        .maybeSingle();
      if (!pk.data) return json({ error: "unknown passkey" }, 404);
      const verification = await verifyAuthenticationResponse({
        response: body.response as Parameters<typeof verifyAuthenticationResponse>[0]["response"],
        expectedChallenge: ch.data.challenge as string,
        expectedOrigin: rp.expectedOrigin,
        expectedRPID: rp.rpID,
        credential: {
          id: pk.data.credential_id as string,
          publicKey: bytesFromB64url(pk.data.public_key as string),
          counter: Number(pk.data.counter),
          transports:
            (pk.data.transports as AuthenticatorTransport[]) ?? undefined,
        },
        requireUserVerification: false,
      });
      if (!verification.verified) return json({ verified: false });
      await admin
        .from("passkeys")
        .update({
          counter: verification.authenticationInfo.newCounter,
          last_used_at: new Date().toISOString(),
        })
        .eq("credential_id", pk.data.credential_id);
      await admin.from("webauthn_challenges").delete().eq("id", ch.data.id);

      // Mint a session: generate a magic-link token the client exchanges.
      const u = await admin.auth.admin.getUserById(pk.data.user_id as string);
      const email = u.data.user?.email;
      if (!email) return json({ error: "no_email" }, 409);
      const link = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      const tokenHash = link.data.properties?.hashed_token;
      if (!tokenHash) return json({ error: "mint_failed" }, 500);
      return json({ verified: true, tokenHash, email });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
