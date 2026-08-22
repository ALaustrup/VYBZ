import { describe, expect, it } from "vitest";
import type { Drop } from "@/types";
import {
  applyDropComposition,
  hideDrops,
  isOnStage,
  parseStageComposition,
  placeDrops,
  sectionFor,
} from "./stageComposition";

const drop = (id: string): Drop => ({
  id,
  authorId: "u1",
  authorUsername: "a",
  title: id,
  body: null,
  seed: 1,
  feels: 0,
  wilds: 0,
  createdAt: 1,
});

describe("stage composition", () => {
  it("treats missing jsonb as uncomposed so existing Stage Files do not go blank", () => {
    const c = parseStageComposition({});
    expect(c.selected).toBe(false);
    expect(isOnStage(c, "d1")).toBe(true);
    expect(applyDropComposition([drop("d1"), drop("d2")], c).map((d) => d.id)).toEqual(["d1", "d2"]);
  });

  it("places without duplicating the asset id", () => {
    const once = placeDrops({ selected: false, placements: [] }, ["a"], "works", ["a", "b"]);
    const twice = placeDrops(once, ["a"], "works");
    expect(once.selected).toBe(true);
    expect(once.placements.map((p) => p.dropId).sort()).toEqual(["a", "b"]);
    expect(twice.placements.filter((p) => p.dropId === "a")).toHaveLength(1);
  });

  it("snapshots current Stage File ids on first compose so other work does not vanish", () => {
    const next = placeDrops({ selected: false, placements: [] }, ["c"], "works", ["a", "b"]);
    expect(next.placements.map((p) => p.dropId).sort()).toEqual(["a", "b", "c"]);
  });

  it("hides a drop after snapshotting the current Stage File", () => {
    const next = hideDrops({ selected: false, placements: [] }, ["b"], ["a", "b", "c"]);
    expect(next.selected).toBe(true);
    expect(next.placements.map((p) => p.dropId)).toEqual(["a", "c"]);
  });

  it("filters and orders composed drops, keeping the featured pin", () => {
    const c = placeDrops({ selected: false, placements: [] }, ["b"], "works", ["a", "b"]);
    const shown = applyDropComposition([drop("z"), drop("b"), drop("a")], c, "z");
    expect(shown.map((d) => d.id)).toEqual(["z", "a", "b"]);
  });

  it("moves an existing placement to featured without a second row", () => {
    const works = placeDrops({ selected: true, placements: [] }, ["a"], "works");
    const featured = placeDrops(works, ["a"], "featured");
    expect(featured.placements).toHaveLength(1);
    expect(sectionFor(featured, "a")).toBe("featured");
  });

  it("ignores empty and duplicate ids", () => {
    const next = placeDrops({ selected: true, placements: [] }, ["", "a", "a"], "works");
    expect(next.placements.map((p) => p.dropId)).toEqual(["a"]);
  });
});
