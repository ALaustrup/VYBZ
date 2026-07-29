import { describe, expect, it } from "vitest";
import { durationFast, durationNormal, withReduce, reduceMotion, easeOutQuick } from "./motion";

describe("motion presets", () => {
  it("exposes v2 durations 120ms / 240ms", () => {
    expect(durationFast).toBe(0.12);
    expect(durationNormal).toBe(0.24);
  });

  it("withReduce collapses to near-zero duration", () => {
    expect(withReduce(true, easeOutQuick)).toEqual(reduceMotion);
    expect(withReduce(false, easeOutQuick)).toEqual(easeOutQuick);
  });
});
