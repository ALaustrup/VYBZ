import { mintObservationId } from "../../ids";
import type { PerceptionModule } from "../../registry";
import type { ModuleCollectResult, ObservationDraft, Origin } from "../../types";
import { WEBSITE_REVIEW_PROD_SURFACES } from "./prodSurfaces";

const ORIGIN: Origin = {
  detector: "web.surface-map",
  version: "1.0.0",
  sourceType: "web",
};

/**
 * Website-review module — first PerceptionModule.
 * Structural surface observations only (no Playwright here).
 * The prod walker enriches evidence at runtime.
 */
export function createWebsiteReviewModule(): PerceptionModule {
  return {
    id: "website-review",
    mediaKind: "web",
    collect: (): ModuleCollectResult => {
      const observations: ObservationDraft[] = WEBSITE_REVIEW_PROD_SURFACES.map(
        (s) => ({
          id: mintObservationId({ surface: s.id, slug: "surface-reachable" }),
          surface: s.id,
          category: "chrome",
          severity: "info" as const,
          confidence: "medium" as const,
          evidence: { url: s.path, note: "Declared prod surface for live review" },
          summary: `Prod surface ${s.id} mapped to ${s.path}`,
          origin: ORIGIN,
        }),
      );

      const edges = WEBSITE_REVIEW_PROD_SURFACES.filter((s) => s.id !== "home").map(
        (s) => ({
          from: mintObservationId({ surface: "home", slug: "surface-reachable" }),
          to: mintObservationId({ surface: s.id, slug: "surface-reachable" }),
          relation: "relates_to" as const,
          confidence: "low" as const,
          origin: ORIGIN,
        }),
      );

      return { observations, edges };
    },
  };
}

export { WEBSITE_REVIEW_PROD_SURFACES, REQUIRED_PROD_SURFACE_IDS } from "./prodSurfaces";
