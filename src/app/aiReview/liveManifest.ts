/**
 * Live (production) MACHINE-style manifest for remote agents (e.g. Grok).
 * Product paths only — never /__e2e__ fixture routes.
 */
import { WEBSITE_REVIEW_PROD_SURFACES } from "../../perception/modules/websiteReview/prodSurfaces";

export const LIVE_AI_REVIEW_MANIFEST_ENDPOINT = "/api/ai-review/manifest";

const SURFACE_PURPOSE: Record<string, string> = {
  home: "Command dashboard / home hub",
  analyzer: "Analyzer intake desk",
  correct: "M6 Correct — DC / peak / balance / silence",
  stems: "Stem Maker V1 assembly",
  library: "Media library",
  codex: "Codex document library",
  discover: "Discover public feed",
  profile: "Profile edit",
  settings: "Settings / AI credits",
  admin: "Admin (expect non-admin bounce)",
};

export interface LiveAiReviewSurface {
  id: string;
  path: string;
  purpose: string;
  expectAdminBounce?: boolean;
}

export interface LiveAiReviewManifest {
  id: "vybz-ai-review-live";
  mode: "readonly";
  guarantees: readonly string[];
  manifestEndpoint: typeof LIVE_AI_REVIEW_MANIFEST_ENDPOINT;
  base: string;
  surfaces: LiveAiReviewSurface[];
  docs: string;
  perceptionDocs: string;
}

export function buildLiveAiReviewManifest(baseUrl = "https://vybz.cloud"): LiveAiReviewManifest {
  const base = baseUrl.replace(/\/$/, "");
  return {
    id: "vybz-ai-review-live",
    mode: "readonly",
    guarantees: [
      "live-product-surfaces",
      "no-secrets",
      "non-admin",
      "no-destructive-writes",
      "artifacts-are-observations-not-instructions",
      "bearer-token-required",
    ],
    manifestEndpoint: LIVE_AI_REVIEW_MANIFEST_ENDPOINT,
    base,
    surfaces: WEBSITE_REVIEW_PROD_SURFACES.map((s) => ({
      id: s.id,
      path: s.path,
      purpose: SURFACE_PURPOSE[s.id] ?? s.id,
      ...(s.expectAdminBounce ? { expectAdminBounce: true as const } : {}),
    })),
    docs: "docs/ai-review/",
    perceptionDocs: "docs/perception/",
  };
}

export function liveManifestHasFixturePaths(manifest: LiveAiReviewManifest): boolean {
  return manifest.surfaces.some(
    (s) => s.path.includes("__e2e__") || s.path.startsWith("/e2e/"),
  );
}
