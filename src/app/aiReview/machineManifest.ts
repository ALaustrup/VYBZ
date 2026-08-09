/**
 * Structural map for AI agents inspecting the review portal.
 * Observations only — not implementation instructions (docs/ai-review/SCHEMA.md).
 */

export type AiReviewSurfaceId =
  | "hub"
  | "home"
  | "shell"
  | "upload"
  | "library"
  | "analyzer"
  | "correct"
  | "stems"
  | "codex"
  | "discover"
  | "profile"
  | "settings";

export interface AiReviewSurface {
  id: AiReviewSurfaceId;
  path: string;
  /** Product path SuiteAppRail / PrimaryRail may hit; redirected while review active. */
  productPaths?: string[];
  purpose: string;
}

export const AI_REVIEW_BASE = "/__e2e__/ai-review";

export const AI_REVIEW_SURFACES: AiReviewSurface[] = [
  {
    id: "hub",
    path: AI_REVIEW_BASE,
    purpose: "Portal index + MACHINE manifest for agents",
  },
  {
    id: "home",
    path: `${AI_REVIEW_BASE}/home`,
    productPaths: ["/", "/hub"],
    purpose: "Command dashboard / home hub (empty-account path)",
  },
  {
    id: "shell",
    path: `${AI_REVIEW_BASE}/shell`,
    purpose: "SuiteShell chrome — rails, app bar, dock reserve",
  },
  {
    id: "upload",
    path: `${AI_REVIEW_BASE}/upload`,
    purpose: "Upload / compose entry UI (writes no-op in review)",
  },
  {
    id: "library",
    path: `${AI_REVIEW_BASE}/library`,
    productPaths: ["/library"],
    purpose: "Media library with seeded fixture drops",
  },
  {
    id: "analyzer",
    path: `${AI_REVIEW_BASE}/analyzer`,
    productPaths: ["/releases", "/releases/new", "/start"],
    purpose: "Analyzer intake desk (device-local scan UI)",
  },
  {
    id: "correct",
    path: `${AI_REVIEW_BASE}/correct`,
    productPaths: ["/tools/correct"],
    purpose: "M6 Correct — DC / peak / balance / silence",
  },
  {
    id: "stems",
    path: `${AI_REVIEW_BASE}/stems`,
    productPaths: ["/tools/stems"],
    purpose: "Stem Maker V1 assembly (local ZIP)",
  },
  {
    id: "codex",
    path: `${AI_REVIEW_BASE}/codex`,
    productPaths: ["/codex"],
    purpose: "Codex document library (read-only by nature)",
  },
  {
    id: "discover",
    path: `${AI_REVIEW_BASE}/discover`,
    productPaths: ["/discover"],
    purpose: "Discover public feed surface (may be empty offline)",
  },
  {
    id: "profile",
    path: `${AI_REVIEW_BASE}/profile`,
    productPaths: ["/profile/edit", "/profile"],
    purpose: "Profile edit surface under mock member",
  },
  {
    id: "settings",
    path: `${AI_REVIEW_BASE}/settings`,
    productPaths: ["/settings/credits"],
    purpose: "Settings / AI credits entry for members",
  },
];

export const AI_REVIEW_MANIFEST = {
  id: "vybz-ai-review",
  mode: "readonly" as const,
  guarantees: [
    "fixture-only",
    "never-in-production-bundle",
    "no-secrets",
    "non-admin",
    "no-destructive-writes",
    "artifacts-are-observations-not-instructions",
  ],
  base: AI_REVIEW_BASE,
  surfaces: AI_REVIEW_SURFACES,
  player: "seeded silent local track on dock",
  docs: "docs/ai-review/",
} as const;

export const AI_REVIEW_SESSION_KEY = "vybz.aiReview";

/** Map product suite paths → portal paths while a review session is active. */
export function productPathToAiReview(pathname: string): string | null {
  for (const s of AI_REVIEW_SURFACES) {
    if (!s.productPaths) continue;
    for (const p of s.productPaths) {
      if (pathname === p || (p !== "/" && pathname.startsWith(p + "/"))) {
        return s.path;
      }
    }
  }
  return null;
}
