import { describe, expect, it } from "vitest";
import { midiToFreq } from "./midiPreview";

describe("midiPreview", () => {
  it("maps A4 to 440 Hz", () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 5);
  });

  it("maps C4 an octave below C5", () => {
    expect(midiToFreq(60)).toBeCloseTo(midiToFreq(72) / 2, 5);
  });
});
