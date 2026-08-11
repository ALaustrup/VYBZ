/**
 * OR-032 working-set unit seam.
 */
import { describe, expect, it, beforeEach } from "vitest";
import {
  clearWorkingTrack,
  getWorkingTrack,
  resetWorkingTrack,
  setWorkingTrack,
  workingTrackAsFile,
} from "@/features/workspace/workingSet";

describe("workingSet", () => {
  beforeEach(() => {
    resetWorkingTrack();
  });

  it("stores and clears the active song workspace track", () => {
    expect(getWorkingTrack()).toBeNull();
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "audio/wav" });
    const track = setWorkingTrack({
      title: "Demo",
      artistName: "A",
      fileName: "demo.wav",
      mimeType: "audio/wav",
      blob,
      source: "analyzer",
      releaseId: "rel-1",
    });
    expect(getWorkingTrack()?.id).toBe(track.id);
    expect(getWorkingTrack()?.title).toBe("Demo");
    const file = workingTrackAsFile();
    expect(file).toBeInstanceOf(File);
    expect(file?.name).toBe("demo.wav");
    clearWorkingTrack();
    expect(getWorkingTrack()).toBeNull();
  });
});
