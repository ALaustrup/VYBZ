import {
  METADATA_PROC_VERSION,
  type InferredMetadata,
  type MetadataInferInput,
} from "./types";

/** Stable fixture used by snapshot tests + e2e (no network). */
export const METADATA_FIXTURE: InferredMetadata = {
  genre: "Electronic",
  mood: "Upbeat",
  bpm: 122,
  isrcSuggestion: "QZVYZ2500001",
  confidence: 0.82,
  procVersion: METADATA_PROC_VERSION,
  source: "fixture",
};

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const GENRES = ["Electronic", "Hip-Hop", "Pop", "Indie", "R&B", "Rock", "Ambient"] as const;
const MOODS = ["Upbeat", "Melancholic", "Dark", "Dreamy", "Aggressive", "Chill"] as const;

/**
 * Local heuristic infer (no API). Used offline + as Edge fallback when Groq missing.
 */
export function inferMetadataLocal(input: MetadataInferInput = {}): InferredMetadata {
  if (input.fixture) return { ...METADATA_FIXTURE };

  const seed = hashSeed(
    `${input.title ?? ""}|${input.artist ?? ""}|${input.keywords ?? ""}|${input.durationSeconds ?? 0}`
  );
  const genre = GENRES[seed % GENRES.length]!;
  const mood = MOODS[(seed >>> 8) % MOODS.length]!;
  const bpm = 70 + (seed % 90);
  const isrcSuggestion = `QZVYZ${String(2500000 + (seed % 100000)).padStart(7, "0")}`;
  return {
    genre,
    mood,
    bpm,
    isrcSuggestion,
    confidence: 0.55 + ((seed >>> 16) % 30) / 100,
    procVersion: METADATA_PROC_VERSION,
    source: "heuristic",
  };
}
