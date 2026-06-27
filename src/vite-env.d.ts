/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Stripe Payment Link for the MYVYB Plus one-time purchase (optional). */
  readonly VITE_STRIPE_PAYMENT_LINK?: string;
  /** Supabase project URL (optional — enables the real backend). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon/public key (optional — enables the real backend). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
