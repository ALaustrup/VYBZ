import { describe, expect, it } from "vitest";
import { generateRandomMidiPhrase, scaleDegrees } from "@/features/tools/midiRandom";

function seq(values: number[]): () => number {
  let i = 0;
  return () => {
    const v = values[i % values.length]!;
    i += 1;
    return v;
  };
}

describe("midiRandom (OR-036)", () => {
  it("exposes scale degree maps", () => {
    expect(scaleDegrees("major")).toEqual([0, 2, 4, 5, 7, 9, 11]);
    expect(scaleDegrees("pentatonic")).toHaveLength(5);
  });

  it("generates notes within MIDI range using injectable RNG", () => {
    const notes = generateRandomMidiPhrase({
      bars: 1,
      density: 6,
      bpm: 120,
      scale: "major",
      rootPc: 0,
      baseMidi: 60,
      random: seq([0.1, 0.4, 0.7, 0.2, 0.9, 0.3, 0.55, 0.15, 0.8]),
    });
    expect(notes.length).toBeGreaterThan(0);
    for (const n of notes) {
      expect(n.midi).toBeGreaterThanOrEqual(0);
      expect(n.midi).toBeLessThanOrEqual(127);
      expect(n.duration).toBeGreaterThan(0);
      expect(n.time).toBeGreaterThanOrEqual(0);
    }
  });

  it("is reproducible for the same RNG sequence", () => {
    const a = generateRandomMidiPhrase({
      bars: 2,
      density: 8,
      random: seq([0.11, 0.22, 0.33, 0.44, 0.55, 0.66, 0.77, 0.88, 0.12, 0.34]),
    });
    const b = generateRandomMidiPhrase({
      bars: 2,
      density: 8,
      random: seq([0.11, 0.22, 0.33, 0.44, 0.55, 0.66, 0.77, 0.88, 0.12, 0.34]),
    });
    expect(a).toEqual(b);
  });
});
