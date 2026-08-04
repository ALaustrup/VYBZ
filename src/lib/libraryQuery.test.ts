import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  availableFacets,
  filterDrops,
  groupDrops,
  queryLibrary,
  sortDrops,
  type LibraryFilters,
} from "@/lib/libraryQuery";
import type { Drop } from "@/types";

const NOW = Date.UTC(2026, 7, 4);
const DAY = 24 * 60 * 60 * 1000;

function d(over: Partial<Drop> & { id: string }): Drop {
  return {
    authorId: "u1",
    authorUsername: "ada",
    title: "Track",
    body: null,
    seed: 1,
    feels: 0,
    wilds: 0,
    createdAt: NOW,
    ...over,
  };
}

const CATALOG: Drop[] = [
  d({ id: "a", title: "Neon Rain", album: "Night Drive", audioFormat: "wav", sampleRate: 44100, lossless: true, durationSec: 200, plays: 50, feels: 9, rating: 4.5, ratingCount: 8, assetId: "as-a", releaseType: "original", license: "free", assetKind: "track", createdAt: NOW - 2 * DAY }),
  d({ id: "b", title: "Dust", album: "Night Drive", audioFormat: "mp3", sampleRate: 44100, durationSec: 45, plays: 5, feels: 1, createdAt: NOW - 20 * DAY }),
  d({ id: "c", title: "Aurora", audioFormat: "flac", sampleRate: 96000, lossless: true, durationSec: 400, plays: 120, feels: 3, assetId: "as-c", createdAt: NOW - 100 * DAY, playbackCustomization: { backdropUrl: "https://x/y.mp4" } as Drop["playbackCustomization"] }),
  d({ id: "e", title: "Untitled sketch", durationSec: undefined, sampleRate: null, createdAt: NOW - 400 * DAY }),
];

function f(over: Partial<LibraryFilters> = {}): LibraryFilters {
  return { ...EMPTY_FILTERS, ...over };
}

function ids(list: Drop[]): string[] {
  return list.map((x) => x.id);
}

describe("filterDrops", () => {
  it("returns everything with empty filters", () => {
    expect(filterDrops(CATALOG, f(), NOW)).toHaveLength(4);
  });

  it("searches across title, album and artist", () => {
    expect(ids(filterDrops(CATALOG, f({ q: "neon" }), NOW))).toEqual(["a"]);
    expect(ids(filterDrops(CATALOG, f({ q: "night drive" }), NOW)).sort()).toEqual(["a", "b"]);
    expect(ids(filterDrops(CATALOG, f({ q: "ada" }), NOW))).toHaveLength(4);
  });

  it("search is case-insensitive and trims", () => {
    expect(ids(filterDrops(CATALOG, f({ q: "  AURORA " }), NOW))).toEqual(["c"]);
  });

  it("filters by format and lossless", () => {
    expect(ids(filterDrops(CATALOG, f({ format: "mp3" }), NOW))).toEqual(["b"]);
    expect(ids(filterDrops(CATALOG, f({ losslessOnly: true }), NOW)).sort()).toEqual(["a", "c"]);
  });

  it("buckets sample rate and separates unknown from any", () => {
    expect(ids(filterDrops(CATALOG, f({ sampleRate: "44100" }), NOW)).sort()).toEqual(["a", "b"]);
    expect(ids(filterDrops(CATALOG, f({ sampleRate: "gt-48000" }), NOW))).toEqual(["c"]);
    expect(ids(filterDrops(CATALOG, f({ sampleRate: "unknown" }), NOW))).toEqual(["e"]);
  });

  it("buckets duration and excludes tracks with no duration", () => {
    expect(ids(filterDrops(CATALOG, f({ duration: "under-1m" }), NOW))).toEqual(["b"]);
    expect(ids(filterDrops(CATALOG, f({ duration: "3-6m" }), NOW))).toEqual(["a"]);
    expect(ids(filterDrops(CATALOG, f({ duration: "over-6m" }), NOW))).toEqual(["c"]);
    // Unknown duration must not silently land in a bucket.
    expect(ids(filterDrops(CATALOG, f({ duration: "1-3m" }), NOW))).not.toContain("e");
  });

  it("filters by upload window", () => {
    expect(ids(filterDrops(CATALOG, f({ uploaded: "7d" }), NOW))).toEqual(["a"]);
    expect(ids(filterDrops(CATALOG, f({ uploaded: "30d" }), NOW)).sort()).toEqual(["a", "b"]);
    expect(ids(filterDrops(CATALOG, f({ uploaded: "365d" }), NOW)).sort()).toEqual(["a", "b", "c"]);
  });

  it("filters by asset and stage presence", () => {
    expect(ids(filterDrops(CATALOG, f({ withAssetOnly: true }), NOW)).sort()).toEqual(["a", "c"]);
    expect(ids(filterDrops(CATALOG, f({ withStageOnly: true }), NOW))).toEqual(["c"]);
  });

  it("combines filters conjunctively", () => {
    const got = filterDrops(CATALOG, f({ losslessOnly: true, duration: "over-6m" }), NOW);
    expect(ids(got)).toEqual(["c"]);
  });
});

