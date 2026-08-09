import type { PerceptionModule } from "../../registry";
import type { ModuleCollectResult } from "../../types";

/**
 * Image perception — interface stub only (Phase 2).
 * Zero collectors; no invented observations.
 */
export interface ImagePerceptionContext {
  /** Reserved: image asset ref — not used yet */
  mediaRef?: string;
}

export function createImagePerceptionModuleStub(): PerceptionModule {
  return {
    id: "image-stub",
    mediaKind: "image",
    collect: (): ModuleCollectResult => ({
      observations: [],
      edges: [],
    }),
  };
}
