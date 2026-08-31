import type { Drop } from "@/types";
import { classifyDrop, type WorkKind } from "@/features/profile/workKind";

/**
 * Filter, sort and group model for the media library.
 *
 * Every option here reads a field that a `Drop` actually carries. Facets the catalog
 * does not store — genre, mood, tags, file size, modified date, processing state,
 * storefront status, sales — are deliberately absent rather than shown and broken.
 */

export type LibraryView = "grid" | "list" | "table" | "shelves";

export type LibrarySort =
  | "newest"
  | "oldest"
  | "title-asc"
  | "title-desc"
  | "longest"
  | "shortest"
  | "most-played"
  | "highest-rated"
  | "most-vybs";

export type LibraryGroup = "none" | "album" | "release-type" | "format";

export type DurationBucket = "any" | "under-1m" | "1-3m" | "3-6m" | "over-6m";
export type UploadedBucket = "any" | "7d" | "30d" | "365d";
export type RateBucket = "any" | "lt-44100" | "44100" | "48000" | "gt-48000" | "unknown";

export type LibraryWorkKind = "any" | Extract<WorkKind, "audio" | "image" | "video" | "file">;

export type LibraryFilters = {
  /** Free text across title, album, credited artist and username. */
  q: string;
  format: string | "any";
  losslessOnly: boolean;
  sampleRate: RateBucket;
  assetKind: string | "any";
  releaseType: string | "any";
  license: string | "any";
  duration: DurationBucket;
  uploaded: UploadedBucket;
  /** Only drops that have a stage backdrop attached. */
  withStageOnly: boolean;
  /** Only drops that have a downloadable asset row. */
  withAssetOnly: boolean;
  /** Composed Stage File only. Ignored until the owner has placed work. */
  onStage: "any" | "on" | "off";
  /** Creative Work kind, classified from the stored file — not a second catalog. */
  workKind: LibraryWorkKind;
};

export const EMPTY_FILTERS: LibraryFilters = {
  q: "",
  format: "any",
  losslessOnly: false,
  sampleRate: "any",
  assetKind: "any",
  releaseType: "any",
  license: "any",
  duration: "any",
  uploaded: "any",
  withStageOnly: false,
  withAssetOnly: false,
  onStage: "any",
  workKind: "any",
};

export const SORT_LABEL: Record<LibrarySort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  "title-asc": "Title A–Z",
  "title-desc": "Title Z–A",
  longest: "Longest",
  shortest: "Shortest",
  "most-played": "Most played",
  "highest-rated": "Highest rated",
  "most-vybs": "Most Vybs",
};

export const GROUP_LABEL: Record<LibraryGroup, string> = {
  none: "No grouping",
  album: "Album",
  "release-type": "Release type",
  format: "Format",
};

/** How many filters are narrowing the list — drives the "clear" affordance. */
export function activeFilterCount(f: LibraryFilters): number {
  let n = 0;
  if (f.q.trim()) n++;
  if (f.format !== "any") n++;
  if (f.losslessOnly) n++;
  if (f.sampleRate !== "any") n++;
  if (f.assetKind !== "any") n++;
  if (f.releaseType !== "any") n++;
  if (f.license !== "any") n++;
  if (f.duration !== "any") n++;
  if (f.uploaded !== "any") n++;
  if (f.withStageOnly) n++;
  if (f.withAssetOnly) n++;
  if (f.onStage !== "any") n++;
  if (f.workKind !== "any") n++;
  return n;
}

