import { describe, expect, it } from "vitest";
import {
  filterMarketPacks,
  genresFromPacks,
  packHasPreview,
} from "@/features/storefront/marketBrowse";
import type { StorefrontPackPublic } from "@/features/storefront/types";

function pack(over: Partial<StorefrontPackPublic>): StorefrontPackPublic {
  return {
    id: over.id ?? "1",
    user_id: "u",
    title: over.title ?? "Pack",
    slug: over.slug ?? "pack",
    description: over.description ?? "",
    features: [],
    genre: over.genre ?? "",
    price_cents: 999,
    currency: "usd",
    preview_path: over.preview_path ?? null,
    cover_path: null,
    created_at: "",
    updated_at: "",
  };
}

describe("marketBrowse (OR-039)", () => {
  it("derives genres and filters without inventing rows", () => {
    const list = [
      pack({ id: "a", title: "Dark Trap Kit", genre: "Trap", slug: "a" }),
      pack({ id: "b", title: "Lo-Fi Keys", genre: "Lo-Fi", slug: "b" }),
    ];
    expect(genresFromPacks(list)).toEqual(["Lo-Fi", "Trap"]);
    expect(filterMarketPacks(list, { genre: "Trap" }).map((p) => p.id)).toEqual(["a"]);
    expect(filterMarketPacks(list, { query: "keys" }).map((p) => p.id)).toEqual(["b"]);
    expect(filterMarketPacks(list, { query: "zzz" })).toEqual([]);
  });

  it("detects preview availability honestly", () => {
    expect(packHasPreview(pack({ preview_path: "u/previews/x.mp3" }))).toBe(true);
    expect(packHasPreview(pack({ preview_path: null }))).toBe(false);
    expect(packHasPreview(pack({ preview_path: "  " }))).toBe(false);
  });
});
