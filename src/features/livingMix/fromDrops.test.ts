import { describe, expect, it } from "vitest";
import type { Drop } from "@/types";
import { dropToCandidate, playableDrops } from "./fromDrops";

function drop(patch: Partial<Drop> & Pick<Drop, "id" | "audioUrl">): Drop {
  return {
    authorId: "u1",
    authorUsername: "ada",
    title: "Track",
    body: null,
    seed: 1,
    feels: 0,
    wilds: 0,
    createdAt: 0,
    ...patch,
  };
}

describe("Living Mix drop mapping", () => {
  it("skips drops without a playable URL", () => {
    const a = drop({ id: "a", audioUrl: "https://cdn.example/a.mp3", durationSec: 120 });
    const b = drop({ id: "b", audioUrl: undefined });
    expect(playableDrops([a, b]).map((d) => d.id)).toEqual(["a"]);
    expect(dropToCandidate(b)).toBeNull();
  });

  it("leaves missing duration, BPM and plays as null", () => {
    const c = dropToCandidate(drop({ id: "a", audioUrl: "https://cdn.example/a.mp3" }));
    expect(c?.durationSec).toBeNull();
    expect(c?.bpm).toBeNull();
    expect(c?.plays).toBeNull();
  });
});
