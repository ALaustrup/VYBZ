/**
 * Live production paths for website-review module (Stage 1b).
 * Fixture portal remains under /__e2e__/ai-review.
 */

export interface ProdSurface {
  id: string;
  path: string;
  /** Expect non-admin bounce away from admin */
  expectAdminBounce?: boolean;
}

export const WEBSITE_REVIEW_PROD_SURFACES: ProdSurface[] = [
  { id: "home", path: "/" },
  { id: "analyzer", path: "/releases" },
  { id: "correct", path: "/tools/correct" },
  { id: "stems", path: "/tools/stems" },
  { id: "library", path: "/library" },
  { id: "codex", path: "/codex" },
  { id: "discover", path: "/discover" },
  { id: "profile", path: "/profile/edit" },
  { id: "settings", path: "/profile/edit" },
  { id: "admin", path: "/admin", expectAdminBounce: true },
];

export const REQUIRED_PROD_SURFACE_IDS = [
  "home",
  "analyzer",
  "correct",
  "stems",
  "library",
  "codex",
  "discover",
  "profile",
  "settings",
  "admin",
] as const;
