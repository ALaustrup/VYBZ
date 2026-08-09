import { describe, expect, it } from "vitest";
import {
  DRY_PLAYBACK_VERSION,
  ambientSignal,
  catalogSignal,
  localSignal,
  resolveTrackSignal,
  simulationSignal,
} from "./playbackSignal";

describe("playbackSignal", () => {
  it("versions dry playback", () => {
    expect(DRY_PLAYBACK_VERSION).toBe("m9.dry-playback.1");
    expect(catalogSignal().version).toBe(DRY_PLAYBACK_VERSION);
  });

  it("discloses ambient and simulation only", () => {
    expect(catalogSignal().disclosure).toBeNull();
    expect(localSignal().disclosure).toBeNull();
    expect(ambientSignal().disclosure).toMatch(/Generated ambient/);
    expect(simulationSignal("Streaming −14").disclosure).toMatch(/disclosed simulation/);
  });

  it("resolves heuristics when signal omitted", () => {
    expect(resolveTrackSignal(null)).toBeNull();
    expect(resolveTrackSignal({ id: "a", url: "https://cdn.example/a.wav" })?.kind).toBe("catalog");
    expect(resolveTrackSignal({ id: "b", url: "blob:abc" })?.kind).toBe("local");
    expect(resolveTrackSignal({ id: "vybz-ambient-pad", url: "blob:x" })?.kind).toBe("ambient");
  });
});
