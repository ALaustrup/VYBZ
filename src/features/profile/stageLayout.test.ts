import { describe, expect, it } from "vitest";
import type { StageWork } from "./workKind";
import {
  DEFAULT_STAGE_MODULE_ORDER,
  dropStageModule,
  moveStageModule,
  parseStageModuleOrder,
  partitionStageWorks,
  visibleStageModules,
} from "./stageLayout";

const work = (dropId: string): StageWork => ({
  id: `drop:${dropId}`,
  kind: "audio",
  title: dropId,
  drop: {
    id: dropId,
    authorId: "u1",
    authorUsername: "a",
    title: dropId,
    body: null,
    seed: 1,
    feels: 0,
    wilds: 0,
    createdAt: 1,
  },
});

describe("stage layout", () => {
  it("fills missing modules and drops unknown ids", () => {
    expect(parseStageModuleOrder(["works", "nope", "works", "stage"])).toEqual([
      "works",
      "stage",
      "featured",
      "story",
      "packs",
      "measured",
      "credits",
      "links",
    ]);
    expect(parseStageModuleOrder(undefined)).toEqual(DEFAULT_STAGE_MODULE_ORDER);
  });

  it("moves a module up and down without wrapping", () => {
    const start = parseStageModuleOrder(["stage", "featured", "works"]);
    expect(moveStageModule(start, "featured", -1)[0]).toBe("featured");
    expect(moveStageModule(start, "stage", -1)).toEqual(start);
    expect(moveStageModule(start, "links", 1)).toEqual(start);
  });

  it("drops a module onto another", () => {
    const start = parseStageModuleOrder(["stage", "featured", "works"]);
    expect(dropStageModule(start, "works", "stage")[0]).toBe("works");
    expect(dropStageModule(start, "works", "works")).toEqual(start);
  });

  it("hides empty modules unless the owner is arranging", () => {
    const order = parseStageModuleOrder(["stage", "works", "measured"]);
    const occupied = {
      stage: false,
      featured: false,
      works: true,
      story: false,
      packs: false,
      measured: true,
      credits: false,
      links: false,
    };
    expect(visibleStageModules(order, occupied, false)).toEqual(["works", "measured"]);
    expect(visibleStageModules(order, occupied, true)).toEqual(order);
  });

  it("splits featured placements out of Works", () => {
    const { featured, rest } = partitionStageWorks(
      [work("a"), work("b")],
      { selected: true, placements: [{ dropId: "b", section: "featured", sort: 0 }, { dropId: "a", section: "works", sort: 1 }] },
      null,
    );
    expect(featured.map((w) => w.drop?.id)).toEqual(["b"]);
    expect(rest.map((w) => w.drop?.id)).toEqual(["a"]);
  });
});
