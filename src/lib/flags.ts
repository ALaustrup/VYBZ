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
} as const;
