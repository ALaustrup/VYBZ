import type { PerceptionModule } from "../../registry";
import type { ModuleCollectResult } from "../../types";

/**
 * Audio perception — interface stub only (Phase 2).
 * Zero collectors; no invented observations.
 */
export interface AudioPerceptionContext {
  /** Reserved: decode handle / buffer id — not used yet */
  mediaRef?: string;
}

export function createAudioPerceptionModuleStub(): PerceptionModule {
  return {
    id: "audio-stub",
    mediaKind: "audio",
    collect: (): ModuleCollectResult => ({
      observations: [],
      edges: [],
    }),
  };
}
