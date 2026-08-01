/**
 * Metadata suggestions.
 *
 * Nothing in this module is a measurement. Genre and mood are subjective descriptors
 * guessed from the title and artist text. Tempo, key and ISRC are deliberately absent:
 * tempo and key require detection from the audio signal, and an ISRC must be issued by a
 * registrant — neither can be suggested honestly.
 */
export const METADATA_PROC_VERSION = "metadata.2";

/**
 * `ai-guess` — a language model's guess from text, never from audio.
 * `unavailable` — nothing could be suggested; the caller must show "Not measured".
 * `fixture` — deterministic test data; never reaches a real user.
 */
export type MetadataSource = "fixture" | "ai-guess" | "unavailable";

export type InferredMetadata = {
  genre: string | null;
  mood: string | null;
  procVersion: string;
  source: MetadataSource;
};

export type MetadataInferInput = {
  title?: string;
  artist?: string;
  durationSeconds?: number;
  keywords?: string;
  /** Force deterministic fixture (unit / e2e). */
  fixture?: boolean;
};
