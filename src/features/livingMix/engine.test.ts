import { describe, expect, it } from "vitest";
import {
  pickNext,
  planSession,
  recencyWindow,
  sessionSeed,
  type MixCandidate,
} from "./engine";

function cand(
  id: string,
  patch: Partial<MixCandidate> = {},
): MixCandidate {
  return {
    id,
    artistKey: patch.artistKey ?? `artist-${id}`,
    durationSec: patch.durationSec ?? null,
    plays: patch.plays ?? null,
    bpm: patch.bpm ?? null,
    kind: patch.kind ?? "track",
  };
}

describe("Living Mix engine", () => {
  it("is deterministic for the same seed, pool and intent", () => {
    const pool = ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => cand(id));
    const a = planSession(pool, "steady", 42);
    const b = planSession(pool, "steady", 42);
    expect(a.map((p) => p.candidate.id)).toEqual(b.map((p) => p.candidate.id));
    expect(a.length).toBeGreaterThanOrEqual(pool.length);
  });

  it("changes order when the session seed changes", () => {
    const pool = ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => cand(id));
    const a = planSession(pool, "steady", sessionSeed("mix", 1_700_000_000_000));
    const b = planSession(pool, "steady", sessionSeed("mix", 1_700_000_000_001));
    expect(a.map((p) => p.candidate.id)).not.toEqual(b.map((p) => p.candidate.id));
  });

  it("does not immediately repeat when the pool has more than one track", () => {
    const pool = ["a", "b", "c", "d"].map((id) => cand(id));
    const planned = planSession(pool, "steady", 7, 12);
    for (let i = 1; i < planned.length; i++) {
      expect(planned[i].candidate.id).not.toBe(planned[i - 1].candidate.id);
    }
  });

  it("never invents duration, BPM or plays", () => {
    const pool = [cand("x"), cand("y")];
    const planned = planSession(pool, "peak", 99, 4);
    for (const pick of planned) {
      expect(pick.candidate.durationSec).toBeNull();
      expect(pick.candidate.bpm).toBeNull();
      expect(pick.candidate.plays).toBeNull();
      expect(pick.reasons).not.toContain("intent-duration");
      expect(pick.reasons).not.toContain("intent-plays");
    }
  });

  it("prefers a long measured track for calm when jitter cannot override", () => {
    const long = cand("long", { durationSec: 300, artistKey: "one" });
    const short = cand("short", { durationSec: 60, artistKey: "two" });
    const pick = pickNext({
      pool: [short, long],
      history: [],
      intent: "calm",
      seed: 1,
      step: 0,
    });
    expect(pick?.candidate.id).toBe("long");
    expect(pick?.reasons).toContain("intent-duration");
  });

  it("keeps the recency window inside the pool", () => {
    expect(recencyWindow(1)).toBe(0);
    expect(recencyWindow(2)).toBe(1);
    expect(recencyWindow(9)).toBe(3);
    expect(recencyWindow(99)).toBe(5);
  });

  it("returns nothing for an empty pool", () => {
    expect(planSession([], "steady", 1)).toEqual([]);
    expect(
      pickNext({ pool: [], history: [], intent: "steady", seed: 1, step: 0 }),
    ).toBeNull();
  });
});
