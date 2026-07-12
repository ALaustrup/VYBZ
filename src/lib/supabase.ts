import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Supabase client. VYBZ is identity-first and backend-backed: the app requires a
// configured project (auth, Postgres, storage). The two env vars below wire it
// up; `App` shows a clear misconfiguration notice when they're absent.
// ---------------------------------------------------------------------------

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True when a Supabase project is configured for this build. */
export const BACKEND_ENABLED = Boolean(url && anonKey);

/** Project URL + anon key (public) — used for direct Edge Function calls that
 *  return binary (e.g. watermarked downloads), where functions.invoke is unreliable. */
export const SUPABASE_URL = (url as string) ?? "";
export const SUPABASE_ANON_KEY = (anonKey as string) ?? "";

/** Configured client, or null in local mode. */
export const supabase: SupabaseClient | null = BACKEND_ENABLED
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;
