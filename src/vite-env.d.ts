/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Stripe Payment Link for Lane A credit top-ups (optional). */
  readonly VITE_STRIPE_PAYMENT_LINK?: string;
  /** Supabase project URL (optional — enables the real backend). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon/public key (optional — enables the real backend). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_FEATURE_TIPS?: string;
  readonly VITE_FEATURE_OAUTH_SPOTIFY?: string;
  readonly VITE_FEATURE_SWARM?: string;
  readonly VITE_FEATURE_PRO?: string;
  readonly VITE_FEATURE_ROLE_CLASS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
