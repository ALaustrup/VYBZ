import { describe, expect, it } from "vitest";
import {
  applyConflictChoice,
  autoMergeIndependent,
  diffRecords,
  resolveAcceptMine,
  resolveAcceptTheirs,
} from "./fieldMerge";

describe("field merge / conflict resolve", () => {
  it("diffs changed fields only", () => {
    const diffs = diffRecords(
      { displayName: "Ada", role: "producer", splitBps: 5000 },
      { displayName: "Ada", role: "mixer", splitBps: 5000 },
      ["displayName", "role", "splitBps"]
    );
    expect(diffs).toEqual([{ field: "role", mine: "producer", theirs: "mixer" }]);
  });

  it("auto-merges independent field edits", () => {
    const { merged, conflicts } = autoMergeIndependent(
      { displayName: "Ada", role: "artist", splitBps: null },
      { displayName: "Ada Lovelace", role: "artist", splitBps: null },
      { displayName: "Ada", role: "producer", splitBps: null },
      ["displayName", "role", "splitBps"]
    );
    expect(conflicts).toHaveLength(0);
    expect(merged).toEqual({ displayName: "Ada Lovelace", role: "producer", splitBps: null });
  });

  it("flags same-field conflicts and supports accept mine/theirs", () => {
    const mine = { displayName: "Mine", role: "producer" };
    const theirs = { displayName: "Theirs", role: "producer" };
    const { conflicts } = autoMergeIndependent(
      { displayName: "Base", role: "producer" },
      mine,
      theirs,
      ["displayName", "role"]
    );
    expect(conflicts).toEqual([{ field: "displayName", mine: "Mine", theirs: "Theirs" }]);
    expect(resolveAcceptMine(mine, theirs, ["displayName"]).displayName).toBe("Mine");
    expect(resolveAcceptTheirs(mine, theirs, ["displayName"]).displayName).toBe("Theirs");
    expect(applyConflictChoice("mine", mine, theirs, ["displayName"]).displayName).toBe("Mine");
    expect(applyConflictChoice("theirs", mine, theirs, ["displayName"]).displayName).toBe("Theirs");
  });
});
