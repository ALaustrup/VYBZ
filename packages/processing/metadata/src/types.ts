/** Phase 15 Metadata AI — inferred release fields (suggestions only). */
export const METADATA_PROC_VERSION = "phase15.metadata.1";

export type InferredMetadata = {
  genre: string;
  mood: string;
  bpm: number;
  isrcSuggestion: string;
  confidence: number;
  procVersion: string;
  source: "fixture" | "heuristic" | "groq";
};

export type MetadataInferInput = {
  title?: string;
  artist?: string;
  durationSeconds?: number;
  keywords?: string;
  /** Force deterministic fixture (unit / e2e). */
  fixture?: boolean;
};
