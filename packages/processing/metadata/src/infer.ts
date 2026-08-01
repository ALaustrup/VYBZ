import {
  METADATA_PROC_VERSION,
  type InferredMetadata,
  type MetadataInferInput,
} from "./types";

/** Deterministic fixture for unit and e2e runs. Never returned to a real user. */
export const METADATA_FIXTURE: InferredMetadata = {
  genre: "Electronic",
  mood: "Upbeat",
  procVersion: METADATA_PROC_VERSION,
  source: "fixture",
};

/**
 * Offline there is no way to suggest genre or mood, so this reports nothing rather than
 * inventing something. Suggestions require the `ai-metadata` function.
 */
export function inferMetadataLocal(input: MetadataInferInput = {}): InferredMetadata {
  if (input.fixture) return { ...METADATA_FIXTURE };
  return {
    genre: null,
    mood: null,
    procVersion: METADATA_PROC_VERSION,
    source: "unavailable",
  };
}
