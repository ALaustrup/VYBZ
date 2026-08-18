// Client-side passkey (WebAuthn) helpers — biometric, passwordless sign-in.
//
// Registration binds a passkey to the signed-in (email-anchored) account.
// Sign-in runs the WebAuthn ceremony, then exchanges the server-minted
// token_hash for a real Supabase session (picked up by the auth listener).

import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
} from "@simplewebauthn/browser";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface PasskeyRow {
  credential_id: string;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
}

/** List the current user's passkeys (RLS: own rows only). */
export async function listPasskeys(): Promise<PasskeyRow[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("passkeys")
    .select("credential_id,label,created_at,last_used_at")
    .order("created_at", { ascending: false });
  return (data as PasskeyRow[]) ?? [];
}

/** Rename a passkey (label only). */
export async function renamePasskey(credentialId: string, label: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("passkeys").update({ label }).eq("credential_id", credentialId);
}

/** Revoke (delete) a passkey. */
export async function deletePasskey(credentialId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("passkeys").delete().eq("credential_id", credentialId);
}

/** Whether this device/browser can use passkeys. */
export function passkeysSupported(): boolean {
  try {
    return browserSupportsWebAuthn();
  } catch {
    return false;
  }
}

/** Whether the browser supports conditional UI (passkey autofill / one-tap). */
export async function passkeyAutofillSupported(): Promise<boolean> {
  try {
    return await browserSupportsWebAuthnAutofill();
  } catch {
    return false;
  }
}

/**
 * Pull the real `{ error }` body out of a Functions invoke failure.
 *
 * `functions.invoke` otherwise surfaces the generic "Edge Function returned a
 * non-2xx status code", which hid `account_exists`, `origin not allowed`, and
 * every other actionable failure from the UI.
 */
async function extractFunctionError(error: unknown, data: unknown): Promise<string> {
  if (data && typeof data === "object" && "error" in data) {
    const msg = (data as { error?: unknown }).error;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body && typeof body === "object" && typeof (body as { error?: unknown }).error === "string") {
        return (body as { error: string }).error;
      }
    } catch {
      /* body was not JSON */
    }
  }
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return "Passkey request failed";
}

async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new Error("Backend not configured");
  const { data, error } = await supabase.functions.invoke("passkey", {
    body: { action, ...payload },
  });
  if (error) throw new Error(await extractFunctionError(error, data));
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

/**
 * Create a passkey for the current account. Requires an email-anchored, signed-in
 * session (so it's recoverable and can mint future sessions).
 */
export async function registerPasskey(): Promise<{ verified: boolean }> {
  const { options } = await call<{ options: unknown }>("register-options");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await startRegistration({ optionsJSON: options as any });
  return call<{ verified: boolean }>("register-verify", { response });
}

/** Exchange a hashed magic-link token for a real session. */
export async function establishSession(tokenHash?: string): Promise<boolean> {
  if (!tokenHash || !supabase) return false;
  // generateLink({ type: "magiclink" }) returns a hashed_token that verifyOtp
  // accepts as either magiclink or email depending on project auth settings.
  const first = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });
  if (!first.error) return true;
  const second = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });
  if (!second.error) return true;
  throw new Error(first.error.message || second.error?.message || "Could not start a session");
}

/**
 * Passkey-first sign-up: create an email-anchored account and register a passkey
 * as the PRIMARY credential in a single ceremony, then establish a session.
 * Throws { code: "account_exists" } if the email already has a passkey.
 */
export async function signUpWithPasskey(email: string): Promise<boolean> {
  let optionsRes: { options: unknown; flowId: string };
  try {
    optionsRes = await call<{ options: unknown; flowId: string }>("signup-options", {
      email: email.trim().toLowerCase(),
    });
  } catch (e) {
    // Surface the already-registered case so the UI can pivot to sign-in.
    if (/account_exists/i.test((e as Error).message))
      throw Object.assign(new Error("account_exists"), { code: "account_exists" });
    throw e;
  }
  if (!optionsRes.flowId) throw new Error("Could not start passkey sign-up. Try again.");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await startRegistration({ optionsJSON: optionsRes.options as any });
  const res = await call<{ verified: boolean; tokenHash?: string }>("signup-verify", {
    response,
    flowId: optionsRes.flowId,
  });
  if (!res.verified) return false;
  return establishSession(res.tokenHash);
}

/**
 * Sign in with a passkey. Runs the WebAuthn ceremony and establishes a session.
 * Returns true on success; the store's auth listener then hydrates the account.
 *
 * Pass `conditional: true` to run the ceremony via browser autofill (conditional
 * UI) — the "tap your account" one-tap experience surfaced from the email field.
 */
export async function signInWithPasskey(
  opts: { conditional?: boolean } = {}
): Promise<boolean> {
  const { options, flowId } = await call<{ options: unknown; flowId: string }>(
    "auth-options"
  );
  if (!flowId) throw new Error("Could not start passkey sign-in. Try again.");
  const response = await startAuthentication({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    optionsJSON: options as any,
    useBrowserAutofill: !!opts.conditional,
  });
  const res = await call<{ verified: boolean; tokenHash?: string }>("auth-verify", {
    response,
    flowId,
  });
  if (!res.verified) return false;
  return establishSession(res.tokenHash);
}