function haystack(d: Drop): string {
  return [d.title, d.album, d.creditedArtist, d.authorUsername]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesDuration(d: Drop, bucket: DurationBucket): boolean {
  if (bucket === "any") return true;
  const s = d.durationSec;
  if (s === undefined || s === null) return false;
  if (bucket === "under-1m") return s < 60;
  if (bucket === "1-3m") return s >= 60 && s < 180;
  if (bucket === "3-6m") return s >= 180 && s < 360;
  return s >= 360;
}

function matchesRate(d: Drop, bucket: RateBucket): boolean {
  if (bucket === "any") return true;
  const r = d.sampleRate;
  if (bucket === "unknown") return r === undefined || r === null;
  if (r === undefined || r === null) return false;
  if (bucket === "lt-44100") return r < 44100;
  if (bucket === "44100") return r === 44100;
  if (bucket === "48000") return r === 48000;
  return r > 48000;
}

function matchesUploaded(d: Drop, bucket: UploadedBucket, now: number): boolean {
  if (bucket === "any") return true;
  const days = bucket === "7d" ? 7 : bucket === "30d" ? 30 : 365;
  return now - d.createdAt <= days * 24 * 60 * 60 * 1000;
}

export function filterDrops(
  drops: Drop[],
  filters: LibraryFilters,
  now: number = Date.now(),
  onStageIds?: Set<string> | null,
): Drop[] {
  const needle = filters.q.trim().toLowerCase();
  return drops.filter((d) => {
    if (needle && !haystack(d).includes(needle)) return false;
    if (filters.format !== "any" && (d.audioFormat ?? "").toLowerCase() !== filters.format) return false;
    if (filters.losslessOnly && !d.lossless) return false;
    if (!matchesRate(d, filters.sampleRate)) return false;
    if (filters.assetKind !== "any" && (d.assetKind ?? "") !== filters.assetKind) return false;
    if (filters.releaseType !== "any" && (d.releaseType ?? "") !== filters.releaseType) return false;
    if (filters.license !== "any" && (d.license ?? "") !== filters.license) return false;
    if (!matchesDuration(d, filters.duration)) return false;
    if (!matchesUploaded(d, filters.uploaded, now)) return false;
    if (filters.withStageOnly && !d.playbackCustomization?.backdropUrl) return false;
    if (filters.withAssetOnly && !d.assetId) return false;
    if (filters.onStage !== "any" && onStageIds) {
      const on = onStageIds.has(d.id);
      if (filters.onStage === "on" && !on) return false;
      if (filters.onStage === "off" && on) return false;
    }
    if (filters.workKind !== "any" && classifyDrop(d) !== filters.workKind) return false;
    return true;
  });
}

function titleOf(d: Drop): string {
  return (d.title?.trim() || "Untitled").toLowerCase();
}

/** Stable sort — ties fall back to newest so ordering never jitters between renders. */
export function sortDrops(drops: Drop[], sort: LibrarySort): Drop[] {
  const out = [...drops];
  const byNewest = (a: Drop, b: Drop) => b.createdAt - a.createdAt;
  out.sort((a, b) => {
    switch (sort) {
      case "oldest":
        return a.createdAt - b.createdAt || titleOf(a).localeCompare(titleOf(b));
      case "title-asc":
        return titleOf(a).localeCompare(titleOf(b)) || byNewest(a, b);
      case "title-desc":
        return titleOf(b).localeCompare(titleOf(a)) || byNewest(a, b);
      case "longest":
        return (b.durationSec ?? 0) - (a.durationSec ?? 0) || byNewest(a, b);
      case "shortest":
        return (a.durationSec ?? 0) - (b.durationSec ?? 0) || byNewest(a, b);
      case "most-played":
        return (b.plays ?? 0) - (a.plays ?? 0) || byNewest(a, b);
      case "highest-rated":
        return (b.rating ?? 0) - (a.rating ?? 0) || (b.ratingCount ?? 0) - (a.ratingCount ?? 0) || byNewest(a, b);
      case "most-vybs":
        return b.feels - a.feels || byNewest(a, b);
      case "newest":
      default:
        return byNewest(a, b) || titleOf(a).localeCompare(titleOf(b));
    }
  });
  return out;
}

export type DropGroup = { key: string; label: string; drops: Drop[] };

export function groupDrops(drops: Drop[], group: LibraryGroup): DropGroup[] {
  if (group === "none") return [{ key: "all", label: "", drops }];
  const buckets = new Map<string, DropGroup>();
  for (const d of drops) {
    let key: string;
    let label: string;
    if (group === "album") {
      key = (d.album?.trim() || "__single").toLowerCase();
      label = d.album?.trim() || "Singles";
    } else if (group === "release-type") {
      key = d.releaseType ?? "__none";
      label = d.releaseType ? d.releaseType : "Unspecified";
    } else {
      key = (d.audioFormat ?? "__none").toLowerCase();
      label = d.audioFormat ? d.audioFormat.toUpperCase() : "Unknown format";
    }
    const existing = buckets.get(key);
    if (existing) existing.drops.push(d);
    else buckets.set(key, { key, label, drops: [d] });
  }
  // Largest groups first, then alphabetical so ordering is deterministic.
  return [...buckets.values()].sort(
    (a, b) => b.drops.length - a.drops.length || a.label.localeCompare(b.label)
  );
}

/** Facet values present in the current catalog, so we never offer an empty filter. */
export function availableFacets(drops: Drop[]) {
  const formats = new Set<string>();
  const kinds = new Set<string>();
  const releaseTypes = new Set<string>();
  const licenses = new Set<string>();
  for (const d of drops) {
    if (d.audioFormat) formats.add(d.audioFormat.toLowerCase());
    if (d.assetKind) kinds.add(d.assetKind);
    if (d.releaseType) releaseTypes.add(d.releaseType);
    if (d.license) licenses.add(d.license);
  }
  const sorted = (s: Set<string>) => [...s].sort((a, b) => a.localeCompare(b));
  return {
    formats: sorted(formats),
    kinds: sorted(kinds),
    releaseTypes: sorted(releaseTypes),
    licenses: sorted(licenses),
  };
}

/** One pass: filter, sort, group. */
export function queryLibrary(
  drops: Drop[],
  filters: LibraryFilters,
  sort: LibrarySort,
  group: LibraryGroup,
  now?: number,
  onStageIds?: Set<string> | null,
): { total: number; matched: Drop[]; groups: DropGroup[] } {
  const matched = sortDrops(filterDrops(drops, filters, now, onStageIds), sort);
  return { total: drops.length, matched, groups: groupDrops(matched, group) };
}
