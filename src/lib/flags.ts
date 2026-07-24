// Lightweight, build-time feature flags. Keep additive & reversible (§9):
// most flags default ON but flip OFF instantly via env; opt-in flags default OFF
// until their external dependency (e.g. Stripe Connect) is provisioned.
const off = (v: unknown) => String(v ?? "").toLowerCase() === "off" || String(v ?? "") === "false";
const on = (v: unknown) => ["on", "true", "1"].includes(String(v ?? "").toLowerCase());

export const FLAGS = {
  /** Phase O1 — creator-adjacent Role Class onboarding + badges + feed split. */
  roleClass: !off(import.meta.env.VITE_FEATURE_ROLE_CLASS),
  /** Phase O3b — Stripe Connect tips. OFF until Connect is enabled on the platform. */
  tips: on(import.meta.env.VITE_FEATURE_TIPS),
  /** Phase C3 — Spotify for Artists OAuth connector. */
  oauthSpotify: on(import.meta.env.VITE_FEATURE_OAUTH_SPOTIFY),
  /** Phase H — encrypted-chunk WebRTC swarm (CDN fallback always available). */
  swarm: on(import.meta.env.VITE_FEATURE_SWARM),
  /** Phase J — Pro soft entitlement UI (badge + soft limits; no hard paywall). */
  pro: !off(import.meta.env.VITE_FEATURE_PRO),
  /** Phase N — Music Repos (CAS VCS on Studio). Default ON; set off to hide. */
  repos: !off(import.meta.env.VITE_FEATURE_REPOS),
} as const;
