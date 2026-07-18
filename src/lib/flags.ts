// Lightweight, build-time feature flags. Keep additive & reversible (§9):
// a flag defaults ON but flips OFF instantly via env without a code change.
const off = (v: unknown) => String(v ?? "").toLowerCase() === "off" || String(v ?? "") === "false";

export const FLAGS = {
  /** Phase O1 — creator-adjacent Role Class onboarding + badges + feed split. */
  roleClass: !off(import.meta.env.VITE_FEATURE_ROLE_CLASS),
} as const;
