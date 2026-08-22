import { describe, expect, it, beforeEach } from "vitest";
import {
  DEFAULT_LIBRARY_ARRANGEMENT,
  loadLibraryArrangement,
  saveLibraryArrangement,
} from "./libraryArrangement";

describe("library arrangement", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns the default grid when nothing is stored", () => {
    expect(loadLibraryArrangement("u1")).toEqual(DEFAULT_LIBRARY_ARRANGEMENT);
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

  it("ignores a corrupted payload instead of crashing", () => {
    localStorage.setItem("vybz.library.arrangement.u1", "{not-json");
    expect(loadLibraryArrangement("u1")).toEqual(DEFAULT_LIBRARY_ARRANGEMENT);
  });
});
