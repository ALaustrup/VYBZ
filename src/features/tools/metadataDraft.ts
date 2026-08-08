/**
 * Versioned Metadata Editor draft JSON — handoff without cloud write-back.
 */

export const METADATA_DRAFT_FORMAT = "vybz.metadata.draft.v1" as const;

export type MetadataDraft = {
  title: string;
  artist: string;
  album: string;
  trackNumber: string;
  year: string;
  genre: string;
  isrc: string;
  upc: string;
  catalogNumber: string;
  copyright: string;
  publisher: string;
  songwriter: string;
  producer: string;
  mixer: string;
  masteringEngineer: string;
  language: string;
  sourceFileName?: string;
};

export function emptyMetadataDraft(): MetadataDraft {
  return {
    title: "",
    artist: "",
    album: "",
    trackNumber: "",
    year: "",
    genre: "",
    isrc: "",
    upc: "",
    catalogNumber: "",
    copyright: "",
    publisher: "",
    songwriter: "",
    producer: "",
    mixer: "",
    masteringEngineer: "",
    language: "",
  };
}

export type MetadataDraftEnvelope = {
  format: typeof METADATA_DRAFT_FORMAT;
  draft: MetadataDraft;
};

export function serializeMetadataDraft(draft: MetadataDraft): string {
  const envelope: MetadataDraftEnvelope = {
    format: METADATA_DRAFT_FORMAT,
    draft,
  };
  return JSON.stringify(envelope, null, 2);
}

export function parseMetadataDraftJson(raw: string): MetadataDraft {
  const parsed = JSON.parse(raw) as Partial<MetadataDraftEnvelope>;
  if (parsed?.format !== METADATA_DRAFT_FORMAT || !parsed.draft || typeof parsed.draft !== "object") {
    throw new Error("Invalid VYBZ metadata draft JSON");
  }
  return { ...emptyMetadataDraft(), ...parsed.draft };
}
