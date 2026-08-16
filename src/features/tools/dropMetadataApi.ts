/**
 * Release metadata for a library track.
 *
 * Sixteen fields, two homes. Title, artist and album are the library's own
 * columns on `drops` and are written there, because a track has one title and
 * duplicating it into a second table would create a second answer. The other
 * thirteen live in `drop_metadata`.
 *
 * Nothing here invents a value: an empty field is saved as empty.
 */
import { supabase } from "@/lib/supabase";
import * as api from "@/lib/api";
import { emptyMetadataDraft, type MetadataDraft } from "@/features/tools/metadataDraft";

/** The thirteen fields that live in `drop_metadata`. */
const EXTRA_FIELDS = [
  "trackNumber", "year", "genre", "isrc", "upc", "catalogNumber", "copyright",
  "publisher", "songwriter", "producer", "mixer", "masteringEngineer", "language",
] as const;

type ExtraField = (typeof EXTRA_FIELDS)[number];

const COLUMN_OF: Record<ExtraField, string> = {
  trackNumber: "track_number",
  year: "year",
  genre: "genre",
  isrc: "isrc",
  upc: "upc",
  catalogNumber: "catalog_number",
  copyright: "copyright",
  publisher: "publisher",
  songwriter: "songwriter",
  producer: "producer",
  mixer: "mixer",
  masteringEngineer: "mastering_engineer",
  language: "language",
};

/** Fields the library owns directly, so the editor writes them to `drops`. */
export const LIBRARY_OWNED_FIELDS = ["title", "artist", "album"] as const;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/**
 * Load one track's saved metadata. Missing rows are not an error — a track that
 * has never been edited simply has empty fields.
 */
export async function loadDropMetadata(dropId: string): Promise<Partial<MetadataDraft>> {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from("drop_metadata")
    .select(Object.values(COLUMN_OF).join(","))
    .eq("drop_id", dropId)
    .maybeSingle();
  if (error || !data) return {};
  const row = data as unknown as Record<string, unknown>;
  const out: Partial<MetadataDraft> = {};
  for (const field of EXTRA_FIELDS) {
    out[field] = str(row[COLUMN_OF[field]]);
  }
  return out;
}

/** Load several tracks at once, so opening an album is one round trip. */
export async function loadDropMetadataMany(
  dropIds: string[],
): Promise<Map<string, Partial<MetadataDraft>>> {
  const byId = new Map<string, Partial<MetadataDraft>>();
  if (!supabase || !dropIds.length) return byId;
  const { data, error } = await supabase
    .from("drop_metadata")
    .select(["drop_id", ...Object.values(COLUMN_OF)].join(","))
    .in("drop_id", dropIds);
  if (error || !data) return byId;
  for (const raw of data as unknown as Record<string, unknown>[]) {
    const id = str(raw.drop_id);
    if (!id) continue;
    const out: Partial<MetadataDraft> = {};
    for (const field of EXTRA_FIELDS) out[field] = str(raw[COLUMN_OF[field]]);
    byId.set(id, out);
  }
  return byId;
}

export interface SaveMetadataResult {
  ok: boolean;
  /** Which of the two writes failed, when one did. */
  failed?: "library" | "metadata";
}

/**
 * Persist one track. The library columns and the metadata row are two writes
 * because they are two tables; a failure in either is reported rather than
 * swallowed, so the editor never claims a save it did not make.
 */
export async function saveDropMetadata(
  dropId: string,
  draft: MetadataDraft,
): Promise<SaveMetadataResult> {
  if (!supabase) return { ok: false, failed: "library" };

  const library = await Promise.all([
    api.updateDropTitle(dropId, draft.title),
    api.updateDropCreditedArtist(dropId, draft.artist.trim() || null),
    supabase.rpc("update_drop_album", { p_drop: dropId, p_album: draft.album }),
  ]);
  const albumError = (library[2] as { error?: unknown } | null)?.error;
  if (!library[0] || !library[1] || albumError) return { ok: false, failed: "library" };

  const { error } = await supabase.rpc("save_drop_metadata", {
    p_drop: dropId,
    p_track_number: draft.trackNumber,
    p_year: draft.year,
    p_genre: draft.genre,
    p_isrc: draft.isrc,
    p_upc: draft.upc,
    p_catalog_number: draft.catalogNumber,
    p_copyright: draft.copyright,
    p_publisher: draft.publisher,
    p_songwriter: draft.songwriter,
    p_producer: draft.producer,
    p_mixer: draft.mixer,
    p_mastering_engineer: draft.masteringEngineer,
    p_language: draft.language,
  });
  if (error) return { ok: false, failed: "metadata" };
  return { ok: true };
}

/** Build a draft from a library track plus whatever metadata it has saved. */
export function draftFromDrop(
  drop: { title: string | null; creditedArtist?: string | null; album?: string | null },
  saved: Partial<MetadataDraft> | undefined,
): MetadataDraft {
  return {
    ...emptyMetadataDraft(),
    ...(saved ?? {}),
    title: drop.title ?? "",
    artist: drop.creditedArtist ?? "",
    album: drop.album ?? "",
  };
}
