import { describe, expect, it } from "vitest";
import { dawHintLabel } from "@/features/workspace/dawFolderLink";
import { detectDaw } from "@/lib/repoSync";

describe("dawFolderLink (OR-041)", () => {
  it("labels detected DAWs without sync claims", () => {
    expect(dawHintLabel("ableton")).toMatch(/Ableton/i);
    expect(dawHintLabel("ableton")).not.toMatch(/sync|live session|bit-perfect/i);
    expect(detectDaw("My Song Project", ["song.als", "Samples/kick.wav"])).toBe("ableton");
  });
});
