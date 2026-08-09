/**
 * VYBZ Perception Engine — product IP.
 * ModelProvider is a pluggable implementation detail.
 */

export type {
  Confidence,
  Evidence,
  Lifecycle,
  MediaKind,
  ModuleCollectResult,
  Observation,
  ObservationDraft,
  Origin,
  PerceptionEdge,
  PerceptionEdgeDraft,
  PerceptionEntity,
  PerceptionRelation,
  Severity,
  SourceType,
} from "./types";

export type { PerceptionContext } from "./context";
export { assertPerceptionContext, contextKey } from "./context";

export { isObservationId, mintEdgeId, mintObservationId, normalizeSegment } from "./ids";

export type { CatalogEntry, CatalogMergeResult, ObservationCatalog } from "./catalog";
export { mergeCatalog } from "./catalog";

export type { PerceptionGraph } from "./graph";
export { emptyGraph, edgesFromTo, mergeGraphs, normalizeEdge } from "./graph";

export type { PerceptionModule } from "./registry";
export { createDefaultRegistry, PerceptionRegistry } from "./registry";

export type {
  ModelProvider,
  PerceptionBundle,
  ReasoningResult,
  ReasoningTier,
} from "./modelProvider";
export { NoopModelProvider } from "./modelProvider";

export type { RunPerceptionInput, RunPerceptionResult } from "./pipeline";
export { runPerception } from "./pipeline";

export {
  createWebsiteReviewModule,
  REQUIRED_PROD_SURFACE_IDS,
  WEBSITE_REVIEW_PROD_SURFACES,
} from "./modules/websiteReview";
export type { ProdSurface } from "./modules/websiteReview/prodSurfaces";

export {
  createAudioPerceptionModuleStub,
  type AudioPerceptionContext,
} from "./modules/audio";
export {
  createImagePerceptionModuleStub,
  type ImagePerceptionContext,
} from "./modules/image";
