// Client-side passkey (WebAuthn) helpers — biometric, passwordless sign-in.
//
// Registration binds a passkey to the signed-in (email-anchored) account.
// Sign-in runs the WebAuthn ceremony, then exchanges the server-minted
// token_hash for a real Supabase session (picked up by the auth listener).

import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";
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

async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new Error("Backend not configured");
  const { data, error } = await supabase.functions.invoke("passkey", {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message);
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

/**
 * Sign in with a passkey. Runs the WebAuthn ceremony and establishes a session.
 * Returns true on success; the store's auth listener then hydrates the account.
 */
export async function signInWithPasskey(): Promise<boolean> {
  const { options, flowId } = await call<{ options: unknown; flowId: string }>(
    "auth-options"
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await startAuthentication({ optionsJSON: options as any });
  const res = await call<{ verified: boolean; tokenHash?: string }>(
    "auth-verify",
    { response, flowId }
  );
  if (!res.verified || !res.tokenHash || !supabase) return false;
  const { error } = await supabase.auth.verifyOtp({
    token_hash: res.tokenHash,
    type: "magiclink",
  });
  return !error;
}
