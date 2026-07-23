/**
 * Client-side audio tag reader (ID3 / Vorbis / MP4 atoms via music-metadata).
 * Prefills Compose / Bulk upload fields — never blocks posting on parse failure.
 */

import { parseBlob } from "music-metadata";
import { GENRES } from "@/lib/profileFields";

export interface Id3Tags {
  title: string | null;
  artist: string | null;
  album: string | null;
  genre: string | null;
  /** Matched to VYBZ GENRES catalog when possible. */
  genreMatched: string | null;
  bpm: number | null;
  year: number | null;
  /** Object URL for embedded cover art; caller must revoke. */
  artworkUrl: string | null;
}

function firstString(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (Array.isArray(v)) {
    for (const x of v) {
      if (typeof x === "string" && x.trim()) return x.trim();
    }
  }
  return null;
}

function matchGenre(raw: string | null): string | null {
  if (!raw) return null;
  const n = raw.toLowerCase().replace(/[^a-z0-9&]+/g, " ").trim();
  if (!n) return null;
  const exact = GENRES.find((g) => g.toLowerCase() === n);
  if (exact) return exact;
  return GENRES.find((g) => n.includes(g.toLowerCase()) || g.toLowerCase().includes(n)) ?? null;
}

function parseYear(v: unknown): number | null {
  if (typeof v === "number" && v >= 1900 && v <= 2100) return Math.floor(v);
  const s = firstString(v);
  if (!s) return null;
  const m = s.match(/(19|20)\d{2}/);
  if (!m) return null;
  const y = Number(m[0]);
  return y >= 1900 && y <= 2100 ? y : null;
}

function parseBpm(v: unknown): number | null {
  if (typeof v === "number" && v >= 40 && v <= 300) return Math.round(v);
  const s = firstString(v);
  if (!s) return null;
  const n = Number(s.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n) || n < 40 || n > 300) return null;
  return Math.round(n);
}

/** Title from filename when tags are missing (strip extension + track numbers). */
export function titleFromFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").trim();
  return base.replace(/^\d{1,3}[\s.\-_]+/, "").trim() || base || "Untitled";
}

/** Best-effort tag parse. Returns empty-ish result on failure. */
export async function readId3Tags(file: File): Promise<Id3Tags> {
  const empty: Id3Tags = {
    title: null, artist: null, album: null, genre: null, genreMatched: null,
    bpm: null, year: null, artworkUrl: null,
  };
  try {
    const meta = await parseBlob(file, { duration: false, skipCovers: false });
    const c = meta.common;
    const genreRaw = firstString(c.genre);
    let artworkUrl: string | null = null;
    const pic = c.picture?.[0];
    if (pic?.data?.length) {
      const mime = pic.format || "image/jpeg";
      const bytes = pic.data instanceof Uint8Array ? pic.data : new Uint8Array(pic.data as ArrayBuffer);
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      artworkUrl = URL.createObjectURL(new Blob([copy], { type: mime }));
    }
    return {
      title: firstString(c.title),
      artist: firstString(c.artist) ?? firstString(c.albumartist),
      album: firstString(c.album),
      genre: genreRaw,
      genreMatched: matchGenre(genreRaw),
      bpm: parseBpm(c.bpm),
      year: parseYear(c.year ?? c.date),
      artworkUrl,
    };
  } catch {
    return empty;
  }
}
