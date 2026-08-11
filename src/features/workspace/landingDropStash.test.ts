import { describe, expect, it, beforeEach } from "vitest";
import {
  peekLandingDropFiles,
  resetLandingDropStash,
  stashLandingDropFiles,
  takeLandingDropFiles,
} from "@/features/workspace/landingDropStash";
import { seedWorkingTrackFromFile } from "@/features/workspace/seedWorkingTrackFromFile";
import { getWorkingTrack, resetWorkingTrack } from "@/features/workspace/workingSet";

describe("landingDropStash (OR-040)", () => {
  beforeEach(() => {
    resetLandingDropStash();
    resetWorkingTrack();
  });

  it("stashes and takes files without inventing extras", () => {
    const f = new File([new Uint8Array([1])], "a.wav", { type: "audio/wav" });
    stashLandingDropFiles([f]);
    expect(peekLandingDropFiles()).toHaveLength(1);
    expect(takeLandingDropFiles()).toHaveLength(1);
    expect(peekLandingDropFiles()).toHaveLength(0);
  });

  it("seeds working track from file with landing source", () => {
    const f = new File([new Uint8Array([1, 2])], "kick.wav", { type: "audio/wav" });
    const track = seedWorkingTrackFromFile({ file: f, source: "landing", dropId: "d1" });
    expect(getWorkingTrack()?.id).toBe(track.id);
    expect(getWorkingTrack()?.source).toBe("landing");
    expect(getWorkingTrack()?.dropId).toBe("d1");
    expect(getWorkingTrack()?.fileName).toBe("kick.wav");
  });
});