describe("activeFilterCount", () => {
  it("is zero for empty filters and counts each narrowing filter once", () => {
    expect(activeFilterCount(f())).toBe(0);
    expect(activeFilterCount(f({ q: "x" }))).toBe(1);
    expect(activeFilterCount(f({ q: "  " }))).toBe(0);
    expect(activeFilterCount(f({ q: "x", losslessOnly: true, format: "wav" }))).toBe(3);
  });
});

describe("sortDrops", () => {
  it("sorts newest and oldest", () => {
    expect(ids(sortDrops(CATALOG, "newest"))).toEqual(["a", "b", "c", "e"]);
    expect(ids(sortDrops(CATALOG, "oldest"))).toEqual(["e", "c", "b", "a"]);
  });

  it("sorts by title in both directions", () => {
    expect(ids(sortDrops(CATALOG, "title-asc"))).toEqual(["c", "b", "a", "e"]);
    expect(ids(sortDrops(CATALOG, "title-desc"))).toEqual(["e", "a", "b", "c"]);
  });

  it("sorts by duration, treating missing as zero", () => {
    expect(ids(sortDrops(CATALOG, "longest"))).toEqual(["c", "a", "b", "e"]);
    expect(ids(sortDrops(CATALOG, "shortest"))[0]).toBe("e");
  });

  it("sorts by engagement", () => {
    expect(ids(sortDrops(CATALOG, "most-played"))[0]).toBe("c");
    expect(ids(sortDrops(CATALOG, "highest-rated"))[0]).toBe("a");
    expect(ids(sortDrops(CATALOG, "most-vybs"))[0]).toBe("a");
  });

  it("does not mutate the input array", () => {
    const before = ids(CATALOG);
    sortDrops(CATALOG, "title-asc");
    expect(ids(CATALOG)).toEqual(before);
  });

  it("is stable across repeated calls", () => {
    expect(ids(sortDrops(CATALOG, "most-played"))).toEqual(ids(sortDrops(CATALOG, "most-played")));
  });
});

describe("groupDrops", () => {
  it("returns a single group when grouping is off", () => {
    const groups = groupDrops(CATALOG, "none");
    expect(groups).toHaveLength(1);
    expect(groups[0]!.drops).toHaveLength(4);
  });

  it("groups by album and labels missing albums as Singles", () => {
    const groups = groupDrops(CATALOG, "album");
    const night = groups.find((g) => g.label === "Night Drive");
    expect(night?.drops.map((x) => x.id).sort()).toEqual(["a", "b"]);
    expect(groups.find((g) => g.label === "Singles")?.drops).toHaveLength(2);
  });

  it("groups by format and labels unknown honestly", () => {
    const groups = groupDrops(CATALOG, "format");
    expect(groups.find((g) => g.label === "Unknown format")?.drops.map((x) => x.id)).toEqual(["e"]);
    expect(groups.find((g) => g.label === "WAV")?.drops.map((x) => x.id)).toEqual(["a"]);
  });

  it("orders groups by size then label", () => {
    const groups = groupDrops(CATALOG, "album");
    expect(groups[0]!.drops.length).toBeGreaterThanOrEqual(groups[1]!.drops.length);
  });

  it("loses no drops when grouping", () => {
    for (const g of ["album", "release-type", "format"] as const) {
      const total = groupDrops(CATALOG, g).reduce((n, x) => n + x.drops.length, 0);
      expect(total).toBe(CATALOG.length);
    }
  });
});

describe("availableFacets", () => {
  it("offers only values the catalog contains", () => {
    const facets = availableFacets(CATALOG);
    expect(facets.formats).toEqual(["flac", "mp3", "wav"]);
    expect(facets.licenses).toEqual(["free"]);
    expect(facets.releaseTypes).toEqual(["original"]);
  });

  it("returns empty lists for an empty catalog rather than inventing options", () => {
    const facets = availableFacets([]);
    expect(facets.formats).toEqual([]);
    expect(facets.kinds).toEqual([]);
  });
});

describe("queryLibrary", () => {
  it("reports total against matched so the UI can show 'n of m'", () => {
    const res = queryLibrary(CATALOG, f({ losslessOnly: true }), "newest", "none", NOW);
    expect(res.total).toBe(4);
    expect(res.matched).toHaveLength(2);
  });

  it("applies filter before sort before group", () => {
    const res = queryLibrary(CATALOG, f({ q: "night drive" }), "title-asc", "album", NOW);
    expect(res.groups).toHaveLength(1);
    expect(res.groups[0]!.drops.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("yields an empty match set without throwing", () => {
    const res = queryLibrary(CATALOG, f({ q: "no-such-track" }), "newest", "album", NOW);
    expect(res.matched).toEqual([]);
    expect(res.groups).toEqual([]);
  });
});
