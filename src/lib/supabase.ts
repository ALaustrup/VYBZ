import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Optional Supabase backend.
//
// MYVYB ships fully functional in "local mode" (state persisted in the browser
// with seeded demo data). When the two env vars below are provided, this module
// exposes a configured client so the app can be upgraded to a real multi-user
// backend (auth, Postgres, realtime, storage) — see `supabase/schema.sql`.
//
// Keeping the backend optional means the app never breaks if it isn't set up,
// and the migration can happen feature-by-feature.
// ---------------------------------------------------------------------------

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True when a Supabase project is configured for this build. */
export const BACKEND_ENABLED = Boolean(url && anonKey);

/** Configured client, or null in local mode. */
export const supabase: SupabaseClient | null = BACKEND_ENABLED
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;
