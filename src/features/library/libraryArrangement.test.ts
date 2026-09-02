import { describe, expect, it, beforeEach } from "vitest";
import {
  DEFAULT_LIBRARY_ARRANGEMENT,
  LIBRARY_GALLERY_BUMP,
  loadLibraryArrangement,
  saveLibraryArrangement,
} from "./libraryArrangement";

describe("library arrangement", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns cinema when nothing is stored", () => {
    expect(loadLibraryArrangement("u1")).toEqual(DEFAULT_LIBRARY_ARRANGEMENT);
    expect(DEFAULT_LIBRARY_ARRANGEMENT.view).toBe("cinema");
  });

  it("remembers view, sort and group per person", () => {
    saveLibraryArrangement("u1", { view: "shelves", sort: "title-asc", group: "album" });
    expect(loadLibraryArrangement("u1")).toEqual({
      view: "shelves",
      sort: "title-asc",
      group: "album",
    });
    expect(loadLibraryArrangement("u2")).toEqual(DEFAULT_LIBRARY_ARRANGEMENT);
  });

  it("accepts cinema as a stored view", () => {
    saveLibraryArrangement("u1", { view: "cinema", sort: "newest", group: "none" });
    expect(loadLibraryArrangement("u1").view).toBe("cinema");
  });

  it("lands a pre-gallery grid default in cinema once", () => {
    localStorage.setItem(
      "vybz.library.arrangement.u1",
      JSON.stringify({ view: "grid", sort: "newest", group: "none" }),
    );
    expect(loadLibraryArrangement("u1").view).toBe("cinema");
  });

  it("lands a grid saved under an older gallery bump in cinema", () => {
    localStorage.setItem(
      "vybz.library.arrangement.u1",
      JSON.stringify({ view: "grid", sort: "newest", group: "none", galleryBump: 1 }),
    );
    expect(loadLibraryArrangement("u1").view).toBe("cinema");
  });

  it("keeps grid after the person chooses it on the gallery bump", () => {
    localStorage.setItem(
      "vybz.library.arrangement.u1",
      JSON.stringify({
        view: "grid",
        sort: "newest",
        group: "none",
        galleryBump: LIBRARY_GALLERY_BUMP,
      }),
    );
    expect(loadLibraryArrangement("u1").view).toBe("grid");
  });

  it("ignores a corrupted payload instead of crashing", () => {
    localStorage.setItem("vybz.library.arrangement.u1", "{not-json");
    expect(loadLibraryArrangement("u1")).toEqual(DEFAULT_LIBRARY_ARRANGEMENT);
  });
});
